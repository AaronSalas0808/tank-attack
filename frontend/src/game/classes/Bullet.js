import GameObject from './GameObject.js';

export default class Bullet extends GameObject {
  constructor(id, x, y, direction, ownerId, damage) {
    super(id, x, y);
    this.direction = direction;
    this.ownerId = ownerId;
    this.damage = damage;
  }

  nextPosition() {
    const delta = {
      up: [0, -1],
      down: [0, 1],
      left: [-1, 0],
      right: [1, 0]
    }[this.direction] ?? [1, 0];
    return { x: this.x + delta[0], y: this.y + delta[1] };
  }
}
