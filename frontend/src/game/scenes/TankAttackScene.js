import Phaser from 'phaser';
import GameManager from '../GameManager.js';
import { GRID } from '../levels/defaultLevels.js';

const COLORS = {
  sand: 0xd9bd78,
  sandDark: 0xcaaa5d,
  wall: 0x8b4513,
  wallDark: 0x5b2f12,
  player: 0x16a34a,
  playerDark: 0x065f46,
  enemyRapido: 0xf97316,
  enemyPesado: 0xdc2626,
  enemyFrancotirador: 0x7c3aed,
  bulletPlayer: 0x0f172a,
  bulletEnemy: 0xef4444,
  objectiveFactory: 0x64748b,
  objectiveRefinery: 0x0f766e,
  objectiveAntenna: 0x2563eb,
  white: 0xffffff,
  black: 0x111827,
  smoke: 0x334155
};

function enemyColor(enemy) {
  if (enemy.type === 'pesado') return COLORS.enemyPesado;
  if (enemy.type === 'francotirador') return COLORS.enemyFrancotirador;
  return COLORS.enemyRapido;
}

function directionAngle(direction) {
  return {
    right: 0,
    down: Math.PI / 2,
    left: Math.PI,
    up: -Math.PI / 2
  }[direction] ?? 0;
}

function directionVector(direction) {
  return {
    right: [1, 0],
    left: [-1, 0],
    up: [0, -1],
    down: [0, 1]
  }[direction] ?? [1, 0];
}

export default class TankAttackScene extends Phaser.Scene {
  constructor(options = {}) {
    super('TankAttackScene');
    this.onStateChange = options.onStateChange ?? (() => {});
    this.gameManager = null;
    this.graphics = null;
    this.cursors = null;
    this.keys = null;
    this.spaceKey = null;
    this.lastMove = 0;
    this.lastShot = 0;
    this.lastMessage = '';
    this.dynamicTexts = [];
    this.renderPositions = new Map();
  }

  create() {
    this.gameManager = new GameManager(() => this.publishState());
    this.graphics = this.add.graphics();

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D');
    this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);

