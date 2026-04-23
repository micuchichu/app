import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Map, Filter, MapPin, Briefcase, ChevronRight, User } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';
import { FilterState, JobFilterModal } from '@/app/components/jobFilterModal';
import { JobsMapModal } from '@/app/components/jobsMapModal';
import { JobPreviewModal } from '@/app/components/jobPreviewModal';
import { Job } from '@/app/components/jobCard';
import { ProfileModal } from '@/app/components/profileModal';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [submittedQuery, setSubmittedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [isMapVisible, setIsMapVisible] = useState(false);
  const [isFilterVisible, setIsFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState<FilterState | undefined>(undefined);

  const [userId, setUserId] = useState<string | null>(null);
  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  const [jobs, setJobs] = useState<any[]>([]);

  const [searchedProfiles, setSearchedProfiles] = useState<any[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<any | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  const categories = ['All', 'Microjob', 'Part-time', 'Full-time', 'On-site', 'Online', 'Hybrid'];

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUserId(user?.id || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    fetchJobsAndProfiles();
  }, [activeCategory, activeFilters, submittedQuery]);

  const fetchJobsAndProfiles = async () => {
    setIsLoading(true);
    try {
      let jobQuery = supabase
        .from('job_postings')
        .select(`
          employer_id, title, description, pay_amount, currency_id, schedule_type, work_mode, is_negotiable, active, created_at,
          thumbnail_url, video_url,
          locations!job_location_id(city_name),
          employers ( rating, verified, profiles ( full_name ) )
        `)
        .eq('active', true)
        .order('created_at', { ascending: false });

      if (submittedQuery.trim() !== '') {
        jobQuery = jobQuery.ilike('title', `%${submittedQuery}%`);
      }

      if (activeCategory !== 'All') {
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

      const fetchProfiles = async () => {
        if (submittedQuery.trim() === '') return { data: null, error: null };
        
        return await supabase
          .from('profiles')
          .select('id, full_name')
          .ilike('full_name', `%${submittedQuery}%`)
          .limit(10);
      };

      const [jobsResponse, profilesResponse] = await Promise.all([
        jobQuery, 
        fetchProfiles()
      ]);

      if (jobsResponse.error) console.error("Error fetching jobs:", jobsResponse.error);
      else setJobs(jobsResponse.data || []);

      if (profilesResponse.error) console.error("Error fetching profiles:", profilesResponse.error);
      else setSearchedProfiles(profilesResponse.data || []);

    } catch (e) {
      console.log(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearchSubmit = () => {
    setSubmittedQuery(searchQuery.trim());
  };

  const renderJobCard = ({ item }: { item: any }) => {
    const cityName = item.locations?.city_name || 'Remote';
    const employerName = item.employers?.profiles?.full_name || 'Anonymous';

    return (
      <TouchableOpacity style={styles.jobListCard} onPress={() => setPreviewJob(item as unknown as Job)}>
        <View style={styles.jobListHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.jobListTitle} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.jobListEmployer}>@{employerName.replace(/\s+/g, '').toLowerCase()}</Text>
          </View>
          <View style={styles.payBadge}>
            <Text style={styles.payBadgeText}>${item.pay_amount}</Text>
          </View>
        </View>
        <Text style={styles.jobListDesc} numberOfLines={2}>{item.description}</Text>
        <View style={styles.jobListFooter}>
          <View style={styles.tagRow}>
            <View style={styles.smallTag}><Briefcase size={12} color={Colors.textMuted} /><Text style={styles.smallTagText}>{item.schedule_type}</Text></View>
            <View style={styles.smallTag}><MapPin size={12} color={Colors.textMuted} /><Text style={styles.smallTagText}>{cityName}</Text></View>
          </View>
          <Text style={styles.timeAgo}>Active</Text>
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
            placeholder="Search jobs or people..."
            placeholderTextColor={Colors.textSubtle}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            onSubmitEditing={handleSearchSubmit} 
          />
          <TouchableOpacity style={styles.filterBtn} onPress={() => setIsFilterVisible(true)}>
            <Filter size={20} color={activeFilters ? Colors.primary : "white"} /> 
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoriesContainer}>
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
      </View>

      <TouchableOpacity style={styles.mapCard} onPress={() => setIsMapVisible(true)}>
        <View style={styles.mapCardContent}>
          <View style={styles.mapIconBg}>
            <Map size={24} color={Colors.primary} />
          </View>
          <View style={styles.mapCardTextContainer}>
            <Text style={styles.mapCardTitle}>Jobs Near Me</Text>
            <Text style={styles.mapCardSub}>Explore opportunities on the map</Text>
          </View>
          <ChevronRight size={24} color={Colors.textSubtle} />
        </View>
      </TouchableOpacity>

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
        {submittedQuery ? `Jobs matching "${submittedQuery}"` : activeCategory === 'All' ? 'Latest Opportunities' : `${activeCategory} Jobs`}
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <FlatList
          data={jobs}
          keyExtractor={(item, index) => item?.id ? item.id.toString() : index.toString()}
          renderItem={renderJobCard}
          ListHeaderComponent={listHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          ListEmptyComponent={
            isLoading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
            ) : (
              <View style={styles.emptyState}>
                <Briefcase size={48} color={Colors.surfaceHighlight} />
                <Text style={styles.emptyStateText}>
                  {submittedQuery ? "No jobs found for this search." : "No jobs found matching your criteria."}
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

        <JobPreviewModal job={previewJob} onClose={() => setPreviewJob(null)} userId={userId} />
        <ProfileModal 
          visible={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          userId={selectedProfile?.id}
          fallbackName={selectedProfile?.full_name} 
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
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchIcon: { position: 'absolute', left: 15, zIndex: 1 },
  searchInput: { flex: 1, backgroundColor: Colors.surfaceHighlight || '#27272a', color: 'white', paddingVertical: 14, paddingLeft: 45, paddingRight: 15, borderRadius: 12, fontSize: 16 },
  filterBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  categoriesContainer: { gap: 10, paddingTop: 10 },
  categoryPill: { backgroundColor: Colors.surface || '#18181b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  categoryPillActive: { backgroundColor: Colors.primary || '#8b5cf6', borderColor: Colors.primary || '#8b5cf6' },
  categoryText: { color: Colors.textSubtle || '#a1a1aa', fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: 'white' },

  mapCard: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 25, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  mapCardContent: { flexDirection: 'row', alignItems: 'center' },
  mapIconBg: { backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: 12, borderRadius: 12, marginRight: 15 },
  mapCardTextContainer: { flex: 1 },
  mapCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mapCardSub: { color: Colors.textMuted || '#71717a', fontSize: 14 },

  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15 },

  // --- NEW: Profile Search Card Styles ---
  profileSearchCard: { backgroundColor: '#18181b', width: 120, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  profileSearchAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.primary },
  profileSearchName: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  profileSearchJob: { color: '#a1a1aa', fontSize: 11, textAlign: 'center' },

  jobListCard: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 16, marginBottom: 15, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  jobListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  jobListTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  jobListEmployer: { color: Colors.primary || '#8b5cf6', fontSize: 13, marginTop: 2, fontWeight: '600' },
  payBadge: { backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  payBadgeText: { color: '#4ade80', fontWeight: 'bold', fontSize: 14 },
  jobListDesc: { color: Colors.textMuted || '#a1a1aa', fontSize: 14, lineHeight: 20, marginBottom: 12 },
  jobListFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a', paddingTop: 12 },
  tagRow: { flexDirection: 'row', gap: 8 },
  smallTag: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.surfaceHighlight || '#27272a', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  smallTagText: { color: Colors.textMuted || '#a1a1aa', fontSize: 12, textTransform: 'capitalize' },
  timeAgo: { color: Colors.textSubtle || '#71717a', fontSize: 12 },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 50 },
  emptyStateText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 }
});