export type Permission = 
  | 'manage_files' 
  | 'use_chat' 
  | 'pin_charts'
  | 'manage_users'
  | 'manage_roles'
  | 'view_analytics'
  | 'manage_projects';

export type Role = {
  id: number;
  name: string;
  description: string;
  permissions: Permission[];
  created_at: string;
  updated_at: string;
};

export interface TeamMember {
  id: number;
  name: string;
  email: string;
  role_id: number;
  role: Role;
  status: 'active' | 'invited' | 'disabled';
  created_at: string;
  updated_at: string;
  permissions: Permission[];
}

export interface UserIdentity {
  type: 'company' | 'user';
  id: number;
  role?: string;
  permissions?: Permission[];
} 