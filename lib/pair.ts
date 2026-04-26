import { doc, getDoc, writeBatch, deleteField } from 'firebase/firestore';
import { db } from './firebase';

/**
 * Atomically unpairs two users by clearing the partnerId field on both documents.
 * This is a "soft break" - shared messages and games are not deleted, only hidden.
 * 
 * @param uid Current user ID
 * @param partnerId Partner's user ID
 */
export async function unpairPartner(uid: string, partnerId: string): Promise<{ ok: boolean; error?: string }> {
  if (!uid || !partnerId) {
    return { ok: false, error: 'User IDs are required for unpairing.' };
  }

  try {
    // 1. Fetch current state to ensure valid permissions
    const [userSnap, partnerSnap] = await Promise.all([
      getDoc(doc(db, 'users', uid)),
      getDoc(doc(db, 'users', partnerId))
    ]);

    const batch = writeBatch(db);
    let hasWork = false;

    // Clear partnerId for current user only if it matches
    if (userSnap.exists() && userSnap.data().partnerId === partnerId) {
      batch.update(doc(db, 'users', uid), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    // Clear partnerId for the partner ONLY if they are still pointing to current user
    // This avoids "insufficient permissions" errors if they've already unpaired us.
    if (partnerSnap.exists() && partnerSnap.data().partnerId === uid) {
      batch.update(doc(db, 'users', partnerId), { partnerId: deleteField(), pairedAt: deleteField() });
      hasWork = true;
    }
    
    if (hasWork) {
      await batch.commit();
    }
    
    return { ok: true };
  } catch (err: any) {
    console.error('Unpair error:', err);
    return { ok: false, error: err.message || 'Failed to unpair. Please try again.' };
  }
}
