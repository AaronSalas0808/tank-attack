import GameObject from './GameObject.js';

export default class Tank extends GameObject {
  #life;
  #maxLife;
  #direction;
  #cooldown;
  #maxCooldown;
  #damage;
  #vision;

  constructor({ id, x, y, life = 100, direction = 'right', cooldown = 20, damage = 25, vision = 6 }) {
    super(id, x, y);
    this.#life = life;
    this.#maxLife = life;
    this.#direction = direction;
    this.#cooldown = 0;
    this.#maxCooldown = cooldown;
    this.#damage = damage;
    this.#vision = vision;
  }

  get life() { return this.#life; }
  get maxLife() { return this.#maxLife; }
  get direction() { return this.#direction; }
  get cooldown() { return this.#cooldown; }
  get maxCooldown() { return this.#maxCooldown; }
  get damage() { return this.#damage; }
  get vision() { return this.#vision; }
  get alive() { return this.#life > 0; }

  setDirection(direction) {
    this.#direction = direction;
  }

  tickCooldown() {
    if (this.#cooldown > 0) this.#cooldown -= 1;
  }

  canShoot() {
    return this.alive && this.#cooldown <= 0;
  }

  resetCooldown() {
    this.#cooldown = this.#maxCooldown;
  }

  receiveDamage(amount) {
    this.#life = Math.max(0, this.#life - amount);
  }

  restore() {
    this.#life = this.#maxLife;
    this.#cooldown = 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      life: this.#life,
      direction: this.#direction,
      damage: this.#damage,
      vision: this.#vision
    };
  }
}
