import { customAlphabet } from "nanoid";
import {
  addBombsToBoard,
  calculateDisplayNums,
  generateSanitizedBoard,
  instantiateSafeBoard,
  isBombSpot,
  updateTileAndNeighbors,
} from "./board";
import { emit } from "./emitter";
import { getGame, saveGame } from "./persistence";
import {
  CreateGamePayload,
  JoinGamePayload,
  Game,
  ServerAction,
  MakeMovePayload,
  ClientInfo,
  Tile,
  GameBoard,
} from "./types";

// TODO: This file will probs be broken out into their own function files.
// And the game specific functions (isLegalMove, etc) can stay in here
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);
const rows = 10;
const columns = 15;
const bombPercentage = 18;
const numBombs = Math.floor(rows * columns * (bombPercentage / 100));

export const createGame = (payload: CreateGamePayload) => {
  const { client } = payload.data;

  let gameCreated = false;
  let gameId: string;
  let newGame: Game;

  // Now that this involves persistence the loop seems ill advised
  // But really how many times would it realistically run?
  while (!gameCreated) {
    gameId = nanoid();

    const existingGame = getGame(gameId);

    if (!existingGame) {
      const gameBoard = instantiateSafeBoard(rows, columns);

      newGame = {
        id: gameId,
        board: gameBoard,
        isStarted: false,
        creator: client,
        player1: client,
        player2: undefined,
        moves: [],
      };

      saveGame(newGame);

      gameCreated = true;
    }
  }

  emit({
    to: [newGame.creator.socketId],
    payload: {
      action: ServerAction.GAME_CREATED,
      data: {
        gameId,
      },
    },
  });
};

export const joinGame = (payload: JoinGamePayload) => {
  const { gameId, client } = payload.data;

  const game = getGame(gameId);

  if (!game) {
    // Throw error? Emit a specific 'NoGameFound' message?
  } else {
    const updatedGame: Game = {
      ...game,
      isStarted: true,
      player2: client,
    };

    saveGame(updatedGame);

    const sanitizedBoard = generateSanitizedBoard(updatedGame.board);

    emit({
      to: [updatedGame.player1.socketId, updatedGame.player2.socketId],
      payload: {
        action: ServerAction.GAME_STARTED, // For now joining a game instantly starts it
        data: {
          game: {
            id: gameId,
            board: sanitizedBoard,
            currentTurn: updatedGame.creator.publicId,
          },
        },
      },
    });
  }

  // Also need to handle trying to join a game that you are already in
};

export const makeMove = (payload: MakeMovePayload) => {
  const { gameId, client, tile } = payload.data;

  const game = getGame(gameId);
  const moveStatus = getMoveStatus(game, tile, client);

  if (moveStatus.status === MoveStatus.ILLEGAL) {
    console.log(`Illegal Move: ${moveStatus.message}`);
    return;
  }

  // Is this clone necessary?
  let updatedBoard: GameBoard = JSON.parse(JSON.stringify(game.board));

  // If this is the first click, add bombs to the board
  if (game.moves.length === 0) {
    updatedBoard = addBombsToBoard(
      updatedBoard,
      tile.row,
      tile.column,
      numBombs
    );
    updatedBoard = calculateDisplayNums(updatedBoard);
  }

  // Check if this is a bomb spot or not
  if (isBombSpot(updatedBoard, tile.row, tile.column)) {
    // TODO: Figure out what should happen here from a gameplay perspective
  } else {
    updatedBoard = updateTileAndNeighbors(updatedBoard, tile.row, tile.column);

    // TODO: Calculate if the game is over
  }

  // Update the game
  const updatedGame: Game = {
    ...game,
    board: updatedBoard,
  };

  // Add the latest move to the list
  updatedGame.moves.push({
    tile,
    client,
  });

  // Persist the updated game
  saveGame(updatedGame);

  const sanitizedBoard = generateSanitizedBoard(updatedBoard);
  const currentTurn = getCurrentTurn(updatedGame).publicId;

  // Emit to all clients
  emit({
    to: [updatedGame.player1.socketId, updatedGame.player2.socketId],
    payload: {
      action: ServerAction.MOVE_MADE,
      data: {
        game: {
          id: gameId,
          board: sanitizedBoard,
          currentTurn,
        },
      },
    },
  });
};

// Given a game board, calculate who has the next turn
const getCurrentTurn = (game: Game): ClientInfo => {
  const lastTurn = game.moves[game.moves.length - 1].client.privateId;

  return lastTurn === game.player1.privateId ? game.player2 : game.player1;
};

// These move related type names are terrible, fix this
enum MoveStatus {
  UNKNOWN = "UNKNOWN",
  LEGAL = "LEGAL",
  ILLEGAL = "ILLEGAL",
}

type MoveLegallity = {
  status: MoveStatus;
  message?: string;
};

const getMoveStatus = (
  game: Game,
  tile: Tile,
  client: ClientInfo
): MoveLegallity => {
  if (!game) {
    return {
      status: MoveStatus.ILLEGAL,
      message: "The game doesn't exist",
    };
  }

  if (game.moves.length === 0) {
    if (client.privateId !== game.creator.privateId) {
      return {
        status: MoveStatus.ILLEGAL,
        message: "The creator needs to make the first move",
      };
    }
  } else {
    if (
      client.privateId === game.moves[game.moves.length - 1].client.privateId
    ) {
      return {
        status: MoveStatus.ILLEGAL,
        message: "It is not this players turn to make a move",
      };
    }
  }

  if (tile.row >= game.board.length || tile.column >= game.board[0].length) {
    return {
      status: MoveStatus.ILLEGAL,
      message: "This tile does not exist on the board",
    };
  }

  if (game.board[tile.row][tile.column].isRevealed) {
    return {
      status: MoveStatus.ILLEGAL,
      message: "This tile has already been revelaed",
    };
  }

  return {
    status: MoveStatus.LEGAL,
  };
};