    this.add.text(16, GRID.rows * GRID.cell + 12, 'WASD / Flechas: mover   ·   Espacio: disparar   ·   La IA enemiga consulta a Prolog', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#e5e7eb'
    });

    this.publishState();
  }

  startGame() {
    this.gameManager.start();
    this.publishState();
  }

  resetGame() {
    this.gameManager.resetGame();
    this.publishState();
  }

  publishState() {
    if (!this.gameManager) return;
    this.onStateChange({
      level: this.gameManager.levelNumber,
      lives: this.gameManager.player.lives,
      playerLife: this.gameManager.player.life,
      score: this.gameManager.score,
      prologOnline: this.gameManager.prologOnline,
      message: this.gameManager.message,
      running: this.gameManager.running,
      finished: this.gameManager.finished
    });
  }

  update(time) {
    if (!this.gameManager) return;

    this.handleInput(time);
    this.gameManager.update();
    this.gameManager.requestEnemyAI();
    this.drawWorld();
    this.publishState();
  }

  handleInput(time) {
    const game = this.gameManager;
    if (!game.running || game.finished) return;

    const moveDelay = 95;
    if (time - this.lastMove > moveDelay) {
      if (this.cursors.left.isDown || this.keys.A.isDown) {
        game.movePlayer('left');
        this.lastMove = time;
      } else if (this.cursors.right.isDown || this.keys.D.isDown) {
        game.movePlayer('right');
        this.lastMove = time;
      } else if (this.cursors.up.isDown || this.keys.W.isDown) {
        game.movePlayer('up');
        this.lastMove = time;
      } else if (this.cursors.down.isDown || this.keys.S.isDown) {
        game.movePlayer('down');
        this.lastMove = time;
      }
    }

    if (this.spaceKey.isDown && time - this.lastShot > 220) {
      game.playerShoot();
      this.lastShot = time;
    }
  }

  drawWorld() {
    const g = this.graphics;
    const game = this.gameManager;
    const { cols, rows, cell } = GRID;
    const width = cols * cell;
    const height = rows * cell;

    this.dynamicTexts.forEach(t => t.destroy());
    this.dynamicTexts = [];
    g.clear();

    g.fillStyle(COLORS.sand, 1);
    g.fillRoundedRect(0, 0, width, height, 14);

    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < cols; x += 1) {
        const px = x * cell;
        const py = y * cell;
        g.fillStyle((x + y) % 2 === 0 ? 0xe1c984 : 0xd7bd74, 0.42);
        g.fillRect(px, py, cell, cell);
      }
    }

    g.lineStyle(1, COLORS.sandDark, 0.55);
    for (let x = 0; x <= cols; x += 1) {
      g.lineBetween(x * cell, 0, x * cell, height);
    }
    for (let y = 0; y <= rows; y += 1) {
      g.lineBetween(0, y * cell, width, y * cell);
    }

    game.walls.forEach(w => this.drawWall(w.x, w.y));
    game.objectives.filter(o => !o.destroyed).forEach(o => this.drawObjective(o));
    this.drawTank(game.player, COLORS.player, COLORS.playerDark, 'P');
    game.enemies.filter(e => e.alive).forEach(e => this.drawTank(e, enemyColor(e), 0x111827, e.type[0].toUpperCase()));
    game.bullets.forEach(b => this.drawBullet(b));

    g.lineStyle(5, COLORS.black, 1);
    g.strokeRoundedRect(2, 2, width - 4, height - 4, 14);

    if (game.finished) {
      g.fillStyle(0x0f172a, 0.78);
      g.fillRoundedRect(0, 0, width, height, 14);
      this.addDynamicText(width / 2, height / 2, game.message, {
        fontFamily: 'Arial',
        fontSize: '28px',
        fontStyle: 'bold',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: width - 100 }
      }).setOrigin(0.5);
    }
  }

  getRenderPosition(obj, ease = 0.22) {
    const key = obj.id ?? `${obj.ownerId}-${obj.x}-${obj.y}`;
    const target = { x: obj.x, y: obj.y };
    const current = this.renderPositions.get(key);

    if (!current) {
      this.renderPositions.set(key, { ...target });
      return target;
    }

    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;

    if (Math.abs(target.x - current.x) < 0.01) current.x = target.x;
    if (Math.abs(target.y - current.y) < 0.01) current.y = target.y;

    return current;
  }

  cellRect(x, y, inset = 3) {
    const { cell } = GRID;
    return {
      px: x * cell + inset,
      py: y * cell + inset,
      size: cell - inset * 2,
      cx: x * cell + cell / 2,
      cy: y * cell + cell / 2
    };
  }

  drawWall(x, y) {
    const g = this.graphics;
    const r = this.cellRect(x, y, 2);
    g.fillStyle(COLORS.wallDark, 1);
    g.fillRoundedRect(r.px + 3, r.py + 3, r.size, r.size, 5);
    g.fillStyle(COLORS.wall, 1);
    g.fillRoundedRect(r.px, r.py, r.size, r.size, 5);
    g.lineStyle(2, COLORS.wallDark, 0.8);
    g.strokeRoundedRect(r.px, r.py, r.size, r.size, 5);
    g.lineStyle(1, 0xc87935, 0.75);
    g.lineBetween(r.px, r.py + r.size / 2, r.px + r.size, r.py + r.size / 2);
    g.lineBetween(r.px + r.size / 2, r.py, r.px + r.size / 2, r.py + r.size / 2);
    g.lineBetween(r.px + r.size / 3, r.py + r.size / 2, r.px + r.size / 3, r.py + r.size);
  }

  drawObjective(objective) {
    const g = this.graphics;
    const r = this.cellRect(objective.x, objective.y, 4);
    const color = objective.type === 'factory' ? COLORS.objectiveFactory : objective.type === 'antenna' ? COLORS.objectiveAntenna : COLORS.objectiveRefinery;

    g.fillStyle(0x0f172a, 0.28);
    g.fillRoundedRect(r.px + 4, r.py + 4, r.size, r.size, 8);
    g.fillStyle(color, 1);
    g.fillRoundedRect(r.px, r.py, r.size, r.size, 8);
    g.lineStyle(3, COLORS.black, 0.85);
    g.strokeRoundedRect(r.px, r.py, r.size, r.size, 8);

    g.fillStyle(COLORS.white, 0.92);
    if (objective.type === 'factory') {
      g.fillRect(r.px + 8, r.py + 19, 22, 11);
      g.fillRect(r.px + 13, r.py + 10, 6, 10);
      g.fillRect(r.px + 22, r.py + 13, 5, 7);
    } else if (objective.type === 'antenna') {
      g.lineStyle(3, COLORS.white, 0.95);
      g.lineBetween(r.cx, r.py + 8, r.cx, r.py + 30);
      g.lineBetween(r.cx, r.py + 8, r.px + 8, r.py + 20);
      g.lineBetween(r.cx, r.py + 8, r.px + 30, r.py + 20);
      g.strokeCircle(r.cx, r.py + 8, 4);
    } else {
      g.fillRect(r.px + 13, r.py + 8, 13, 24);
      g.fillStyle(0xef4444, 1);
      g.fillRect(r.px + 16, r.py + 5, 7, 6);
    }

    const lifePercent = Math.max(0, objective.life / objective.maxLife);
    g.fillStyle(0x111827, 0.65);
    g.fillRoundedRect(r.px + 4, r.py + r.size - 7, r.size - 8, 5, 2);
    g.fillStyle(0x22c55e, 1);
    g.fillRoundedRect(r.px + 4, r.py + r.size - 7, (r.size - 8) * lifePercent, 5, 2);

    this.addDynamicText(r.cx, r.py - 3, `${objective.life}/${objective.maxLife}`, {
      fontFamily: 'Arial',
      fontSize: '10px',
      fontStyle: 'bold',
      color: '#111827'
    }).setOrigin(0.5);
  }

  drawTank(tank, color, darkColor, label) {
    const g = this.graphics;
    const pos = this.getRenderPosition(tank, 0.24);
    const r = this.cellRect(pos.x, pos.y, 5);
    const angle = directionAngle(tank.direction);
    const [vx, vy] = directionVector(tank.direction);
    const cannonW = 8;
    const cannonL = 24;

    g.fillStyle(0x0f172a, 0.25);
    g.fillRoundedRect(r.px + 4, r.py + 5, r.size, r.size, 8);

    g.fillStyle(darkColor, 1);
    g.fillRoundedRect(r.px + 2, r.py + 5, r.size - 4, r.size - 10, 10);
    g.fillStyle(color, 1);
    g.fillRoundedRect(r.px + 5, r.py + 2, r.size - 10, r.size - 4, 8);

    g.lineStyle(3, COLORS.black, 1);
    g.strokeRoundedRect(r.px + 5, r.py + 2, r.size - 10, r.size - 4, 8);

    g.fillStyle(COLORS.black, 1);
    if (vx !== 0) {
      const cannonX = vx > 0 ? r.cx : r.cx - cannonL;
      g.fillRoundedRect(cannonX, r.cy - cannonW / 2, cannonL, cannonW, 3);
    } else {
      const cannonY = vy > 0 ? r.cy : r.cy - cannonL;
      g.fillRoundedRect(r.cx - cannonW / 2, cannonY, cannonW, cannonL, 3);
    }

    g.fillStyle(0xffffff, 0.88);
    g.fillCircle(r.cx, r.cy, 8);
    g.fillStyle(COLORS.black, 1);
    g.fillCircle(r.cx, r.cy, 4);

    g.fillStyle(COLORS.white, 1);
    g.fillRect(r.px + 4, r.py - 4, Math.max(0, (r.size - 8) * (tank.life / tank.maxLife)), 3);
    g.lineStyle(1, COLORS.black, 0.8);
    g.strokeRect(r.px + 4, r.py - 4, r.size - 8, 3);

    g.fillStyle(COLORS.white, 1);
    g.fillCircle(r.cx - 12, r.cy + 12, 8);
    g.fillStyle(COLORS.black, 1);
    this.addDynamicText(r.cx - 12, r.cy + 12, label, {
      fontFamily: 'Arial',
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#111827'
    }).setOrigin(0.5);
  }

  addDynamicText(x, y, text, style) {
    const obj = this.add.text(x, y, text, style);
    this.dynamicTexts.push(obj);
    return obj;
  }

  drawBullet(bullet) {
    const g = this.graphics;
    const pos = this.getRenderPosition(bullet, 0.35);
    const r = this.cellRect(pos.x, pos.y, 0);
    const color = bullet.ownerId === 'player' ? COLORS.bulletPlayer : COLORS.bulletEnemy;
    g.fillStyle(color, 1);
    g.fillCircle(r.cx, r.cy, 7);
    g.fillStyle(0xffffff, 0.65);
    g.fillCircle(r.cx - 2, r.cy - 2, 2);
  }
}
