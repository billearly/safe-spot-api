// Note: This server is only used for local development and is not deployed
// This is simply a 'mock' of the AWS API Gateway

import "dotenv/config";
import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import { createGame, joinGame, makeMove } from "./game";
import {
  ClientAction,
  CreateGamePayload,
  JoinGamePayload,
  MakeMovePayload,
  Payload,
  ServerAction,
} from "./types";
import { nanoid } from "nanoid";
import { emit } from "./emitter";
import { handleNewConnection } from "./connected";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

type CustomWebSocket = WebSocket & {
  id: string;
};

wss.on("connection", (socket: CustomWebSocket) => {
  socket.id = nanoid();

  // Send the client its socket ID
  handleNewConnection({
    action: ClientAction.CONNECT,
    requestContext: {
      connectionId: socket.id,
    },
  });

  socket.on("message", (message: string) => {
    const payload: Payload = JSON.parse(message.toString());

    switch (payload.action) {
      case ClientAction.CREATE_GAME:
        const createGamePayload = payload as CreateGamePayload;
        createGame(createGamePayload); // Validate the shape? typeguard?
        break;

      case ClientAction.JOIN_GAME:
        const joinGamePayload = payload as JoinGamePayload;
        joinGame(joinGamePayload);
        break;

      case ClientAction.MAKE_MOVE:
        const makeMovePayload = payload as MakeMovePayload;
        makeMove(makeMovePayload);
        break;

      default:
      // TODO: handle error
    }
  });
});

export const sendToSockets = (
  to: string[],
  payload: { action: ServerAction; data: any } // This is the apigateway type
): void => {
  wss.clients.forEach((client: CustomWebSocket) => {
    if (to.includes(client.id)) {
      client.send(JSON.stringify(payload));
    }
  });
};

const port = process.env.PORT || 3001;

server.listen(port, () => {
  console.log(`Server listening on ws://localhost:${port}`);
});
