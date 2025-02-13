import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Check, X } from 'lucide-react';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { 
  Role, 
  TeamMember, 
  Permission,
  UserIdentity,
} from '../types/roles';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { 
  getTeamMembers,
  getRoles,
  updateTeamMember,
  updateAllPermissions,
} from '../services/api';
import { PermissionGuard } from '../components/PermissionGuard';

interface TeamManagementProps {
  isDark?: boolean;
}

const PERMISSIONS: { id: Permission; label: string }[] = [
  { id: 'manage_files', label: 'Manage Files' },
  { id: 'use_chat', label: 'Use Chat' },
  // Commented out for future use
  // { id: 'pin_charts', label: 'Pin Charts' },
  // { id: 'manage_users', label: 'Manage Users' },
  // { id: 'manage_roles', label: 'Manage Roles' },
  // { id: 'view_analytics', label: 'View Analytics' },
  // { id: 'manage_projects', label: 'Manage Projects' }
];

interface RoleWithMembers extends Role {
  members: TeamMember[];
}

export const TeamManagement: React.FC<TeamManagementProps> = ({ isDark }) => {
  const { currentTheme } = useTheme();
  const actualIsDark = isDark ?? currentTheme === 'dark';
  
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();
  
  // Get identity information
  const identityStr = localStorage.getItem('userIdentity');
  const identity: UserIdentity = identityStr ? JSON.parse(identityStr) : null;
  
  const canManagePermissions = identity && (
    identity.type === 'company' || 
    identity.role === 'admin'
  );

  const fetchMembers = async () => {
    try {
      // Add debug logs
      const identityStr = localStorage.getItem('userIdentity');
      console.log('Current identity:', identityStr);
      
      const membersData = await getTeamMembers();
      console.log('Members data:', membersData);
      
      // Ensure permissions are properly initialized for each member
      const updatedMembers = membersData.map(member => ({
        ...member,
        permissions: member.permissions || member.role.permissions || []
      }));
      
      console.log('Updated members with permissions:', updatedMembers);
      setMembers(updatedMembers);
    } catch (error) {
      console.error('Error loading team data:', error);
      showToast('Failed to load team data', 'error');
    }
  };

  const handlePermissionToggle = async (memberId: number, permissions: Permission[]) => {
    if (!canManagePermissions) {
      showToast('Only administrators can update permissions', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const updatedMember = await updateAllPermissions(memberId, permissions);
      console.log('Updated member response:', updatedMember);
      
      setMembers(prevMembers => 
        prevMembers.map(member => 
          member.id === memberId ? {
            ...member,
            permissions: updatedMember.permissions || []
          } : member
        )
      );
      showToast('Permissions updated successfully', 'success');
    } catch (error: any) {
      showToast(error.message || 'Failed to update permissions', 'error');
      // Refresh the members list
      fetchMembers();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  // Add debug log for permissions check
  console.log('Can manage permissions:', canManagePermissions);
  console.log('Identity:', identity);

  return (
    <PermissionGuard
      permission="manage_users"
      fallback={
        <div className="p-4 text-center text-gray-600">
          You do not have permission to manage users. 
          Please contact your administrator to request access.
        </div>
      }
    >
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-50 dark:bg-gray-800">
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                User
              </th>
              {PERMISSIONS.map(permission => (
                <th key={permission.id} className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  {permission.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {members.map(member => (
              <tr key={member.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-col">
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {member.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {member.email}
                    </div>
                    <div className="text-xs text-gray-400 dark:text-gray-500">
                      Role: {member.role.name}
                    </div>
                  </div>
                </td>
                {PERMISSIONS.map(permission => (
                  <td key={permission.id} className="px-6 py-4 whitespace-nowrap text-center">
                    <div className="flex justify-center">
                      <Switch
                        checked={member.permissions?.includes(permission.id) || false}
                        onCheckedChange={(checked) => {
                          const newPermissions = checked
                            ? [...(member.permissions || []), permission.id]
                            : (member.permissions || []).filter(p => p !== permission.id);
                          handlePermissionToggle(member.id, newPermissions);
                        }}
                        disabled={isLoading || !canManagePermissions}
                        className="data-[state=checked]:bg-blue-500 data-[state=unchecked]:bg-gray-200"
                      />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </PermissionGuard>
  );
}; 