/**
 * TODO:
 * This is way too highly coupled with the game logic. If this is going to be deployed as a lambda
 * then almost all of this 'server' code is for local development only
 * need to have a better line so that the handoff is smooth
 */

import "dotenv/config";
import { Server, ServerOptions, Socket } from "socket.io";
import { customAlphabet } from "nanoid";
import {
  addBombsToBoard,
  calculateDisplayNums,
  generateSanitizedBoard,
  instantiateSafeBoard,
  isBombSpot,
  updateTileAndNeighbors,
} from "./game";
import { ClientInfo, Game, GameBoard, GameState, Tile } from "./types";

const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

const rows = 10;
const columns = 15;
const bombPercentage = 18;
const numBombs = Math.floor(rows * columns * (bombPercentage / 100));

type CreateGamePayload = {
  client: ClientInfo;
};

type JoinGamePayload = {
  gameId: string;
  client: ClientInfo;
};

type MoveMadePayload = {
  gameId: string;
  client: ClientInfo;
  tile: Tile;
};

interface ServerToClientEvents {
  connected: (message: string) => void;
  gameCreated: (payload: { gameId: string }) => void;
  gameJoined: (message: string) => void;
  gameStarted: (payload: { game: GameState }) => void;
  moveMade: (payload: { game: GameState }) => void;
}

interface ClientToServerEvents {
  createGame: (creator: string) => void;
  joinGame: (gameId: string, userId: string) => void;
  makeMove: (payload: MoveMadePayload) => void;
}

interface InterServerEvents {
  ping: () => void;
}

interface SocketData {
  username: string;
}

const io = new Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>();

// High chance of mem leak, this obvs can't stay here
const games = new Map<string, Game>();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.emit("connected", `Your socket ID is ${socket.id}`);

  socket.on("createGame", (payload) => {
    const { client } = payload as unknown as CreateGamePayload;

    let gameCreated = false;
    let gameId: string;

    while (!gameCreated) {
      gameId = nanoid();

      if (!games.has(gameId)) {
        const gameBoard = instantiateSafeBoard(rows, columns);

        games.set(gameId, {
          id: gameId,
          board: gameBoard,
          isStarted: false,
          creator: client,
          player1: client,
          player2: undefined,
          moves: [],
        });

        gameCreated = true;
      }
    }

    socket.join(gameId);
    socket.emit("gameCreated", { gameId: gameId });
  });

  socket.on("joinGame", (payload) => {
    console.log("game joined");
    const { gameId, client } = payload as unknown as JoinGamePayload;

    if (!games.has(gameId)) {
      // Throw error? Emit a specific 'NoGameFound' message?
    } else {
      socket.join(gameId);
      socket.to(gameId).emit("gameJoined", "Game has been joined");

      const updatedGame: Game = {
        ...games.get(gameId),
        isStarted: true,
        player2: client,
      };

      games.set(gameId, updatedGame);

      const sanitizedBoard = generateSanitizedBoard(updatedGame.board);

      // Use io instead of socket to emit to all, including the sender
      // emit GameState
      io.to(gameId).emit("gameStarted", {
        game: {
          id: gameId,
          board: sanitizedBoard,
          currentTurn: updatedGame.creator.publicId,
        },
      });
    }

    // Also need to handle trying to join a game that you are already in
  });

  socket.on("makeMove", (payload) => {
    // How do I know the game, does that ID need to be passed everytime?
    // Can I get the gameID from the room that the socket is in?
    // Looks like this is possile, would just need to make sure that a socket is not in more than 1 room

    const { gameId, client, tile } = payload as unknown as MoveMadePayload;

    const game = games.get(gameId);
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
      updatedBoard = updateTileAndNeighbors(
        updatedBoard,
        tile.row,
        tile.column
      );

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
    games.set(gameId, updatedGame);

    const sanitizedBoard = generateSanitizedBoard(updatedBoard);
    const currentTurn = getCurrentTurn(updatedGame).publicId;

    io.to(gameId).emit("moveMade", {
      game: {
        id: gameId,
        board: sanitizedBoard,
        currentTurn,
      },
    });
  });
});

const PORT = Number(process.env.PORT) || 3001;

const opts: Partial<ServerOptions> = {
  cors: {
    origin: "*",
    allowedHeaders: ["Access-Control-Allow-Origin"],
  },
};

io.listen(PORT, opts);

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
