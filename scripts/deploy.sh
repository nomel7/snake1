#!/bin/bash

npm run build && aws s3 cp dist/index.html s3://snake-animation-kdone-2026/index.html
