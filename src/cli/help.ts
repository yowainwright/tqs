import { CLI_NAME, CLI_DESCRIPTION } from '../constants.js';
import { logger } from '../logger.js';

export const showHelp = (): void => {
  logger.info(`${CLI_NAME} - ${CLI_DESCRIPTION}`);
  logger.info('');
  logger.info('Usage:');
  logger.info(`  ${CLI_NAME} <script>                 Build and run a QuickJS script`);
  logger.info(`  ${CLI_NAME} <script> -o <output>     Build a standalone executable`);
  logger.info(`  ${CLI_NAME} --help                   Show this help`);
  logger.info(`  ${CLI_NAME} --version                Show version`);
  logger.info('');
  logger.info('Examples:');
  logger.info(`  ${CLI_NAME} my-script.tqs`);
  logger.info(`  ${CLI_NAME} my-script.tqs -o my-script`);
  logger.info('');
  logger.info('The script will have access to:');
  logger.info('  - QuickJS standard library');
  logger.info('  - maybefetch(url, maxRetries, initialDelayMs, maxDelayMs, backoffFactor, timeoutMs)');
};
