// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Log for debugging (remove in production)
console.log('Supabase URL exists:', !!supabaseUrl)
console.log('Supabase Key exists:', !!supabaseAnonKey)

// Create client - use mock values if env vars are missing for development
export const supabase = createClient(
  supabaseUrl || 'https://example.supabase.co',
  supabaseAnonKey || 'example-key'
)


// Optional: Test connection (commented out to avoid errors)
// supabase.from('food_posts').select('*').limit(1)
//   .then(() => console.log('✅ Supabase connected'))
//   .catch(err => console.log('⚠️ Supabase connection issue (mock mode):', err.message))