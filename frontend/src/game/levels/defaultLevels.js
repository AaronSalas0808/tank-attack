export const GRID = { cols: 20, rows: 13, cell: 40 };

// ─────────────────────────────────────────────
//  Utilidades de aleatoriedad
// ─────────────────────────────────────────────

function rnd(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─────────────────────────────────────────────
//  Muros del borde (siempre fijos)
// ─────────────────────────────────────────────

function borderWalls() {
  const walls = [];
  const { cols, rows } = GRID;
  for (let x = 0; x < cols; x++) {
    walls.push([x, 0]);
    walls.push([x, rows - 1]);
  }
  for (let y = 1; y < rows - 1; y++) {
    walls.push([0, y]);
    walls.push([cols - 1, y]);
  }
  return walls;
}

// ─────────────────────────────────────────────
//  BFS: verifica que todos los puntos destino
//  sean alcanzables desde el origen en el grid
// ─────────────────────────────────────────────

function isConnected(wallSet, start, targets) {
  const { cols, rows } = GRID;
  const key = (x, y) => `${x},${y}`;
  const visited = new Set();
  const queue = [[start.x, start.y]];
  visited.add(key(start.x, start.y));

  while (queue.length) {
    const [cx, cy] = queue.shift();
    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      if (wallSet.has(k)) continue;
      visited.add(k);
      queue.push([nx, ny]);
    }
  }

  return targets.every(t => visited.has(key(t.x, t.y)));
}

// ─────────────────────────────────────────────
//  Zona de seguridad: celdas que NO pueden
//  ser muro (spawn, objetivos, enemigos, buffer)
// ─────────────────────────────────────────────

function buildSafeSet(playerStart, objectives, enemies) {
  const safe = new Set();
  const key = (x, y) => `${x},${y}`;

  // Buffer 2 celdas alrededor del spawn del jugador
  for (let dx = -2; dx <= 2; dx++) {
    for (let dy = -2; dy <= 2; dy++) {
      safe.add(key(playerStart.x + dx, playerStart.y + dy));
    }
  }

  // Objetivos y celdas adyacentes
  for (const o of objectives) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        safe.add(key(o.x + dx, o.y + dy));
      }
    }
  }

  // Enemigos
  for (const e of enemies) {
    safe.add(key(e.x, e.y));
  }

  return safe;
}

// ─────────────────────────────────────────────
//  Genera muros interiores aleatorios
//  density: fracción de celdas interiores a bloquear
// ─────────────────────────────────────────────

function generateInteriorWalls(playerStart, objectives, enemies, density = 0.14) {
  const { cols, rows } = GRID;
  const borderSet = new Set(borderWalls().map(([x, y]) => `${x},${y}`));
  const safeSet = buildSafeSet(playerStart, objectives, enemies);

  // Celdas interiores candidatas
  const candidates = [];
  for (let y = 1; y < rows - 1; y++) {
    for (let x = 1; x < cols - 1; x++) {
      const k = `${x},${y}`;
      if (!borderSet.has(k) && !safeSet.has(k)) {
        candidates.push([x, y]);
      }
    }
  }

  const maxWalls = Math.floor(candidates.length * density);
  const shuffled = shuffle(candidates);
  const chosen = shuffled.slice(0, maxWalls);

  // Validar conectividad con BFS
  const wallSet = new Set([
    ...borderWalls().map(([x, y]) => `${x},${y}`),
    ...chosen.map(([x, y]) => `${x},${y}`)
  ]);

  // Si no hay conectividad, quitar muros problemáticos uno a uno
  const targets = [...objectives, ...enemies, playerStart];
  const finalWalls = [...chosen];

  for (let i = finalWalls.length - 1; i >= 0; i--) {
    const testSet = new Set([
      ...borderWalls().map(([x, y]) => `${x},${y}`),
      ...finalWalls.map(([x, y]) => `${x},${y}`)
    ]);
    if (!isConnected(testSet, playerStart, targets)) {
      finalWalls.splice(i, 1);
    }
  }

  return finalWalls;
}

// ─────────────────────────────────────────────
//  Elige posición aleatoria libre en una zona
//  zone: { xMin, xMax, yMin, yMax }
// ─────────────────────────────────────────────

function randomFreePos(zone, occupied, minDist = 2) {
  const { xMin, xMax, yMin, yMax } = zone;
  const candidates = [];

  for (let y = yMin; y <= yMax; y++) {
    for (let x = xMin; x <= xMax; x++) {
      const far = occupied.every(o => Math.abs(o.x - x) + Math.abs(o.y - y) >= minDist);
      if (far) candidates.push({ x, y });
    }
  }

  if (!candidates.length) return null;
  return pick(candidates);
}

// ─────────────────────────────────────────────
//  Posición adyacente libre para el enemigo
// ─────────────────────────────────────────────

function adjacentFree(obj, occupied) {
  const dirs = shuffle([[1,0],[-1,0],[0,1],[0,-1]]);
  const { cols, rows } = GRID;
  for (const [dx, dy] of dirs) {
    const nx = obj.x + dx;
    const ny = obj.y + dy;
    if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
    const free = occupied.every(o => !(o.x === nx && o.y === ny));
    if (free) return { x: nx, y: ny };
  }
  return { x: obj.x, y: obj.y }; // fallback: misma celda
}

// ─────────────────────────────────────────────
//  Configuraciones por nivel
// ─────────────────────────────────────────────

