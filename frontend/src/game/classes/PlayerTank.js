import Tank from './Tank.js';

export default class PlayerTank extends Tank {
  constructor(x, y) {
    super({ id: 'player', x, y, life: 100, direction: 'right', cooldown: 10, damage: 25, vision: 8 });
    this.lives = 3;
  }

  loseLifeAndRespawn(x, y) {
    this.lives -= 1;
    this.restore();
    this.setPosition(x, y);
    this.setDirection('right');
  }
}
