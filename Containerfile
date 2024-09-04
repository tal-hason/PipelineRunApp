# Builder stage
FROM registry.access.redhat.com/ubi9/nodejs-20 AS builder

USER root
# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY src/package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy source code
COPY src .

WORKDIR /tmp

# Get the oc Client Binary
ADD https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/stable/openshift-client-linux.tar.gz .

# Extract the binary and remove the tarball
RUN tar xvf openshift-client-linux.tar.gz --no-same-owner && rm openshift-client-linux.tar.gz

# Download and install yq
ADD https://github.com/mikefarah/yq/releases/latest/download/yq_linux_amd64 .
RUN mv yq_linux_amd64 yq && chmod +x yq
LABEL org.opencontainers.image.source https://github.com/tal-hason/PipelineRunApp
# Runner stage
FROM registry.access.redhat.com/ubi9/nodejs-20-minimal AS runner
LABEL org.opencontainers.image.source https://github.com/tal-hason/PipelineRunApp
# Set working directory
WORKDIR /app

# Copy oc binaries and yq from the builder stage
COPY --from=builder --chown=1001:0 /tmp /usr/local/bin
COPY --from=builder --chown=1001:0 /app .

# Configure the container to run as root-less
USER 1001

# Command to start the application
CMD ["node", "app.js"]

