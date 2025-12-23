import { supabase } from './supabase';

export interface ModulePermission {
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface Module {
  id: string;
  name: string;
  display_name: string;
  icon: string;
}

export interface UserPermission {
  id: string;
  user_id: string;
  module_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export const MODULES = {
  DASHBOARD: 'dashboard',
  CALLS: 'calls',
  DEVICES: 'devices',
  STOCK_MOVEMENTS: 'stock_movements',
  STOCK: 'stock',
  RECEIVE_STOCK: 'receive_stock',
  IN_TRANSIT: 'in_transit',
  ENGINEERS: 'engineers',
  BANKS: 'banks',
  REPORTS: 'reports',
  USER_MANAGEMENT: 'user_management',
  MAP: 'map',
  ALERTS: 'alerts',
  APPROVALS: 'approvals',
  SETTINGS: 'settings',
  // Phase 2
  PINCODE_MASTER: 'pincode_master',
} as const;

export type ModuleName = typeof MODULES[keyof typeof MODULES];

/**
 * Get modules the current user has access to
 */
export async function getUserModules(userId: string): Promise<ModulePermission[]> {
  const { data, error } = await supabase.rpc('get_user_modules', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Error fetching user modules:', error);
    return [];
  }

  return (data || []) as ModulePermission[];
}

/**
 * Check if user has access to a specific module
 */
export async function hasModuleAccess(
  userId: string,
  moduleName: string
): Promise<boolean> {
  const { data, error } = await supabase.rpc('has_module_access', {
    target_user_id: userId,
    module_name: moduleName,
  });

  if (error) {
    console.error('Error checking module access:', error);
    return false;
  }

  return !!data;
}

/**
 * Grant all permissions to a user (super_admin only)
 */
export async function grantAllPermissions(userId: string): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('grant_all_permissions', {
    target_user_id: userId,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Grant specific module permission (super_admin only)
 */
export async function grantModulePermission(
  userId: string,
  moduleName: string,
  permissions: {
    can_view?: boolean;
    can_create?: boolean;
    can_edit?: boolean;
    can_delete?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('grant_module_permission', {
    target_user_id: userId,
    module_name: moduleName,
    p_can_view: permissions.can_view ?? true,
    p_can_create: permissions.can_create ?? false,
    p_can_edit: permissions.can_edit ?? false,
    p_can_delete: permissions.can_delete ?? false,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Revoke module permission (super_admin only)
 */
export async function revokeModulePermission(
  userId: string,
  moduleName: string
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.rpc('revoke_module_permission', {
    target_user_id: userId,
    module_name: moduleName,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Get all available modules
 */
export async function getAllModules(): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('id, name, display_name, icon');

  if (error) {
    console.error('Error fetching modules:', error);
    return [];
  }

  return (data || []) as Module[];
}

/**
 * Get user's permissions
 */
export async function getUserPermissions(userId: string): Promise<UserPermission[]> {
  const { data, error } = await supabase
    .from('user_permissions')
    .select('id, user_id, module_name, can_view, can_create, can_edit, can_delete')
    .eq('user_id', userId);

  if (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }

  return (data || []) as UserPermission[];
}
