import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getUserModules, Module, ModuleName } from '../lib/permissions';

interface PermissionsContextType {
  modules: Module[];
  loading: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isEngineer: boolean;
  hasAccess: (moduleName: ModuleName | string, permission?: 'view' | 'create' | 'edit' | 'delete') => boolean;
  canCreate: (moduleName: ModuleName | string) => boolean;
  canEdit: (moduleName: ModuleName | string) => boolean;
  canDelete: (moduleName: ModuleName | string) => boolean;
  refreshPermissions: () => Promise<void>;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { profile, user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  const isSuperAdmin = profile?.role === 'super_admin';
  const isAdmin = profile?.role === 'admin' || isSuperAdmin;
  const isEngineer = profile?.role === 'engineer';

  const loadPermissions = useCallback(async () => {
    if (!user) {
      setModules([]);
      setLoading(false);
      return;
    }

    try {
      const userModules = await getUserModules();
      setModules(userModules);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  const hasAccess = useCallback(
    (moduleName: string, permission: 'view' | 'create' | 'edit' | 'delete' = 'view'): boolean => {
      // Super admin has access to everything
      if (isSuperAdmin) return true;

      const module = modules.find(m => m.module_name === moduleName);
      if (!module) return false;

      switch (permission) {
        case 'view':
          return module.can_view;
        case 'create':
          return module.can_create;
        case 'edit':
          return module.can_edit;
        case 'delete':
          return module.can_delete;
        default:
          return module.can_view;
      }
    },
    [modules, isSuperAdmin]
  );

  const canCreate = useCallback(
    (moduleName: string): boolean => hasAccess(moduleName, 'create'),
    [hasAccess]
  );

  const canEdit = useCallback(
    (moduleName: string): boolean => hasAccess(moduleName, 'edit'),
    [hasAccess]
  );

  const canDelete = useCallback(
    (moduleName: string): boolean => hasAccess(moduleName, 'delete'),
    [hasAccess]
  );

  return (
    <PermissionsContext.Provider
      value={{
        modules,
        loading,
        isSuperAdmin,
        isAdmin,
        isEngineer,
        hasAccess,
        canCreate,
        canEdit,
        canDelete,
        refreshPermissions: loadPermissions,
      }}
    >
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }
  return context;
}
