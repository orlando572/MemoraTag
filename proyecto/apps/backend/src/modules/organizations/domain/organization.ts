import type { Role } from '@memoratag/contracts';

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Membership {
  user_id: string;
  role: Role;
}
