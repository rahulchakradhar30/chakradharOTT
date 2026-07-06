const admin = require('firebase-admin');
const { expect } = require('chai');

describe('onTriviaResponse integration', function(){
  this.timeout(20000);

  before(() => {
    // Point to emulator if not already
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-project' });
  });

  it('writes leaderboard entry when response is created', async () => {
    const db = admin.firestore();
    const roomId = 'testRoom1';
    const sessionId = 'session1';

    // create session with one question
    const sessionRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}`);
    await sessionRef.set({
      startedBy: 'host1',
      startedAt: admin.firestore.FieldValue.serverTimestamp(),
      status: 'in_progress',
      questions: [{ id: 'q1', correctId: 'c1', points: 100 }],
      settings: { timePerQuestionMs: 10000 }
    });

    // create response (this should trigger the Cloud Function running in emulator)
    const responseRef = db.collection(`watchRooms/${roomId}/triviaSessions/${sessionId}/responses`).doc();
    await responseRef.set({ uid: 'userA', questionId: 'q1', choiceId: 'c1', timeMs: 500 });

    // poll for leaderboard entry
    const lbRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}/leaderboard/userA`);
    let attempts = 0;
    let lbSnap = await lbRef.get();
    while (!lbSnap.exists && attempts < 20){
      await new Promise(r=>setTimeout(r, 500));
      lbSnap = await lbRef.get();
      attempts++;
    }

    expect(lbSnap.exists).to.be.true;
    const data = lbSnap.data();
    expect(data).to.have.property('score');
    expect(data.score).to.be.greaterThan(0);
  });
});
