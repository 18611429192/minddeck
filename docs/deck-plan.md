# DeckPlan and Deterministic Planner

`DeckPlan` is the layout-free protocol between source understanding and DeckSpec.

```js
{
  schemaVersion: 1,
  purpose: string,
  audience: string,
  tone: string,
  targetSlides: number,
  storyArc: string[],
  sections: [{ id, title }],
  slideIntents: [{
    goal,
    roleHint,
    title,
    topic,
    facts,
    takeaway,
    chartIntent,
    tableIntent,
    diagramIntent,
    imageIntent,
    emphasis
  }],
  source: { title, sourceType }
}
```

It intentionally has no `x/y/w/h`, CSS, DOM, element or slideElements.

Public API:

```js
Core.Planner.validateDeckPlan(plan)
Core.Planner.deterministicPlan(sourceDocument, { targetSlides, purpose, audience, tone })
Core.Planner.toDeckSpec(plan, { theme, seed })
```

The deterministic planner is the offline, regression and AI-fallback implementation. It recognizes headings, basic numeric/data content, tables and processes; merges excessive source fragments; may split dense intents; and uses `targetSlides` as a hard planning bound. The resulting DeckSpec is validated before it can enter `Core.Composer`.
