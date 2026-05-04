import { EXIT_SUCCESS, EXIT_FAILURE } from "../constants.js";
import { parseArgs } from "./args.js";
import { showHelp } from "./help.js";
import { showVersion } from "./version.js";
import { compile } from "../compiler.js";
import { logger } from "../logger.js";

const args = process.argv.slice(2);
const options = parseArgs(args);

const shouldShowHelp = options.help || args.length === 0;

if (options.version) {
  showVersion();
  process.exit(EXIT_SUCCESS);
}

if (shouldShowHelp) {
  showHelp();
  process.exit(EXIT_SUCCESS);
}

if (options.scriptFile) {
  try {
    compile(options.scriptFile, options.outputFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(message);
    process.exit(EXIT_FAILURE);
  }
}
