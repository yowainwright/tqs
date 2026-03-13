import type { Logger } from './types.js';

const createLogger = (): Logger => ({
  info: (message: string): void => {
    console.log(message);
  },
  error: (message: string): void => {
    console.error(message);
  },
  success: (message: string): void => {
    console.log(message);
  },
});

export const logger = createLogger();