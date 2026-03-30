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
  deliveryTime?: number;
  createdAt: number;
  emoji?: string;
  meta?: string;
}

export interface MessageCardProps {
  id: string;
  title: string;
  emoji: string;
  status: MessageStatus;
  deliveryTime?: number;
  meta?: string;
  onClick?: () => void;
}

export interface RevealModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: Message | null;
}

export interface BottomNavProps {
  activeTab: 'inbox' | 'create' | 'scheduled';
}
