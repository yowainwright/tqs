import * as std from "qjs:std";
import type { Logger } from "./types.js";
import {
  RESET,
  BOLD,
  DIM,
  RED,
  GREEN,
  CYAN,
  CHAR_SUCCESS,
  CHAR_ERROR,
  CHAR_STEP,
} from "./constants.js";

const colorEnabled = std.getenv("NO_COLOR") === null;

const c = (code: string, text: string): string => (colorEnabled ? `${code}${text}${RESET}` : text);

export const spaces = (count: number): string => " ".repeat(Math.max(0, count));

export const pad = (str: string, width: number): string =>
  str + spaces(Math.max(0, width - str.length));

export const color = {
  bold: (text: string): string => c(BOLD, text),
  dim: (text: string): string => c(DIM, text),
  cyan: (text: string): string => c(CYAN, text),
  red: (text: string): string => c(RED, text),
  green: (text: string): string => c(GREEN, text),
};

const createLogger = (): Logger => ({
  info: (message: string): void => {
    std.out.puts(`${message}\n`);
  },
  error: (message: string): void => {
    std.err.puts(`${c(RED, CHAR_ERROR)} ${message}\n`);
  },
  success: (message: string): void => {
    std.out.puts(`${c(GREEN, CHAR_SUCCESS)} ${message}\n`);
  },
  step: (message: string): void => {
    std.out.puts(`${c(DIM, CHAR_STEP)} ${message}\n`);
  },
});

export const logger = createLogger();
