const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { expect } = require('chai');

describe('awardBadge integration', function(){
  this.timeout(20000);
  before(() => {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || 'localhost:8080';
    if (!admin.apps.length) admin.initializeApp({ projectId: 'demo-project' });
  });

  it('awards a badge to a user via callable', async () => {
    const db = admin.firestore();
    const badgeId = 'integration_test_badge';
    await db.doc(`badges/${badgeId}`).set({ name: 'Integration Badge' });

    const project = 'demo-project';
    const url = `http://localhost:5001/${project}/us-central1/awardBadge`;
    const payload = { data: { uid: 'userBadge1', badgeId, contextInfo: { test: true } } };
    const res = await fetch(url, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'application/json' } });
    const json = await res.json();
    expect(json).to.have.property('result');
    const snap = await db.doc(`users/userBadge1/badges/${badgeId}`).get();
    expect(snap.exists).to.be.true;
  });
});
