import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, Dimensions, TextInput, KeyboardAvoidingView, Platform, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { User, MapPin, DollarSign, Share2, Briefcase, X, Bookmark, Eye } from 'lucide-react-native';
import { FlashList } from '@shopify/flash-list';
import { supabase } from '../lib/supabase';
const { height, width } = Dimensions.get('window');

interface Job {
  id: string;
  employer: string;
  title: string;
  type: string;
  payAmount: string;
  negotiable: boolean;
  location: string;
  image: string;
  description: string;
  viewCount: number;
}

const JobCard = ({ item, onApply }: { item: Job, onApply: () => void }) => {
  const [isSaved, setIsSaved] = useState(false);

  return (
    <View style={styles.jobCard}>
      <Image source={{ uri: item.image }} style={styles.bgImage} />

      <View style={styles.darkOverlay} />
      
      <View style={styles.contentOverlay}>
        
        <View style={styles.jobInfoContainer}>
          
          <View style={styles.viewCountBadge}>
            <Eye size={12} color="white" />
            <Text style={styles.viewCountText}>{item.viewCount} people viewing</Text>
          </View>

          <Text style={styles.employer}>@{item.employer.replace(/\s+/g, '').toLowerCase()}</Text>
          <Text style={styles.jobTitle}>{item.title}</Text>
          
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>

          <View style={styles.tagsRow}>
            <View style={styles.tag}><Briefcase size={12} color="white" /><Text style={styles.tagText}>{item.type}</Text></View>
            <View style={styles.tag}><MapPin size={12} color="white" /><Text style={styles.tagText}>{item.location}</Text></View>
          </View>
          
          <View style={styles.payRow}>
            <DollarSign size={18} color="#4ade80" />
            <Text style={styles.payText}>{item.payAmount}</Text>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionIcon}>
            <View style={styles.profilePicPlaceholder}><User size={24} color="white" /></View>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionIcon} onPress={() => setIsSaved(!isSaved)}>
            <Bookmark size={28} color={isSaved ? "#fbbf24" : "white"} fill={isSaved ? "#fbbf24" : "transparent"} />
            <Text style={styles.actionText}>{isSaved ? "Saved" : "Save"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionIcon}><Share2 size={28} color="white" /><Text style={styles.actionText}>Share</Text></TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.applyBtnBubble, { backgroundColor: item.negotiable ? '#8b5cf6' : '#2563eb' }]} 
            onPress={onApply}
          >
            <Text style={styles.applyBtnText}>{item.negotiable ? 'BID' : 'APPLY'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

export default function FeedScreen() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [biddingJob, setBiddingJob] = useState<Job | null>(null);
  const [bidAmount, setBidAmount] = useState('');
  const [feedMode, setFeedMode] = useState<'hiring' | 'toHire'>('hiring');

  useEffect(() => {
    fetchJobs();
  }, [feedMode]);

  const fetchJobs = async () => {
    setIsLoading(true);
    
    const { data: fetchedData, error } = await supabase
      .from('jobs')
      .select('*')
      .order('id', { ascending: true });

    let data = fetchedData;
    if(feedMode === 'hiring') {
      data = data?.filter(job => job.type !== 'Service Request') || [];
    } else {
      data = data?.filter(job => job.type === 'Service Request') || [];
    } 

    if (error) {
      Alert.alert("Error fetching jobs", error.message);
      console.log(error);
    } else {
      setJobs(data);
    }
    
    setIsLoading(false);
  };

  const handleApply = (job: Job) => {
    if (job.negotiable) setBiddingJob(job);
    else Alert.alert("Applied!", `Your application to ${job.employer} has been sent.`);
  }

  if (isLoading && jobs.length === 0) {
    return (
      <View style={{ flex: 1, backgroundColor: 'black', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  return (
    <View style={{flex: 1, backgroundColor: 'black'}}>
      
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
        renderItem={({ item }) => <JobCard item={item} onApply={() => handleApply(item)} />}
        keyExtractor={item => item.id.toString()}
        snapToInterval={height} 
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum={true}
        showsVerticalScrollIndicator={false}

        refreshing={isLoading}
        onRefresh={fetchJobs}
      />

      {biddingJob && (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setBiddingJob(null)}><X size={24} color="#71717a" /></TouchableOpacity>
            <Text style={styles.modalTitle}>Place your bid</Text>
            <Text style={styles.modalSub}>{biddingJob.title} • {biddingJob.payAmount}</Text>
            <View style={styles.inputContainer}>
              <DollarSign size={20} color="white" />
              <TextInput style={styles.input} placeholder="0.00" placeholderTextColor="#71717a" keyboardType="numeric" value={bidAmount} onChangeText={setBidAmount} autoFocus />
            </View>
            <TouchableOpacity style={styles.submitBidBtn} onPress={() => { Alert.alert("Bid Sent"); setBiddingJob(null); }}>
              <Text style={{color: 'white', fontWeight: 'bold', fontSize: 16}}>Submit Bid</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // Top Nav Styles
  topNavContainer: { position: 'absolute', top: 0, width: '100%', zIndex: 10, paddingTop: Platform.OS === 'android' ? 40 : 0 },
  topNav: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 15 },
  topNavText: { color: 'rgba(255,255,255,0.6)', fontSize: 16, fontWeight: '600', paddingHorizontal: 10 },
  topNavTextActive: { color: 'white', fontWeight: 'bold' },
  topNavSeparator: { color: 'rgba(255,255,255,0.3)', fontSize: 16 },
  activeIndicator: { height: 2, backgroundColor: 'white', width: 20, alignSelf: 'center', marginTop: 4, borderRadius: 2 },

  // Card Styles
  jobCard: { height: height - 20, width: width, marginBottom: 20 },
  bgImage: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  contentOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 110, paddingHorizontal: 15 },
  jobInfoContainer: { flex: 1, paddingRight: 20 },
  
  viewCountBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginBottom: 8 },
  viewCountText: { color: 'white', fontSize: 11, marginLeft: 4, fontWeight: '500' },
  
  employer: { color: '#d1d5db', fontSize: 16, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  jobTitle: { color: 'white', fontSize: 26, fontWeight: 'bold', marginVertical: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  description: { color: '#e5e7eb', fontSize: 14, marginBottom: 12, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  
  tagsRow: { flexDirection: 'row', marginBottom: 12 },
  tag: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, marginRight: 8, alignItems: 'center' },
  tagText: { color: 'white', fontSize: 12, marginLeft: 4 },
  payRow: { flexDirection: 'row', alignItems: 'center' },
  payText: { color: '#4ade80', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 3 },
  
  // Action Buttons
  actionButtonsContainer: { alignItems: 'center', paddingBottom: 10 },
  actionIcon: { alignItems: 'center', marginBottom: 20 },
  profilePicPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white' },
  applyBtnBubble: { borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: {width: 1, height: 1}, textShadowRadius: 2 },
  
  // Modal Styles
  modalOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end', zIndex: 10 },
  modalBox: { backgroundColor: '#18181b', padding: 25, borderTopLeftRadius: 25, borderTopRightRadius: 25 },
  closeBtn: { alignSelf: 'flex-end' },
  modalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 5 },
  modalSub: { color: '#a1a1aa', fontSize: 14, marginBottom: 20 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', borderRadius: 12, paddingHorizontal: 15, marginBottom: 20 },
  input: { flex: 1, color: 'white', fontSize: 24, paddingVertical: 15, marginLeft: 10, fontWeight: 'bold' },
  submitBidBtn: { backgroundColor: '#8b5cf6', padding: 18, borderRadius: 12, alignItems: 'center' }
});