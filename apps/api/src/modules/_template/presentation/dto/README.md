# DTO re-exports

Module-specific DTOs are defined as **Zod schemas in `@wa-kijo/shared`** (per
ADR-0004). This folder re-exports them with the names the controller imports
from, so a contributor can find every DTO referenced in `<module>.controller.ts`
without leaving the module folder.

```ts
// example.dto.ts (placeholder)
export {
  CreateExampleSchema,
  type CreateExampleDto,
  GetExampleSchema,
  type GetExampleDto,
} from '@wa-kijo/shared';
```

If the DTO is **truly local** (used only inside this module — never shared with
the frontend), define it inline here as a Zod schema. Don't define a duplicate
of a `@wa-kijo/shared` schema.
