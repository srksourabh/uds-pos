import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate environment variables with helpful error messages
function validateEnvVars(): { url: string; key: string } {
  const errors: string[] = [];

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL is missing');
  } else if (!supabaseUrl.startsWith('https://')) {
    errors.push('VITE_SUPABASE_URL must start with https://');
  }

  if (!supabaseAnonKey) {
    errors.push('VITE_SUPABASE_ANON_KEY is missing');
  } else if (!supabaseAnonKey.startsWith('eyJ')) {
    errors.push('VITE_SUPABASE_ANON_KEY appears to be invalid (should start with eyJ)');
  }

  if (errors.length > 0) {
    const errorMessage = [
      '========================================',
      'SUPABASE CONFIGURATION ERROR',
      '========================================',
      '',
      'Missing or invalid environment variables:',
      ...errors.map(e => `  - ${e}`),
      '',
      'To fix this:',
      '1. Create a .env file in the project root',
      '2. Add the following variables:',
      '',
      '   VITE_SUPABASE_URL=https://your-project.supabase.co',
      '   VITE_SUPABASE_ANON_KEY=your-anon-key',
      '',
      '3. Get these values from:',
      '   https://supabase.com/dashboard → Settings → API',
      '',
      '========================================',
    ].join('\n');

    console.error(errorMessage);
    throw new Error('Missing Supabase environment variables. Check console for details.');
  }

  return { url: supabaseUrl, key: supabaseAnonKey };
}

// Create Supabase client with validated config
function createSupabaseClient(): SupabaseClient<Database> {
  const { url, key } = validateEnvVars();

  return createClient<Database>(url, key, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = createSupabaseClient();

// Export a function to test Supabase connection
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  error?: string;
  projectUrl?: string;
}> {
  try {
    // Try a simple query to test connection
    const { error } = await supabase.from('banks').select('count').limit(1);

    if (error) {
      // Check if it's a table not found error (expected if migrations not run)
      if (error.message.includes('does not exist')) {
        return {
          connected: true,
          error: 'Database tables not found. Run migrations first.',
          projectUrl: supabaseUrl,
        };
      }
      return {
        connected: false,
        error: error.message,
        projectUrl: supabaseUrl,
      };
    }

    return {
      connected: true,
      projectUrl: supabaseUrl,
    };
  } catch (err) {
    return {
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      projectUrl: supabaseUrl,
    };
  }
}
