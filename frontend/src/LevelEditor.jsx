import React, { useState, useCallback } from 'react';
import { GRID, BASE_LEVELS } from './game/levels/defaultLevels.js';
import { levelToEditorState, applyEditorLevel } from './game/levels/levelEditor.js';
import { regenerateLevel } from './game/levels/defaultLevels.js';

const { cols, rows } = GRID;
const CELL = 36; // px por celda en el editor

// ── Paleta de herramientas ──────────────────────────────────────────
const TOOLS = [
  { id: 'wall',                          label: '🧱 Muro',           color: '#475569' },
  { id: 'player',                        label: '🟦 Jugador',        color: '#3b82f6' },
  { id: 'objective:factory',             label: '🏭 Factory',        color: '#f59e0b' },
  { id: 'objective:refinery',            label: '🛢 Refinería',      color: '#f97316' },
  { id: 'objective:antenna',             label: '📡 Antena',         color: '#8b5cf6' },
  { id: 'enemy:rapido',                  label: '⚡ Enemigo rápido', color: '#22c55e' },
  { id: 'enemy:pesado',                  label: '🔴 Enemigo pesado', color: '#ef4444' },
  { id: 'enemy:francotirador',           label: '🎯 Francotirador',  color: '#06b6d4' },
  { id: 'erase',                         label: '🧹 Borrador',       color: '#94a3b8' },
];

// Color de cada tipo de celda para pintarla en la grilla
function cellColor(cell) {
  if (!cell) return null;
  const t = cell.type;
  if (t === 'wall')      return '#475569';
  if (t === 'player')    return '#3b82f6';
  if (t === 'objective') {
    if (cell.subtype === 'factory')  return '#f59e0b';
    if (cell.subtype === 'refinery') return '#f97316';
    if (cell.subtype === 'antenna')  return '#8b5cf6';
  }
  if (t === 'enemy') {
    if (cell.subtype === 'rapido')        return '#22c55e';
    if (cell.subtype === 'pesado')        return '#ef4444';
    if (cell.subtype === 'francotirador') return '#06b6d4';
  }
  return '#e2e8f0';
}

function cellEmoji(cell) {
  if (!cell) return '';
  if (cell.type === 'player') return '🟦';
  if (cell.type === 'objective') {
    if (cell.subtype === 'factory')  return '🏭';
    if (cell.subtype === 'refinery') return '🛢';
    if (cell.subtype === 'antenna')  return '📡';
  }
  if (cell.type === 'enemy') {
    if (cell.subtype === 'rapido')        return '⚡';
    if (cell.subtype === 'pesado')        return '🔴';
    if (cell.subtype === 'francotirador') return '🎯';
  }
  return '';
}

