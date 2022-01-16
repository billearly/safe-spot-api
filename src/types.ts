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
  player: string;
};

export type Game = {
  id: string;
  board: GameBoard;
  isStarted: boolean;
  creator: string;
  player1: string;
  player2: string | undefined;
  moves: Move[];
};
