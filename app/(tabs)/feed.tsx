import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FlashList } from '@shopify/flash-list';
import { DollarSign, X } from 'lucide-react-native';

import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/ranking'; 
import { GlobalStyles } from '../constants/globalStyles';
import { Colors } from '../constants/colors';

import JobCard, { Job } from '../components/jobCard';

const { height } = Dimensions.get('window');

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('');
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
      .select(`*, employers ( company_name ), locations ( city_name )`)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
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
      {/* Top Nav */}
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

      {/* The Feed */}
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

      {/* Bidding Modal */}
      <Modal visible={!!biddingJob} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={GlobalStyles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setBiddingJob(null)}>
              <X size={24} color={Colors.textSubtle} />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>Place your bid</Text>
            <Text style={styles.modalSub}>{biddingJob?.title} • {biddingJob?.pay_amount}</Text>
            
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="white" />
              <TextInput
                style={styles.modalInput}
                placeholder="0.00"
                placeholderTextColor={Colors.textSubtle}
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                autoFocus
              />
            </View>
            
            <TouchableOpacity
              style={GlobalStyles.primaryButton}
              onPress={async () => {
                if (userId && biddingJob) await trackEvent(userId, biddingJob.id, 'bid');
                Alert.alert('Bid Sent');
                setBiddingJob(null);
                setBidAmount('');
              }}
            >
              <Text style={GlobalStyles.primaryButtonText}>Submit Bid</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  // Nav
  topNavContainer: { position: 'absolute', top: 0, width: '100%', zIndex: 10 },
  topNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingBottom: 15, paddingTop: Platform.OS === 'android' ? 15 : 0 },
  topNavText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', paddingHorizontal: 10 },
  topNavTextActive: { color: 'white', fontWeight: 'bold' },
  topNavSeparator: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  activeIndicator: { height: 2, backgroundColor: 'white', width: 20, alignSelf: 'center', marginTop: 4, borderRadius: 2 },
  
  // Cleaned Modal Styles
  modalBox: { backgroundColor: Colors.surface, padding: 25, borderTopLeftRadius: 30, borderTopRightRadius: 30, width: '100%' },
  closeBtn: { alignSelf: 'flex-end', marginBottom: 10 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: Colors.textMuted, fontSize: 15, marginBottom: 25 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surfaceHighlight, borderRadius: 12, paddingHorizontal: 15, marginBottom: 25 },
  modalInput: { flex: 1, color: 'white', fontSize: 28, paddingVertical: 18, marginLeft: 10, fontWeight: 'bold' },
});