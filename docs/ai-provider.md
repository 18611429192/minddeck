# AI Story Planner

## Responsibility

AI is an optional Planner implementation:

```text
SourceDocument -> AIStoryPlanner -> DeckPlan -> DeckSpec -> Core.Composer
```

It may understand source material, deduplicate facts, create a story arc, choose role hints and content intents, and propose takeaways. It may not output final HTML/CSS, coordinates, slideElements, MindDeck Project objects or renderer instructions.

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
  fetch // optional injection for tests/hosts
})
```

Any OpenAI-compatible chat-completions endpoint can be used, including compatible deployments of OpenAI, Qwen, DeepSeek, llama.cpp, vLLM or Ollama.

## Structured output pipeline

```text
LLM JSON text
 -> parse/extract JSON
 -> sanitize known DeckPlan fields
 -> DeckPlan schema validation
 -> retry (bounded)
 -> deterministic fallback
```

Malformed JSON, missing/invalid roles, schema rejection, timeout and provider failure are covered by mock-provider tests. Unknown fields are not copied into the canonical DeckPlan.

## Key handling

- no real key is stored in source, examples or snapshots;
- `describe()` returns only `[configured]` or `[missing]` for the key;
- prompts and warnings do not include the key;
- applications should inject secrets at runtime according to their host security model.

## Offline behavior

If the provider is absent or all attempts fail, `AIStoryPlanner.plan()` returns the deterministic Step 7 plan with `mode: 'fallback'`. Basic deck generation therefore does not depend on an AI service.
