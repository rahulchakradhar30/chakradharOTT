const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

/**
 * Trigger: on trivia response write
 * - Validate response
 * - Compute score for the user for this session
 * - Update session leaderboard snapshot
 */
exports.onTriviaResponse = functions.firestore
  .document('watchRooms/{roomId}/triviaSessions/{sessionId}/responses/{uid}')
  .onWrite(async (change, context) => {
    const { roomId, sessionId, uid } = context.params;
    const after = change.after.exists ? change.after.data() : null;
    if (!after) return null; // ignore deletes

    // Placeholder: compute score (implement scoring rules here)
    const computedScore = (after.answers || []).reduce((acc, a) => acc + (a.isCorrect ? 100 : 0), 0);

    const leaderboardRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}/leaderboard/${uid}`);
    await leaderboardRef.set({ uid, score: computedScore, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

    return null;
  });


/**
 * Trigger: on reaction shard update
 * - Aggregate shards into a totals doc for fast client reads
 */
exports.onReactionShardUpdate = functions.firestore
  .document('watchRooms/{roomId}/reactions_shards/{shardId}')
  .onWrite(async (change, context) => {
    const { roomId } = context.params;
    const shardsSnap = await db.collection(`watchRooms/${roomId}/reactions_shards`).get();
    const totals = {};
    shardsSnap.forEach(doc => {
      const data = doc.data();
      const counts = data.counts || {};
      Object.keys(counts).forEach(k => { totals[k] = (totals[k] || 0) + (counts[k] || 0); });
    });

    const totalsRef = db.doc(`watchRooms/${roomId}/reactionTotals/summary`);
    await totalsRef.set({ totals, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return null;
  });


/**
 * Callable function: evaluate and award badges
 * - This should be called by trusted backend workflows or admin UI
 */
exports.awardBadge = functions.https.onCall(async (data, context) => {
  // Security: ensure caller is authenticated and has admin claim (implement claims check in production)
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required');

  const { uid, badgeId, contextInfo } = data;
  if (!uid || !badgeId) throw new functions.https.HttpsError('invalid-argument', 'uid and badgeId required');

  const badgeRef = db.doc(`badges/${badgeId}`);
  const userBadgeRef = db.doc(`users/${uid}/badges/${badgeId}`);
  const badgeSnap = await badgeRef.get();
  if (!badgeSnap.exists) throw new functions.https.HttpsError('not-found', 'Badge not found');

  await userBadgeRef.set({ awardedAt: admin.firestore.FieldValue.serverTimestamp(), context: contextInfo || null }, { merge: true });
  return { success: true };
});
