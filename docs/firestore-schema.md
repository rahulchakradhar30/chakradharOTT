# Firestore Schema (Scaffold)

This file summarizes the Firestore schema scaffold for Watch Parties, Trivia, X‑Ray overlays, Reactions, and Gamification.

Top-level collections
- `media/{mediaId}`: canonical media metadata and subcollections `xray`, `trivia`.
- `watchRooms/{roomId}`: active watch rooms. Subcollections: `participants`, `events_recent`, `triviaSessions`, `reactions_shards`.
- `triviaSets/{setId}`: reusable question banks.
- `users/{uid}`: profile and `stats`, `badges` subcollection.
- `badges/{badgeId}`: badge definitions.
- `leaderboards/{period_scope}`: snapshot docs for fast reads.

Design notes
- Use sharded counters for high-write reaction aggregates and keep a small `events_recent` sliding window for UI animations.
- Authoritative scoring and badge awarding must be done server-side (Cloud Functions) to avoid tampering.
- Archive long-term events to BigQuery or `events_archival` for analytics.

See `functions/` for Cloud Functions skeleton that implements scoring, aggregation, and badge-award hooks.
