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
  id: string;
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
};
