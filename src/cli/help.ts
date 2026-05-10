import { CLI_NAME, CLI_DESCRIPTION } from "../constants.js";
import { logger, pad, color } from "../logger.js";

const COLUMN_WIDTH = 28;

export const showHelp = (): void => {
  logger.info(`${color.bold(CLI_NAME)}  ${color.dim(CLI_DESCRIPTION)}`);
  logger.info("");
  logger.info(color.cyan("Usage"));
  logger.info(
    `  ${pad(`${CLI_NAME} <script>`, COLUMN_WIDTH)}Compile TypeScript to a native binary`,
  );
  logger.info(`  ${pad(`${CLI_NAME} <script> -o <output>`, COLUMN_WIDTH)}Specify output binary path`);
  logger.info(`  ${pad(`${CLI_NAME} --help`, COLUMN_WIDTH)}Show this help`);
  logger.info(`  ${pad(`${CLI_NAME} --version`, COLUMN_WIDTH)}Show version`);
  logger.info("");
  logger.info(color.cyan("Examples"));
  logger.info(`  ${CLI_NAME} my-script.ts`);
  logger.info("");
  logger.info(color.cyan("Available in scripts"));
  logger.info(`  ${color.dim("QuickJS standard library (std, os)")}`);
  logger.info(`  ${color.dim("maybeFetch(url, config?)")}`);
};
