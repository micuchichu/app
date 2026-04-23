import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const url = Linking.getLinkingURL();
    if (url) {
      supabase.auth.exchangeCodeForSession(url).then(({ error }) => {
        if (error) console.error(error);
        router.replace('/(tabs)/feed');
      });
    }
  }, []);

  return null;
}