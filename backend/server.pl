:- use_module(library(http/thread_httpd)).
:- use_module(library(http/http_dispatch)).
:- use_module(library(http/http_json)).
:- use_module(library(http/http_cors)).
:- use_module(library(lists)).

:- dynamic muro/2.
:- dynamic limite/2.

:- set_setting(http:cors, [*]).
:- http_handler(root(ia_enemigo), ia_enemigo, []).
:- http_handler(root(health), health, [method(get)]).

iniciar :-
    http_server(http_dispatch, [port(8080)]),
    writeln('Servidor Prolog activo en http://localhost:8080').

health(_Request) :-
    reply_json_dict(_{status: ok, servicio: 'tank-attack-prolog'}).

ia_enemigo(Request) :-
    option(method(options), Request),
    !,
    cors_enable(Request, [methods([post, options])]),
    format('~n').

ia_enemigo(Request) :-
    cors_enable(Request, [methods([post, options])]),
    http_read_json_dict(Request, Datos),
    cargar_hechos(Datos),
    Enemy = Datos.enemy,
    Player = Datos.player,
    Objective = Datos.objective,
    decidir_accion(Enemy, Player, Objective, Accion, Direccion, Ruta, Motivo),
    reply_json_dict(_{
        accion: Accion,
        direccion: Direccion,
        ruta: Ruta,
        motivo: Motivo
    }).

cargar_hechos(Datos) :-
    retractall(muro(_, _)),
    retractall(limite(_, _)),
    Cols = Datos.grid.cols,
    Rows = Datos.grid.rows,
    assertz(limite(Cols, Rows)),
    forall(member([X, Y], Datos.walls), assertz(muro(X, Y))).

% ----------------------------
% Decisiones tácticas de la IA
% ----------------------------

% 1. Si el jugador está cerca, alineado y sin muro en medio, dispara.
decidir_accion(Enemy, Player, _Objective, disparar, Direccion, [], 'Jugador cerca y con línea de visión. Disparar.') :-
    cerca(Enemy, Player),
    linea_vision(Enemy, Player, Direccion),
    !.

% 2. Si tiene poca vida, retrocede hacia su objetivo defendido.
decidir_accion(Enemy, _Player, Objective, mover, Direccion, RutaDict, 'Vida baja. Retroceder para defender objetivo.') :-
    Enemy.life =< 35,
    buscar_ruta(Enemy.x, Enemy.y, Objective.x, Objective.y, Ruta),
    ruta_a_dict(Ruta, RutaDict),
    direccion_inicial(Ruta, Direccion),
    !.

% 3. Si no puede disparar pero el jugador está cerca, busca ruta para emboscar/acercarse.
decidir_accion(Enemy, Player, _Objective, mover, Direccion, RutaDict, 'Jugador cercano sin línea directa. Buscar ruta de ataque.') :-
    cerca(Enemy, Player),
    buscar_ruta(Enemy.x, Enemy.y, Player.x, Player.y, Ruta),
    ruta_a_dict(Ruta, RutaDict),
    direccion_inicial(Ruta, Direccion),
    !.

% 4. Si está lejos de su objetivo, regresa a defenderlo.
decidir_accion(Enemy, _Player, Objective, mover, Direccion, RutaDict, 'Alejado del objetivo. Regresar a defender.') :-
    distancia(Enemy.x, Enemy.y, Objective.x, Objective.y, D),
    D > 4,
    buscar_ruta(Enemy.x, Enemy.y, Objective.x, Objective.y, Ruta),
    ruta_a_dict(Ruta, RutaDict),
    direccion_inicial(Ruta, Direccion),
    !.

% 5. Si no hay amenaza, patrulla alrededor del objetivo.
decidir_accion(Enemy, _Player, Objective, mover, Direccion, RutaDict, 'Patrullar cerca del objetivo.') :-
    casilla_patrulla(Objective.x, Objective.y, TX, TY),
    buscar_ruta(Enemy.x, Enemy.y, TX, TY, Ruta),
    ruta_a_dict(Ruta, RutaDict),
    direccion_inicial(Ruta, Direccion),
    !.

% 6. Fallback.
decidir_accion(_Enemy, _Player, _Objective, esperar, down, [], 'Sin movimiento disponible.').

