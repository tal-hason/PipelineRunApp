#!/bin/bash

# URL of the application to test
URL="https://pipeline-runner-pipeline-runner.apps-crc.testing"

# Number of requests to send
NUM_REQUESTS=100000

# Number of concurrent requests
CONCURRENCY=1000

# Function to perform a single request
perform_request() {
  HTTP_STATUS=$(curl -o /dev/null -s -w "%{http_code}\n" $URL -k)
  echo "HTTP Status: $HTTP_STATUS"
}

# Export the function so it can be used by parallel
export -f perform_request
export URL

# Run the requests in parallel
seq $NUM_REQUESTS | xargs -n 1 -P $CONCURRENCY bash -c 'perform_request'

echo "Load test completed with $NUM_REQUESTS requests."
