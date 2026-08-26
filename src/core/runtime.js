import { createMindDeckCore } from '../runtime/index.js';

// Core adapters consume the ESM source graph directly. The browser IIFE runtime is a build artifact.
export const Core=createMindDeckCore('source');
