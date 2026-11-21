# Tasks

## 1. The historical crew-standalone change is archived with its tool-maintenance delta synchronized

- [x] 1.1 Recheck the current baseline against the original delta before running `delivery openspec archive crew-standalone --yes`; retain default synchronization and validation, and report any duplicate or conflict without forcing it.
- [x] 1.2 Preserve the five unchanged historical archive files, carry their exact tool-maintenance delta in this housekeeping change, and restore draft canonical specs to the target branch; check archive/delta equality and the scoped diff.
- [x] 1.3 Pass strict all-item and archived-task OpenSpec validation, then rehearse non-writing bot finalization against target canonical blobs and check that it regenerates the original synchronized spec.

## Workflow follow-up

- Let the delivery bot promote the completed draft and finalize this housekeeping change, synchronizing the carried delta; inspect the resulting PR state and finalization metadata without marking ready manually.
