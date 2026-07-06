const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Helper: compute score for a single answer
function computeAnswerScore(question, choiceId, timeMs, settings = {}){
  const base = question && question.points ? question.points : 100;
  const isCorrect = question && question.correctId === choiceId;
  if (!isCorrect) return { score: 0, isCorrect };
  // time bonus: faster answers get small bonus
  const maxBonus = settings.maxTimeBonus || 50;
  const timeLimit = settings.timePerQuestionMs || 10000;
  const bonus = Math.max(0, Math.round(((timeLimit - Math.min(timeMs || timeLimit, timeLimit))/timeLimit) * maxBonus));
  return { score: base + bonus, isCorrect };
}

/**
 * Callable: start a trivia session in a watch room
 * - Creates a session doc with provided question set or inline questions
 */
exports.startTriviaSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  const { roomId, sessionId, questionSetId, questions = [], settings = {} } = data;
  if (!roomId || !sessionId) throw new functions.https.HttpsError('invalid-argument', 'roomId and sessionId required');

  const sessionRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}`);
  const payload = {
    startedBy: context.auth.uid,
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: 'waiting',
    settings: Object.assign({ questionCount: questions.length || 10, timePerQuestionMs: 10000 }, settings),
    questionSetRef: questionSetId ? db.doc(`triviaSets/${questionSetId}`) : null,
    questions: questions || [],
  };
  await sessionRef.set(payload, { merge: true });
  return { success: true };
});


/**
 * Trigger: on trivia response create
 * - Compute answer score
 * - Atomically update per-user leaderboard entry for the session
 */
exports.onTriviaResponseCreate = functions.firestore
  .document('watchRooms/{roomId}/triviaSessions/{sessionId}/responses/{responseId}')
  .onCreate(async (snap, context) => {
    const { roomId, sessionId, responseId } = context.params;
    const data = snap.data();
    if (!data) return null;

    const uid = data.uid || data.userId;
    const questionId = data.questionId;
    const choiceId = data.choiceId;
    const timeMs = data.timeMs || 0;

    if (!uid || !questionId) return null;

    const sessionRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}`);
    const sessionSnap = await sessionRef.get();
    if (!sessionSnap.exists) return null;
    const session = sessionSnap.data();

    // Find question object
    let question = null;
    if (session.questions && session.questions.length) question = session.questions.find(q=>q.id===questionId);
    // TODO: fallback to questionSetRef

    const { score, isCorrect } = computeAnswerScore(question || {}, choiceId, timeMs, session.settings || {});

    const leaderboardRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}/leaderboard/${uid}`);

    // atomically increment user's score and counts
    await db.runTransaction(async (tx) => {
      const lbSnap = await tx.get(leaderboardRef);
      const prev = lbSnap.exists ? lbSnap.data() : { score:0, correct:0, answered:0 };
      const newScore = (prev.score || 0) + (score || 0);
      const newCorrect = (prev.correct || 0) + (isCorrect ? 1 : 0);
      const newAnswered = (prev.answered || 0) + 1;
      tx.set(leaderboardRef, { uid, score: newScore, correct: newCorrect, answered: newAnswered, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

      // mark response processed to prevent reprocessing (idempotency)
      tx.update(snap.ref, { processed: true, processedAt: admin.firestore.FieldValue.serverTimestamp(), pointsAwarded: score });
    });

    return null;
  });


/**
 * Callable: finalize a trivia session
 * - Computes ranks and writes a final leaderboard snapshot
 */
exports.finalizeTriviaSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Authentication required');
  const { roomId, sessionId } = data;
  if (!roomId || !sessionId) throw new functions.https.HttpsError('invalid-argument', 'roomId and sessionId required');

  const lbCol = db.collection(`watchRooms/${roomId}/triviaSessions/${sessionId}/leaderboard`);
  const snaps = await lbCol.get();
  const entries = [];
  snaps.forEach(s => entries.push(Object.assign({ id: s.id }, s.data())));
  entries.sort((a,b)=> (b.score||0) - (a.score||0));
  const ranked = entries.map((e,i)=> ({ uid: e.uid, score: e.score||0, rank: i+1 }));

  const finalRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}/finalLeaderboard/summary`);
  await finalRef.set({ ranked, finalizedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  // Optionally: award badges for winners (simple example: top 1 gets 'quiz_winner')
  if (ranked.length>0){
    const winner = ranked[0];
    const userBadgeRef = db.doc(`users/${winner.uid}/badges/quiz_winner`);
    await userBadgeRef.set({ awardedAt: admin.firestore.FieldValue.serverTimestamp(), context: { roomId, sessionId } }, { merge: true });
  }

  // update session status
  const sessionRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}`);
  await sessionRef.set({ status: 'finished', finishedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });

  return { success: true, top: ranked.slice(0,5) };
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
