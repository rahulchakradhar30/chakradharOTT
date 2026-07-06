const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { expect } = require('chai');

describe('finalizeTriviaSession integration', function(){
  this.timeout(20000);
  before(() => {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-project' });
  });

  it('finalizes session and writes finalLeaderboard', async () => {
    const db = admin.firestore();
    const roomId = 'testRoomFinalize';
    const sessionId = 'sessionFinal';

    // create leaderboard entries
    const lbCol = db.collection(`watchRooms/${roomId}/triviaSessions/${sessionId}/leaderboard`);
    await lbCol.doc('user1').set({ uid: 'user1', score: 300 });
    await lbCol.doc('user2').set({ uid: 'user2', score: 150 });

    // call finalizeTriviaSession via emulator callable endpoint
    const project = 'demo-project';
    const url = `http://localhost:5001/${project}/us-central1/finalizeTriviaSession`;
    const res = await fetch(url, { method: 'POST', body: JSON.stringify({ data: { roomId, sessionId } }), headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    expect(json).to.have.property('result');
    const result = json.result;
    expect(result).to.have.property('top');

    const finalRef = db.doc(`watchRooms/${roomId}/triviaSessions/${sessionId}/finalLeaderboard/summary`);
    const snap = await finalRef.get();
    expect(snap.exists).to.be.true;
    const data = snap.data();
    expect(data).to.have.property('ranked');
    expect(data.ranked[0].uid).to.equal('user1');
  });
});
