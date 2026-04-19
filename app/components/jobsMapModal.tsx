import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Animated, PanResponder, Dimensions, Image, ScrollView } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { X, MapPin, ArrowLeft, Users, Bookmark, Briefcase, Sparkles, Navigation, DollarSign } from 'lucide-react-native';
import * as Location from 'expo-location';

import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const HIDDEN_Y = SCREEN_HEIGHT;
const SMALL_Y = SCREEN_HEIGHT - 240; // Overview & Job Preview height
const EXPANDED_Y = SCREEN_HEIGHT * 0.15; // Full Job height

interface JobsMapModalProps {
  visible: boolean;
  onClose: () => void;
}

export const JobsMapModal = ({ visible, onClose }: JobsMapModalProps) => {
  const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  const [jobs, setJobs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false); 
  const panY = useRef(new Animated.Value(HIDDEN_Y)).current;

  useEffect(() => {
    if (visible) {
      getUserLocation();
      fetchMapJobs();
      // Show the Overview sheet automatically when opened
      setSelectedJob(null);
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
    } else {
      setSelectedJob(null);
      setIsExpanded(false);
      isExpandedRef.current = false;
    }
  }, [visible]);

  // Whenever the selected job changes (or clears), reset to the SMALL preview state
  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      isExpandedRef.current = false;
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
    }
  }, [selectedJob]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderMove: (_, gestureState) => {
        const startY = isExpandedRef.current ? EXPANDED_Y : SMALL_Y;
        let newY = startY + gestureState.dy;
        if (newY < EXPANDED_Y) newY = EXPANDED_Y; 
        panY.setValue(newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        // SWIPE UP
        if (gestureState.dy < -50 || gestureState.vy < -0.5) {
          if (selectedJob) {
            // Expand the job
            isExpandedRef.current = true;
            setIsExpanded(true);
            Animated.spring(panY, { toValue: EXPANDED_Y, useNativeDriver: true, bounciness: 6 }).start();
          } else {
            // Overview doesn't expand, bounce back
            Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
          }
        } 
        // SWIPE DOWN
        else if (gestureState.dy > 50 || gestureState.vy > 0.5) {
          if (isExpandedRef.current) {
             // Shrink job to preview
             isExpandedRef.current = false;
             setIsExpanded(false);
             Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
          } else {
             if (selectedJob) {
               // Swipe down on job preview -> clear job, show overview
               setSelectedJob(null); 
             } else {
               // Swipe down on overview -> hide sheet completely to see map
               Animated.spring(panY, { toValue: HIDDEN_Y, useNativeDriver: true }).start();
             }
          }
        } 
        // SNAP BACK (Didn't swipe hard enough)
        else {
           Animated.spring(panY, { toValue: isExpandedRef.current ? EXPANDED_Y : SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    })
  ).current;

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
    }
  };

  const fetchMapJobs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        id:job_id, title, description, pay_amount, pay_currency, schedule_type, 
        work_mode, is_negotiable, people_needed, is_sponsored, save_count, thumbnail_url,
        locations!job_location_id ( latitude, longitude )
      `)
      .eq('active', true);

    if (!error && data) {
      const formattedJobs = (data as any[]).map(job => ({
        ...job,
        locationData: Array.isArray(job.locations) ? job.locations[0] : job.locations
      })).filter(job => job.locationData?.latitude && job.locationData?.longitude);
      setJobs(formattedJobs);
    }
    setIsLoading(false);
  };

  const fallbackImage = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";

  // Calculate nearby stats
  const microjobCount = jobs.filter(j => j.schedule_type?.toLowerCase() === 'microjob').length;
  const partTimeCount = jobs.filter(j => j.schedule_type?.toLowerCase() === 'part-time').length;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        <MapView 
          style={styles.map} 
          region={mapRegion} 
          showsUserLocation={true} 
          onPress={() => {
            if (selectedJob) {
              setSelectedJob(null); // Map tap clears job -> shows overview
            } else {
              // Map tap when hidden -> brings overview back
              Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
            }
          }}
        >
          {jobs.map((job) => (
            <Marker
              key={job.id}
              coordinate={{ latitude: job.locationData.latitude, longitude: job.locationData.longitude }}
              onPress={(e) => {
                e.stopPropagation();
                setSelectedJob(job);
              }}
            >
              <View style={[
                styles.markerBadge, 
                job.is_sponsored && { backgroundColor: '#fbbf24' },
                selectedJob?.id === job.id && styles.markerBadgeSelected
              ]}>
                <MapPin size={16} color="white" />
              </View>
            </Marker>
          ))}
        </MapView>

        <View style={styles.headerOverlay} pointerEvents="box-none">
          <TouchableOpacity style={styles.backBtn} onPress={onClose}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          {isLoading && (
            <View style={styles.loadingBadge}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.loadingText}>Loading...</Text>
            </View>
          )}
        </View>

        <Animated.View {...panResponder.panHandlers} style={[styles.bottomSheet, { transform: [{ translateY: panY }] }]}>
          <View style={styles.dragZone}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.sheetContent}>
            {selectedJob ? (
              // --- SELECTED JOB VIEW ---
              <>
                <View style={styles.titleRow}>
                  <View style={{ flex: 1, paddingRight: 15 }}>
                    {selectedJob.is_sponsored && (
                      <View style={styles.sponsoredBadge}>
                        <Sparkles size={12} color="#fbbf24" />
                        <Text style={styles.sponsoredText}>Sponsored</Text>
                      </View>
                    )}
                    <Text style={styles.jobTitle} numberOfLines={isExpanded ? 2 : 1}>{selectedJob.title}</Text>
                    
                    <View style={styles.payRow}>
                      <Text style={styles.jobPay}>${selectedJob.pay_amount} {selectedJob.pay_currency}</Text>
                      {selectedJob.is_negotiable && <Text style={styles.negotiableText}>(Negotiable)</Text>}
                    </View>
                  </View>
                  
                  {isExpanded && (
                    <TouchableOpacity style={styles.closeX} onPress={() => setSelectedJob(null)}>
                      <X size={20} color="white" />
                    </TouchableOpacity>
                  )}
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScrollView} contentContainerStyle={styles.badgesContainer}>
                  <View style={styles.infoBadge}>
                    <Briefcase size={14} color="#a1a1aa" />
                    <Text style={styles.infoBadgeText}>{selectedJob.schedule_type}</Text>
                  </View>
                  <View style={styles.infoBadge}>
                    <MapPin size={14} color="#a1a1aa" />
                    <Text style={styles.infoBadgeText}>{selectedJob.work_mode}</Text>
                  </View>
                  <View style={styles.infoBadge}>
                    <Users size={14} color="#a1a1aa" />
                    <Text style={styles.infoBadgeText}>{selectedJob.people_needed} Needed</Text>
                  </View>
                  {selectedJob.save_count > 0 && (
                    <View style={styles.infoBadge}>
                      <Bookmark size={14} color="#fbbf24" />
                      <Text style={styles.infoBadgeText}>{selectedJob.save_count} Saves</Text>
                    </View>
                  )}
                </ScrollView>

                {isExpanded && (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.jobDescription} numberOfLines={3}>{selectedJob.description}</Text>
                    <View style={styles.mediaContainer}>
                      <Image source={{ uri: selectedJob.thumbnail_url || fallbackImage }} style={styles.mediaPreview} />
                    </View>
                    <TouchableOpacity style={styles.applyBtn}>
                      <Text style={styles.applyBtnText}>{selectedJob.is_negotiable ? 'Place a Bid' : 'Apply Now'}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            ) : (
              // --- NEARBY OVERVIEW VIEW ---
              <>
                <View style={styles.overviewHeader}>
                  <View style={styles.radarIconBg}>
                    <Navigation size={24} color={Colors.primary || "#8b5cf6"} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.overviewTitle}>{jobs.length} Jobs Nearby</Text>
                    <Text style={styles.overviewSub}>Tap a pin to view details, or swipe down to hide</Text>
                  </View>
                </View>

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{microjobCount}</Text>
                    <Text style={styles.statLabel}>Microjobs</Text>
                  </View>
                  <View style={styles.statBoxDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.statNumber}>{partTimeCount}</Text>
                    <Text style={styles.statLabel}>Part-time</Text>
                  </View>
                  <View style={styles.statBoxDivider} />
                  <View style={styles.statBox}>
                    <DollarSign size={20} color="#4ade80" />
                    <Text style={styles.statLabel}>Paid Gigs</Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  map: { width: '100%', height: '100%' },
  
  headerOverlay: { position: 'absolute', top: 0, width: '100%', flexDirection: 'row', justifyContent: 'space-between', padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40 },
  backBtn: { backgroundColor: '#18181b', padding: 12, borderRadius: 25, borderWidth: 1, borderColor: '#27272a' },
  loadingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20 },
  loadingText: { color: 'white', fontWeight: 'bold', marginLeft: 8 },

  markerBadge: { backgroundColor: '#8b5cf6', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' },
  markerBadgeSelected: { backgroundColor: '#4ade80', transform: [{ scale: 1.2 }], borderColor: 'white', zIndex: 10 },
  
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', height: SCREEN_HEIGHT, backgroundColor: Colors.surface || '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  dragZone: { width: '100%', alignItems: 'center', paddingVertical: 15 },
  dragHandle: { width: 40, height: 5, backgroundColor: '#52525b', borderRadius: 3 },
  
  sheetContent: { paddingHorizontal: 25, flex: 1 },
  
  // Job Details
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sponsoredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 },
  sponsoredText: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  jobTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  payRow: { flexDirection: 'row', alignItems: 'baseline' },
  jobPay: { color: '#4ade80', fontSize: 18, fontWeight: '800' },
  negotiableText: { color: '#a1a1aa', fontSize: 14, marginLeft: 6 },
  closeX: { backgroundColor: '#27272a', padding: 8, borderRadius: 20 },
  badgesScrollView: { maxHeight: 35, minHeight: 35, marginBottom: 15 },
  badgesContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 20 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  infoBadgeText: { color: 'white', fontSize: 12, marginLeft: 6, textTransform: 'capitalize' },
  jobDescription: { color: '#a1a1aa', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  mediaContainer: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', marginBottom: 20 },
  mediaPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  applyBtn: { backgroundColor: Colors.primary || '#8b5cf6', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Overview Styles
  overviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  radarIconBg: { backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: 12, borderRadius: 16, marginRight: 15 },
  overviewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  overviewSub: { color: Colors.textMuted || '#71717a', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceHighlight || '#27272a', borderRadius: 16, padding: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxDivider: { width: 1, height: 30, backgroundColor: '#3f3f46' },
  statNumber: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: Colors.textSubtle || '#a1a1aa', fontSize: 12, marginTop: 4 },
});