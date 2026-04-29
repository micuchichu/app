import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform, FlatList, ActivityIndicator, Image, Modal, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Map, Filter, Briefcase, ChevronRight, User, X } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { FilterState, JobFilterModal } from '@/app/components/jobFilterModal';
import { JobsMapModal } from '@/app/components/jobsMapModal';

import { ProfileModal } from '@/app/components/profileModal';
import { ScrollableJobs } from '@/app/components/scrollableJobs'; 
import { ServiceModal } from '@/app/components/serviceModal';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  
  const [feedMode, setFeedMode] = useState<'jobs' | 'services'>('jobs');
  
  const [activeCategory, setActiveCategory] = useState('All');
  const categories = ['All', 'Microjob', 'Part-time', 'Full-time', 'On-site', 'Online', 'Hybrid'];

  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | undefined>(undefined);

  const [userId, setUserId] = useState<string | null>(null);
  const [feedStartId, setFeedStartId] = useState<string | null>(null);

  const [feedItems, setFeedItems] = useState<any[]>([]);

  const [searchedProfiles, setSearchedProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);
  const [selectedService, setSelectedService] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const fallbackImage = require('@/assets/nomedia.png');

  const filterAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: feedMode === 'jobs' ? 1 : 0,
      duration: 100,
      useNativeDriver: false,
    }).start();
  }, [feedMode]);

  const animatedFilterBtnStyle = {
    opacity: filterAnim,
    width: filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 48],
    }),
    marginLeft: filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 10],
    }),
    transform: [{
      scale: filterAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
      })
    }],
  };

  const animatedFilterStyle = {
    opacity: filterAnim,
    height: filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 50],
    }),
    marginTop: filterAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 10],
    }),
    transform: [{
      translateY: filterAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [-20, 0],
      })
    }],
  };

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchData();
  }, [activeCategory, activeFilters, submittedQuery, feedMode]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      
      let jobQuery = supabase
        .from('job_postings')
        .select(`
          *,
          id:job_id,
          currencies ( currency_text ),
          employers ( rating, verified, profiles ( full_name ) ),
          locations!job_location_id ( city_name ),
          job_postings_candidates ( employee_id )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (submittedQuery.trim() !== '') {
        jobQuery = jobQuery.ilike('title', `%${submittedQuery}%`);
      }

      if (activeCategory !== 'All' && activeCategory !== 'Jobs' && activeCategory !== 'Services') {
        const cat = activeCategory.toLowerCase();
        if (['microjob', 'part-time', 'full-time'].includes(cat)) {
          jobQuery = jobQuery.eq('schedule_type', cat);
        } else if (['on-site', 'online', 'hybrid'].includes(cat)) {
          jobQuery = jobQuery.eq('work_mode', cat);
        }
      }

      if (activeFilters) {
        if (activeFilters.workModes && activeFilters.workModes.length > 0) {
          const mappedModes = activeFilters.workModes.map(mode => mode === 'In-Person' ? 'on-site' : mode.toLowerCase());
          jobQuery = jobQuery.in('work_mode', mappedModes);
        }
        if (activeFilters.scheduleTypes && activeFilters.scheduleTypes.length > 0) {
          const mappedTypes = activeFilters.scheduleTypes.map(type => type.toLowerCase());
          jobQuery = jobQuery.in('schedule_type', mappedTypes);
        }
        if (activeFilters.peopleNeeded && activeFilters.peopleNeeded !== 'Any') {
          if (activeFilters.peopleNeeded === '5+') {
            jobQuery = jobQuery.gte('people_needed', 5);
          } else {
            jobQuery = jobQuery.eq('people_needed', parseInt(activeFilters.peopleNeeded));
          }
        }
      }

      let serviceQuery = supabase
        .from('service_postings')
        .select(`
          *,
          currencies ( currency_text ),
          employees ( rating, profiles ( full_name, phone_number, email ) )
        `)
        .order('created_at', { ascending: false });

      if (submittedQuery.trim() !== '') {
        serviceQuery = serviceQuery.ilike('title', `%${submittedQuery}%`);
      }

      const fetchProfiles = async () => {
        if (submittedQuery.trim() === '') return { data: null, error: null };
        return await supabase
          .from('profiles')
          .select('id, full_name')
          .ilike('full_name', `%${submittedQuery}%`)
          .limit(10);
      };

      let rawJobs: any[] = [];
      let rawServices: any[] = [];
      
      const fetchPromises = [];
      fetchPromises.push(fetchProfiles());

      if (feedMode === 'jobs') {
         fetchPromises.push(jobQuery);
      } else {
         fetchPromises.push(Promise.resolve({ data: [], error: null })); 
      }

      if (feedMode === 'services') {
         fetchPromises.push(serviceQuery);
      } else {
         fetchPromises.push(Promise.resolve({ data: [], error: null })); 
      }

      const [profilesResponse, jobsResponse, servicesResponse] = await Promise.all(fetchPromises);

      if (profilesResponse?.error) console.error("Error profiles:", profilesResponse.error);
      else setSearchedProfiles(profilesResponse.data || []);

      if (jobsResponse.error) console.error("Error jobs:", jobsResponse.error);
      else rawJobs = jobsResponse.data || [];

      if (servicesResponse?.error) console.error("Error services:", servicesResponse.error);
      else rawServices = servicesResponse?.data || [];

      const normalizedJobs = rawJobs.map(job => ({ ...job, _type: 'job' }));
      const normalizedServices = rawServices.map(service => ({ 
        ...service, 
        _type: 'service',
        pay_amount: service.price, 
        employer_id: service.employee_id, 
        employers: {
           profiles: { full_name: service.employees?.profiles?.full_name }
        }
      }));

      if (feedMode === 'jobs') {
        setFeedItems(normalizedJobs);
      } else {
        setFeedItems(normalizedServices);
      }

    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setSubmittedQuery(searchQuery.trim());
  };

  const renderFeedCard = ({ item }: { item: any }) => {
    const isService = item._type === 'service';
    const creatorName = item.employers?.profiles?.full_name || 'Anonymous';
    const imageSource = item.thumbnail_url ? { uri: item.thumbnail_url } : fallbackImage;

    return (
      <TouchableOpacity 
        style={[styles.gridCard, isService && styles.serviceGridCard]} 
        onPress={() => {
           if (isService) {
              setSelectedService(item);
           } else {
              setFeedStartId(item.id);
           }
        }}
      >
        {/* Only render the image and overlay if it is a job */}
        {!isService && (
          <>
            <Image source={imageSource} style={styles.gridCardImage} />
            <View style={styles.gridCardOverlay} />
          </>
        )}

        <View style={styles.gridCardContent}>
          <View style={styles.gridCardTop}>
             <View style={[styles.payBadgeSmall, isService && { backgroundColor: Colors.primary }]}>
               <Text style={styles.payBadgeTextSmall}>
                 {isService ? 'Service' : `${item.pay_amount} ${item.currencies?.currency_text || ''}`}
               </Text>
             </View>
          </View>
          
          <View style={styles.gridCardBottom}>
            {isService && (
                <Text style={{ color: '#4ade80', fontSize: 13, fontWeight: 'bold', marginBottom: 4 }}>
                    {item.price} {item.currencies?.currency_text || ''}
                </Text>
            )}
            <Text style={[styles.gridCardTitle, isService && styles.noTextShadow]} numberOfLines={2}>{item.title}</Text>
            <Text style={[styles.gridCardEmployer, isService && styles.noTextShadow]} numberOfLines={1}>@{creatorName.replace(/\s+/g, '').toLowerCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const listHeader = (
    <View>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Explore</Text>

        <View style={styles.searchContainer}>
          <Search size={20} color={Colors.textSubtle} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder={`Search ${feedMode}...`}
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit} 
          />
          <Animated.View style={[animatedFilterBtnStyle, { overflow: 'hidden' }]}>
            <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterVisible(true)}>
              <Filter size={20} color={activeFilters ? Colors.primary : "white"} /> 
            </TouchableOpacity>
          </Animated.View>
        </View>

        <Animated.View style={[animatedFilterStyle, { overflow: 'hidden' }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </Animated.View>
      </View>

      <TouchableOpacity style={styles.mapCard} onPress={() => setIsMapVisible(true)}>
        <View style={styles.mapCardContent}>
          <View style={styles.mapIconBg}>
            <Map size={24} color={Colors.primary} />
          </View>
          <View style={styles.mapCardTextContainer}>
            <Text style={styles.mapCardTitle}>Opportunities Near Me</Text>
            <Text style={styles.mapCardSub}>Explore the local map</Text>
          </View>
          <ChevronRight size={24} color={Colors.textSubtle} />
        </View>
      </TouchableOpacity>

      {submittedQuery === '' && (
        <View style={styles.modeToggleContainer}>
          <TouchableOpacity 
            style={[styles.modeToggleBtn, feedMode === 'jobs' && styles.modeToggleBtnActive]} 
            onPress={() => setFeedMode('jobs')}
          >
            <Text style={[styles.modeToggleText, feedMode === 'jobs' && styles.modeToggleTextActive]}>Jobs</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.modeToggleBtn, feedMode === 'services' && styles.modeToggleBtnActive]} 
            onPress={() => setFeedMode('services')}
          >
            <Text style={[styles.modeToggleText, feedMode === 'services' && styles.modeToggleTextActive]}>Services</Text>
          </TouchableOpacity>
        </View>
      )}

      {submittedQuery !== '' && searchedProfiles.length > 0 && (
        <View style={{ marginBottom: 25 }}>
          <Text style={styles.sectionTitle}>People matching "{submittedQuery}"</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
            {searchedProfiles.map(profile => (
              <TouchableOpacity 
                key={profile.id} 
                style={styles.profileSearchCard} 
                onPress={() => setSelectedProfile(profile)}
              >
                <View style={styles.profileSearchAvatar}>
                  <User size={24} color="white" />
                </View>
                <Text style={styles.profileSearchName} numberOfLines={1}>{profile.full_name || 'Anonymous User'}</Text>
                <Text style={styles.profileSearchJob} numberOfLines={1}>{profile.current_job || 'Member'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      <Text style={styles.sectionTitle}>
        {submittedQuery 
          ? `Results matching "${submittedQuery}"` 
          : feedMode === 'services' 
            ? 'Latest Services' 
            : activeCategory === 'All' ? 'Latest Jobs' : `${activeCategory} Jobs`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={feedItems}
          key={'grid-2-cols'} 
          keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
          renderItem={renderFeedCard}
          ListHeaderComponent={listHeader}
          numColumns={2}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : (
              <View style={styles.emptyState}>
                <Briefcase size={48} color={Colors.surfaceHighlight} />
                <Text style={styles.emptyStateText}>
                  {submittedQuery ? `No ${feedMode} found for this search.` : `No ${feedMode} found matching your criteria.`}
                </Text>
                <TouchableOpacity onPress={() => { setSearchQuery(''); setSubmittedQuery(''); setActiveCategory('All'); setActiveFilters(undefined); setSearchedProfiles([]); }}>
                  <Text style={{ color: Colors.primary, marginTop: 10, fontWeight: 'bold' }}>Clear Filters</Text>
                </TouchableOpacity>
              </View>
            )
          }
        />

        <JobsMapModal visible={isMapVisible} onClose={() => setIsMapVisible(false)} />

        <JobFilterModal 
          visible={isFilterVisible}
          onClose={() => setIsFilterVisible(false)}
          currentFilters={activeFilters}
          onApply={(newFilters) => {
            setActiveFilters(newFilters);
            setIsFilterVisible(false);
          }}
        />

        <ProfileModal 
          visible={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          userId={selectedProfile?.id}
          fallbackName={selectedProfile?.full_name} 
        />

        <Modal visible={!!feedStartId} animationType="slide" onRequestClose={() => setFeedStartId(null)}>
          <View style={{ flex: 1, backgroundColor: 'black' }}>
            <TouchableOpacity style={styles.closeSwipeFeedBtn} onPress={() => setFeedStartId(null)}>
              <X size={24} color="white" />
            </TouchableOpacity>

            {!!feedStartId && (
              <ScrollableJobs 
                jobs={feedItems.filter(j => j._type === 'job') as any} 
                userId={userId} 
                initialJobId={feedStartId} 
                onRefresh={fetchData} 
              />
            )}
          </View>
        </Modal>
        
        <ServiceModal 
          visible={!!selectedService}
          onClose={() => setSelectedService(null)}
          service={selectedService}
        />
        
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background || 'black' },
  container: { flex: 1, paddingHorizontal: 20 },
  
  header: { marginBottom: 20, paddingTop: Platform.OS === 'android' ? 20 : 10 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
  
  modeToggleContainer: { flexDirection: 'row', backgroundColor: Colors.surface || '#18181b', borderRadius: 12, padding: 3, marginBottom: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  modeToggleBtn: { flex: 1, alignItems: 'center', paddingVertical: 6, borderRadius: 8 },
  modeToggleBtnActive: { backgroundColor: '#27272a' },
  modeToggleText: { color: Colors.textSubtle || '#a1a1aa', fontWeight: '600', fontSize: 13 },
  modeToggleTextActive: { color: 'white' },

  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchIcon: { position: 'absolute', left: 15, zIndex: 1 },
  searchInput: { flex: 1, backgroundColor: Colors.surfaceHighlight || '#27272a', color: 'white', paddingVertical: 14, paddingLeft: 45, paddingRight: 15, borderRadius: 12, fontSize: 16 },
  filterBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  categoriesContainer: { gap: 10, height: 50, paddingTop: 10 },
  categoryPill: { backgroundColor: Colors.surface || '#18181b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  categoryPillActive: { backgroundColor: Colors.primary || '#8b5cf6', borderColor: Colors.primary || '#8b5cf6' },
  categoryText: { color: Colors.textSubtle || '#a1a1aa', fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: 'white' },

  mapCard: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  mapCardContent: { flexDirection: 'row', alignItems: 'center' },
  mapIconBg: { backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: 12, borderRadius: 12, marginRight: 15 },
  mapCardTextContainer: { flex: 1 },
  mapCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mapCardSub: { color: Colors.textMuted || '#71717a', fontSize: 14 },

  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },

  profileSearchCard: { backgroundColor: '#18181b', width: 120, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  profileSearchAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.primary },
  profileSearchName: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  profileSearchJob: { color: '#a1a1aa', fontSize: 11, textAlign: 'center' },

  row: { justifyContent: 'space-between', marginBottom: 15, },

  gridCard: { width: '48%', aspectRatio: 0.75, borderRadius: 12, backgroundColor: '#18181b', overflow: 'hidden', borderWidth: 1, borderColor: '#27272a' },
  serviceGridCard: { backgroundColor: '#1d1d1d', borderColor: '#3f3f46' }, 
  gridCardImage: { width: '100%', height: '100%', position: 'absolute', resizeMode: 'cover', },
  gridCardOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.35)', },
  gridCardContent: { flex: 1, justifyContent: 'space-between', padding: 10, },
  gridCardTop: { flexDirection: 'row', justifyContent: 'flex-start', },

  gridCardBottom: { justifyContent: 'flex-end', },
  gridCardTitle: { color: 'white', fontSize: 14, fontWeight: 'bold', marginBottom: 4, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, },
  gridCardEmployer: { color: '#d4d4d8', fontSize: 12, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4, },
  noTextShadow: { textShadowColor: 'transparent', textShadowRadius: 0 },

  payBadgeSmall: { backgroundColor: '#27272a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, overlayColor: 'rgba(0,0,0,0.6)', marginBottom: 6 },
  payBadgeTextSmall: { color: 'white', fontWeight: 'bold', fontSize: 12,},
 
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyStateText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 },
  
  closeSwipeFeedBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100, backgroundColor: 'rgba(24, 24, 27, 0.8)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: '#3f3f46' },
});