cerca(Enemy, Player) :-
    distancia(Enemy.x, Enemy.y, Player.x, Player.y, D),
    D =< Enemy.vision.

distancia(X1, Y1, X2, Y2, D) :-
    D is abs(X1 - X2) + abs(Y1 - Y2).

linea_vision(Enemy, Player, right) :-
    Enemy.y =:= Player.y,
    Player.x > Enemy.x,
    sin_muro_horizontal(Enemy.x, Player.x, Enemy.y).
linea_vision(Enemy, Player, left) :-
    Enemy.y =:= Player.y,
    Player.x < Enemy.x,
    sin_muro_horizontal(Player.x, Enemy.x, Enemy.y).
linea_vision(Enemy, Player, down) :-
    Enemy.x =:= Player.x,
    Player.y > Enemy.y,
    sin_muro_vertical(Enemy.y, Player.y, Enemy.x).
linea_vision(Enemy, Player, up) :-
    Enemy.x =:= Player.x,
    Player.y < Enemy.y,
    sin_muro_vertical(Player.y, Enemy.y, Enemy.x).

sin_muro_horizontal(X1, X2, Y) :-
    A is X1 + 1,
    B is X2 - 1,
    forall(between(A, B, X), \+ muro(X, Y)).

sin_muro_vertical(Y1, Y2, X) :-
    A is Y1 + 1,
    B is Y2 - 1,
    forall(between(A, B, Y), \+ muro(X, Y)).

casilla_patrulla(OX, OY, TX, TY) :-
    member([DX, DY], [[1,0],[-1,0],[0,1],[0,-1],[2,0],[-2,0],[0,2],[0,-2]]),
    TX is OX + DX,
    TY is OY + DY,
    valida(TX, TY),
    !.

% ----------------------------
% DFS con heurística Manhattan
% ----------------------------

buscar_ruta(SX, SY, GX, GY, Ruta) :-
    dfs_h([[SX, SY]], GX, GY, RutaInvertida),
    reverse(RutaInvertida, Ruta),
    !.

buscar_ruta(SX, SY, _GX, _GY, [[SX, SY]]).

dfs_h([[GX, GY] | Camino], GX, GY, [[GX, GY] | Camino]).

dfs_h([[X, Y] | Camino], GX, GY, Ruta) :-
    vecinos_ordenados(X, Y, GX, GY, Vecinos),
    member([NX, NY], Vecinos),
    \+ member([NX, NY], Camino),
    dfs_h([[NX, NY], [X, Y] | Camino], GX, GY, Ruta).

vecinos_ordenados(X, Y, GX, GY, VecinosOrdenados) :-
    findall([H, [NX, NY]], (
        movimiento(X, Y, NX, NY),
        heuristica(NX, NY, GX, GY, H)
    ), Pares),
    sort(Pares, Ordenados),
    findall(Pos, member([_, Pos], Ordenados), VecinosOrdenados).

movimiento(X, Y, NX, Y) :- NX is X + 1, valida(NX, Y).
movimiento(X, Y, NX, Y) :- NX is X - 1, valida(NX, Y).
movimiento(X, Y, X, NY) :- NY is Y + 1, valida(X, NY).
movimiento(X, Y, X, NY) :- NY is Y - 1, valida(X, NY).

valida(X, Y) :-
    limite(Cols, Rows),
    X >= 0, Y >= 0,
    X < Cols, Y < Rows,
    \+ muro(X, Y).

heuristica(X, Y, GX, GY, H) :-
    H is abs(X - GX) + abs(Y - GY).

ruta_a_dict([], []).
ruta_a_dict([[X, Y] | Resto], [_{x:X, y:Y} | RestoDict]) :-
    ruta_a_dict(Resto, RestoDict).

direccion_inicial([[X1, _Y1], [X2, _Y2] | _], right) :- X2 > X1, !.
direccion_inicial([[X1, _Y1], [X2, _Y2] | _], left) :- X2 < X1, !.
direccion_inicial([[_X1, Y1], [_X2, Y2] | _], down) :- Y2 > Y1, !.
direccion_inicial([[_X1, Y1], [_X2, Y2] | _], up) :- Y2 < Y1, !.
direccion_inicial(_, down).
