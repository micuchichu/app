import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, TouchableOpacity, StyleSheet, ActivityIndicator, Platform, Animated, PanResponder, Dimensions, Text } from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import { ArrowLeft, MapPin, Filter, Compass, LocateFixed } from 'lucide-react-native'; // <-- NEW ICONS
import * as Location from 'expo-location';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { JobFilterModal, FilterState } from './jobFilterModal';
import MapBottomSheet from './mapBottomSheet';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const HIDDEN_Y = SCREEN_HEIGHT;
const SMALL_Y = SCREEN_HEIGHT - 240;
const CLUSTER_Y = SMALL_Y - 30; 
const EXPANDED_Y = SCREEN_HEIGHT * 0.15;

interface JobsMapModalProps {
  visible: boolean;
  onClose: () => void;
}

export const JobsMapModal = ({ visible, onClose }: JobsMapModalProps) => {
  const mapRef = useRef<MapView>(null);
  const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.1, longitudeDelta: 0.1 });
  const [zoomDelta, setZoomDelta] = useState(0.1); 
  
  const [allJobs, setAllJobs] = useState<any[]>([]); 
  const [jobs, setJobs] = useState<any[]>([]);
  const [clusters, setClusters] = useState<any[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [selectedCluster, setSelectedCluster] = useState<any | null>(null);

  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | undefined>(undefined);

  const selectedRef = useRef({ job: selectedJob, cluster: selectedCluster });
  useEffect(() => { selectedRef.current = { job: selectedJob, cluster: selectedCluster }; }, [selectedJob, selectedCluster]);
  
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false); 
  const panY = useRef(new Animated.Value(HIDDEN_Y)).current;

  // --- NEW: Map Control Functions ---
  const handleReorientNorth = () => {
    // Animates the camera rotation back to 0 (North) and resets tilt (pitch)
    mapRef.current?.animateCamera({ heading: 0, pitch: 0 }, { duration: 400 });
  };

  const handleRelocate = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const newRegion = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
      };
      setMapRegion(newRegion);
      setZoomDelta(0.1);
      // Smoothly fly the camera back to the user
      mapRef.current?.animateToRegion(newRegion, 500);
    }
  };

  const getDistanceInKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  };

  const getUserLocation = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setMapRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.1, longitudeDelta: 0.1 });
      setZoomDelta(0.1);
    }
  };

  const fetchMapJobs = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('job_postings')
      .select('id:job_id, title, description, pay_amount, currency_id, schedule_type, work_mode, is_negotiable, people_needed, is_sponsored, save_count, thumbnail_url, locations!job_location_id ( latitude, longitude )')
      .eq('active', true);

    if (!error && data) {
      const formattedJobs = (data as any[]).map(job => ({
        ...job,
        locationData: Array.isArray(job.locations) ? job.locations[0] : job.locations
      })).filter(job => job.locationData?.latitude && job.locationData?.longitude);
      setAllJobs(formattedJobs);
      setJobs(formattedJobs);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    if (visible) {
      getUserLocation();
      fetchMapJobs();
      setSelectedJob(null);
      setSelectedCluster(null);
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
    } else {
      setSelectedJob(null);
      setSelectedCluster(null);
      setIsExpanded(false);
      isExpandedRef.current = false;
    }
  }, [visible]);

  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      isExpandedRef.current = false;
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
    }
  }, [selectedJob]);

  useEffect(() => {
    if (!activeFilters) return setJobs(allJobs);
    let filtered = [...allJobs];

    if (activeFilters.distance <= 100) {
      filtered = filtered.filter(job => getDistanceInKm(mapRegion.latitude, mapRegion.longitude, job.locationData.latitude, job.locationData.longitude) <= activeFilters.distance);
    }
    if (activeFilters.workModes.length > 0) {
      filtered = filtered.filter(job => activeFilters.workModes.some(mode => mode.toLowerCase() === job.work_mode?.toLowerCase()));
    }
    if (activeFilters.scheduleTypes.length > 0) {
      filtered = filtered.filter(job => activeFilters.scheduleTypes.some(type => type.toLowerCase() === job.schedule_type?.toLowerCase()));
    }
    if (activeFilters.peopleNeeded !== 'Any') {
      const reqNum = parseInt(activeFilters.peopleNeeded);
      filtered = filtered.filter(job => activeFilters.peopleNeeded === '5+' ? job.people_needed >= 5 : job.people_needed === reqNum);
    }
    setJobs(filtered);
  }, [activeFilters, allJobs, mapRegion.latitude, mapRegion.longitude]);

  useEffect(() => {
    if (!jobs.length) return setClusters([]);
    const threshold = zoomDelta / 12; 
    const newClusters: any[] = [];
    const visited = new Set();

    for (let i = 0; i < jobs.length; i++) {
      if (visited.has(jobs[i].id)) continue;

      const currentJob = jobs[i];
      const cluster = { id: currentJob.id, coordinate: { latitude: currentJob.locationData.latitude, longitude: currentJob.locationData.longitude }, jobs: [currentJob], isCluster: false, job: currentJob };
      visited.add(currentJob.id);

      for (let j = i + 1; j < jobs.length; j++) {
        if (visited.has(jobs[j].id)) continue;
        const targetJob = jobs[j];
        const dLat = currentJob.locationData.latitude - targetJob.locationData.latitude;
        const dLon = currentJob.locationData.longitude - targetJob.locationData.longitude;
        if (Math.sqrt(dLat * dLat + dLon * dLon) < threshold) {
          cluster.jobs.push(targetJob);
          visited.add(targetJob.id);
        }
      }

      if (cluster.jobs.length > 1) {
        cluster.isCluster = true;
        cluster.coordinate.latitude = cluster.jobs.reduce((sum, j) => sum + j.locationData.latitude, 0) / cluster.jobs.length;
        cluster.coordinate.longitude = cluster.jobs.reduce((sum, j) => sum + j.locationData.longitude, 0) / cluster.jobs.length;
        cluster.id = `cluster-${cluster.jobs[0].id}-${cluster.jobs.length}`;
      }
      newClusters.push(cluster);
    }
    setClusters(newClusters);
  }, [jobs, zoomDelta]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        const isClusterOnly = selectedRef.current.cluster && !selectedRef.current.job;
        const targetSmallY = isClusterOnly ? CLUSTER_Y : SMALL_Y;

        let newY = (isExpandedRef.current ? EXPANDED_Y : targetSmallY) + gestureState.dy;
        panY.setValue(newY < EXPANDED_Y ? EXPANDED_Y : newY);
      },
      onPanResponderRelease: (_, gestureState) => {
        const hasSelection = selectedRef.current.job !== null || selectedRef.current.cluster !== null;
        const isClusterOnly = selectedRef.current.cluster && !selectedRef.current.job;
        const targetSmallY = isClusterOnly ? CLUSTER_Y : SMALL_Y;

        const { dy, vy } = gestureState;

        if (dy < -50 || vy < -0.5) {
          if (hasSelection) {
            isExpandedRef.current = true;
            setIsExpanded(true);
            Animated.spring(panY, { toValue: EXPANDED_Y, useNativeDriver: true, bounciness: 6 }).start();
          } else {
            Animated.spring(panY, { toValue: targetSmallY, useNativeDriver: true, bounciness: 6 }).start();
          }
        } else if (dy > 50 || vy > 0.5) {
          if (isExpandedRef.current) {
             isExpandedRef.current = false;
             setIsExpanded(false);
             Animated.spring(panY, { toValue: targetSmallY, useNativeDriver: true, bounciness: 6 }).start();
          } else {
             if (hasSelection) {
               setSelectedJob(null); 
               setSelectedCluster(null);
             } else {
               Animated.spring(panY, { toValue: HIDDEN_Y, useNativeDriver: true }).start();
             }
          }
        } else {
           Animated.spring(panY, { toValue: isExpandedRef.current ? EXPANDED_Y : targetSmallY, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    })
  ).current;

  return (
    <Modal visible={visible} animationType="slide" transparent={false}>
      <View style={styles.container}>
        
        <MapView 
          ref={mapRef}
          style={styles.map} 
          initialRegion={mapRegion} 
          showsUserLocation={true}
          moveOnMarkerPress={false} 
          onRegionChangeComplete={(region) => {
            setMapRegion(region);
            if (Math.abs(region.longitudeDelta - zoomDelta) > zoomDelta * 0.1) {
              setZoomDelta(region.longitudeDelta);
            }
          }}
          onPress={() => {
            if (selectedJob || selectedCluster) {
              setSelectedJob(null);
              setSelectedCluster(null);
              Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
            } else {
              Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
            }
          }}
        >
          {clusters.map((cluster) => {
            if (cluster.isCluster) {
              return (
                <Marker 
                  key={cluster.id} 
                  coordinate={cluster.coordinate}
                  onPress={(e) => {
                    e.stopPropagation();
                    setSelectedJob(null);
                    setSelectedCluster(cluster); 
                    
                    isExpandedRef.current = false;
                    setIsExpanded(false);
                    Animated.spring(panY, { toValue: CLUSTER_Y, useNativeDriver: true, bounciness: 6 }).start();
                    
                    if (mapRef.current) {
                      mapRef.current.animateToRegion({
                        latitude: cluster.coordinate.latitude - (mapRegion.latitudeDelta * 0.1),
                        longitude: cluster.coordinate.longitude,
                        latitudeDelta: mapRegion.latitudeDelta,
                        longitudeDelta: mapRegion.longitudeDelta,
                      }, 400);
                    }
                  }}
                >
                  <View style={[styles.clusterBadge, selectedCluster?.id === cluster.id && { backgroundColor: '#4ade80' }]}>
                    <Text style={{ color: 'white', fontWeight: 'bold' }}>{cluster.jobs.length}</Text>
                  </View>
                </Marker>
              );
            }

            const job = cluster.job;
            return (
              <Marker
                key={job.id}
                coordinate={{ latitude: job.locationData.latitude, longitude: job.locationData.longitude }}
                onPress={(e) => { 
                  e.stopPropagation(); 
                  setSelectedCluster(null);
                  setSelectedJob(job); 
                }}
              >
                <View style={[styles.markerBadge, job.is_sponsored && { backgroundColor: '#fbbf24' }, selectedJob?.id === job.id && styles.markerBadgeSelected]}>
                  <MapPin size={16} color="white" />
                </View>
              </Marker>
            );
          })}
        </MapView>

        {/* --- NEW: Map Action Buttons (Right Sidebar) --- */}
        <View style={styles.mapSideControls} pointerEvents="box-none">
          <View style={styles.controlsPill}>
            <TouchableOpacity style={styles.controlBtn} onPress={handleReorientNorth}>
              <Compass size={22} color="white" />
            </TouchableOpacity>
            
            <View style={styles.controlDivider} />
            
            <TouchableOpacity style={styles.controlBtn} onPress={handleRelocate}>
              <LocateFixed size={22} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Header Controls */}
        <View style={styles.floatingHeader} pointerEvents="box-none">
          <TouchableOpacity style={styles.floatingBtn} onPress={onClose}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.rightFloatingGroup}>
            {isLoading && <View style={styles.loadingBadge}><ActivityIndicator size="small" color="white" /></View>}
            <TouchableOpacity style={[styles.floatingBtn, activeFilters && styles.floatingBtnActive]} onPress={() => setIsFilterVisible(true)}>
              <Filter size={24} color={activeFilters ? Colors.primary || '#8b5cf6' : 'white'} />
              {activeFilters && <View style={styles.filterActiveDot} />}
            </TouchableOpacity>
          </View>
        </View>

        <MapBottomSheet 
          panY={panY}
          panHandlers={panResponder.panHandlers}
          selectedJob={selectedJob}
          selectedCluster={selectedCluster} 
          isExpanded={isExpanded}
          jobsCount={jobs.length}
          microjobCount={jobs.filter(j => j.schedule_type?.toLowerCase() === 'microjob').length}
          partTimeCount={jobs.filter(j => j.schedule_type?.toLowerCase() === 'part-time').length}
          onCloseJob={() => {
            setSelectedJob(null);
            setSelectedCluster(null);
            Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
          }}
          onSelectJob={(job) => {
            setSelectedCluster(null); 
            setSelectedJob(job);
          }}
        />

        <JobFilterModal visible={isFilterVisible} onClose={() => setIsFilterVisible(false)} currentFilters={activeFilters} onApply={(newFilters) => setActiveFilters(newFilters)} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  map: { width: '100%', height: '100%' },
  
  floatingHeader: { position: 'absolute', top: 0, width: '100%', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 60 : 40, zIndex: 10 },
  floatingBtn: { backgroundColor: '#18181b', padding: 12, borderRadius: 25, borderWidth: 1, borderColor: '#3f3f46', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  floatingBtnActive: { borderColor: Colors.primary || '#8b5cf6', backgroundColor: '#27272a' },
  rightFloatingGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  filterActiveDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444' }, 
  loadingBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#8b5cf6', padding: 12, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5 },
  markerBadge: { backgroundColor: '#8b5cf6', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' },
  markerBadgeSelected: { backgroundColor: '#4ade80', transform: [{ scale: 1.2 }], borderColor: 'white', zIndex: 10 },
  clusterBadge: { backgroundColor: Colors.primary || '#8b5cf6', width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 5 },

  mapSideControls: { position: 'absolute', right: 20, top: '40%', zIndex: 5 },
  controlsPill: { backgroundColor: '#18181b', borderRadius: 16, borderWidth: 1, borderColor: '#3f3f46', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 5, elevation: 5, overflow: 'hidden' },
  controlBtn: { padding: 14, alignItems: 'center', justifyContent: 'center' },
  controlDivider: { height: 1, backgroundColor: '#3f3f46', width: '100%' },
});