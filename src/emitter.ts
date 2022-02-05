import { ApiGatewayManagementApi } from "aws-sdk";
import { sendToSockets } from "./server";
import { ServerAction } from "./types";

type EmitArgs = {
  to: string[];
  payload: {
    // The payload should be the same shape as APIGatewayEvent
    action: ServerAction;
    data: any;
  };
  requestContext: {
    domainName: string;
    stage: string;
    connectionId: string;
  };
};

export type LambdaResponse = {
  statusCode: number;
};

export const emit = async ({
  to,
  payload,
  requestContext,
}: EmitArgs): Promise<LambdaResponse> => {
  if (process.env.NODE_ENV === "development") {
    sendToSockets(to, payload);
  } else {
    const apigwManagementApi = new ApiGatewayManagementApi({
      apiVersion: "2018-11-29",
      endpoint: `${requestContext.domainName}/${requestContext.stage}`,
    });

    const postCalls = to.map(async (socketId) => {
      try {
        await apigwManagementApi
          .postToConnection({
            ConnectionId: socketId,
            Data: JSON.stringify(payload),
          })
          .promise();
      } catch (e) {
        // Not sure if I want to do anything special here
        throw e;
      }
    });

    try {
      await Promise.all(postCalls);
    } catch (e) {
      return { statusCode: 500 };
    }

    return {
      statusCode: 200,
    };
  }
};
