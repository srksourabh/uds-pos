/**
 * Cache Manager
 * Handles version-based cache invalidation to prevent stale data issues
 */

import { supabase } from './supabase';

const CACHE_VERSION_KEY = 'app_cache_version';
const CURRENT_VERSION = '1.0.1'; // Updated: Fixed RLS recursive dependencies

/**
 * Check if cache version matches current version
 * If not, clear all app storage and update version
 */
export function checkAndClearCache(): boolean {
  try {
    const storedVersion = localStorage.getItem(CACHE_VERSION_KEY);
    
    if (storedVersion !== CURRENT_VERSION) {
      console.log('[Cache Manager] Version mismatch detected. Clearing cache...');
      clearAppCache();
      localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
      return true; // Cache was cleared
    }
    
    return false; // Cache is up to date
  } catch (error) {
    console.error('[Cache Manager] Error checking cache:', error);
    return false;
  }
}

/**
 * Clear all application cache and storage
 */
export function clearAppCache(): void {
  try {
    // Clear localStorage except auth-related items
    const authToken = localStorage.getItem('supabase.auth.token');
    const authRefreshToken = localStorage.getItem('supabase.auth.refresh_token');
    
    // Clear everything
    localStorage.clear();
    
    // Restore auth tokens if they existed
    if (authToken) {
      localStorage.setItem('supabase.auth.token', authToken);
    }
    if (authRefreshToken) {
      localStorage.setItem('supabase.auth.refresh_token', authRefreshToken);
    }
    
    // Set new version
    localStorage.setItem(CACHE_VERSION_KEY, CURRENT_VERSION);
    
    // Clear sessionStorage
    sessionStorage.clear();
    
    console.log('[Cache Manager] Cache cleared successfully');
  } catch (error) {
    console.error('[Cache Manager] Error clearing cache:', error);
  }
}

/**
 * Force clear everything including auth (for logout)
 */
export async function clearAllStorage(): Promise<void> {
  try {
    // Sign out from Supabase
    await supabase.auth.signOut();
    
    // Clear all storage
    localStorage.clear();
    sessionStorage.clear();
    
    // Clear IndexedDB if exists
    if ('indexedDB' in window) {
      const databases = await window.indexedDB.databases();
      databases.forEach((db) => {
        if (db.name) {
          window.indexedDB.deleteDatabase(db.name);
        }
      });
    }
    
    console.log('[Cache Manager] All storage cleared');
  } catch (error) {
    console.error('[Cache Manager] Error clearing all storage:', error);
  }
}

/**
 * Get current cache version
 */
export function getCacheVersion(): string {
  return CURRENT_VERSION;
}

/**
 * Check if user needs to refresh the page
 */
export function shouldRefreshPage(): boolean {
  const lastRefresh = sessionStorage.getItem('last_page_refresh');
  const now = Date.now();
  
  if (!lastRefresh) {
    sessionStorage.setItem('last_page_refresh', now.toString());
    return false;
  }
  
  // Refresh if more than 1 hour since last refresh
  const oneHour = 60 * 60 * 1000;
  return (now - parseInt(lastRefresh)) > oneHour;
}
