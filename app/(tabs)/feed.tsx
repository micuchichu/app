import React, { useEffect, useState } from 'react';
import { View } from 'react-native';

import { supabase } from '@/app/lib/supabase';
import { GlobalStyles } from '@/app/constants/globalStyles';
import { Job } from '@/app/components/jobCard';
import { useAlert } from '@/app/components/alertContext';
import { ScrollableJobs } from '@/app/components/scrollableJobs'; // <-- Import the new component

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
        employers ( rating, verified, profiles ( full_name ) ),
        locations!job_location_id ( city_name ),
        job_postings_candidates ( employee_id ) 
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