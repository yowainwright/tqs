import { logger } from "../logger.js";

declare const __VERSION__: string;

export const showVersion = (): void => {
  logger.info(__VERSION__);
};
