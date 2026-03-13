import { CLI_NAME, CLI_DESCRIPTION } from '../constants.js';
import { logger } from '../logger.js';

export const showHelp = (): void => {
  logger.info(`${CLI_NAME} - ${CLI_DESCRIPTION}`);
  logger.info('');
  logger.info('Usage:');
  logger.info(`  ${CLI_NAME} <script.ts>    Compile and run TypeScript with QuickJS + maybefetch`);
  logger.info(`  ${CLI_NAME} --help        Show this help`);
  logger.info(`  ${CLI_NAME} --version     Show version`);
  logger.info('');
  logger.info('Examples:');
  logger.info(`  ${CLI_NAME} my-script.ts`);
  logger.info('');
  logger.info('The script will have access to:');
  logger.info('  - QuickJS standard library');
  logger.info('  - maybefetch(url, maxRetries, initialDelayMs, maxDelayMs, backoffFactor, timeoutMs)');
};