# Cloud Functions (Scaffold)

This folder contains a minimal Firebase Cloud Functions scaffold used for:
- computing trivia scores and updating leaderboards
- aggregating reaction shards into totals for fast reading
- awarding badges (callable function)

To install and deploy (example):

```bash
cd functions
npm install
firebase deploy --only functions
```

Customize `index.js` to implement production scoring rules, security checks, and batching as required.

Notes:
- This scaffold added `startTriviaSession`, `onTriviaResponseCreate`, and `finalizeTriviaSession` functions.
- Use `firebase emulators:start` for local testing of Firestore and Functions before deploying.

