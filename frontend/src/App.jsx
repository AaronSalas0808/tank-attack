import React, { useEffect, useRef, useState } from 'react';
import Phaser from 'phaser';
import TankAttackScene from './game/scenes/TankAttackScene.js';
import { GRID } from './game/levels/defaultLevels.js';

const initialState = {
  level: 1,
  lives: 3,
  playerLife: 100,
  score: 0,
  prologOnline: false,
  message: 'Presiona Inicio para jugar.',
  running: false,
  finished: false
};

export default function App() {
  const containerRef = useRef(null);
  const phaserRef = useRef(null);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    const scene = new TankAttackScene({ onStateChange: setState });

    const config = {
      type: Phaser.AUTO,
      parent: containerRef.current,
      width: GRID.cols * GRID.cell,
      height: GRID.rows * GRID.cell + 50,
      backgroundColor: '#0f172a',
      scene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      render: {
        antialias: true,
        pixelArt: false
      }
    };

    phaserRef.current = new Phaser.Game(config);

    return () => {
      phaserRef.current?.destroy(true);
      phaserRef.current = null;
    };
  }, []);

  const getScene = () => phaserRef.current?.scene.getScene('TankAttackScene');

  return (
    <main className="page">
      <section className="shell">
        <header className="topbar">
          <div>
            <h1>Tank-Attack</h1>
            <p>React para el panel · Phaser para la interfaz gráfica · SWI-Prolog como cerebro de la IA enemiga</p>
          </div>
          <div className="actions">
            <button onClick={() => getScene()?.startGame()}>Inicio</button>
            <button onClick={() => getScene()?.resetGame()}>Reiniciar</button>
          </div>
        </header>

        <section className="hud">
          <article><span>Nivel</span><strong>{state.level}/3</strong></article>
          <article><span>Vidas</span><strong>{state.lives}</strong></article>
          <article><span>Vida jugador</span><strong>{state.playerLife}</strong></article>
          <article><span>Puntaje</span><strong>{state.score}</strong></article>
          <article className={state.prologOnline ? 'online' : 'offline'}>
            <span>Prolog</span><strong>{state.prologOnline ? 'Conectado' : 'Desconectado'}</strong>
          </article>
        </section>

        <div className="game-frame">
          <div ref={containerRef} className="game-container" />
        </div>

        <div className="console">
          <span>Estado:</span> {state.message}
        </div>

        <p className="help">
          <strong>Controles:</strong> flechas o WASD para moverse · espacio para disparar. Los enemigos consultan a Prolog cada cierto tiempo para decidir si se mueven, disparan o defienden el objetivo.
        </p>
      </section>
    </main>
  );
}
