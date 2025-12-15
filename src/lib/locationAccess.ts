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
}> {
  // Get user profile to check if super_admin
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role, department_new')
    .eq('id', userId)
    .single();
  
  // Super admin has access to everything
  if (profile?.role === 'super_admin' || profile?.department_new === 'super_admin') {
    return { hasAccess: true, cities: [], officeIds: [] };
  }
  
  const locations = await getUserAccessibleLocations(userId);
  
  if (locations.length === 0) {
    return { hasAccess: false, cities: [], officeIds: [] };
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
    officeIds: [...new Set(officeIds)]
  };
}

/**
 * Get subordinate users based on reports_to hierarchy
 */
export async function getSubordinates(userId: string): Promise<string[]> {
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
        subordinateIds.push(user.i