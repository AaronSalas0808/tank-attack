# Tank-Attack React + Phaser + Prolog

Proyecto base para la Segunda Tarea Programada de Lenguajes de Programación.

## Arquitectura

- **React**: panel de control, botones y estado general.
- **Phaser**: interfaz gráfica del juego, tablero, tanques, muros, balas y objetivos.
- **SWI-Prolog**: cerebro lógico de la IA enemiga.
- **HTTP + JSON**: comunicación entre frontend y backend.

## Requisitos

- Node.js LTS
- npm
- SWI-Prolog
- Visual Studio Code recomendado

## Ejecutar backend Prolog

Abrir una terminal:

```bash
cd backend
swipl server.pl
```

Dentro de SWI-Prolog ejecutar:

```prolog
iniciar.
```

Debe mostrarse:

```txt
Servidor Prolog activo en http://localhost:8080
```

Prueba rápida:

```txt
http://localhost:8080/health
```

## Ejecutar frontend

Abrir otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir la URL que indique Vite, normalmente:

```txt
http://localhost:5173/
```

## Controles

- Flechas o WASD: mover tanque del jugador.
- Espacio: disparar.
- Inicio: iniciar el juego.
- Reiniciar: volver al nivel 1.

## Qué hace Prolog

Prolog recibe el estado del juego y decide la acción de cada tanque enemigo:

- disparar si el jugador está cerca y alineado;
- moverse hacia el jugador;
- defender el objetivo asignado;
- calcular ruta con DFS usando heurística Manhattan.

## Estructura principal

```txt
frontend/
  src/
    App.jsx
    styles.css
    game/
      GameManager.js
      scenes/TankAttackScene.js
      classes/
      levels/defaultLevels.js
      services/PrologService.js
backend/
  server.pl
docs/
  diagrama-clases.txt
```


## Ajustes de jugabilidad

- Movimiento visual suavizado en Phaser mediante interpolación entre celdas.
- Balas más lentas: avanzan por intervalos, no en cada frame.
- Los objetivos/estructuras primarias ahora resisten 3 impactos antes de destruirse.
- La barra y el contador sobre cada estructura muestran su resistencia restante.
