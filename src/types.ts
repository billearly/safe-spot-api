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

// This is the object that clients send to API Gateway
export type APIGatewayPayload = {
  action: ClientAction;
};

export type CreateGameAPIGatewayPayload = APIGatewayPayload & {
  data: {
    client: ClientInfo;
  };
};

export type JoinGameAPIGatewayPayload = APIGatewayPayload & {
  data: {
    gameId: string;
    client: ClientInfo;
  };
};

export type MakeMoveAPIGatewayPayload = APIGatewayPayload & {
  data: {
    gameId: string;
    client: ClientInfo;
    tile: Tile;
  };
};

export type NewConnectionAPIGatewayPayload = APIGatewayPayload & {
  requestContext: {
    connectionId: string;
  };
};

// This is the object that API Gateway sends to the Lambda
export type LambdaEvent = {
  requestContext: {
    domain: string;
    stage: string;
    connectionId: string;
  };
  body?: string;
};

// The third category is objects sent back to clients

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
