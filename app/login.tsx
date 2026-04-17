import * as AuthSession from 'expo-auth-session';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

import { GlobalStyles } from './constants/globalStyles';
import { Colors } from './constants/colors';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Error', error.message);
    else router.replace('/(tabs)/profile');
    setLoading(false);
  }

  async function signInAsGuest() {
    setLoading(true);
    const { error } = await supabase.auth.signInAnonymously();
    if (error) Alert.alert('Error', error.message);
    else router.replace('/(tabs)/feed');
    setLoading(false);
  }

  async function signInWithGoogle() {
  setLoading(true);
  const redirectTo = AuthSession.makeRedirectUri({ scheme: 'app' });

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) { Alert.alert('Error', error.message); setLoading(false); return; }

  const result = await WebBrowser.openAuthSessionAsync(data.url!, redirectTo);

  if (result.type === 'success') {
    const url = result.url;
    const { data: sessionData, error: sessionError } = await supabase.auth.exchangeCodeForSession(
      new URL(url).searchParams.get('code')!
    );
    if (!sessionError) router.replace('/(tabs)/feed');
  }
  setLoading(false);
}

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.header}>Welcome Back</Text>
        <Text style={styles.subHeader}>Sign in to find jobs or hire talent.</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#71717a"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#71717a"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        {/* Primary Login */}
        <TouchableOpacity style={styles.primaryButton} onPress={signInWithEmail} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Sign In</Text>}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.dividerContainer}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity style={styles.socialButton} onPress={signInWithGoogle} disabled={loading}>
          <Text style={styles.socialBtnText}>Sign in with Google</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.guestButton} onPress={signInAsGuest} disabled={loading}>
          <Text style={styles.guestBtnText}>Continue as Guest</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/signup')} disabled={loading}>
          <Text style={styles.secondaryBtnText}>Don't have an account? Create one</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center', flexGrow: 1 },
  formContainer: { padding: 20 },
  header: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 8 },
  subHeader: { color: '#a1a1aa', fontSize: 16, marginBottom: 30 },
  
  input: { backgroundColor: '#18181b', color: 'white', padding: 18, borderRadius: 12, fontSize: 16, borderWidth: 1, borderColor: '#27272a', marginBottom: 15 },
  
  primaryButton: { backgroundColor: '#8b5cf6', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  
  dividerContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#27272a' },
  dividerText: { color: '#71717a', paddingHorizontal: 15, fontWeight: 'bold' },

  // New Button Styles
  socialButton: { backgroundColor: 'white', padding: 18, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  socialBtnText: { color: 'black', fontWeight: 'bold', fontSize: 16 },
  
  guestButton: { backgroundColor: '#18181b', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  guestBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  secondaryButton: { padding: 18, alignItems: 'center', marginTop: 15 },
  secondaryBtnText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 14 }
});