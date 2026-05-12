// Lambda handler for /api/metric. Invoked via Function URL from the
// browser. Uses the Lambda execution role (no static AWS keys) to call
// CloudWatch PutMetricData.
//
// The AWS SDK v3 is bundled into the nodejs20.x runtime, so we don't need
// node_modules here.

import {
  CloudWatchClient,
  PutMetricDataCommand,
} from "@aws-sdk/client-cloudwatch";

const cw = new CloudWatchClient({});

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method ?? event?.httpMethod;
  if (method && method !== "POST") {
    return { statusCode: 405, body: "" };
  }

  try {
    await cw.send(
      new PutMetricDataCommand({
        Namespace: "SnakeAnimation",
        MetricData: [
          {
            MetricName: "RenderCount",
            Value: 1,
            Unit: "Count",
            Timestamp: new Date(),
          },
        ],
      }),
    );
    return { statusCode: 204, body: "" };
  } catch (err) {
    console.error("CloudWatch error:", err);
    return { statusCode: 500, body: String(err) };
  }
};
