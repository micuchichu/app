import { router } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { supabase } from './lib/supabase';

import { GlobalStyles } from './constants/globalStyles';
import { Colors } from './constants/colors';
import { useAlert } from '@/app/components/alertContext';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { showAlert } = useAlert();

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) showAlert('Error', error.message);
    else router.replace('/(tabs)/explore');
    setLoading(false);
  }

  async function signInAsGuest() {
    setLoading(true);
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) {
      showAlert('Error', error.message);
    } else if (data.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .upsert([{
          id: data.user.id,
          full_name: 'Guest User',
          email: `guest_${data.user.id.substring(0, 8)}@anonymous.local`,
          age: 18,
        }], { onConflict: 'id' });

      if (profileError) {
        console.error("Guest profile creation error:", profileError);
      }
      router.replace('/(tabs)/explore');
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

        <TouchableOpacity style={styles.primaryButton} onPress={signInWithEmail} disabled={loading}>
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.btnText}>Sign In</Text>}
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

  guestButton: { backgroundColor: '#18181b', padding: 18, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: '#27272a', marginTop: 15 },
  guestBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  secondaryButton: { padding: 18, alignItems: 'center', marginTop: 15 },
  secondaryBtnText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 14 }
});
