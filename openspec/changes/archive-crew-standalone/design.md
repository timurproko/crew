# Design

## Context

See `proposal.md` for motivation. `delivery openspec archive crew-standalone --yes` completed cleanly and produced `openspec/changes/archive/2026-11-21-crew-standalone/`, with five unchanged files and one added plus one modified canonical requirement. However, delivery run 44930357661 blocked the draft with `draft-delivery-specs-diverged`.

## Goals / Non-Goals

**Goal:** Preserve the historical archive and deliver its exact original specification updates through existing bot finalization.

**Non-goals:** No new runtime behavior, altered historical requirements, workflow changes, repository settings changes, or manual ready mutation.

## Decisions

- `publish-openspec-finalization.mjs` calls `reconcileFinalization`, whose draft path invokes `prepareSinglePrDelivery` with canonical target-branch blobs from `readCanonicalSpecs`. Before sandbox archiving, `canonicalSpecsMatch` requires equal file counts and byte equality at every path under `openspec/specs/`. It compares the entire canonical tree, not only capabilities in the linked delta. Any draft spec divergence fails even when a matching delta exists.
- Keep the five historical archive files untouched. Restore the draft canonical spec from current `origin/main`, and carry a byte-identical copy of the historical delta in this active housekeeping change. Remove `skip_specs: true` because this change now delivers that pending delta. This preserves the required final spec while allowing the bot to perform its normal archive/sync operation.
- Do not simply restore the baseline while retaining `skip_specs`: that would lose the pending spec update. Adding only a delta without restoring the baseline would still fail the early equality check. Removing Automation would evade linked finalization rather than deliver the declared change.
- Use a non-writing `prepareSinglePrDelivery` rehearsal against current target blobs to verify that the generated canonical spec equals the earlier successful historical archive's output. Local rehearsal must not finalize the actual branch; readiness, the finalization commit, and acceptance metadata remain bot-owned.

## Risks / Trade-offs

- The original delta is present in both the preserved historical archive and this delivery change → they represent the same pending update, not two active updates; only this active change is synchronized by the bot.
- The default branch may advance → merge it before pushing, then recheck exact canonical equality; report actual conflicts instead of forcing edits.

## Migration Plan

The coordinator authorized this correction after the bot refusal. Retain the historical archive, carry its delta in the active housekeeping change, restore target canonical bytes, validate all items and archived tasks, and rehearse finalization. Push a normal corrective commit on the existing PR. Inspect bot promotion and finalization results without manually marking ready or changing automation. Pull any bot finalization commit before further pushes.
