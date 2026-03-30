import { createRequire } from 'node:module';
import { logger } from '../logger.js';

type PkgJson = { version: string };

const require = createRequire(import.meta.url);
const { version } = require('../../package.json') as PkgJson;

export const showVersion = (): void => {
  logger.info(version);
};
