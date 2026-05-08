import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';

import { useAlert } from '@/components/alertContext';
import { BiddingModal } from '@/components/biddingModal';
import JobCard, { Job } from '@/components/jobCard';
import { trackEvent } from '@/lib/ranking';
import { supabase } from '@/lib/supabase';

const { height } = Dimensions.get('window');

interface JobSwipeFeedProps {
  jobs: Job[];
  userId: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  initialJobId?: string;
}

export const ScrollableJobs = ({ jobs, userId, isLoading = false, onRefresh, initialJobId }: JobSwipeFeedProps) => {
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const { showAlert } = useAlert();

  const initialIndex = initialJobId ? Math.max(0, jobs.findIndex(j => j.id === initialJobId)) : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleApply = async (job: Job) => {
    if (!userId) {
      showAlert("Sign In Required", "You must be logged in to apply for jobs.");
      return;
    }

    if (job.is_negotiable) {
      setBiddingJob(job);
      return;
    } 
    
    const { data: existingEmployee, error: empFetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (empFetchError) {
      showAlert("Database Error", "Could not verify your profile. Please try again.");
      return;
    }

    if (!existingEmployee) {
      const { error: insertEmpError } = await supabase
        .from('employees')
        .insert([{ 
          id: userId, 
          rating: 0, 
          looking_for_job: true, 
          active_user: true, 
          jobs_done: 0 
        }]); 

      if (insertEmpError) {
        console.error("Employee creation error:", insertEmpError);
        showAlert("Profile Error", "Could not initialize your worker profile.");
        return;
      }
    }

    const { error } = await supabase
      .from('job_postings_candidates')
      .insert({
        job_id: job.id,
        employee_id: userId
      });

    if (error) {
      if(userId == job.employers?.id) {
        showAlert('Error', 'You cannot apply to your own job posting.');
      }
      else if (error.code === '23505') {
        showAlert('Already Applied', 'You have already submitted an application for this job.');
      }
      else {
        console.error("Apply error:", error);
        showAlert('Error', 'Could not submit your application. Please try again.');
      }
    } else {
      await trackEvent(userId, job.id, 'apply');
      const employerName = job.employers?.profiles?.full_name || 'the employer';
      const handle = `@${employerName.replace(/\s+/g, '').toLowerCase()}`;
      showAlert('Applied!', `Your application to ${handle} has been sent successfully.`);
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
    <View style={styles.container}>
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
        initialScrollIndex={initialIndex}
        snapToInterval={height} 
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsVerticalScrollIndicator={false}
        refreshing={isLoading}
        onRefresh={onRefresh}
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' }
});