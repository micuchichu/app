import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { User, LogOut, Star, Briefcase, Lock } from 'lucide-react-native';
import { router } from 'expo-router';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { GlobalStyles } from '@/app/constants/globalStyles';
import { useAlert } from '@/app/components/alertContext';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  
  const [employerRating, setEmployerRating] = useState<number | null>(null);
  const [employeeRating, setEmployeeRating] = useState<number | null>(null);
  const { showAlert } = useAlert();

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) throw authError;

      if (!user || user.is_anonymous || !user.email) {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: employerData } = await supabase
        .from('employers')
        .select('rating')
        .eq('id', user.id)
        .maybeSingle();

      const { data: employeeData } = await supabase
        .from('employees')
        .select('rating')
        .eq('id', user.id)
        .maybeSingle();

      setEmployerRating(employerData?.rating || 0);
      setEmployeeRating(employeeData?.rating || 0);

      if (profileError) {
        console.log("Error fetching profile from DB:", profileError);
        setUserData({ email: user.email });
      } else {
        setUserData({ ...profileData, email: user.email });
      }
    } catch (error) {
      console.log("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showAlert("Error signing out", error.message);
    } else {
      router.replace('/login');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
        <View style={styles.restrictedCircle}>
          <Lock size={40} color={Colors.textMuted} />
        </View>
        <Text style={styles.restrictedHeader}>Account Required</Text>
        <Text style={styles.restrictedSub}>You need to be logged in to view and edit your profile.</Text>
        
        <TouchableOpacity style={[GlobalStyles.primaryButton, { width: '100%' }]} onPress={handleSignOut}>
          <Text style={GlobalStyles.primaryButtonText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const emailPrefix = userData?.email?.split('@')[0] || 'user';
  const displayName = userData?.full_name || emailPrefix;
  const currentJob = userData?.current_job || 'New Member';
  const age = userData?.age || '?';
  const skills: string[] = userData?.skills || [];

  return (
    <ScrollView style={styles.screenContainer} contentContainerStyle={{paddingBottom: 120}}>
      
      <View style={styles.profileHeader}>
        <TouchableOpacity style={styles.settingsIcon} onPress={handleSignOut}>
          <LogOut size={24} color={Colors.error} />
        </TouchableOpacity>
        
        <View style={styles.largeAvatar}>
          <User size={40} color="white" />
        </View>
        
        <Text style={styles.profileName}>{displayName}</Text>
        <Text style={styles.profileHandle}>{currentJob} • Age {age}</Text>
        
        {/* UPDATED: Added Employee vs Employer Rating split */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {employerRating && employerRating > 0 ? employerRating.toFixed(1) : 'N/A'} <Star size={12} color="#fbbf24" />
            </Text>
            <Text style={styles.statLabel}>Employer</Text>
          </View>
          <View style={styles.statBoxDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>
              {employeeRating && employeeRating > 0 ? employeeRating.toFixed(1) : 'N/A'} <Star size={12} color="#fbbf24" />
            </Text>
            <Text style={styles.statLabel}>Worker</Text>
          </View>
          <View style={styles.statBoxDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Done</Text>
          </View>
          <View style={styles.statBoxDivider} />
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Bids</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>My Expertise</Text>
      {skills.length > 0 ? (
        <View style={styles.skillsContainer}>
          {skills.map((skill, index) => (
            <View key={index} style={styles.skillPill}>
              <Text style={styles.skillPillText}>{skill}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text style={styles.emptyText}>No skills added yet.</Text>
      )}

      <Text style={[styles.sectionTitle, { marginTop: 25 }]}>Recent Activity</Text>
      
      <View style={styles.activityCard}>
        <Briefcase size={20} color={Colors.primary} />
        <View style={styles.activityTextContainer}>
          <Text style={styles.activityTitle}>Account Created</Text>
          <Text style={styles.activitySubtitle}>Welcome to the platform!</Text>
        </View>
        <Text style={[styles.activityStatus, { color: '#4ade80' }]}>New</Text>
      </View>

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  screenContainer: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: Platform.OS === 'android' ? 60 : 60 },
  
  profileHeader: { alignItems: 'center', backgroundColor: Colors.surface, padding: 20, borderRadius: 20, marginBottom: 25, position: 'relative' },
  settingsIcon: { position: 'absolute', top: 20, right: 20 },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: Colors.primary },
  
  profileName: { color: 'white', fontSize: 22, fontWeight: 'bold', textTransform: 'capitalize' },
  profileHandle: { color: Colors.textMuted, fontSize: 14, marginBottom: 20, fontWeight: '500' },
  
  // UPDATED: Now perfectly spaces 4 columns using flex
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight, paddingTop: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxDivider: { width: 1, height: 25, backgroundColor: Colors.surfaceHighlight },
  statNumber: { color: 'white', fontSize: 16, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center', gap: 4 },
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  skillPill: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.5)' },
  skillPillText: { color: '#d8b4fe', fontWeight: '600', fontSize: 14 },
  emptyText: { color: Colors.textMuted, fontStyle: 'italic' },

  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 15, borderRadius: 12, marginBottom: 10 },
  activityTextContainer: { marginLeft: 15, flex: 1 },
  activityTitle: { color: 'white', fontWeight: 'bold', marginBottom: 2 },
  activitySubtitle: { color: Colors.textMuted, fontSize: 12 },
  activityStatus: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold' },

  restrictedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: Colors.surfaceHighlight },
  restrictedHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  restrictedSub: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 22 },
});