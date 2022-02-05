import { generateSanitizedBoard } from "../board";
import { emit } from "../emitter";
import { getGame, updateGame } from "../persistence";
import {
  Game,
  JoinGameAPIGatewayPayload,
  LambdaEvent,
  ServerAction,
} from "../types";

export const joinGame = async (payload: LambdaEvent) => {
  const body = JSON.parse(payload.body) as JoinGameAPIGatewayPayload;
  const { gameId, client } = body.data;

  const game = await getGame(gameId);

  if (!game) {
    // Throw error? Emit a specific 'NoGameFound' message?
  } else {
    const updatedGame: Game = {
      ...game,
      isStarted: true,
      player2: client,
    };

    await updateGame(updatedGame);

    const sanitizedBoard = generateSanitizedBoard(updatedGame.board);

    const response = await emit({
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
      requestContext: payload.requestContext,
    });

    return response;
  }

  // Also need to handle trying to join a game that you are already in
  // trying to join a game that already has 2 players
};

const handler = joinGame;
export default handler;
