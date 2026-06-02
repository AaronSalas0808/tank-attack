import { GRID, BASE_LEVELS } from './defaultLevels.js';

/**
 * Convierte el estado del editor (celdas pintadas) en un objeto de nivel
 * compatible con BASE_LEVELS y GameManager.
 */
export function editorStateToLevel(cells, levelIndex) {
  const walls = [];
  const objectives = [];
  const enemies = [];
  let playerStart = { x: 1, y: 1 };

  const objCounter = {};
  let enemyCount = 0;

  for (const [key, cell] of Object.entries(cells)) {
    const [x, y] = key.split(',').map(Number);

    if (cell.type === 'wall') {
      walls.push([x, y]);
    } else if (cell.type === 'player') {
      playerStart = { x, y };
    } else if (cell.type === 'objective') {
      const id = `obj${objectives.length + 1}`;
      objectives.push({ id, x, y, type: cell.subtype });
    } else if (cell.type === 'enemy') {
      enemyCount++;
      enemies.push({
        id: `enemy${enemyCount}`,
        x,
        y,
        type: cell.subtype,
        objectiveId: null // se asigna abajo
      });
    }
  }

  // Asignar cada enemigo al objetivo más cercano (garantía: 1 tanque por objetivo)
  const assignedObjectives = new Set();
  for (const enemy of enemies) {
    let closest = null;
    let minDist = Infinity;
    for (const obj of objectives) {
      if (assignedObjectives.has(obj.id)) continue;
      const dist = Math.abs(obj.x - enemy.x) + Math.abs(obj.y - enemy.y);
      if (dist < minDist) { minDist = dist; closest = obj; }
    }
    if (closest) {
      enemy.objectiveId = closest.id;
      assignedObjectives.add(closest.id);
    } else if (objectives.length > 0) {
      // fallback: asignar al primero libre o al primero si todos están ocupados
      enemy.objectiveId = objectives[0].id;
    }
  }

  const levelNames = ['Nivel 1', 'Nivel 2', 'Nivel 3'];
  return {
    id: levelIndex + 1,
    name: levelNames[levelIndex] ?? `Nivel ${levelIndex + 1}`,
    playerStart,
    walls,
    objectives,
    enemies,
    customized: true   // evita que regenerateLevel lo sobreescriba
  };
}

/**
 * Convierte un nivel de BASE_LEVELS al formato de celdas del editor.
 */
export function levelToEditorState(level) {
  const cells = {};

  for (const [x, y] of level.walls) {
    cells[`${x},${y}`] = { type: 'wall' };
  }

  cells[`${level.playerStart.x},${level.playerStart.y}`] = { type: 'player' };

  for (const obj of level.objectives) {
    cells[`${obj.x},${obj.y}`] = { type: 'objective', subtype: obj.type };
  }

  for (const enemy of level.enemies) {
    cells[`${enemy.x},${enemy.y}`] = { type: 'enemy', subtype: enemy.type };
  }

  return cells;
}

/**
 * Aplica el nivel editado a BASE_LEVELS para que el juego lo use.
 */
export function applyEditorLevel(levelIndex, cells) {
  const level = editorStateToLevel(cells, levelIndex);
  BASE_LEVELS[levelIndex] = level;
  return level;
}