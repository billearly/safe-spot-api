// Note: This server is only used for local development and is not deployed
// This is simply a 'mock' of the AWS API Gateway

import "dotenv/config";
import * as express from "express";
import * as http from "http";
import * as WebSocket from "ws";
import {
  ClientAction,
  CreateGameAPIGatewayPayload,
  JoinGameAPIGatewayPayload,
  MakeMoveAPIGatewayPayload,
  APIGatewayPayload,
  ServerAction,
  LambdaEvent,
} from "./types";
import { nanoid } from "nanoid";
import {
  createGame,
  handleNewConnection,
  joinGame,
  makeMove,
} from "./functions";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

type CustomWebSocket = WebSocket & {
  id: string;
};

wss.on("connection", (socket: CustomWebSocket) => {
  socket.id = nanoid();

  socket.on("message", async (message: string) => {
    const payload: APIGatewayPayload = JSON.parse(message.toString());

    switch (payload.action) {
      case ClientAction.GET_SOCKET_INFO:
        console.log(socket.id, "actual socket id");
        const getSocketInfoEvent = createLambdaEvent(socket.id);
        await handleNewConnection(getSocketInfoEvent);
        break;

      case ClientAction.CREATE_GAME:
        const createGamePayload = payload as CreateGameAPIGatewayPayload;
        const createGameEvent = createLambdaEvent(socket.id, createGamePayload);
        await createGame(createGameEvent); // Validate the shape? typeguard?
        break;

      case ClientAction.JOIN_GAME:
        const joinGamePayload = payload as JoinGameAPIGatewayPayload;
        const joinGameEvent = createLambdaEvent(socket.id, joinGamePayload);
        await joinGame(joinGameEvent);
        break;

      case ClientAction.MAKE_MOVE:
        const makeMovePayload = payload as MakeMoveAPIGatewayPayload;
        const makeMoveEvent = createLambdaEvent(socket.id, makeMovePayload);
        await makeMove(makeMoveEvent);
        break;

      default:
        console.error(`${payload.action} is not a valid action`);
      // TODO: handle error
    }
  });
});

const createLambdaEvent = (
  socketId: string,
  payload?:
    | CreateGameAPIGatewayPayload
    | JoinGameAPIGatewayPayload
    | MakeMoveAPIGatewayPayload
): LambdaEvent => {
  return {
    requestContext: {
      domainName: "domain-local",
      stage: "stage-local",
      connectionId: socketId,
    },
    body: payload ? JSON.stringify({ data: payload.data }) : undefined,
  };
};

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
