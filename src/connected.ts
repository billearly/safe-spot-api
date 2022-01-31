import { emit } from "./emitter";
import { NewConnectionPayload, ServerAction } from "./types";

export const handleNewConnection = (payload: NewConnectionPayload) => {
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
