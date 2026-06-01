import Tank from './Tank.js';

const TYPES = {
  rapido: { life: 80, cooldown: 22, damage: 18, vision: 7, color: '#f97316' },
  pesado: { life: 140, cooldown: 38, damage: 35, vision: 5, color: '#dc2626' },
  francotirador: { life: 90, cooldown: 30, damage: 30, vision: 9, color: '#7c3aed' }
};

export default class EnemyTank extends Tank {
  constructor(id, x, y, type, objectiveId) {
    const stats = TYPES[type] ?? TYPES.rapido;
    super({ id, x, y, life: stats.life, direction: 'left', cooldown: stats.cooldown, damage: stats.damage, vision: stats.vision });
    this.type = type;
    this.objectiveId = objectiveId;
    this.color = stats.color;
    this.pendingRoute = [];
  }

  toJSON() {
    return { ...super.toJSON(), type: this.type, objectiveId: this.objectiveId };
  }
}
