import { Permission } from '../types/roles';

export const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: 'manage_files', label: 'Manage Files' },
  { id: 'use_chat', label: 'Use Chat' },
  { id: 'pin_charts', label: 'Pin Charts' },
  { id: 'manage_users', label: 'Manage Users' },
  { id: 'manage_roles', label: 'Manage Roles' },
  { id: 'view_analytics', label: 'View Analytics' },
  { id: 'manage_projects', label: 'Manage Projects' }
]; 