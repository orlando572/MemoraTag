export type EventType = 'note' | 'issue' | 'maintenance' | 'photo';

export type MemoryEvent = {
  id: string;
  objectId: string;
  type: EventType;
  title: string;
  description?: string;
  eventDate: string;
  imageUri?: string;
};

export type MemoryObject = {
  id: string;
  name: string;
  description?: string;
  coverImageUri?: string;
  color: string;
  qrToken: string;
  createdAt: string;
};
