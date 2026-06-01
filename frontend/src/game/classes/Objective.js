import GameObject from './GameObject.js';

export default class Objective extends GameObject {
  #life;
  #maxLife;

  constructor(id, x, y, type = 'refinery', life = 3) {
    super(id, x, y);
    this.type = type;
    this.#life = life;
    this.#maxLife = life;
    this.destroyed = false;
  }

  get life() { return this.#life; }
  get maxLife() { return this.#maxLife; }

  receiveHit() {
    if (this.destroyed) return;
    this.#life = Math.max(0, this.#life - 1);
    if (this.#life <= 0) this.destroy();
  }

  destroy() {
    this.destroyed = true;
    this.#life = 0;
  }

  toJSON() {
    return {
      ...super.toJSON(),
      type: this.type,
      life: this.#life,
      maxLife: this.#maxLife,
      destroyed: this.destroyed
    };
  }
}
