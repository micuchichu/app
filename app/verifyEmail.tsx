import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Mail, ArrowRight } from 'lucide-react-native';

export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        
        <View style={styles.iconContainer}>
          <View style={styles.iconBackground}>
            <Mail size={48} color="#10b981" />
          </View>
        </View>

        <Text style={styles.title}>Check your inbox</Text>
        
        <Text style={styles.description}>
          We've sent a verification email to
        </Text>
        
        <View style={styles.emailBadge}>
          <Text style={styles.emailText}>{email || "your email address"}</Text>
        </View>

        <Text style={styles.instructions}>
          Please click the link inside to verify your account. Once verified, you can log in and start using the app!
        </Text>

      </View>

      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.loginButton} 
          onPress={() => router.replace('/login')}
        >
          <Text style={styles.loginButtonText}>Go to Login</Text>
          <ArrowRight size={20} color="white" style={{ marginLeft: 8 }} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconContainer: { marginBottom: 30, alignItems: 'center' },
  iconBackground: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(16, 185, 129, 0.15)', justifyContent: 'center', alignItems: 'center' },
  title: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 15,textAlign: 'center' },
  description: { color: '#a1a1aa', fontSize: 16, textAlign: 'center', marginBottom: 10 },
  emailBadge: { backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1, borderColor: '#27272a', marginBottom: 20 },
  emailText: { color: 'white', fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
  instructions: { color: '#a1a1aa', fontSize: 15, textAlign: 'center', lineHeight: 24, paddingHorizontal: 10 },
  bottomNav: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 10 : 30, borderTopWidth: 1, borderTopColor: '#27272a', backgroundColor: '#09090b' },
  loginButton: { flexDirection: 'row', backgroundColor: '#8b5cf6', height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', },
  loginButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});