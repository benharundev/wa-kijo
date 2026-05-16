<!-- Thanks for the PR. Fill in the boxes below — empty PRs slow down review. -->

## Summary

<!-- One-sentence description of what changes and why. -->

## Type of change

- [ ] Bug fix (non-breaking)
- [ ] New feature (non-breaking)
- [ ] Breaking change (`BREAKING CHANGE:` footer + CHANGELOG + upgrade guide entry required)
- [ ] Docs only
- [ ] Refactor (no behavior change)
- [ ] Test / CI / build

## Related issue(s)

<!-- Closes #N, Refs #N, or "no related issue" -->

## How to verify

<!-- Steps a reviewer can follow locally, or a curl command, or a screenshot. -->

## Checklist

- [ ] My commits use [Conventional Commits](https://www.conventionalcommits.org/) and are signed off (`git commit -s`)
- [ ] `pnpm typecheck` passes locally
- [ ] `pnpm test` passes locally
- [ ] `pnpm lint` passes locally
- [ ] For schema changes: `pnpm db:migrate` generates a clean migration
- [ ] For schema / behavior changes: `pnpm test:integration` passes (Docker required)
- [ ] I've added or updated tests for the change
- [ ] I've updated `CHANGELOG.md` under `[Unreleased]` if user-visible
- [ ] I've updated `docs/upgrade-guide.md` if this is a breaking change

## Risk + rollback

<!-- What could go wrong? How would a reviewer roll this back if it breaks production? -->

## Screenshots / curl (if user-visible)

<!-- Optional but appreciated for any UI or API change. -->
