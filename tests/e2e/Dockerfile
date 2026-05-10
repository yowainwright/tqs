FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y \
    curl \
    build-essential \
    git \
    cmake \
    unzip \
    libcurl4-openssl-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Bun
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:$PATH"

# Create working directory
WORKDIR /app

# Copy source code and package files
COPY package.json bun.lock bunfig.toml bunfig.ci.toml tsconfig.json tsconfig.cli.json ./
COPY src/ ./src/
COPY native/ ./native/
COPY scripts/ ./scripts/
COPY tests/fixtures/ ./tests/fixtures/

# Install dependencies
RUN bun install --config=bunfig.ci.toml

# Build the project
RUN bun run stage:quickjs
RUN bash scripts/build-qjsc.sh
RUN bun run build:ts
ENV PATH="/app/bin:$PATH"

# Create test scripts directory
RUN mkdir -p /test-scripts

# Copy test scripts
COPY tests/e2e/test-scripts/ /test-scripts/

# Set working directory for tests
WORKDIR /test-scripts

# Command to run e2e tests
CMD ["bun", "/app/dist/cli/index.js", "--help"]
