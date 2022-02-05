import {
  addBombsToBoard,
  calculateDisplayNums,
  generateSanitizedBoard,
  isBombSpot,
  updateTileAndNeighbors,
} from "../board";
import { emit } from "../emitter";
import { getGame, updateGame } from "../persistence";
import {
  ClientInfo,
  Game,
  GameBoard,
  LambdaEvent,
  MakeMoveAPIGatewayPayload,
  ServerAction,
  Tile,
} from "../types";

export const makeMove = async (payload: LambdaEvent) => {
  const numRows = Number(process.env.BOARD_NUM_ROWS) || 10;
  const numColumns = Number(process.env.BOMB_NUM_COLUMNS) || 15;
  const bombPercentage = Number(process.env.BOARD_BOMB_PERCENTAGE) || 18;
  const numBombs = Math.floor(numRows * numColumns * (bombPercentage / 100));

  const body = JSON.parse(payload.body) as MakeMoveAPIGatewayPayload;
  const { gameId, client, tile } = body.data;

  const game = await getGame(gameId);
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
  await updateGame(updatedGame);

  const sanitizedBoard = generateSanitizedBoard(updatedBoard);
  const currentTurn = getCurrentTurn(updatedGame).publicId;

  // Emit to all clients
  const response = await emit({
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
    requestContext: payload.requestContext,
  });

  return response;
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

const handler = makeMove;
export default handler;
