import { customAlphabet } from "nanoid";
import { instantiateSafeBoard } from "../board";
import { emit } from "../emitter";
import { getGame, saveGame } from "../persistence";
import {
  CreateGameAPIGatewayPayload,
  Game,
  GameStatus,
  LambdaEvent,
  ServerAction,
} from "../types";

const nanoid = customAlphabet("1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ", 6);

export const createGame = async (payload: LambdaEvent) => {
  const numRows = Number(process.env.BOARD_NUM_ROWS) || 10;
  const numColumns = Number(process.env.BOMB_NUM_COLUMNS) || 15;

  console.log(payload, "payload");

  const body = JSON.parse(payload.body) as CreateGameAPIGatewayPayload;

  console.log(body, "body");

  const { client } = body.data;

  let gameCreated = false;
  let gameId: string;
  let newGame: Game;

  while (!gameCreated) {
    gameId = nanoid();

    const existingGame = await getGame(gameId);

    if (!existingGame) {
      const gameBoard = instantiateSafeBoard(numRows, numColumns);

      newGame = {
        displayId: gameId,
        board: gameBoard,
        isStarted: false,
        status: GameStatus.WAITING_FOR_PLAYER,
        creator: client,
        player1: client,
        player2: undefined,
        moves: [],
      };

      await saveGame(newGame);

      gameCreated = true;
    }
  }

  const response = await emit({
    to: [newGame.creator.socketId],
    payload: {
      action: ServerAction.GAME_CREATED,
      data: {
        gameId,
      },
    },
    requestContext: payload.requestContext,
  });

  // This signals to the Lambda that the function existed (success or failure)
  return response;
};

// Lambda
const handler = createGame;
export default handler;
