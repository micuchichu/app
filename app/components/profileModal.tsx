import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { User, X, Star, BadgeCheck, MapPin, Calendar } from 'lucide-react-native';
import { useRouter } from 'expo-router'; // Brought in the router to actually navigate!

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const HIDDEN_Y = SCREEN_HEIGHT;
const SMALL_Y = SCREEN_HEIGHT - 380; 
const EXPANDED_Y = SCREEN_HEIGHT * 0.15; 

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string | null;
  fallbackName?: string;
}

export function ProfileModal({ visible, onClose, userId, fallbackName = 'Anonymous' }: ProfileModalProps) {
  const router = useRouter();

  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false); 
  const panY = useRef(new Animated.Value(HIDDEN_Y)).current;

  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  const [employerData, setEmployerData] = useState<any>(null);
  const [jobsPostedCount, setJobsPostedCount] = useState(0);

  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      isExpandedRef.current = false;
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
      
      if (userId) fetchProfileData(userId);
    } else {
      panY.setValue(HIDDEN_Y);
      setProfileData(null);
      setEmployerData(null);
      setJobsPostedCount(0);
    }
  }, [visible, userId]);

  const fetchProfileData = async (id: string) => {
    setLoading(true);
    try {
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
          *,
          locations!profile_location_id ( city_name, country_code )
        `)
        .eq('id', id)
        .maybeSingle();

      const { data: employer } = await supabase
        .from('employers')
        .select('rating, verified')
        .eq('id', id)
        .maybeSingle();

      const { count } = await supabase
        .from('job_postings')
        .select('*', { count: 'exact', head: true })
        .eq('employer_id', id)
        .eq('active', true);

      setProfileData(profile);
      setEmployerData(employer);
      setJobsPostedCount(count || 0);

    } catch (error) {
      console.log("Error fetching profile for modal:", error);
    } finally {
      setLoading(false);
    }
  };

  const closeWithAnimation = () => {
    Animated.timing(panY, { toValue: HIDDEN_Y, duration: 250, useNativeDriver: true }).start(() => {
      onClose(); 
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5, 
      
      onPanResponderMove: (_, gestureState) => {
        const startY = isExpandedRef.current ? EXPANDED_Y : SMALL_Y;
        let newY = startY + gestureState.dy;
        if (newY < EXPANDED_Y) newY = EXPANDED_Y; 
        panY.setValue(newY);
      },
      
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;

        if (dy < -50 || vy < -0.5) {
          isExpandedRef.current = true;
          setIsExpanded(true);
          Animated.spring(panY, { toValue: EXPANDED_Y, useNativeDriver: true, bounciness: 6 }).start();
        } 
        else if (dy > 50 || vy > 0.5) {
          if (isExpandedRef.current) {
             isExpandedRef.current = false;
             setIsExpanded(false);
             Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
          } else {
             closeWithAnimation();
          }
        } 
        else {
           Animated.spring(panY, { toValue: isExpandedRef.current ? EXPANDED_Y : SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    })
  ).current;

  const displayName = profileData?.full_name || fallbackName;
  const employerRating = employerData?.rating || 0;
  const isVerified = employerData?.verified || false;
  const joinDate = profileData?.created_at 
    ? new Date(profileData.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) 
    : 'Recently';

  const locationObj = Array.isArray(profileData?.locations) ? profileData?.locations[0] : profileData?.locations;
  const locationString = locationObj?.city_name 
    ? `${locationObj.city_name}${locationObj.country_code ? `, ${locationObj.country_code}` : ''}` 
    : 'Unknown Location';

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={closeWithAnimation}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeWithAnimation} />

        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: panY }] }]}>
          
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.massiveDragArea}>
              <View style={styles.dragHandle} />
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={closeWithAnimation}>
              <X size={24} color="#a1a1aa" />
            </TouchableOpacity>

            <View style={styles.modalAvatarPlaceholder}>
              <User size={40} color="white" />
            </View>

            <View style={styles.modalNameRow}>
              {loading && !profileData ? (
                <ActivityIndicator size="small" color={Colors.primary} style={{ marginRight: 8 }} />
              ) : null}
              <Text style={styles.modalEmployerName}>{displayName}</Text>
              {isVerified && <BadgeCheck size={20} color="#3b82f6" style={{ marginLeft: 6 }} />}
            </View>
            <Text style={styles.modalEmployerHandle}>@{displayName.replace(/\s+/g, '').toLowerCase()}</Text>

            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatNumber}>
                  {employerRating > 0 ? employerRating.toFixed(1) : 'New'} <Star size={16} color="#fbbf24" fill={employerRating > 0 ? "#fbbf24" : "transparent"} />
                </Text>
                <Text style={styles.modalStatLabel}>Employer Rating</Text>
              </View>
              
              {isExpanded && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatNumber}>{jobsPostedCount}</Text>
                    <Text style={styles.modalStatLabel}>Active Jobs</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {isExpanded && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.expandedContent} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>
                {profileData?.bio || "This user hasn't added a bio yet."}
              </Text>

              <View style={styles.infoRow}>
                <MapPin size={18} color="#a1a1aa" />
                <Text style={styles.infoText}>Based in {locationString}</Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={18} color="#a1a1aa" />
                <Text style={styles.infoText}>Joined {joinDate}</Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Expertise</Text>
              {profileData?.skills?.length > 0 ? (
                <View style={styles.badgesContainer}>
                  {profileData.skills.map((skill: string, index: number) => (
                    <View key={index} style={styles.badgePill}><Text style={styles.badgeText}>{skill}</Text></View>
                  ))}
                </View>
              ) : (
                <Text style={styles.infoText}>No skills listed.</Text>
              )}
            </ScrollView>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  
  bottomSheet: { position: 'absolute', width: '100%', height: SCREEN_HEIGHT, backgroundColor: '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: '#27272a',shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  
  dragZone: { alignItems: 'center', width: '100%', paddingHorizontal: 25 },
  massiveDragArea: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  dragHandle: { width: 50, height: 6, backgroundColor: '#52525b', borderRadius: 3 },

  closeModalBtn: { position: 'absolute', top: 15, right: 20, padding: 5, zIndex: 10 },
  
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: Colors.primary || '#8b5cf6' },
  modalNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modalEmployerName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  modalEmployerHandle: { color: '#a1a1aa', fontSize: 14, marginBottom: 10 },
  
  modalStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#27272a', paddingVertical: 15, marginBottom: 10 },
  modalStatBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#27272a' },
  modalStatNumber: { color: 'white', fontSize: 20, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatLabel: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },

  expandedContent: { flex: 1, width: '100%', paddingHorizontal: 25, paddingTop: 10 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  bioText: { color: '#d4d4d8', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  infoText: { color: '#a1a1aa', fontSize: 14 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgePill: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.4)' },
  badgeText: { color: '#d8b4fe', fontSize: 12, fontWeight: 'bold' },

  footer: { paddingHorizontal: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingTop: 10 },
  viewProfileBtn: { backgroundColor: Colors.primary || '#8b5cf6', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  viewProfileBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});