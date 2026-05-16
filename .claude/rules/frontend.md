# Frontend Rules — Next.js + shadcn/ui

> **Scope:** Loaded when working on files under `apps/web/`. **Status:**
> Skeleton — to be filled in during Phase 4 (frontend bootstrap).

## Stack

- Next.js 15 (App Router)
- TypeScript strict mode
- Tailwind CSS + shadcn/ui
- TanStack Query for server state
- Zod schemas (shared from `@wa-kijo/shared`)
- React Hook Form for form state

## Component organisation

```
src/components/
├── ui/           # shadcn/ui primitives — never edit directly; re-run CLI to update
├── layout/       # Sidebar, TopBar, OrgSwitcher, UserMenu
└── can.tsx       # <Can do="permission"> — UX hint only, NOT a security boundary
```

- Server components by default. Add `'use client'` only when you need browser
  APIs, event handlers, or hooks.
- Page components under `app/` are server components and can `async` + `await`.
- Layout/shell components that read session client-side are `'use client'`.

## Form patterns

All forms use **React Hook Form + Zod resolver**:

```ts
const form = useForm<Values>({ resolver: zodResolver(Schema) });
```

- Schema lives in `packages/shared/` if reused by the API. UI-only schemas (e.g.
  confirm-password) can live in the page file.
- Field errors rendered as `<p className="text-xs text-destructive">`.
- Server errors stored in `useState<string | null>` above the form.

## Server vs client component decisions

| Need                                       | Component type                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Read session server-side (layout guard)    | Server component, use `getSession({ fetchOptions: { headers: await headers() } })` |
| Read session client-side (hooks, reactive) | Client component, use `useSession()` from `@/lib/auth-client`                      |
| Static UI, no interactivity                | Server component                                                                   |
| Form, dropdown, dialog, toggle             | Client component                                                                   |

## Auth-aware fetcher

`src/lib/fetcher.ts` wraps `fetch` with `credentials: 'include'`. Always use
this for TanStack Query `queryFn`s:

```ts
const { data } = useQuery({
  queryKey: ['contacts', workspaceId],
  queryFn: () => fetcher<ContactList>(`/api/v1/contacts`),
});
```

On 401 it redirects to `/sign-in`. On non-OK it throws `ApiError` with `code`,
`message`, and optional `fields`.

## shadcn/ui customisation

- CSS variables defined in `src/app/globals.css`. Change colours there, not in
  `tailwind.config.ts`.
- Components in `src/components/ui/` are owned by this repo — edit freely.
- Dark mode: `attribute="class"` on `ThemeProvider`. Toggle via
  `<ThemeToggle />`.

## RBAC in the frontend

```tsx
// UX hint — server guards are the real check
const can = useCan();
if (can('member:invite')) { ... }

<Can do="member:invite">
  <InviteButton />
</Can>
```

`useCan()` reads `session.user.role` (populated by the Better Auth org plugin).
`hasPermission()` from `@wa-kijo/shared` is the authority — never inline the
permission logic.

## i18n

All user-facing strings are placeholders pending Phase 5 i18n wiring. Don't
hard-code English strings in new components — add a `// i18n: <key>` comment
where the translation key would go.

## Error boundaries

Not yet wired — add `error.tsx` files next to `page.tsx` when you add a page
that can meaningfully recover (e.g., reload org data).
