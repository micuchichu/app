import { ensureWebTestAuth } from '@/lib/webTestAuth';
import { Session } from '@supabase/supabase-js';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, View } from 'react-native';
import { AlertProvider } from '../components/alertContext';
import { supabase } from '../lib/supabase';

export const unstable_settings = {
  initialRouteName: 'login',
};

export default function RootLayout() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const init = async () => {
      
      if (Platform.OS === 'web') {
        await ensureWebTestAuth();
      }

      
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setIsInitialized(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isInitialized) return;

    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && inTabsGroup) {
      router.replace('/login');
    } else if (session && !inTabsGroup) {
      router.replace('/(tabs)/explore');
    }
  }, [session, segments, isInitialized]);

  if (!isInitialized) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <AlertProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
      </Stack>
    </AlertProvider>
  );
}