import { emit, LambdaResponse } from "../emitter";
import { LambdaEvent, ServerAction } from "../types";

export const handleNewConnection = async (
  payload: LambdaEvent
): Promise<LambdaResponse> => {
  try {
    // the payload may come in as a string, might need to JSON.parse it
    // or rather.... its just the data on the body that is a string
    const { connectionId: socketId } = payload.requestContext;

    const response = await emit({
      to: [socketId],
      payload: {
        action: ServerAction.GIVE_SOCKET_INFO,
        data: {
          socketId,
        },
      },
      requestContext: payload.requestContext,
    });

    return response;
  } catch (e) {
    console.error(e);
  }
};

const handler = handleNewConnection;
export default handler;
