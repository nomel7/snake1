#!/usr/bin/env bash
# Deploys the metrics Lambda + Function URL.
#
# Usage:
#   AWS_PROFILE=dev SITE_ORIGIN=https://your-site.example.com \
#     ./scripts/deploy-metrics-lambda.sh
#
# Env:
#   AWS_PROFILE   - AWS CLI profile to use (default: dev)
#   AWS_REGION    - region to deploy to     (default: us-east-1)
#   SITE_ORIGIN   - allowed CORS origin     (default: *  -- tighten for prod)
#   FN_NAME       - Lambda function name    (default: snake-metrics)
#   ROLE_NAME     - IAM role name           (default: snake-metrics-lambda-role)

set -euo pipefail

REGION="${AWS_REGION:-us-east-1}"
FN_NAME="${FN_NAME:-snake-metrics}"
ROLE_NAME="${ROLE_NAME:-snake-metrics-lambda-role}"
SITE_ORIGIN="${SITE_ORIGIN:-*}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LAMBDA_DIR="$REPO_ROOT/lambda/metrics"

echo "Region:      $REGION"
echo "Function:    $FN_NAME"
echo "Role:        $ROLE_NAME"
echo "CORS origin: $SITE_ORIGIN"
echo

# --- IAM role ---------------------------------------------------------------

TRUST_POLICY='{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Principal":{"Service":"lambda.amazonaws.com"},"Action":"sts:AssumeRole"}]}'

INLINE_POLICY='{"Version":"2012-10-17","Statement":[
  {"Effect":"Allow","Action":"cloudwatch:PutMetricData","Resource":"*"},
  {"Effect":"Allow","Action":["logs:CreateLogGroup","logs:CreateLogStream","logs:PutLogEvents"],"Resource":"*"}
]}'

if ! aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  echo "Creating IAM role $ROLE_NAME..."
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST_POLICY" >/dev/null
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name snake-metrics-policy \
    --policy-document "$INLINE_POLICY"
  echo "Waiting 10s for role to propagate..."
  sleep 10
else
  echo "IAM role $ROLE_NAME already exists, updating policy..."
  aws iam put-role-policy \
    --role-name "$ROLE_NAME" \
    --policy-name snake-metrics-policy \
    --policy-document "$INLINE_POLICY"
fi

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)
echo "Role ARN: $ROLE_ARN"

# --- Bundle Lambda ----------------------------------------------------------

TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

cp "$LAMBDA_DIR/index.mjs" "$TMPDIR/"
(cd "$TMPDIR" && zip -qr lambda.zip .)
ZIP_PATH="$TMPDIR/lambda.zip"

# --- Lambda function --------------------------------------------------------

if aws lambda get-function --function-name "$FN_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Updating function code for $FN_NAME..."
  aws lambda update-function-code \
    --function-name "$FN_NAME" \
    --zip-file "fileb://$ZIP_PATH" \
    --region "$REGION" >/dev/null
else
  echo "Creating Lambda $FN_NAME..."
  aws lambda create-function \
    --function-name "$FN_NAME" \
    --runtime nodejs20.x \
    --role "$ROLE_ARN" \
    --handler index.handler \
    --zip-file "fileb://$ZIP_PATH" \
    --region "$REGION" >/dev/null
fi

# --- Function URL + CORS ----------------------------------------------------

CORS_JSON=$(cat <<EOF
{"AllowOrigins":["$SITE_ORIGIN"],"AllowMethods":["POST"],"AllowHeaders":["content-type"],"MaxAge":86400}
EOF
)

if aws lambda get-function-url-config --function-name "$FN_NAME" --region "$REGION" >/dev/null 2>&1; then
  echo "Updating Function URL CORS..."
  aws lambda update-function-url-config \
    --function-name "$FN_NAME" \
    --auth-type NONE \
    --cors "$CORS_JSON" \
    --region "$REGION" >/dev/null
else
  echo "Creating Function URL..."
  aws lambda create-function-url-config \
    --function-name "$FN_NAME" \
    --auth-type NONE \
    --cors "$CORS_JSON" \
    --region "$REGION" >/dev/null
  # Public Function URLs require an explicit resource-based policy.
  aws lambda add-permission \
    --function-name "$FN_NAME" \
    --statement-id FunctionURLAllowPublicAccess \
    --action lambda:InvokeFunctionUrl \
    --principal "*" \
    --function-url-auth-type NONE \
    --region "$REGION" >/dev/null
fi

URL=$(aws lambda get-function-url-config \
  --function-name "$FN_NAME" \
  --region "$REGION" \
  --query 'FunctionUrl' --output text)

echo
echo "Deployed."
echo "Function URL: $URL"
echo
echo "Build the site with:"
echo "  VITE_METRICS_URL=$URL npm run build"
echo
echo "Or save it to .env.production (gitignore'd or not -- it's not a secret)."
