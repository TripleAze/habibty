import { doc, getDoc, setDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export async function recordGameResult(
  uid1: string,
  uid2: string,
  gameType: string,
  winnerUid: string | null, // null = draw
  winnerName: string = ''
) {
  const pairId = [uid1, uid2].sort().join('_');
  const [playerA, playerB] = [uid1, uid2].sort();
  const ref = doc(db, 'scoreboards', pairId);

  const snap = await getDoc(ref);
  const existing = snap.exists() ? snap.data() : {};
  const gameData = existing[gameType] || {
    playerA, 
    playerB, 
    winsA: 0, 
    winsB: 0, 
    draws: 0
  };

  if (winnerUid === null) {
    gameData.draws += 1;
  } else if (winnerUid === playerA) {
    gameData.winsA += 1;
  } else {
    gameData.winsB += 1;
  }

  gameData.lastPlayedAt = Date.now();

  await setDoc(ref, { [gameType]: gameData }, { merge: true });

  // Send notification to loser
  if (winnerUid !== null) {
    const loserId = winnerUid === uid1 ? uid2 : uid1;
    try {
      await addDoc(collection(db, 'notifications', loserId, 'items'), {
        type: 'game_result',
        fromUid: winnerUid,
        fromName: winnerName,
        meta: `won ${gameType.replace('_', ' ')} 🏆`,
        read: false,
        createdAt: serverTimestamp()
      });
    } catch (err) {
      console.error('Failed to send win notification:', err);
    }
  }
}
