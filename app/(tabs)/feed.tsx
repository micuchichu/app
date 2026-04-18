import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';

import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/ranking'; 
import { GlobalStyles } from '../constants/globalStyles';
import { Colors } from '../constants/colors';

import JobCard, { Job } from '../components/jobCard';
import { BiddingModal } from '../components/biddingModal'; 

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [feedMode, setFeedMode] = useState<'hiring' | 'toHire'>('hiring');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [feedMode]);

  const fetchJobs = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        id:job_id,
        employers ( rating, verified ),
        locations!job_location_id ( city_name )
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch error details:", error);
      Alert.alert('Error fetching jobs', error.message);
    } else {
      const filtered = (data ?? []).filter((job: Job) => 
        feedMode === 'hiring' ? job.schedule_type !== 'service_request' : job.schedule_type === 'service_request'
      );
      setJobs(filtered);
    }
    
    setIsLoading(false);
  };

  const handleApply = async (job: Job) => {
    if (job.is_negotiable) {
      setBiddingJob(job);
    } else {
      if (userId) await trackEvent(userId, job.id, 'apply');
      Alert.alert('Applied!', `Your application to ${job.employers?.company_name || 'the employer'} has been sent.`);
    }
  };

  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (!userId) return;
    viewableItems.forEach((vi: any) => trackEvent(userId, vi.item.id, 'view'));
  }, [userId]);

  if (isLoading && jobs.length === 0) {
    return (
      <View style={GlobalStyles.safeScreen}>
        <ActivityIndicator size="large" color={Colors.primary} style={{ flex: 1 }} />
      </View>
    );
  }

  return (
    <View style={GlobalStyles.safeScreen}>
      <View style={styles.topNavContainer}>
        <SafeAreaView edges={['top']} style={styles.topNav}>
          <TouchableOpacity onPress={() => setFeedMode('hiring')}>
            <Text style={[styles.topNavText, feedMode === 'hiring' && styles.topNavTextActive]}>Hiring</Text>
            {feedMode === 'hiring' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          <Text style={styles.topNavSeparator}>|</Text>
          <TouchableOpacity onPress={() => setFeedMode('toHire')}>
            <Text style={[styles.topNavText, feedMode === 'toHire' && styles.topNavTextActive]}>To hire</Text>
            {feedMode === 'toHire' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </SafeAreaView>
      </View>

      <FlashList
        data={jobs}
        renderItem={({ item }) => <JobCard item={item} onApply={() => handleApply(item)} userId={userId} />}
        keyExtractor={item => item.id.toString()}
        snapToInterval={height} 
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={fetchJobs}
        onViewableItemsChanged={handleViewableChange}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
      />

      {/* NEW: Drop in the isolated component! */}
      <BiddingModal 
        visible={!!biddingJob}
        job={biddingJob}
        userId={userId}
        onClose={() => setBiddingJob(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  topNavContainer: { position: 'absolute', top: 0, width: '100%', zIndex: 10 },
  topNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 15, paddingTop: Platform.OS === 'android' ? 15 : 0 },
  topNavText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', paddingHorizontal: 10 },
  topNavTextActive: { color: 'white', fontWeight: 'bold' },
  topNavSeparator: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  activeIndicator: { height: 2, backgroundColor: 'white', width: 20, alignSelf: 'center', marginTop: 4, borderRadius: 2 },
});