import { db } from '../../firebase';
import { doc, runTransaction } from 'firebase/firestore';

/**
 * Increment reaction count using sharded counters.
 * roomId: watch room id
 * emoji: string (e.g., '🔥')
 * numShards: number of shards configured (default 8)
 */
export async function incrementReaction(roomId, emoji, numShards = 8){
  const shardId = Math.floor(Math.random() * numShards);
  const shardRef = doc(db, `watchRooms/${roomId}/reactions_shards/shard_${shardId}`);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(shardRef);
    if (!snap.exists()){
      tx.set(shardRef, { shardId, counts: { [emoji]: 1 }, lastUpdated: new Date() });
      return;
    }
    const data = snap.data();
    const counts = data.counts || {};
    counts[emoji] = (counts[emoji] || 0) + 1;
    tx.update(shardRef, { counts, lastUpdated: new Date() });
  });
}
