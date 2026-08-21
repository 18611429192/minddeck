import '../runtime/shared-core.js';

export const Core = globalThis.MindDeckCore;
if (!Core) throw new Error('MindDeck shared core failed to initialize');
