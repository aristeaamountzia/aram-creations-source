# Stage one — isolation, characterization and privacy plan

Date: 2026-10-14. Upstream base: `44ce32c832a1854b12a9b398f64790dc9d4daf42`.
Branch: `codex/stage-1-isolation-2026-10-14`.

No new shop features, production data conversion, Firebase rule deployment, merge or site deployment are part of this stage. Production `firestore.rules`, `storage.rules`, `firebase.json`, product rendering, order pricing/reservation/cancellation logic and source IDs remain unchanged. Stage-one tests deliberately characterize known defects rather than silently fixing them.

## Changes

- Optional strict emulator mode for the browser and server database connections, using `demo-aram-stage1` only and loopback Auth/Firestore/Storage hosts. Invalid test configuration fails instead of falling back to production.
- An allowlisted test-process environment without cloud/provider credentials. Worker TCP/fetch connections to external hosts fail. Browser requests to nonlocal hosts are aborted; production Firebase endpoint attempts are explicitly checked.
- Test-mode email suppression; scheduled backup/email handlers execute only against emulator services. External AI, media signing, Wix and generic API/import routes are disabled in the sandbox.
- Legacy production-reaching integration scripts now fail before credential reads outside the emulator guard; deployment verification is explicitly disabled for this stage. Their old credential-based bodies have not been migrated into safe new executables. Use only the new runner.
- Emulator-only public projection/rules prototype, mixed-notes review, diagnostic color mapping, immutable backup and guarded selective reversal prototype. These are not connected to the production UI.
- Added pinned development test tools: Firebase CLI 13.35.1 (Java 17-compatible emulator version), rules-unit-testing 5.0.0 and Playwright 1.58.2. Existing direct runtime dependency versions were not upgraded. Optional `re2` native builds are disabled.
- A branch-specific Netlify ignore command and `[skip ci]` commit prevent automated branch publication. No PR is opened.

## Run locally

Requirements: Node.js, Java 17+, installed dependencies and a local Chromium executable. Tested here with Node 24.19.0, Java 17.0.20 and Chromium 153.0.8010.0. The repository normally requests Node 22; Node 22 execution remains unverified.

```bash
pnpm install --frozen-lockfile
pnpm exec firebase setup:emulators:firestore
pnpm exec firebase setup:emulators:storage
pnpm exec playwright install chromium --only-shell
pnpm test:unit
pnpm lint
pnpm lint:stage1
pnpm test:stage1
pnpm build
```

Emulator binaries are downloaded before test workers start. The test child intentionally does not inherit proxies or cloud credentials. If a local Chromium is already installed, set only `ARAM_CHROMIUM_EXECUTABLE=/absolute/path/to/chromium` for `pnpm test:stage1`. The normal Playwright CDN returned truncated archives in this environment; a separately installed local Chromium binary was used. It is not included in the repository or application build.

Do not run `firebase deploy`, `netlify deploy`, legacy credential-based integration scripts, or the production deployment verifier. No production key is needed for stage one. A stopped emulator suite is not an invitation to use a real Firebase project.

## Checks

| Check | Result |
| --- | --- |
| Existing local unit/API-fixture checks | 30 passed, 0 failed |
| Emulator/isolation/browser characterization suite | 11 passed, 0 failed, 0 skipped (including Chromium shop/admin checks) |
| TypeScript application check | Passed |
| Additional stage-one/server/prototype type check | Passed |
| Frontend, server and nine Netlify function bundles | Built successfully |
| Whitespace/diff check | Passed |

Expected `PERMISSION_DENIED` messages belong to assertions that anonymous/member access must fail. Build retains its pre-existing large-bundle warning. The back office still has `@ts-nocheck`; the added stage-one config checks the new isolation/prototype files, not a wholesale back-office type conversion.

The suite uses actual Auth/Firestore/Storage emulators, actual browser SDK login and Storage upload, and Chromium storefront/admin navigation. It verifies current hidden-product/media rendering, server order transactions, retries, concurrent purchase attempts, cancellation, suppressed emails, scheduled backups, chunked history undo/redo, Vinted refresh conflict handling, prototype privacy rules and selective backup reversal.

The compatibility prototype verifies lossless admin reconstruction, duplication field preservation, AI payload availability without an AI-provider call, and Excel generation. It is not a complete UI implementation of the new schema or a manual test of every existing editor/AI/CSV workflow. GIF/video editing, video compression in a real browser, all CSV variations and every bulk editor interaction remain outside the completed checks.

## Stock finding — separate decision required

The unchanged real order handler was called against a synthetic product with stock=3, price=20 and quantity=1. Two simultaneous distinct submissions produced one accepted order and one conflict. The accepted order set stock to **0** and held the listing. Repeating the same submission did not create another order. Cancellation set stock to **1**; repeated cancellation stayed at 1; reopening a cancelled order was rejected.

The hardcoded `remaining = 0`, existing fixture expecting stock=9 to become 0, and quantity=1 restriction show an intentional exclusive-listing reservation policy in the current implementation. Whether that policy matches the owner's intended meaning of stock is unconfirmed. If stock represents interchangeable units, 3 -> 0 -> 1 loses two units and is a defect. If every listing is intrinsically a unique object, stock values above 1 conflict with that policy.

No correction was made. A separate proposed change for multi-unit inventory would use `remaining = previousStock - reservedQuantity`, permit concurrent orders up to actual stock, and add the recorded reserved quantity exactly once to the current stock on cancellation, preserving subsequent replenishment. Status transitions, quick sale, Vinted and old reservations require dedicated tests and approval. Gift wrapping must not include this change.

## Mapping dry run

Only the approved spelling target is encoded: `Μοβ -> Μωβ`. Fixture dry run removes both spellings within one product, reports palette conflicts, does not mutate input and proposes no second change once normalized. No production write is performed. The prior read-only catalog audit found 22 unique products containing the two spellings (2 using Μοβ, 21 using Μωβ, one using both); this is an audit snapshot, not a locked conversion count.

`Ρητίνη`, `Υγρό Γυαλί`, `Υγρό Γυαλί (Resin)`, `Πέτρα`, `Φυσική Πέτρα`, `Στρας` and `Κρύσταλλα / Στρας` have no automatic mappings. Case differences in source-platform versus display-platform fields need field-specific review. No production option merge, category/status merge or historical rewrite occurred.

## Privacy and backup references

- [Specific public/private design](STAGE-1-PRIVACY.md)
- [Repository-rule audit](STAGE-1-RULES-AUDIT.json)
- [Permanent backup and safe restoration](STAGE-1-BACKUP.md)

## Netlify and outstanding limits

The accessible published deployment is `6ac7200b6d4c8515319c82bb`, created 2026-10-08 via API, with no branch/commit/build ID. The available metadata tool does not expose Git linkage, production branch, branch-deploy settings or build settings. Thus automatic deployment from a specific branch remains unconfirmed. No environment-variable enumeration, secret read or dashboard mutation was attempted in stage one.

The new branch is blocked by its Netlify context `ignore = "exit 0"` and its commit carries `[skip ci]`; no preview is requested. A build hook could override ignore logic and is outside the verified metadata; no hook is invoked here. Production publication configuration must be reviewed through metadata-only access before any future approved release.

Production rule identity/configuration, real IAM/retention enforcement, a globally consistent export under live checkout, production migration, token revocation, complete compatibility of every UI route with the proposed schema, and execution on Node 22 remain unverified. These limits must not be replaced with claims of production readiness.

Stop after stage one for owner evaluation. Implementing new features, fixing inventory policy, deploying rules, running conversion or publishing the site requires the next explicit approval.
