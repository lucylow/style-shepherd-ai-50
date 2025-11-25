/**
 * MSW Browser Setup
 * Use this in development or browser-based tests
 */

import { setupWorker } from 'msw/browser';
import { handlers } from './handlers';

export const worker = setupWorker(...handlers);

// Start the worker when this module is imported
if (typeof window !== 'undefined') {
  worker.start({
    onUnhandledRequest: 'bypass', // Don't warn about unhandled requests
  });
}

