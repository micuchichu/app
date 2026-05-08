import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { useAlert } from '@/components/alertContext';
import { Job } from '@/components/jobCard';
import { ScrollableJobs } from '@/components/scrollableJobs';
import { GlobalStyles } from '@/constants/globalStyles';
import { supabase } from '@/lib/supabase';

const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const { showAlert } = useAlert();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUserId(user?.id ?? null));
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    setIsLoading(true);
    
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        id:job_id,
        currencies ( currency_text ),
        employers ( id, rating, verified, profiles ( full_name ) ),
        locations!job_location_id ( city_name ),
        job_postings_candidates ( employee_id ) 
      `)
      .eq('active', true);

    if (error) {
      console.error("Fetch error details:", error);
      showAlert('Error fetching jobs', error.message);
    } else {
      const fetchedJobs = data || [];
      const randomizedJobs = shuffleArray(fetchedJobs);
      setJobs(randomizedJobs);
    }

    setIsLoading(false);
  };

  return (
    <View style={GlobalStyles.safeScreen}>
      <ScrollableJobs 
        jobs={jobs} 
        userId={userId} 
        isLoading={isLoading} 
        onRefresh={fetchJobs} 
      />
    </View>
  );
}