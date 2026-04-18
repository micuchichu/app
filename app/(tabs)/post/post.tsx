import React, { useRef, useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Dimensions, Platform, KeyboardAvoidingView, ActivityIndicator
} from 'react-native';
import { Lock } from 'lucide-react-native';
import { HireTab } from './hire';
import { supabase } from '../../lib/supabase';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 40;

export default function PostScreen() {  
  const [isGuest, setIsGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.is_anonymous || !user?.email) {
        setIsGuest(true);
      }
      setLoadingAuth(false);
    };
    checkAuth();
  }, []);

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
        <View style={styles.restrictedCircle}>
          <Lock size={40} color="#a1a1aa" />
        </View>
        <Text style={styles.restrictedHeader}>Account Required</Text>
        <Text style={styles.restrictedSub}>You need to be logged in to create a job posting or offer your services.</Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToLogin}>
          <Text style={styles.submitBtnText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenHeader}>Post a Job</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView>
            <View style={{ width: contentWidth - 10, marginRight: 5, marginLeft: 5 }}>
              <HireTab />
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: 'black', paddingHorizontal: 20, paddingTop: 60 },
  screenHeader: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  restrictedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  restrictedHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  restrictedSub: { color: '#a1a1aa', fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 22 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 25, padding: 4, marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  toggleSlider: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, backgroundColor: '#8b5cf6', borderRadius: 21, width: '50%'},
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 21 },
  toggleBtnActive: { backgroundColor: '#8b5cf6' },
  toggleText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 14 },
  toggleTextActive: { color: 'white' },

  formSection: { flex: 1 },
  subHeader: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  uploadBox: { height: 160, backgroundColor: '#18181b', borderRadius: 15, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  uploadText: { color: '#71717a', marginTop: 10, fontWeight: '500' },
  inputLabel: { color: '#e4e4e7', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  formInput: { backgroundColor: '#18181b', color: 'white', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#27272a' },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  pill: { backgroundColor: '#18181b', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  pillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  pillText: { color: '#a1a1aa', fontWeight: '600' },
  pillTextActive: { color: 'white' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10},
  infoIcon: { marginLeft: 6, marginRight: '55%' },
  
  primaryButton: { backgroundColor: '#8a5cf6', color: 'black', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, width: '100%', alignSelf: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});