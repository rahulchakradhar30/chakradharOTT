"use client"
import React, { useState } from 'react';
import RealtimeReactions from '../../components/reactions/RealtimeReactions';
import { incrementReaction } from '../../components/reactions/shardHelper';

export default function ReactionsDemo(){
  const [roomId] = useState('demoRoom');
  return (
    <div style={{padding:20}}>
      <h2>Reactions Demo</h2>
      <div style={{marginBottom:12}}>
        <button onClick={()=>incrementReaction(roomId,'🔥')}>Fire</button>
        <button onClick={()=>incrementReaction(roomId,'❤️')}>Love</button>
        <button onClick={()=>incrementReaction(roomId,'👏')}>Clap</button>
      </div>
      <div style={{position:'relative', height:200, border:'1px solid #ddd'}}>
        <RealtimeReactions roomId={roomId} />
      </div>
    </div>
  );
}
