import React, { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useAlert } from '@/components/alertContext';
import { BiddingModal } from '@/components/biddingModal';
import JobCard, { Job } from '@/components/jobCard';
import { trackEvent } from '@/lib/ranking';
import { supabase } from '@/lib/supabase';

interface JobSwipeFeedProps {
  jobs: Job[];
  userId: string | null;
  isLoading?: boolean;
  onRefresh?: () => void;
  initialJobId?: string;
}

export const ScrollableJobs = ({
  jobs,
  userId,
  isLoading = false,
  onRefresh,
  initialJobId,
}: JobSwipeFeedProps) => {
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const { showAlert } = useAlert();

  const initialIndex = initialJobId
    ? Math.max(0, jobs.findIndex((j) => j.id === initialJobId))
    : 0;
  const [activeIndex, setActiveIndex] = useState(initialIndex);

  const handleApply = async (job: Job) => {
    if (!userId) {
      showAlert('Sign In Required', 'You must be logged in to apply for jobs.');
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
      showAlert('Database Error', 'Could not verify your profile. Please try again.');
      return;
    }

    if (!existingEmployee) {
      const { error: insertEmpError } = await supabase.from('employees').insert([
        {
          id: userId,
          rating: 0,
          looking_for_job: true,
          active_user: true,
          jobs_done: 0,
        },
      ]);

      if (insertEmpError) {
        showAlert('Profile Error', 'Could not initialize your worker profile.');
        return;
      }
    }

    const { error } = await supabase.from('job_postings_candidates').insert({
      job_id: job.id,
      employee_id: userId,
    });

    if (error) {
      if (userId == job.employers?.id) {
        showAlert('Error', 'You cannot apply to your own job posting.');
      } else if (error.code === '23505') {
        showAlert('Already Applied', 'You have already submitted an application for this job.');
      } else {
        showAlert('Error', 'Could not submit your application. Please try again.');
      }
    } else {
      await trackEvent(userId, job.id, 'apply');
      const employerName = job.employers?.profiles?.full_name || 'the employer';
      const handle = `@${employerName.replace(/\s+/g, '').toLowerCase()}`;
      showAlert('Applied!', `Your application to ${handle} has been sent successfully.`);
    }
  };

  const handleScroll = useCallback(
    (e: any) => {
      const scrollTop = e.nativeEvent.contentOffset.y;
      // each item is 100vh — estimate index from scroll position
      const viewportHeight = window.innerHeight;
      const index = Math.round(scrollTop / viewportHeight);
      if (index !== activeIndex) {
        setActiveIndex(index);
        if (userId && jobs[index]) {
          trackEvent(userId, jobs[index].id, 'view');
        }
      }
    },
    [activeIndex, userId, jobs]
  );

  return (
    <View style={styles.container}>
      <ScrollView
        style={webSnapStyles.scrollView as any}
        contentContainerStyle={webSnapStyles.content as any}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={100}
      >
        {jobs.map((item, index) => (
          <View key={item.id.toString()} style={webSnapStyles.snapItem as any}>
            <JobCard
              item={item}
              onApply={() => handleApply(item)}
              userId={userId}
              isActive={index === activeIndex}
            />
          </View>
        ))}
      </ScrollView>

      <BiddingModal
        visible={!!biddingJob}
        job={biddingJob}
        userId={userId}
        onClose={() => setBiddingJob(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
});

// Web-only CSS snap styles — defined outside StyleSheet.create to allow
// browser-specific properties without TypeScript conflicts
const webSnapStyles = {
  scrollView: {
    flex: 1,
    height: '100vh',
    overflowY: 'scroll',
    scrollSnapType: 'y mandatory',
    WebkitOverflowScrolling: 'touch',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
  },
  snapItem: {
    height: '100vh',
    minHeight: '100vh',
    scrollSnapAlign: 'start',
    scrollSnapStop: 'always',
    overflow: 'hidden',
  },
};