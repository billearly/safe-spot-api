// import httpServer from "http";
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
import { Game, GameBoard, Tile } from "./types";

const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

const rows = 10;
const columns = 15;
const bombPercentage = 18;
const numBombs = Math.floor(rows * columns * (bombPercentage / 100));

type CreateGamePayload = {
  creator: string;
};

type JoinGamePayload = {
  gameId: string;
  userId: string;
};

type MoveMadePayload = {
  gameId: string;
  userId: string;
  tile: Tile;
};

interface ServerToClientEvents {
  connected: (message: string) => void;
  gameCreated: (payload: { gameId: string }) => void;
  gameJoined: (message: string) => void;
  gameStarted: (payload: { board: GameBoard }) => void;
  moveMade: (payload: { board: GameBoard }) => void;
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
    const { creator } = payload as unknown as CreateGamePayload;

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
          creator,
          player1: creator,
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
    const { gameId, userId } = payload as unknown as JoinGamePayload;

    if (!games.has(gameId)) {
      // Throw error? Emit a specific 'NoGameFound' message?
    } else {
      socket.join(gameId);
      socket.to(gameId).emit("gameJoined", "Game has been joined");

      const updatedGame: Game = {
        ...games.get(gameId),
        isStarted: true,
        player2: userId,
      };

      games.set(gameId, updatedGame);

      const sanitizedBoard = generateSanitizedBoard(updatedGame.board);

      // Use io instead of socket to emit to all, including the sender
      io.to(gameId).emit("gameStarted", { board: sanitizedBoard });
    }

    // Also need to handle trying to join a game that you are already in
  });

  socket.on("makeMove", (payload) => {
    // How do I know the game, does that ID need to be passed everytime?
    // Can I get the gameID from the room that the socket is in?
    // Looks like this is possile, would just need to make sure that a socket is not in more than 1 room

    const { gameId, userId, tile } = payload as unknown as MoveMadePayload;

    const game = games.get(gameId);

    if (!game) {
      console.log("Exit, the game doesn't exist");
      return;
    }

    if (game.moves.length === 0) {
      if (userId !== game.creator) {
        console.log("Exit, the creator needs to make the first move");
        return;
      }
    } else {
      if (userId === game.moves[game.moves.length - 1].player) {
        console.log("Exit, this player has tried to make 2 moves in a row");
        return;
      }
    }

    if (tile.row >= game.board.length || tile.column >= game.board[0].length) {
      console.log("Exit, this tile does not exist on the board");
      return;
    }

    if (game.board[tile.row][tile.column].isRevealed) {
      console.log("Exit, this tile has already be revelaed");
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
      // Figure out what should happen here from a gameplay perspective
    } else {
      updatedBoard = updateTileAndNeighbors(
        updatedBoard,
        tile.row,
        tile.column
      );

      // TODO: Calculate if the game is over
    }

    // Persist the updated game
    games.set(gameId, {
      ...game,
      board: updatedBoard,
      // TODO: add the move to the list
    });

    const sanitizedBoard = generateSanitizedBoard(updatedBoard);

    io.to(gameId).emit("moveMade", { board: sanitizedBoard });

    // I need to be emiting whose turn it is, so that the client knows who is up
    // I might need a private and public id. The public id is sent and helps the client identify who is up
    // The private id is used to actually make the move
    // Or maybe I could emit to a specific socket

    // I kind of like the idea of the server just emitting the state and the client deciding what to show (if you are up or not)
  });
});

const PORT = Number(process.env.PORT) || 3001;

const opts: Partial<ServerOptions> = {
  cors: {
    origin: "http://localhost:3000",
    allowedHeaders: ["Access-Control-Allow-Origin"],
  },
};

io.listen(PORT, opts);
