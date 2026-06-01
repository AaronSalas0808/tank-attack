import PlayerTank from './classes/PlayerTank.js';
import EnemyTank from './classes/EnemyTank.js';
import Bullet from './classes/Bullet.js';
import Wall from './classes/Wall.js';
import Objective from './classes/Objective.js';
import { BASE_LEVELS, GRID } from './levels/defaultLevels.js';
import { askEnemyAI } from './services/PrologService.js';

const DIRECTIONS = {
  up: [0, -1],
  down: [0, 1],
  left: [-1, 0],
  right: [1, 0]
};

export default class GameManager {
  #levelIndex = 0;
  #player;
  #walls = [];
  #objectives = [];
  #enemies = [];
  #bullets = [];
  #lastAIRequest = 0;
  #message = 'Presiona Inicio para jugar.';
  #running = false;
  #finished = false;
  #score = 0;
  #prologOnline = false;
  #bulletCounter = 0;
  #frameTick = 0;
  #bulletMoveInterval = 8;

  constructor(onChange = () => {}) {
    this.onChange = onChange;
    this.loadLevel(0);
  }

  get running() { return this.#running; }
  get message() { return this.#message; }
  get player() { return this.#player; }
  get walls() { return this.#walls; }
  get objectives() { return this.#objectives; }
  get enemies() { return this.#enemies; }
  get bullets() { return this.#bullets; }
  get level() { return BASE_LEVELS[this.#levelIndex]; }
  get levelNumber() { return this.#levelIndex + 1; }
  get score() { return this.#score; }
  get prologOnline() { return this.#prologOnline; }
  get finished() { return this.#finished; }

  start() {
    this.#running = true;
    this.#finished = false;
    this.#message = 'Juego iniciado. Prolog decide la IA enemiga.';
    this.onChange();
  }

  resetGame() {
    this.#levelIndex = 0;
    this.#score = 0;
    this.loadLevel(0);
    this.start();
  }

  loadLevel(index) {
    const data = BASE_LEVELS[index];
    this.#levelIndex = index;
    this.#player = new PlayerTank(data.playerStart.x, data.playerStart.y);
    this.#walls = data.walls.map(([x, y], i) => new Wall(`wall-${i}`, x, y));
    this.#objectives = data.objectives.map(o => new Objective(o.id, o.x, o.y, o.type));
    this.#enemies = data.enemies.map(e => new EnemyTank(e.id, e.x, e.y, e.type, e.objectiveId));
    this.#bullets = [];
    this.#frameTick = 0;
    this.#message = `${data.name}: destruye todos los objetivos.`;
    this.#finished = false;
    this.onChange();
  }

  isBlocked(x, y, ignoreId = null) {
    if (x < 0 || y < 0 || x >= GRID.cols || y >= GRID.rows) return true;
    if (this.#walls.some(w => w.x === x && w.y === y)) return true;
    if (this.#objectives.some(o => !o.destroyed && o.x === x && o.y === y)) return true;
    if (this.#enemies.some(e => e.id !== ignoreId && e.alive && e.x === x && e.y === y)) return true;
    if (this.#player.id !== ignoreId && this.#player.alive && this.#player.x === x && this.#player.y === y) return true;
    return false;
  }

  movePlayer(direction) {
    if (!this.#running || this.#finished) return;
    const [dx, dy] = DIRECTIONS[direction] ?? [0, 0];
    const nx = this.#player.x + dx;
    const ny = this.#player.y + dy;
    this.#player.setDirection(direction);
    if (!this.isBlocked(nx, ny, this.#player.id)) {
      this.#player.setPosition(nx, ny);
    }
    this.onChange();
  }

  playerShoot() {
    if (!this.#running || this.#finished || !this.#player.canShoot()) return;
    this.#bullets.push(new Bullet(`b${++this.#bulletCounter}`, this.#player.x, this.#player.y, this.#player.direction, this.#player.id, this.#player.damage));
    this.#player.resetCooldown();
    this.onChange();
  }

  enemyShoot(enemy) {
    if (!enemy.canShoot()) return;
    this.#bullets.push(new Bullet(`b${++this.#bulletCounter}`, enemy.x, enemy.y, enemy.direction, enemy.id, enemy.damage));
    enemy.resetCooldown();
  }

  update() {
    if (!this.#running || this.#finished) return;
    this.#frameTick += 1;
    this.#player.tickCooldown();
    this.#enemies.forEach(e => e.tickCooldown());
    if (this.#frameTick % this.#bulletMoveInterval === 0) {
      this.updateBullets();
    }
    this.checkLevelStatus();
  }

  async requestEnemyAI() {
    if (!this.#running || this.#finished) return;
    const now = Date.now();
    if (now - this.#lastAIRequest < 650) return;
    this.#lastAIRequest = now;

    for (const enemy of this.#enemies.filter(e => e.alive)) {
      const objective = this.#objectives.find(o => o.id === enemy.objectiveId);
      try {
        const decision = await askEnemyAI({
          grid: { cols: GRID.cols, rows: GRID.rows },
          enemy: enemy.toJSON(),
          player: this.#player.toJSON(),
          objective: objective?.toJSON(),
          walls: this.#walls.map(w => [w.x, w.y]),
          allies: this.#enemies.filter(e => e.id !== enemy.id && e.alive).map(e => e.toJSON())
        });
        this.#prologOnline = true;
        this.applyEnemyDecision(enemy, decision);
      } catch (error) {
        this.#prologOnline = false;
        this.#message = 'Backend Prolog no conectado. Levanta backend/server.pl.';
      }
    }
    this.onChange();
  }

  applyEnemyDecision(enemy, decision) {
    if (!decision || !enemy.alive) return;
    if (decision.direccion) enemy.setDirection(decision.direccion);

    if (decision.accion === 'disparar') {
      this.enemyShoot(enemy);
      this.#message = `${enemy.id} (${enemy.type}) dispara: ${decision.motivo ?? 'decisión de Prolog'}`;
      return;
    }

    if (decision.accion === 'mover' && Array.isArray(decision.ruta) && decision.ruta.length > 1) {
      const next = decision.ruta[1];
      const nx = Number(next.x);
      const ny = Number(next.y);
      const direction = this.directionFromTo(enemy.x, enemy.y, nx, ny);
      if (direction) enemy.setDirection(direction);
      if (!this.isBlocked(nx, ny, enemy.id)) {
        enemy.setPosition(nx, ny);
      }
      this.#message = `${enemy.id} decide ${decision.accion}: ${decision.motivo ?? 'ruta calculada por Prolog'}`;
    }
  }

  directionFromTo(x1, y1, x2, y2) {
    if (x2 > x1) return 'right';
    if (x2 < x1) return 'left';
    if (y2 > y1) return 'down';
    if (y2 < y1) return 'up';
    return null;
  }

  updateBullets() {
    const survivors = [];
    for (const bullet of this.#bullets) {
      const next = bullet.nextPosition();
      bullet.setPosition(next.x, next.y);

      if (next.x < 0 || next.y < 0 || next.x >= GRID.cols || next.y >= GRID.rows) continue;
      if (this.#walls.some(w => w.x === next.x && w.y === next.y)) continue;

      const obj = this.#objectives.find(o => !o.destroyed && o.x === next.x && o.y === next.y);
      if (obj && bullet.ownerId === this.#player.id) {
        obj.receiveHit();
        if (obj.destroyed) {
          this.#score += 50;
          this.#message = `Objetivo ${obj.id} destruido.`;
        } else {
          this.#score += 15;
          this.#message = `Objetivo ${obj.id} impactado. Resistencia: ${obj.life}/${obj.maxLife}.`;
        }
        continue;
      }

      if (bullet.ownerId === this.#player.id) {
        const enemy = this.#enemies.find(e => e.alive && e.x === next.x && e.y === next.y);
        if (enemy) {
          enemy.receiveDamage(bullet.damage);
          this.#score += 10;
          this.#message = `Impacto sobre ${enemy.id}.`;
          continue;
        }
      } else if (this.#player.x === next.x && this.#player.y === next.y) {
        this.#player.receiveDamage(bullet.damage);
        this.#message = 'El jugador recibió daño.';
        if (!this.#player.alive) this.handlePlayerDestroyed();
        continue;
      }

      survivors.push(bullet);
    }
    this.#bullets = survivors;
  }

  handlePlayerDestroyed() {
    if (this.#player.lives > 1) {
      const start = this.level.playerStart;
      this.#player.loseLifeAndRespawn(start.x, start.y);
      this.#message = `Tanque destruido. Vidas restantes: ${this.#player.lives}.`;
    } else {
      this.#player.lives = 0;
      this.#finished = true;
      this.#running = false;
      this.#message = 'Game Over: el jugador perdió todas sus vidas.';
    }
  }

  checkLevelStatus() {
    if (this.#objectives.every(o => o.destroyed)) {
      if (this.#levelIndex < BASE_LEVELS.length - 1) {
        this.#levelIndex += 1;
        this.loadLevel(this.#levelIndex);
        this.#message = `Nivel superado. Inicia ${this.level.name}.`;
      } else {
        this.#finished = true;
        this.#running = false;
        this.#message = 'Victoria total: completaste los 3 niveles.';
      }
    }
  }
}