// ── Componente principal ────────────────────────────────────────────
export default function LevelEditor({ onClose }) {
  const [selectedLevel, setSelectedLevel] = useState(0);
  const [cells, setCells]   = useState(() => levelToEditorState(BASE_LEVELS[0]));
  const [tool, setTool]     = useState('wall');
  const [painting, setPainting] = useState(false);
  const [saved, setSaved]   = useState(false);

  // Cambia de nivel para editar (carga el nivel actual de BASE_LEVELS)
  function switchLevel(idx) {
    setSelectedLevel(idx);
    setCells(levelToEditorState(BASE_LEVELS[idx]));
    setSaved(false);
  }

  // Aplica la herramienta activa sobre la celda (x,y)
  const paintCell = useCallback((x, y) => {
    const key = `${x},${y}`;
    setCells(prev => {
      const next = { ...prev };
      if (tool === 'erase') {
        delete next[key];
        return next;
      }
      const [type, subtype] = tool.split(':');

      // Solo puede haber 1 jugador: borrar el anterior
      if (type === 'player') {
        for (const k of Object.keys(next)) {
          if (next[k].type === 'player') delete next[k];
        }
      }

      next[key] = subtype ? { type, subtype } : { type };
      return next;
    });
  }, [tool]);

  function handleMouseDown(x, y) {
    setPainting(true);
    paintCell(x, y);
  }

  function handleMouseEnter(x, y) {
    if (painting) paintCell(x, y);
  }

  function handleMouseUp() {
    setPainting(false);
  }

  // Guarda el nivel editado en BASE_LEVELS
  function saveLevel() {
    const level = applyEditorLevel(selectedLevel, cells);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  // Regenera aleatoriamente y carga en el editor
  function resetToRandom() {
    // Borra el flag customized forzando regeneración
    const { BASE_LEVELS } = window.__tankLevels__ ?? {};
    // Simplest way: llamar regenerateLevel que ya ignora customized si lo borramos
    import('./game/levels/defaultLevels.js').then(({ BASE_LEVELS, regenerateLevel }) => {
      delete BASE_LEVELS[selectedLevel].customized;
      const level = regenerateLevel(selectedLevel);
      setCells(levelToEditorState(level));
      setSaved(false);
    });
  }

  // Limpia la grilla dejando solo los muros del borde
  function clearGrid() {
    const borderCells = {};
    for (let x = 0; x < cols; x++) {
      borderCells[`${x},0`]        = { type: 'wall' };
      borderCells[`${x},${rows-1}`] = { type: 'wall' };
    }
    for (let y = 1; y < rows - 1; y++) {
      borderCells[`0,${y}`]        = { type: 'wall' };
      borderCells[`${cols-1},${y}`] = { type: 'wall' };
    }
    setCells(borderCells);
  }

  // Conteo de elementos para feedback visual
  const counts = Object.values(cells).reduce((acc, c) => {
    acc[c.type] = (acc[c.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="editor-overlay" onMouseUp={handleMouseUp}>
      {/* Header */}
      <div className="editor-header">
        <div>
          <h2>Editor de Niveles</h2>
          <p>Dibujá muros, colocá objetivos y enemigos, luego guardá el nivel.</p>
        </div>
        <button className="btn-close" onClick={onClose}>✕ Cerrar editor</button>
      </div>

      {/* Selector de nivel */}
      <div className="editor-level-tabs">
        {[0, 1, 2].map(i => (
          <button
            key={i}
            className={selectedLevel === i ? 'tab active' : 'tab'}
            onClick={() => switchLevel(i)}
          >
            Nivel {i + 1}
          </button>
        ))}
      </div>

      <div className="editor-body">
        {/* Paleta */}
        <aside className="editor-palette">
          <p className="palette-title">Herramienta activa</p>
          {TOOLS.map(t => (
            <button
              key={t.id}
              className={`palette-btn ${tool === t.id ? 'selected' : ''}`}
              style={{ '--tool-color': t.color }}
              onClick={() => setTool(t.id)}
            >
              {t.label}
            </button>
          ))}

          <hr />

          <div className="editor-counts">
            <p>🟦 Jugador: {counts.player ?? 0}</p>
            <p>🏭 Objetivos: {counts.objective ?? 0}</p>
            <p>⚡ Enemigos: {counts.enemy ?? 0}</p>
            <p>🧱 Muros: {counts.wall ?? 0}</p>
          </div>

          <hr />

          <button className="btn-clear" onClick={clearGrid}>🗑 Limpiar grilla</button>
          <button className="btn-random" onClick={resetToRandom}>🎲 Generar aleatorio</button>
          <button
            className={`btn-save ${saved ? 'saved' : ''}`}
            onClick={saveLevel}
          >
            {saved ? '✅ ¡Guardado!' : `💾 Guardar Nivel ${selectedLevel + 1}`}
          </button>
          {saved && (
            <p className="save-note">
              El juego usará este nivel la próxima vez que cargues Nivel {selectedLevel + 1}.
            </p>
          )}
        </aside>

        {/* Grilla */}
        <div className="editor-grid-wrap">
          <div
            className="editor-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
              gridTemplateRows: `repeat(${rows}, ${CELL}px)`,
              userSelect: 'none',
              cursor: 'crosshair'
            }}
          >
            {Array.from({ length: rows }, (_, y) =>
              Array.from({ length: cols }, (_, x) => {
                const key = `${x},${y}`;
                const cell = cells[key];
                const bg = cellColor(cell) ?? '#1e293b';
                const isBorder = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
                return (
                  <div
                    key={key}
                    onMouseDown={() => handleMouseDown(x, y)}
                    onMouseEnter={() => handleMouseEnter(x, y)}
                    style={{
                      width: CELL,
                      height: CELL,
                      background: bg,
                      border: isBorder
                        ? '1px solid #334155'
                        : '1px solid #334155',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: CELL * 0.52,
                      lineHeight: 1,
                      transition: 'background 0.05s'
                    }}
                  >
                    {cellEmoji(cell)}
                  </div>
                );
              })
            )}
          </div>
          <p className="editor-hint">
            Hacé clic o arrastrá para pintar · Usá el borrador para eliminar celdas
          </p>
        </div>
      </div>
    </div>
  );
}