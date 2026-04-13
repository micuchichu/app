import { FlashList } from '@shopify/flash-list';
import { Bookmark, Briefcase, DollarSign, Eye, MapPin, Share2, User, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// Note: You will need to update your lib/ranking file to accept the new Job interface as well
import { trackEvent } from '../lib/ranking'; 
import { supabase } from '../lib/supabase';

const { height, width } = Dimensions.get('window');

// --- UPDATED INTERFACE ---
// This matches exactly what the new Supabase query will return
export interface Job {
  id: string;
  title: string;
  description: string;
  schedule_type: string;
  pay_amount: number;
  pay_currency: string;
  is_negotiable: boolean;
  thumbnail_url: string;
  viewCount: number; // Assuming you add this back or calculate it
  
  // These come from the JOINs
  employers?: { company_name?: string } | null; 
  cities?: { name?: string } | null;
}

const JobCard = ({ item, onApply, userId }: {
  item: Job;
  onApply: () => void;
  userId: string | null;
}) => {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    if (userId) {
      await trackEvent(userId, item.id, 'save');
    }
  };

  // Safely extract the joined data
  const employerName = item.employers?.company_name || 'Unknown Employer';
  const cityName = item.cities?.name || 'Remote';
  
  // Format the pay string based on numeric value
  const formattedPay = `${item.is_negotiable ? 'Max ' : ''}${item.pay_amount} ${item.pay_currency}`;

  return (
    <View style={styles.jobCard}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.bgImage} />
      <View style={styles.darkOverlay} />
      <View style={styles.contentOverlay}>
        <View style={styles.jobInfoContainer}>
          
          <View style={styles.viewCountBadge}>
            <Eye size={12} color="white" />
            {/* Fallback to 0 if viewCount isn't tracked yet */}
            <Text style={styles.viewCountText}>{item.viewCount || 0} people viewing</Text>
          </View>
          
          <Text style={styles.employer}>@{employerName.replace(/\s+/g, '').toLowerCase()}</Text>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.tagsRow}>
            <View style={styles.tag}><Briefcase size={12} color="white" /><Text style={styles.tagText}>{item.schedule_type}</Text></View>
            <View style={styles.tag}><MapPin size={12} color="white" /><Text style={styles.tagText}>{cityName}</Text></View>
          </View>
          
          <View style={styles.payRow}>
            <DollarSign size={18} color="#4ade80" />
            <Text style={styles.payText}>{formattedPay}</Text>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionIcon}>
            <View style={styles.profilePicPlaceholder}><User size={24} color="white" /></View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} onPress={handleSave}>
            <Bookmark size={28} color={isSaved ? "#fbbf24" : "white"} fill={isSaved ? "#fbbf24" : "transparent"} />
            <Text style={styles.actionText}>{isSaved ? "Saved" : "Save"}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon}>
            <Share2 size={28} color="white" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.applyBtnBubble, { backgroundColor: item.is_negotiable ? '#8b5cf6' : '#2563eb' }]}
            onPress={onApply}
          >
            <Text style={styles.applyBtnText}>{item.is_negotiable ? 'BID' : 'APPLY'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  
  // We use schedule_type to determine which feed to show
  const [feedMode, setFeedMode] = useState<'hiring' | 'toHire'>('hiring');

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id ?? null);
    });
  }, []);

  useEffect(() => {
    fetchJobs();
  }, [feedMode]);

  const fetchJobs = async () => {
    setIsLoading(true);
    
    // --- UPDATED QUERY WITH JOINS ---
    // This tells Supabase to grab the job, PLUS look up the employer and city attached to those IDs!
    const { data, error } = await supabase
      .from('job_postings')
      .select(`
        *,
        employers ( company_name ),
        cities ( name )
      `)
      .eq('active', true) // Only show active jobs
      .order('created_at', { ascending: false });

    if (error) {
      Alert.alert('Error fetching jobs', error.message);
      console.log("Feed Error:", error);
    } else {
      
      // Filter the UI based on the new schedule_type enum
      const filtered = (data ?? []).filter((job: Job) => {
        if (feedMode === 'hiring') {
           // Show regular jobs
           return job.schedule_type !== 'service_request'; 
        } else {
           // Show freelancers offering services
           return job.schedule_type === 'service_request';
        }
      });
      
      setJobs(filtered);
    }
    
    setIsLoading(false);
  };

  const handleApply = async (job: Job) => {
    if (job.is_negotiable) {
      setBiddingJob(job);
    } else {
      if (userId) await trackEvent(userId, job.id, 'apply');
      const employerName = job.employers?.company_name || 'the employer';
      Alert.alert('Applied!', `Your application to ${employerName} has been sent.`);
    }
  };

  const handleViewableChange = useCallback(({ viewableItems }: any) => {
    if (!userId) return;
    viewableItems.forEach((vi: any) => {
      trackEvent(userId, vi.item.id, 'view');
    });
  }, [userId]);

  if (isLoading && jobs.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  // --- RENDER REMAINS EXACTLY THE SAME ---
  return (
    <View style={{ flex: 1, backgroundColor: 'black' }}>
      <SafeAreaView style={styles.topNavContainer}>
        <View style={styles.topNav}>
          <TouchableOpacity onPress={() => setFeedMode('hiring')}>
            <Text style={[styles.topNavText, feedMode === 'hiring' && styles.topNavTextActive]}>Hiring</Text>
            {feedMode === 'hiring' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
          <Text style={styles.topNavSeparator}>|</Text>
          <TouchableOpacity onPress={() => setFeedMode('toHire')}>
            <Text style={[styles.topNavText, feedMode === 'toHire' && styles.topNavTextActive]}>To hire</Text>
            {feedMode === 'toHire' && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <FlashList
        data={jobs}
        renderItem={({ item }) => (
          <JobCard
            item={item}
            onApply={() => handleApply(item)}
            userId={userId}
          />
        )}
        keyExtractor={item => item.id.toString()}
        // BE CAREFUL WITH HEIGHT: Make sure your jobCard style matches this exactly!
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

      {biddingJob && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setBiddingJob(null)}>
              <X size={24} color="#71717a" />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Place your bid</Text>
            <Text style={styles.modalSub}>{biddingJob.title} • {biddingJob.pay_amount}</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="white" />
              <TextInput
                style={styles.input}
                placeholder="0.00"
                placeholderTextColor="#71717a"
                keyboardType="numeric"
                value={bidAmount}
                onChangeText={setBidAmount}
                autoFocus
              />
            </View>
            <TouchableOpacity
              style={styles.submitBidBtn}
              onPress={async () => {
                if (userId && biddingJob) await trackEvent(userId, biddingJob.id, 'bid');
                Alert.alert('Bid Sent');
                setBiddingJob(null);
              }}
            >
              <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Submit Bid</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  topNavContainer: { position: 'absolute', top: 0, width: '100%', zIndex: 10, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  topNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  topNavText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', paddingHorizontal: 10 },
  topNavTextActive: { color: 'white', fontWeight: 'bold' },
  topNavSeparator: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  activeIndicator: { height: 2, backgroundColor: 'white', width: 20, alignSelf: 'center', marginTop: 4, borderRadius: 2 },
  jobCard: { height: height - 20, width: width, marginBottom: 20 },
  bgImage: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  contentOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 110, paddingHorizontal: 15 },
  jobInfoContainer: { flex: 1, paddingRight: 20 },
  viewCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  viewCountText: { color: 'white', fontSize: 11, marginLeft: 4, fontWeight: '500' },
  employer: { color: '#d1d5db', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  jobTitle: { color: 'white', fontSize: 26, fontWeight: 'bold', marginVertical: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  description: { color: '#e5e7eb', fontSize: 14, marginBottom: 12, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  tagsRow: { flexDirection: 'row', marginBottom: 12 },
  tag: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  tagText: { color: 'white', fontSize: 12, marginLeft: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center' },
  payText: { color: '#4ade80', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  actionButtonsContainer: { alignItems: 'center', paddingBottom: 10 },
  actionIcon: { alignItems: 'center', marginBottom: 20 },
  profilePicPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white' },
  applyBtnBubble: { borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 10 },
  modalBox: { backgroundColor: '#18181b', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  closeBtn: { alignSelf: 'flex-end' },
  modalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: '#a1a1aa', fontSize: 14, marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  input: { flex: 1, color: 'white', fontSize: 24, paddingVertical: 15, marginLeft: 10, fontWeight: 'bold' },
  submitBidBtn: { backgroundColor: '#8b5cf6', padding: 18, borderRadius: 12, alignItems: 'center' },
});