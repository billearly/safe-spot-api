export type Tile = {
  row: number;
  column: number;
  isSafe?: boolean;
  isRevealed: boolean;
  displayNum?: number;
};

export type GameBoard = Tile[][];

export type Move = {
  tile: Tile;
  client: ClientInfo;
};

export type Game = {
  displayId: string;
  board: GameBoard;
  isStarted: boolean;
  creator: ClientInfo;
  player1: ClientInfo;
  player2: ClientInfo | undefined;
  moves: Move[];
};

export type GameState = {
  id: string;
  board: GameBoard;
  currentTurn: string;
};

export type ClientInfo = {
  privateId: string;
  publicId: string;
  socketId: string;
};

// This needs to be the same shape as the API Gateway routed message
export type Payload = {
  action: ClientAction;
};

export type CreateGamePayload = Payload & {
  data: {
    client: ClientInfo;
  };
};

export type JoinGamePayload = Payload & {
  data: {
    gameId: string;
    client: ClientInfo;
  };
};

export type MakeMovePayload = Payload & {
  data: {
    gameId: string;
    client: ClientInfo;
    tile: Tile;
  };
};

export type NewConnectionPayload = Payload & {
  requestContext: {
    connectionId: string;
  };
};

export enum ClientAction {
  CONNECT = "connect",
  CREATE_GAME = "createGame",
  JOIN_GAME = "joinGame",
  MAKE_MOVE = "makeMove",
}

export enum ServerAction {
  CONNECTED = "connected",
  GAME_CREATED = "gameCreated",
  GAME_STARTED = "gameStarted",
  MOVE_MADE = "moveMade",
}
