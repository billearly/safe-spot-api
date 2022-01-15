// import httpServer from "http";
import "dotenv/config";
import { Server, ServerOptions, Socket } from "socket.io";

import { customAlphabet } from "nanoid";
const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

type CreateGamePayload = {
  creator: string;
};

type JoinGamePayload = {
  gameId: string;
  userId: string;
};

interface ServerToClientEvents {
  connected: (message: string) => void;
  gameCreated: (payload: { gameId: string }) => void;
  gameJoined: (message: string) => void;
}

interface ClientToServerEvents {
  createGame: (creator: string) => void;
  joinGame: (gameId: string, userId: string) => void;
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
const gameIds = new Set<string>();

io.on("connection", (socket) => {
  console.log("Client connected");

  socket.emit("connected", `Your socket ID is ${socket.id}`);

  socket.on("createGame", (payload) => {
    const { creator } = payload as unknown as CreateGamePayload;

    let gameCreated = false;
    let gameId: string;

    while (!gameCreated) {
      gameId = nanoid();

      if (!gameIds.has(gameId)) {
        gameIds.add(gameId);
        gameCreated = true;
      }
    }

    socket.join(gameId);
    socket.emit("gameCreated", { gameId: gameId });
  });

  socket.on("joinGame", (payload) => {
    console.log("called");

    const { gameId } = payload as unknown as JoinGamePayload;

    if (!gameIds.has(gameId)) {
      // Throw error? Emit a specific 'NoGameFound' message?
    } else {
      socket.join(gameId);
      socket.to(gameId).emit("gameJoined", "Game has been joined");
    }

    // Also need to handle trying to join a game that you are already in
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
