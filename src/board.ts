import { GameBoard, Tile } from "./types";

export const instantiateSafeBoard = (
  rows: number,
  columns: number
): GameBoard => {
  const board: GameBoard = [];

  for (var row = 0; row < rows; row++) {
    // Insert new row
    board.push([]);

    for (var column = 0; column < columns; column++) {
      board[row][column] = {
        row,
        column,
        isSafe: true,
        isRevealed: false,
        displayNum: 0,
      };
    }
  }

  return board;
};

export const addBombsToBoard = (
  board: GameBoard,
  row: number,
  column: number,
  numBombs: number
): GameBoard => {
  const maxRow = board.length;
  const maxColumn = board[0].length;

  while (numBombs > 0) {
    const bombRow = Math.floor(Math.random() * maxRow);
    const bombColumn = Math.floor(Math.random() * maxColumn);

    // if the spot isn't already a bomb
    // and its not the clicked spot or any of its neighbors
    if (
      board[bombRow][bombColumn].isSafe &&
      (Math.abs(bombRow - row) > 1 || Math.abs(bombColumn - column) > 1)
    ) {
      board[bombRow][bombColumn].isSafe = false;
      numBombs -= 1;
    } else {
      // try again
      continue;
    }
  }

  return board;
};

export const generateSanitizedBoard = (board: GameBoard): GameBoard => {
  // Hacky clone
  const sanitizedBoard: GameBoard = JSON.parse(JSON.stringify(board));

  for (let row = 0; row < sanitizedBoard.length; row++) {
    for (let column = 0; column < sanitizedBoard[0].length; column++) {
      const spot = sanitizedBoard[row][column];

      if (!spot.isRevealed) {
        spot.displayNum = undefined;
        spot.isSafe = undefined;
      }
    }
  }

  return sanitizedBoard;
};

export const calculateDisplayNums = (board: GameBoard): GameBoard => {
  for (var row = 0; row < board.length; row++) {
    for (var column = 0; column < board[0].length; column++) {
      board[row][column].displayNum = calculateDisplayNum(board, row, column);
    }
  }

  return board;
};

export const updateTileAndNeighbors = (
  board: GameBoard,
  row: number,
  column: number
): GameBoard => {
  // First off, does this tile exist
  if (
    row < 0 ||
    column < 0 ||
    row >= board.length ||
    column >= board[0].length
  ) {
    return board;
  }

  const clickedTile = board[row][column];

  // Don't do anything if this spot has already been revealed
  if (clickedTile.isRevealed) {
    return board;
  }

  // does this belong in here? end game is ill defined right now
  if (!board[row][column].isSafe) {
    alert("you clicked on a bomb");
    return board;
  }

  clickedTile.isRevealed = true;

  // update the board for each neighbor if this is a 0
  if (clickedTile.displayNum === 0) {
    board = updateTileAndNeighbors(board, row - 1, column);
    board = updateTileAndNeighbors(board, row - 1, column + 1);
    board = updateTileAndNeighbors(board, row - 1, column - 1);
    board = updateTileAndNeighbors(board, row + 1, column);
    board = updateTileAndNeighbors(board, row + 1, column + 1);
    board = updateTileAndNeighbors(board, row + 1, column - 1);
    board = updateTileAndNeighbors(board, row, column + 1);
    board = updateTileAndNeighbors(board, row, column - 1);
  }

  return board;
};

export const isBombSpot = (
  board: GameBoard,
  row: number,
  column: number
): boolean => {
  return !board[row][column].isSafe;
};

export const getBombSpots = (board: GameBoard): Tile[] => {
  const bombSpots: Tile[] = [];

  for (var row = 0; row < board.length; row++) {
    for (var column = 0; column < board[0].length; column++) {
      const spot = board[row][column];

      if (!spot.isSafe) {
        bombSpots.push(spot);
      }
    }
  }

  return bombSpots;
};

export const revealBombSpots = (
  board: GameBoard,
  bombSpots: Tile[]
): GameBoard => {
  console.log(bombSpots.length);

  bombSpots.forEach((bomb) => {
    board[bomb.row][bomb.column].isRevealed = true;
  });

  return board;
};

export const getNumSafeSpotsLeft = (board: GameBoard): number => {
  let numSpots = 0;

  for (let row = 0; row < board.length; row++) {
    for (let column = 0; column < board[0].length; column++) {
      const spot = board[row][column];

      if (spot.isSafe && !spot.isRevealed) {
        numSpots++;
      }
    }
  }

  return numSpots;
};

const calculateDisplayNum = (
  board: GameBoard,
  row: number,
  column: number
): number => {
  // Is this tile a bomb
  if (!board[row][column].isSafe) {
    return -1;
  }

  // Check all directions
  return (
    getNeighborBombCount(board, row - 1, column) + //N
    getNeighborBombCount(board, row - 1, column + 1) + // NE
    getNeighborBombCount(board, row, column + 1) + // E
    getNeighborBombCount(board, row + 1, column + 1) + //SE
    getNeighborBombCount(board, row + 1, column) + //S
    getNeighborBombCount(board, row + 1, column - 1) + //SW
    getNeighborBombCount(board, row, column - 1) + //W
    getNeighborBombCount(board, row - 1, column - 1) //NW
  );
};

const getNeighborBombCount = (
  board: GameBoard,
  neighborRow: number,
  neighborColumn: number
): number => {
  const neighborExists =
    neighborRow >= 0 &&
    neighborRow < board.length &&
    neighborColumn >= 0 &&
    neighborColumn < board[0].length;

  if (!neighborExists) {
    return 0;
  }

  return board[neighborRow][neighborColumn].isSafe ? 0 : 1;
};
