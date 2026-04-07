export type MessageType = 'text' | 'voice' | 'video';

export type MessageStatus = 'locked' | 'available' | 'opened';

export type DeliveryType = 'immediate' | 'scheduled';

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
  emoji?: string;
  meta?: string;
  moods?: string[];
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
  activeTab: 'inbox' | 'create' | 'scheduled' | 'profile';
}
