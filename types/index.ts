export type MessageType = 'text' | 'voice' | 'video';

export type MessageStatus = 'draft' | 'scheduled' | 'sent' | 'locked' | 'available' | 'opened';

export type DeliveryType = 'immediate' | 'scheduled';

export type UnlockConditionType = 'time' | 'emotional' | 'event' | 'manual';

export interface Reaction {
  userId: string;
  userName?: string;
  userPhoto?: string;
  emoji: string;
  createdAt: number;
}

export interface Reply {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  text: string;
  type?: 'text' | 'voice';
  mediaUrl?: string;
  createdAt: number;
}

export interface Message {
  id: string;
  title: string;
  content: string;
  type: MessageType;
  status: MessageStatus;
  deliveryType: DeliveryType;
  scheduledFor?: string | null;
  isDelivered: boolean;
  senderId: string;
  senderName?: string;
  receiverId: string;
  createdAt: number;
  updatedAt?: number;
  emoji?: string;
  meta?: string;
  moods?: string[];
  mediaUrl?: string;
  mediaPublicId?: string;
  mediaDuration?: number;
  // Advanced unlock conditions
  unlockType?: UnlockConditionType;
  unlockCondition?: string;
  unlockLocation?: {
    lat: number;
    lng: number;
    radius: number;
    name?: string;
  };
  isUnlocked?: boolean;
  // Surprise mode
  isSurprise?: boolean;
  surpriseType?: 'message' | 'voice' | 'game' | 'combo';
}

export interface AppUser {
  uid: string;
  displayName?: string;
  photoURL?: string;
  email?: string;
  inviteCode?: string;
  partnerId?: string;
  pairedAt?: number;
}

export interface MessageCardProps {
  message: Message;
  onClick?: () => void;
  now?: number;
}

export interface RevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export interface BottomNavProps {
  activeTab: 'inbox' | 'create' | 'games' | 'scheduled' | 'moments' | 'profile';
}

// ─── WHOT GAME TYPES ──────────────────────────────────────

export type Suit = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface WhotCard {
  suit: Suit;
  value: number;
  id: string; // unique e.g. "circle-5-0"
}

export type SpecialEffect =
  | 'skip'          // 1, 8
  | 'pick2'         // 2
  | 'pick3'         // 5
  | 'market'        // 20 (draw 1)
  | 'general-market' // 14 (all others draw 1)
  | null;

export interface WhotGameState {
  id: string;
  type: 'whot';
  players: string[];
  playerNames: Record<string, string>;
  playerPhotos: Record<string, string>;
  discard: WhotCard[];
  topCard: WhotCard;
  calledSuit: Suit | null;   // active when Whot is on top
  turn: string;              // uid whose turn it is
  pendingPickup: number;     // stacked pick-2/pick-3 total
  pendingSkip: boolean;      // next player must skip
  status: 'waiting' | 'playing' | 'finished';
  winner: string | null;
  lastCardUids: string[];    // players who have 1 card (auto-detected)
  createdAt: number;
  deckCount: number;         // number of cards left in private draw pile
  nextDeckIndex: number;     // next index to draw from deck/cards subcollection
  handCounts: Record<string, number>; // number of cards each player has
}

export interface PlayerHand {
  cards: WhotCard[];
}
