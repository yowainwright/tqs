import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { logger } from '../../../src/logger.js';

describe('logger', () => {
  let consoleSpy: {
    log: ReturnType<typeof console.log>;
    error: ReturnType<typeof console.error>;
  };

  beforeEach(() => {
    consoleSpy = {
      log: console.log,
      error: console.error
    };

    console.log = () => {};
    console.error = () => {};
  });

  afterEach(() => {
    console.log = consoleSpy.log;
    console.error = consoleSpy.error;
  });

  it('should have info method that calls console.log', () => {
    let loggedMessage = '';
    console.log = (message: string) => {
      loggedMessage = message;
    };

    logger.info('test message');
    expect(loggedMessage).toBe('test message');
  });

  it('should have error method that calls console.error', () => {
    let errorMessage = '';
    console.error = (message: string) => {
      errorMessage = message;
    };

    logger.error('error message');
    expect(errorMessage).toBe('error message');
  });

  it('should have success method that calls console.log', () => {
    let successMessage = '';
    console.log = (message: string) => {
      successMessage = message;
    };

    logger.success('success message');
    expect(successMessage).toBe('success message');
  });
});