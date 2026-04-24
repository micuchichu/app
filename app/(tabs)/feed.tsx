import React, { useCallback, useEffect, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import { FlashList } from '@shopify/flash-list';

import { supabase } from '@/app/lib/supabase';
import { trackEvent } from '@/app/lib/ranking'; 
import { GlobalStyles } from '@/app/constants/globalStyles';

import JobCard, { Job } from '@/app/components/jobCard';
import { BiddingModal } from '@/app/components/biddingModal'; 
import { useAlert } from '@/app/components/alertContext';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const { showAlert } = useAlert();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        id:job_id,
        employers ( 
          rating, 
          verified,
          profiles ( full_name ) 
        ),
        locations!job_location_id ( city_name )
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Fetch error details:", error);
      showAlert('Error fetching jobs', error.message);
    } else {
      setJobs(data || []);
    }
    
    setIsLoading(false);
  };

  const handleApply = async (job: Job) => {
    if (job.is_negotiable) {
      setBiddingJob(job);
    } else {
      if (userId) await trackEvent(userId, job.id, 'apply');
      showAlert('Applied!', `Your application to ${job.employers?.profiles?.full_name || 'the employer'} has been sent.`);
    }
  };

  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index);
    }
    if (!userId) return;
    viewableItems.forEach((vi: any) => trackEvent(userId, vi.item.id, 'view'));
  }, [userId]);

  return (
    <View style={GlobalStyles.safeScreen}>
      <FlashList
        data={jobs}
        renderItem={({ item, index }) => (
          <JobCard 
            item={item} 
            onApply={() => handleApply(item)} 
            userId={userId} 
            isActive={index === activeIndex} 
          />
        )}
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

      <BiddingModal 
        visible={!!biddingJob}
        job={biddingJob}
        userId={userId}
        onClose={() => setBiddingJob(null)}
      />
    </View>
  );
}