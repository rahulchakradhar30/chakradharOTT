"use client"
import React, { useEffect, useState } from 'react';
import { db } from '../../firebase';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import ReactionCascade from './ReactionCascade';

export default function RealtimeReactions({ roomId }){
  const [events, setEvents] = useState([]);

  useEffect(()=>{
    if (!roomId) return;
    const col = collection(db, `watchRooms/${roomId}/events_recent`);
    const q = query(col, orderBy('timestamp','desc'), limit(20));
    const unsub = onSnapshot(q, snap=>{
      const items = [];
      snap.forEach(d => items.push(Object.assign({ id: d.id }, d.data())));
      // reverse so oldest first for animation
      setEvents(items.reverse());
    });
    return () => unsub();
  }, [roomId]);

  return <ReactionCascade events={events} />;
}
