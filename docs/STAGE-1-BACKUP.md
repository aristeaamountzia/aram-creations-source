# Permanent backup and guarded restore: stage-one design

The existing rotating backup is not a migration prerequisite. It lacks history parts and media bytes and can be overwritten by rotation.

## Demonstrated in isolation

`tests/stage1/backup-prototype.ts` is a fixture-only tool guarded by emulator-only configuration. It enumerates top-level collections and nested subcollections (including documents having only subcollections), preserves typed timestamps, bytes, references and geopoints, and captures local Storage media bytes/content types. A manifest contains document paths/counts, media paths/counts and SHA-256 checksums. The file is downloaded and verified before it is considered usable. Tampering fails verification.

Permanent IDs are create-only. The Storage Emulator does not enforce GCS generation preconditions, which was discovered by a failing test; the prototype adds an atomic create-only Firestore manifest before upload. A second attempt with the same backup ID is rejected. Failed uploads keep their manifest in the writing state and require a new ID; they are not marked verified.

The test restores into a new empty `stage1Restores/{namespace}/…` document/object namespace and verifies typed fields, a history subcollection and image bytes. It does not overwrite source documents or live order collections. Emulator objects disappear when the local suite stops; this verifies the algorithm rather than providing an actual durable production backup.

## Required production implementation before conversion

- A dedicated permanent private backup destination, unique immutable run IDs, restricted writers, protected manifest and retention/object-lock policy where supported. Use a separate protected copy; the rotating slots remain supplementary.
- A coherent snapshot: managed consistent Firestore export or an explicitly controlled write window/read-time strategy. The sequential fixture enumeration is not a global consistent snapshot under live concurrent checkout and is not production-ready.
- Include canonical products, projections, private review data, settings, orders, rate limits, notification outbox, history with all parts, conversion ledgers, media/original files and local unsaved option settings. Auth configuration/claims and deployed rule/config versions need their own verified capture; the fixture prototype does not export Auth accounts.
- Preserve native Firestore types, IDs, field absence, media content types, paths and token/revocation provenance. Verify every downloaded object and restore into an isolated project before conversion approval.
- Compare all restored document fields and media checksums, not just counts; verify emulator-to-real-project compatibility separately.

## Restore must not erase later commerce

Full disaster recovery and selective migration reversal are different operations. The fixture namespace restore is for verification. Production migration reversal must use an approved field allowlist and before/after journal. Within a transaction, compare each current transformed field to its expected post-migration value; reject conflicts and active reservations for manual review. Restore only the audited fields, never wholesale historical documents, stock, reservations, status, orders or notification state.

The test reverses only `colors`, preserves a later order and stock=5, rejects a later color change and rejects an active reservation. A general reversal engine for all option/settings fields, partial-batch recovery and production concurrency is not yet implemented. Historical orders and historical change snapshots remain unchanged.
