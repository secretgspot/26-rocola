# Station Recovery Runbook

## Scope
Use this when Rocola playback appears stalled, looping one item, or not advancing with zero clients connected.

## Quick Health Checks
1. Check station runtime/lag from admin health:
   - `GET /api/admin/health/realtime`
   - Confirm `station.lagMs` is not continuously growing.
2. Check current playback pointer:
   - `GET /api/queue/current`
3. Check queue state:
   - `GET /api/queue`

## Cron Validation (Production)
1. Verify Vercel cron exists for:
   - `path: /api/station/tick`
   - schedule at least once per minute.
2. Verify secrets:
   - `STATION_TICK_SECRET` is set.
   - `CRON_SECRET` matches `STATION_TICK_SECRET`.
3. Trigger a manual tick:
   - `POST /api/station/tick` with `Authorization: Bearer <CRON_SECRET>`.

## Common Failure Modes
### Cron not firing
- Symptom: `station.lagMs` keeps increasing, playback does not progress without clients.
- Fix: repair cron config and secret mismatch; re-run manual tick to confirm.

### Stale playback pointer
- Symptom: same queue item keeps appearing, timeline/end-screen mismatch.
- Fix: `POST /api/station/tick` to trigger reconciliation; check `playback-log.ndjson` for `reconciled: true`.

### Neon transient outage
- Symptom: API 5xx, stalled progression.
- Fix:
  - wait for DB recovery,
  - then manually call `/api/station/tick`,
  - verify `/api/queue/current` updates.

## Replay/Recovery Procedure
1. Confirm queue still has playable rows (`GET /api/queue`).
2. Trigger manual station tick once.
3. If still stalled, trigger tick 2-3 more times (spaced by 1s).
4. Re-check:
   - `/api/queue/current` changed or moved to `null` when exhausted.
   - `/api/admin/health/realtime` reports low `station.lagMs`.

## Debug Artifacts
- Local debug stream:
  - `docs/debug/playback-log.ndjson`
- Useful markers:
  - `tick_advance`
  - `ended_advance`
  - `queue_next`
  - `reconciled: true`

