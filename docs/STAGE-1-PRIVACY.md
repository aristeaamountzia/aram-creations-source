# Aram Creations: stage-one public/private proposal

Status: emulator-tested proposal; no production conversion or rule deployment is authorized.

## Data layout

| Location | Access | Contents |
| --- | --- | --- |
| `jewelry/{id}` | Administrator only | Canonical complete product; existing IDs and legacy fields retained. Cost, storage, stock reservations, source/import metadata and original media references stay here. |
| `publicCatalog/{id}` | Anonymous read only when `showInShop == true` | Explicit allowlist of approved public fields and approved media/links. Derived from the canonical product. No raw source object, legacy fallbacks, internal bookkeeping or original/private URLs. |
| `productAdmin/{id}` | Administrator only | Review decisions, provenance and compatibility wrapper demonstrated in the fixture prototype. Production should reference the canonical product rather than duplicate unbounded raw data. |
| `settings/shop` | Administrator only | Full configuration, editor option lists, hidden options and private configuration. |
| `publicSettings/shop` | Anonymous read | Allowlisted display configuration only, including the public palette and display ordering. No AI/admin configuration. |
| `orders`, notification outbox, rate limits, history and backup manifests | Administrator/server only | Existing private operational records and all history subcollections. |
| `publicMedia/…` | Public read | Only media deliberately approved for publication. |
| `privateMedia/…`, originals and permanent backups | Administrator only | Paths/references rather than long-lived public download tokens. Short-lived authenticated media retrieval where needed. |

The emulator proposal uses stricter rules in `tests/stage1/*.proposed.rules`. Neither production rule file has been changed. The production release would require a separately approved rule/data/read-path conversion together; changing rules first would break the old public UI.

## Mixed-use notes

`description` is public. `notes` is mixed-use legacy content and is not categorically labelled private. The review prototype retains the exact original `notes`, sets a pending review decision, and does not publish it or copy it into `description` automatically. The administrator must classify each relevant product: public wording, internal notes, or mixed wording requiring a deliberate split. Products already having `description` keep it unchanged. A migration must retain provenance and reversal data without rewriting historical order snapshots.

## Hidden products and media

`showInShop: false` means no anonymous direct document access in the proposed model. Public collection queries must include `where('showInShop', '==', true)`; unfiltered queries are denied. Hidden catalog records remain available to the administrator. A product's availability state remains a separate concern: sold/public portfolio items must not be arbitrarily removed.

Private media exclusion applies to every representation: `mediaList`, `images`, `imageUrl`, `src`, `videoUrl`, `originalUrl` and hidden posted links. A hidden item cannot be republished by a legacy fallback. Existing Firebase download tokens are bearer access: the emulator confirms that knowing a valid token permits a download even when anonymous Storage SDK reads are denied. Future conversion must inventory/revoke tokens on media classified private or copy them to new private objects without tokens, then test old URLs. Storage rules alone cannot revoke a previously published token.

## Compatibility and release ordering

1. Approve classification rules and mappings before any production write.
2. Take a verified immutable backup, including history parts, media and operational records. Capture local unsaved option settings explicitly.
3. Implement a lossless administrator adapter. Back office, AI input, Excel/CSV, duplication, history and backup continue to see their original fields. The prototype tests exact round-trip reconstruction, Excel generation and history/Vinted behavior; it is not a complete integration of every screen.
4. Build the public projection through a trusted publisher with an explicit field allowlist. Unknown fields default to unpublished. Restrict direct public projection writes to that publisher; production hardening must validate the projection schema, not merely trust client admin writes.
5. Synchronize product edits, bulk edits, quick sale, ordering, duplication, deletion, Vinted, undo/redo and restoration with the publisher. Checkout must refresh the projection after reservation/status changes. Test failure/retry consistency before release.
6. Prepare and test an atomic rollout of new public read paths and restrictive rules; do not leave old publicly readable copies or private URLs behind. The public query contract, templates and platform visibility must be validated on a full test copy.
7. Present exact data changes, rule diff, migration dry run, checks and reversal plan for approval. No production switch is included in stage one.

## Audit result (repository baseline)

The separate JSON audit records the demonstrated public access and business-rule mismatch. It does not claim that a complete deployed-rules audit was performed. Admin SDK bypasses rules, so emulator rule tests use both anonymous and non-admin browser SDK contexts; server-only operations are tested separately.
