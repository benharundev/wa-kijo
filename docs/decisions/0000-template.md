# ADR NNNN — <Short, decision-driven title>

**Date:** YYYY-MM-DD
**Status:** Proposed | Accepted | Deprecated | Superseded by ADR-XXXX
**Deciders:** <names or roles>

> Use this template for every architectural decision worth remembering.
> Copy the file, rename to the next sequential number (`0007-...`,
> `0008-...`), and replace the placeholder sections.
>
> Keep ADRs short. If you need more than 1500 words, you're describing
> *implementation*, not a *decision*. Move that detail into
> `docs/architecture.md` or a feature-specific README.

---

## Context

Describe the problem we're solving in one or two paragraphs. What forces are
at play? Why is this decision needed *now*? What constraints are non-negotiable
(stack, customer requirements, security policy)?

A reader who has never seen the codebase should be able to understand
**why** this decision matters from the Context section alone.

---

## Decision

State the decision in one or two sentences. Use the active voice and the
present tense ("We use Better Auth...", not "We will use" or "It was
decided to use").

If the decision involves a specific library, version, or pattern, name it
explicitly. Future readers will Ctrl-F for it.

---

## Alternatives considered

For each serious alternative we evaluated and rejected:

### Alternative A — <name>

- **What it is:** one sentence.
- **Why considered:** what made it appealing.
- **Why rejected:** the specific reason. Be honest — "we already know
  Library X" is a valid reason.

### Alternative B — <name>

(same structure)

### Alternative C — <name>

(same structure)

---

## Consequences

### Positive

- Bullet list of the benefits this decision unlocks.

### Negative

- Bullet list of the costs we accept by making this choice. Be honest.
- "We can't easily switch to X later because Y" is the most useful entry
  in this section.

### Neutral

- Things that change but aren't clearly good or bad — different mental
  model, different tooling, different vocabulary.

---

## Implementation notes (optional)

If the decision implies a specific implementation pattern that isn't
obvious from the codebase, sketch it here. Link to the canonical files
in the repo. Don't paste large code blocks — they'll go stale.

---

## References

- Related ADRs: ADR-XXXX, ADR-YYYY
- External: link to library docs, RFCs, or articles that informed the
  decision.
- Tickets: Linear issue IDs, support tickets.
