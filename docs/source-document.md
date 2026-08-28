# SourceDocument

`SourceDocument` is the stable input protocol before planning.

```js
{
  schemaVersion: 1,
  sourceType: 'text' | 'markdown' | 'json',
  title: string,
  rawContent: string,
  sections: [{ id, title, content }],
  metadata: object
}
```

Public API:

```js
Core.SourceDocument.normalize(input, options?)
Core.SourceDocument.validate(document)
```

Properties:

- JSON serializable and deterministic;
- no DOM nodes, functions, `element`, `slideElements`, coordinates or CSS;
- Markdown headings become sections;
- plain text is normalized into content blocks;
- structured JSON can provide title/metadata/sections directly, while `rawContent` remains a stable string representation.

Invalid normalized documents throw `SOURCE_DOCUMENT_INVALID` with a validation report.
