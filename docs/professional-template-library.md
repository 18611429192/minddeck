# V10 Step 5 — Professional Template Library

## Scope

Step 5 expands the existing `Core.Composer -> Project -> Runtime` pipeline. It does not add a renderer, project model, editor matcher, or workflow change.

## Library

- Roles: 20
- Templates: 72
- Legacy templates retained: 24
- Professional templates added: 48
- Professional semantic families added: 24
- Parameterized templates: 58 / 72 (80.6%)

Expanded roles:

`agenda`, `problem`, `solution`, `table`, `matrix`, `case`, `roadmap`, `architecture`

They join the existing roles:

`cover`, `section`, `statement`, `cards`, `compare`, `process`, `metrics`, `trend`, `timeline`, `image`, `quote`, `conclusion`

## Professional families

The new library covers agenda/chapter overview, problem diagnosis/root cause, solution frameworks/options, case story/proof, roadmap horizon/milestones, chart analysis/story, table report/comparison, matrix 2x2/strategy, before-after, pros-cons, KPI dashboard, big-number, system architecture/flow, testimonial proof, and summary/action close.

Every manifest is plain serializable data. Families reuse the existing structural compiler primitives and Parametric Template schema.

## Matcher / Capacity

Matcher still applies hard `Capacity.fits` and required-slot checks first. Professional manifests additionally expose semantic traits and an `idealItems` capacity target. Capacity fitness is a ranking signal, not a second layout engine.

For the eight new roles, professional semantic affinity is active immediately. For existing V9.9 roles, professional subtypes remain available as candidates without displacing the Step 0 frozen Golden by default. Fine-grained intent routing for subtypes is intentionally reserved for Step 6 Design Intent.

## Allocator

The allocator keeps the V9.9 deterministic template/family penalties for legacy assignments and adds professional-library balancing for:

- recent family reuse
- parametric primitive reuse
- repeated family within the same role
- existing adjacent family and template reuse penalties

No selection logic is placed in Editor.

## Diversity quality

`Composer.Diversity` reports:

- pages
- unique templates / families / parametric families
- repeated template rate
- repeated family rate
- adjacent family reuse
- maximum family share
- unsuitable assignment count
- capacity violation count
- deck role coverage
- catalog role coverage

The Step 5 golden fixture is a 20-page deck (root cover + 19 explicit slides) covering every non-cover role once.

## Compatibility

The original 24 template IDs remain in the same registry. Existing V10 Step 0 golden snapshots are not rewritten by Step 5. The public `Core.Composer.templates` view is the merged 72-template library.

GitHub workflows are outside Step 5 and are not modified.
