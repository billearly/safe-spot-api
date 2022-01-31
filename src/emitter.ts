import { sendToSockets } from "./server";
import { ServerAction } from "./types";

type EmitArgs = {
  to: string[];
  payload: {
    // The payload should be the same shape as APIGatewayEvent
    action: ServerAction;
    data: any;
  };
};

export const emit = ({ to, payload }: EmitArgs): void => {
  if (process.env.NODE_ENV === "development") {
    sendToSockets(to, payload);
  } else {
    // Use the GatewayManagementAPI to send the message
  }
};
