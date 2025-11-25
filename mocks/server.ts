/**
 * MSW Node Setup
 * Use this in Node.js tests (Jest, Vitest, etc.)
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

export const server = setupServer(...handlers);

