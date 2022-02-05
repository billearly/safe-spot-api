import { emit } from "../emitter";
import { LambdaEvent, ServerAction } from "../types";

export const handleNewConnection = (payload: LambdaEvent) => {
  // the payload may come in as a string, might need to JSON.parse it
  // or rather.... its just the data on the body that is a string
  const { connectionId: socketId } = payload.requestContext;

  emit({
    to: [socketId],
    payload: {
      action: ServerAction.CONNECTED,
      data: {
        socketId,
      },
    },
  });
};

const handler = handleNewConnection;
export default handler;
