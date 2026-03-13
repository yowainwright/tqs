FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    cmake \
    libcurl4-openssl-dev \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Create working directory
WORKDIR /app

# Copy package files
COPY package.json ./
COPY tsup.config.ts ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/
COPY native/ ./native/
COPY scripts/ ./scripts/

# Build the project
RUN npm run build

# Create test scripts directory
RUN mkdir -p /test-scripts

# Copy test scripts
COPY tests/e2e/test-scripts/ /test-scripts/

# Set working directory for tests
WORKDIR /test-scripts

# Command to run e2e tests
CMD ["/app/bin/tqs", "--help"]