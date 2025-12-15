import { supabase } from './supabase';

export interface UserLocation {
  office_id: string;
  office_name: string;
  location_names: string[];
}

/**
 * Get all locations accessible by a user based on their office assignments
 */
export async function getUserAccessibleLocations(userId: string): Promise<UserLocation[]> {
  const { data, error } = await supabase
    .rpc('get_user_accessible_locations', { p_user_id: userId });
  
  if (error) {
    console.error('Error getting user locations:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get all city names accessible by a user
 */
export async function getUserAccessibleCities(userId: string): Promise<string[]> {
  const locations = await getUserAccessibleLocations(userId);
  const cities: string[] = [];
  
  locations.forEach(loc => {
    if (loc.location_names) {
      cities.push(...loc.location_names);
    }
  });
  
  return [...new Set(cities)].map(c => c.toUpperCase());
}

/**
 * Check if user can access a specific call
 */
export async function canUserAccessCall(userId: string, callId: string): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('can_user_access_call', { p_user_id: userId, p_call_id: callId });
  
  if (error) {
    console.error('Error checking call access:', error);
    return false;
  }
  
  return data || false;
}

/**
 * Build a query filter for calls based on user's accessible locations
 */
export async function buildLocationFilter(userId: string): Promise<{
  hasAccess: boolean;
  cities: string[];
  officeIds: string[];
  isSuperAdmin: boolean;
}> {
  // Get user profile to check if super_admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_new')
    .eq('id', userId)
    .single();
  
  // Super admin has access to everything
  if (profile?.role === 'super_admin' || profile?.department_new === 'super_admin') {
    return { hasAccess: true, cities: [], officeIds: [], isSuperAdmin: true };
  }
  
  const locations = await getUserAccessibleLocations(userId);
  
  if (locations.length === 0) {
    return { hasAccess: false, cities: [], officeIds: [], isSuperAdmin: false };
  }
  
  const cities: string[] = [];
  const officeIds: string[] = [];
  
  locations.forEach(loc => {
    if (loc.office_id) officeIds.push(loc.office_id);
    if (loc.location_names) {
      cities.push(...loc.location_names.map(c => c.toUpperCase()));
    }
  });
  
  return {
    hasAccess: true,
    cities: [...new Set(cities)],
    officeIds: [...new Set(officeIds)],
    isSuperAdmin: false
  };
}

/**
 * Get subordinate users based on reports_to hierarchy
 */
export async function getSubordinates(userId: string, includeAllLevels: boolean = true): Promise<string[]> {
  const subordinateIds: string[] = [];
  const toProcess = [userId];
  const processed = new Set<string>();
  
  while (toProcess.length > 0) {
    const currentId = toProcess.pop()!;
    if (processed.has(currentId)) continue;
    processed.add(currentId);
    
    const { data } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('reports_to', currentId);
    
    if (data) {
      data.forEach(user => {
        subordinateIds.push(user.id);
        if (includeAllLevels) {
          toProcess.push(user.id);
        }
      });
    }
  }
  
  return subordinateIds;
}

/**
 * Get direct reports only (one level down)
 */
export async function getDirectReports(userId: string): Promise<{
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  department_new: string | null;
  role: string;
}[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, email, phone, department_new, role')
    .eq('reports_to', userId)
    .eq('status', 'active')
    .order('full_name');
  
  if (error) {
    console.error('Error getting direct reports:', error);
    return [];
  }
  
  return data || [];
}

/**
 * Get engineers that can be assigned calls based on user's hierarchy
 */
export async function getAssignableEngineers(userId: string): Promise<{
  id: string;
  full_name: string;
  phone: string | null;
  office_id: string | null;
}[]> {
  // Get user's role
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_new, office_id')
    .eq('id', userId)
    .single();
  
  if (!profile) return [];
  
  // Super admin can assign to any engineer
  if (profile.role === 'super_admin' || profile.department_new === 'super_admin') {
    const { data } = await supabase
      .from('user_profiles')
      .select('id, full_name, phone, office_id')
      .eq('role', 'engineer')
      .eq('status', 'active')
      .order('full_name');
    return data || [];
  }
  
  // Get all subordinates
  const subordinateIds = await getSubordinates(userId);
  
  if (subordinateIds.length === 0) {
    // If no subordinates via hierarchy, try same office
    if (profile.office_id) {
      const { data } = await supabase
        .from('user_profiles')
        .select('id, full_name, phone, office_id')
        .eq('role', 'engineer')
        .eq('office_id', profile.office_id)
        .eq('status', 'active')
        .order('full_name');
      return data || [];
    }
    return [];
  }
  
  // Get engineers from subordinates
  const { data } = await supabase
    .from('user_profiles')
    .select('id, full_name, phone, office_id')
    .eq('role', 'engineer')
    .in('id', subordinateIds)
    .eq('status', 'active')
    .order('full_name');
  
  return data || [];
}
