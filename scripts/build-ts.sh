#!/bin/bash
set -e

VERSION=$(bun -e "console.log(require('./package.json').version)")

rm -rf dist

bun build src/index.ts src/quickjs.ts \
  --outdir dist \
  --target browser \
  --minify \
  --external qjs:std \
  --external qjs:os \
  --define "__VERSION__=\"$VERSION\""

bun build src/cli/index.ts \
  --outfile dist/cli/index.js \
  --target node \
  --minify \
  --define "__VERSION__=\"$VERSION\""

bunx tsc --emitDeclarationOnly --declarationMap false --outDir dist
bunx tsc --project tsconfig.cli.json --noEmit
