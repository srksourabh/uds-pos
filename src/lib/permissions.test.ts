import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock supabase before importing the module - use vi.hoisted to create mocks before vi.mock is hoisted
const { mockRpc, mockFrom } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock('./supabase', () => ({
  supabase: {
    rpc: mockRpc,
    from: mockFrom,
  },
}));

import {
  MODULES,
  getUserModules,
  hasModuleAccess,
  grantAllPermissions,
  grantModulePermission,
  revokeModulePermission,
  getUserPermissions,
  getAllModules,
} from './permissions';

describe('Permissions Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('MODULES constant', () => {
    it('should have all required modules defined', () => {
      expect(MODULES.DASHBOARD).toBe('dashboard');
      expect(MODULES.CALLS).toBe('calls');
      expect(MODULES.DEVICES).toBe('devices');
      expect(MODULES.STOCK_MOVEMENTS).toBe('stock_movements');
      expect(MODULES.ENGINEERS).toBe('engineers');
      expect(MODULES.BANKS).toBe('banks');
      expect(MODULES.REPORTS).toBe('reports');
      expect(MODULES.USER_MANAGEMENT).toBe('user_management');
    });

    it('should have unique module values', () => {
      const values = Object.values(MODULES);
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('getUserModules', () => {
    it('should return user modules on success', async () => {
      const mockModules = [
        { module_name: 'dashboard', can_view: true, can_create: false, can_edit: false, can_delete: false },
        { module_name: 'calls', can_view: true, can_create: true, can_edit: true, can_delete: false },
      ];

      mockRpc.mockResolvedValueOnce({
        data: mockModules,
        error: null,
      });

      const result = await getUserModules('user-123');

      expect(mockRpc).toHaveBeenCalledWith('get_user_modules', { target_user_id: 'user-123' });
      expect(result).toEqual(mockModules);
    });

    it('should return empty array on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await getUserModules('user-123');

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await getUserModules('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('hasModuleAccess', () => {
    it('should return true when user has access', async () => {
      mockRpc.mockResolvedValueOnce({
        data: true,
        error: null,
      });

      const result = await hasModuleAccess('user-123', 'dashboard');

      expect(mockRpc).toHaveBeenCalledWith('has_module_access', {
        target_user_id: 'user-123',
        module_name: 'dashboard',
      });
      expect(result).toBe(true);
    });

    it('should return false when user does not have access', async () => {
      mockRpc.mockResolvedValueOnce({
        data: false,
        error: null,
      });

      const result = await hasModuleAccess('user-123', 'admin');

      expect(result).toBe(false);
    });

    it('should return false on error', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Access denied' },
      });

      const result = await hasModuleAccess('user-123', 'dashboard');

      expect(result).toBe(false);
    });
  });

  describe('grantAllPermissions', () => {
    it('should return success when permissions granted', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await grantAllPermissions('user-123');

      expect(mockRpc).toHaveBeenCalledWith('grant_all_permissions', {
        target_user_id: 'user-123',
      });
      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when operation fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Insufficient permissions' },
      });

      const result = await grantAllPermissions('user-123');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Insufficient permissions');
    });
  });

  describe('grantModulePermission', () => {
    it('should call rpc with correct parameters', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const permissions = {
        can_view: true,
        can_create: true,
        can_edit: false,
        can_delete: false,
      };

      const result = await grantModulePermission('user-123', 'calls', permissions);

      expect(mockRpc).toHaveBeenCalledWith('grant_module_permission', {
        target_user_id: 'user-123',
        module_name: 'calls',
        p_can_view: true,
        p_can_create: true,
        p_can_edit: false,
        p_can_delete: false,
      });
      expect(result.success).toBe(true);
    });

    it('should return error when rpc fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });

      const result = await grantModulePermission('user-123', 'calls', {
        can_view: true,
        can_create: false,
        can_edit: false,
        can_delete: false,
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should use default values for missing permissions', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await grantModulePermission('user-123', 'calls', {});

      expect(mockRpc).toHaveBeenCalledWith('grant_module_permission', {
        target_user_id: 'user-123',
        module_name: 'calls',
        p_can_view: true,
        p_can_create: false,
        p_can_edit: false,
        p_can_delete: false,
      });
    });
  });

  describe('revokeModulePermission', () => {
    it('should call rpc with correct parameters', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      const result = await revokeModulePermission('user-123', 'calls');

      expect(mockRpc).toHaveBeenCalledWith('revoke_module_permission', {
        target_user_id: 'user-123',
        module_name: 'calls',
      });
      expect(result.success).toBe(true);
    });

    it('should return error when rpc fails', async () => {
      mockRpc.mockResolvedValueOnce({
        data: null,
        error: { message: 'Permission not found' },
      });

      const result = await revokeModulePermission('user-123', 'calls');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Permission not found');
    });
  });

  describe('getUserPermissions', () => {
    it('should return user permissions', async () => {
      const mockPermissions = [
        { id: '1', user_id: 'user-123', module_name: 'calls', can_view: true, can_create: true, can_edit: false, can_delete: false },
      ];

      const mockEq = vi.fn().mockResolvedValueOnce({
        data: mockPermissions,
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValueOnce({ eq: mockEq });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getUserPermissions('user-123');

      expect(mockFrom).toHaveBeenCalledWith('user_permissions');
      expect(mockSelect).toHaveBeenCalledWith('id, user_id, module_name, can_view, can_create, can_edit, can_delete');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-123');
      expect(result).toEqual(mockPermissions);
    });

    it('should return empty array on error', async () => {
      const mockEq = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      const mockSelect = vi.fn().mockReturnValueOnce({ eq: mockEq });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getUserPermissions('user-123');

      expect(result).toEqual([]);
    });
  });

  describe('getAllModules', () => {
    it('should return all modules', async () => {
      const mockModules = [
        { id: '1', name: 'dashboard', display_name: 'Dashboard', icon: 'home' },
        { id: '2', name: 'calls', display_name: 'Calls', icon: 'phone' },
      ];

      const mockSelect = vi.fn().mockResolvedValueOnce({
        data: mockModules,
        error: null,
      });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getAllModules();

      expect(mockFrom).toHaveBeenCalledWith('modules');
      expect(mockSelect).toHaveBeenCalledWith('id, name, display_name, icon');
      expect(result).toEqual(mockModules);
    });

    it('should return empty array on error', async () => {
      const mockSelect = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getAllModules();

      expect(result).toEqual([]);
    });

    it('should return empty array when data is null', async () => {
      const mockSelect = vi.fn().mockResolvedValueOnce({
        data: null,
        error: null,
      });
      mockFrom.mockReturnValueOnce({ select: mockSelect });

      const result = await getAllModules();

      expect(result).toEqual([]);
    });
  });
});
