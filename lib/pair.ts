import { doc, writeBatch, deleteField } from 'firebase/firestore';
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
    const batch = writeBatch(db);
    
    // Clear partnerId for current user
    const userRef = doc(db, 'users', uid);
    batch.update(userRef, { partnerId: deleteField() });
    
    // Clear partnerId for the partner
    const partnerRef = doc(db, 'users', partnerId);
    batch.update(partnerRef, { partnerId: deleteField() });
    
    await batch.commit();
    return { ok: true };
  } catch (err: any) {
    console.error('Unpair error:', err);
    return { ok: false, error: err.message || 'Failed to unpair. Please try again.' };
  }
}