const LEVEL_CONFIGS = [
  {
    id: 1,
    name: 'Nivel 1',
    playerStart: { x: 1, y: 11 },
    objectiveCount: 2,
    objectiveTypes: ['factory', 'refinery'],
    // zona donde aparecen los objetivos (columnas derechas)
    objectiveZone: { xMin: 13, xMax: 17, yMin: 1, yMax: 11 },
    density: 0.13
  },
  {
    id: 2,
    name: 'Nivel 2',
    playerStart: { x: 1, y: 1 },
    objectiveCount: 3,
    objectiveTypes: ['factory', 'refinery', 'antenna'],
    objectiveZone: { xMin: 11, xMax: 17, yMin: 1, yMax: 11 },
    density: 0.15
  },
  {
    id: 3,
    name: 'Nivel 3',
    playerStart: { x: 10, y: 11 },
    objectiveCount: 4,
    objectiveTypes: ['factory', 'refinery', 'antenna', 'factory'],
    // 4 esquinas del mapa
    objectiveZones: [
      { xMin: 2,  xMax: 5,  yMin: 1, yMax: 4  },
      { xMin: 14, xMax: 17, yMin: 1, yMax: 4  },
      { xMin: 2,  xMax: 5,  yMin: 8, yMax: 11 },
      { xMin: 14, xMax: 17, yMin: 8, yMax: 11 }
    ],
    density: 0.16
  }
];

const TANK_TYPES = ['rapido', 'pesado', 'francotirador'];

// ─────────────────────────────────────────────
//  Genera un nivel completo con aleatoriedad
// ─────────────────────────────────────────────

function generateLevel(cfg) {
  const { id, name, playerStart, density } = cfg;
  const objTypes = shuffle([...cfg.objectiveTypes]);

  // 1. Colocar objetivos en posiciones aleatorias
  const objectives = [];
  const occupied = [playerStart];

  for (let i = 0; i < cfg.objectiveCount; i++) {
    // Nivel 3 usa zonas por esquina; niveles 1 y 2 usan una zona general
    const zone = cfg.objectiveZones ? cfg.objectiveZones[i] : cfg.objectiveZone;
    const pos = randomFreePos(zone, occupied, 3);
    if (!pos) return null; // fallo, reintentar

    const obj = { id: `obj${i + 1}`, x: pos.x, y: pos.y, type: objTypes[i] };
    objectives.push(obj);
    occupied.push(pos);
  }

  // 2. Colocar enemigos adyacentes a su objetivo (tipo aleatorio)
  // Garantía: solo 1 tanque por objetivo
  const enemies = [];
  for (const obj of objectives) {
    const ePos = adjacentFree(obj, [...occupied, ...enemies]);
    const type = pick(TANK_TYPES);
    const idx = objectives.indexOf(obj) + 1;
    enemies.push({ id: `enemy${idx}`, x: ePos.x, y: ePos.y, type, objectiveId: obj.id });
    occupied.push(ePos);
  }

  // 3. Generar muros interiores aleatorios con validación BFS
  const interiorWalls = generateInteriorWalls(playerStart, objectives, enemies, density);

  // 4. Unir muros borde + interiores
  const allWalls = [...borderWalls(), ...interiorWalls];

  // 5. Verificación final de conectividad
  const wallSet = new Set(allWalls.map(([x, y]) => `${x},${y}`));
  const targets = [...objectives, ...enemies];
  if (!isConnected(wallSet, playerStart, targets)) return null;

  return {
    id,
    name,
    playerStart,
    walls: allWalls,
    objectives,
    enemies
  };
}

// ─────────────────────────────────────────────
//  Genera los 3 niveles con reintentos
// ─────────────────────────────────────────────

function buildLevels() {
  const levels = [];
  for (const cfg of LEVEL_CONFIGS) {
    let level = null;
    let attempts = 0;
    while (!level && attempts < 30) {
      level = generateLevel(cfg);
      attempts++;
    }
    if (!level) {
      // Fallback de emergencia: nivel mínimo sin muros interiores
      console.warn(`Nivel ${cfg.id}: se usó fallback tras 30 intentos`);
      const objTypes = [...cfg.objectiveTypes];
      const objectives = objTypes.map((type, i) => {
        const zone = cfg.objectiveZones ? cfg.objectiveZones[i] : cfg.objectiveZone;
        return { id: `obj${i+1}`, x: zone.xMin + 1, y: zone.yMin + 1, type };
      });
      const enemies = objectives.map((obj, i) => ({
        id: `enemy${i+1}`, x: obj.x + 1, y: obj.y, type: pick(TANK_TYPES), objectiveId: obj.id
      }));
      level = {
        id: cfg.id,
        name: cfg.name,
        playerStart: cfg.playerStart,
        walls: borderWalls(),
        objectives,
        enemies
      };
    }
    levels.push(level);
  }
  return levels;
}

// BASE_LEVELS se regenera cada vez que se importa el módulo
// (es decir, cada vez que se recarga/reinicia el juego)
export const BASE_LEVELS = buildLevels();

// ─────────────────────────────────────────────
//  Función pública para regenerar un nivel
//  específico (usada por GameManager)
// ─────────────────────────────────────────────

export function regenerateLevel(index) {
  const cfg = LEVEL_CONFIGS[index];
  if (!cfg) return BASE_LEVELS[index];

  // Si el nivel fue editado manualmente, respetarlo sin regenerar
  if (BASE_LEVELS[index]?.customized) return BASE_LEVELS[index];

  let level = null;
  let attempts = 0;
  while (!level && attempts < 30) {
    level = generateLevel(cfg);
    attempts++;
  }

  if (level) {
    BASE_LEVELS[index] = level;
    return level;
  }
  return BASE_LEVELS[index];
}