import React, { useState, useEffect } from 'react';
import { Dialog } from './ui/Dialog';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Label } from './ui/Label';
import { Checkbox } from './ui/Checkbox';
import { Role, Permission } from '../types/roles';
import { useTheme } from '../contexts/ThemeContext';

interface RoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (roleData: { name: string; description: string; permissions: Permission[] }) => Promise<void>;
  role?: Role;
  title: string;
}

const PERMISSIONS: { id: Permission; label: string; description: string }[] = [
  { 
    id: 'manage_files', 
    label: 'Manage Files',
    description: 'Upload, download, and delete project files'
  },
  { 
    id: 'use_chat', 
    label: 'Use Chat',
    description: 'Access and use the AI chat feature'
  },
  { 
    id: 'pin_charts', 
    label: 'Pin Charts',
    description: 'Pin and manage dashboard charts'
  },
  { 
    id: 'manage_users', 
    label: 'Manage Users',
    description: 'Invite and manage team members'
  },
  { 
    id: 'manage_roles', 
    label: 'Manage Roles',
    description: 'Create and edit team roles'
  },
  { 
    id: 'view_analytics', 
    label: 'View Analytics',
    description: 'Access project analytics and reports'
  },
  { 
    id: 'manage_projects', 
    label: 'Manage Projects',
    description: 'Create and manage projects'
  }
];

export function RoleDialog({ open, onOpenChange, onSave, role, title }: RoleDialogProps) {
  const { currentTheme } = useTheme();
  const isDark = currentTheme === 'dark';
  
  const [name, setName] = useState(role?.name ?? '');
  const [description, setDescription] = useState(role?.description ?? '');
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>(role?.permissions ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (role) {
      setName(role.name);
      setDescription(role.description);
      setSelectedPermissions(role.permissions);
    }
  }, [role]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave({
        name,
        description,
        permissions: selectedPermissions
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving role:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const togglePermission = (permission: Permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission)
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Dialog.Content className="sm:max-w-[600px]">
        <Dialog.Header>
          <Dialog.Title>{title}</Dialog.Title>
        </Dialog.Header>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Role Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Project Manager"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the role's responsibilities"
                required
              />
            </div>

            <div className="space-y-4">
              <Label>Permissions</Label>
              <div className="space-y-2">
                {PERMISSIONS.map((permission) => (
                  <div
                    key={permission.id}
                    className={`p-4 rounded-lg ${
                      isDark ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-50 hover:bg-gray-100'
                    } transition-colors`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <div>
                        <label
                          htmlFor={permission.id}
                          className={`font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}
                        >
                          {permission.label}
                        </label>
                        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                          {permission.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Role'}
            </Button>
          </div>
        </form>
      </Dialog.Content>
    </Dialog>
  );
} 