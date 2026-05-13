import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

const TEST_EMAIL = 'workly.test1@gmail.com';     // your test account email
const TEST_PASSWORD = 'Workly123!'; // your test account password

export async function ensureWebTestAuth() {
  if (Platform.OS !== 'web') return;

  const { data: { session } } = await supabase.auth.getSession();
  if (session) return; // already logged in, do nothing

  const { error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  if (error) {
    console.error('[WebTestAuth] Failed to sign in test account:', error.message);
  } else {
    console.log('[WebTestAuth] Signed in as test account');
  }
}