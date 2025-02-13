import { Permission } from '../types/roles';
import { PERMISSIONS } from '../constants/permissions';

export const checkPermission = (requiredPermission: Permission): boolean => {
  const userType = localStorage.getItem('userType');
  
  // Company users have all permissions
  if (userType === 'company') {
    return true;
  }

  // Get stored permissions for regular users
  const storedPermissions = localStorage.getItem('userPermissions');
  if (!storedPermissions) {
    return false;
  }

  try {
    const userPermissions = JSON.parse(storedPermissions);
    return userPermissions.includes(requiredPermission);
  } catch {
    return false;
  }
};

export const getUserPermissions = (): Permission[] => {
  const userType = localStorage.getItem('userType');
  
  if (userType === 'company') {
    return PERMISSIONS.map(p => p.id);
  }

  try {
    const storedPermissions = localStorage.getItem('userPermissions');
    return storedPermissions ? JSON.parse(storedPermissions) : [];
  } catch {
    return [];
  }
}; 