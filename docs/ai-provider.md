# AI Story Planner / DeepSeek

## Responsibility

AI is an optional planning and editing layer:

```text
SourceDocument -> AIStoryPlanner -> DeckPlan -> DeckSpec -> Core.Composer
Existing Project -> AICommand -> validated Patch -> existing editable elements
```

AI may understand source material, deduplicate facts, create a story arc, choose role hints and content intents, propose takeaways, or produce bounded edits for existing text/chart/table/diagram elements. It may not output final HTML/CSS, coordinates, slideElements, MindDeck Project objects or renderer instructions.

## Provider abstraction

`OpenAICompatibleProvider` accepts:

```js
new Core.OpenAICompatibleProvider({
  baseUrl,
  apiKey,
  model,
  timeout,
  temperature,
  maxTokens,
  thinking,         // enabled / disabled / provider default
  reasoningEffort,  // low / high / max
  fetch              // optional injection for tests/hosts
})
```

Any OpenAI-compatible chat-completions endpoint can be used.

MindDeck also exposes a DeepSeek preset:

```js
const provider = Core.DeepSeek.createProvider({
  preset: 'fast', // or quality
  apiKey
});
```

Current presets:

- `fast` -> `deepseek-v4-flash`, non-thinking, suitable for normal compose/edit operations;
- `quality` -> `deepseek-v4-pro`, thinking + high reasoning effort, suitable for complex story planning.

The DeepSeek OpenAI-compatible base URL is `https://api.deepseek.com`.

## Structured output pipeline

```text
LLM JSON text
 -> parse/extract JSON
 -> sanitize known DeckPlan/Patch fields
 -> schema / target-id validation
 -> retry (bounded)
 -> deterministic planner fallback (deck generation only)
```

Deck planning additionally enforces the requested slide count before it can return `mode: 'ai'`.

AICommand uses IDs from the supplied Project snapshot as a capability boundary. Unknown node/element IDs are ignored/rejected. Geometry and styling fields are never copied from the model into the canonical patch.

## Key handling in the browser app

The public source code never contains a real API key.

For the GitHub Pages/browser application:

- the user types the key at runtime;
- the key is stored only in `sessionStorage` under the current browser session;
- the key is never written to Project data, DeckPlan, DeckSpec, localStorage, snapshots, logs, examples or exports;
- `describe()` returns only `[configured]` or `[missing]` for the key;
- the user can clear the key from the AI settings panel at any time.

The repository can therefore remain public without publishing the user's DeepSeek credential.

## AI editing contract

The editor supports three scopes:

- current selection;
- current slide;
- whole deck.

By default AI edits content only and preserves position, size, z-order and style. Native chart/table/diagram data is normalized and validated before it is applied. AI changes participate in the existing `checkpoint()` history and can be undone with Ctrl/Cmd+Z.

A redesign is only allowed when the user explicitly enables the redesign checkbox. That path goes back through `Core.Composer`, rather than allowing the model to write coordinates or template IDs.

## Offline behavior

If the provider is absent or all DeckPlan attempts fail, `AIStoryPlanner.plan()` returns the deterministic planner result with `mode: 'fallback'`. Basic deck generation therefore does not depend on an AI service.

AI editing does not invent a fallback edit: if a safe validated patch cannot be produced, the operation fails without mutating the Project.
