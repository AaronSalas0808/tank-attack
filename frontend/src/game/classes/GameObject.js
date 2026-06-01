export default class GameObject {
  #id;
  #x;
  #y;

  constructor(id, x, y) {
    this.#id = id;
    this.#x = x;
    this.#y = y;
  }

  get id() { return this.#id; }
  get x() { return this.#x; }
  get y() { return this.#y; }

  setPosition(x, y) {
    this.#x = x;
    this.#y = y;
  }

  toJSON() {
    return { id: this.#id, x: this.#x, y: this.#y };
  }
}
