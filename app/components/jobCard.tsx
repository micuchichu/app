import React, { useState, useEffect } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
// REMOVED DollarSign from imports
import { Bookmark, Briefcase, MapPin, Share2, User } from 'lucide-react-native';

import { useVideoPlayer, VideoView } from 'expo-video';

import { supabase } from '@/app/lib/supabase';
import { trackEvent } from '@/app/lib/ranking'; 
import { Colors } from '@/app/constants/colors'; 

import { ProfileModal } from '@/app/components/profileModal'; 
import { useAlert } from './alertContext';

const { width, height } = Dimensions.get('window');

export interface Job {
  id: string;
  title: string;
  description: string;
  schedule_type: string;
  pay_amount: number;
  currencies?: { currency_text: string } | null; 
  is_negotiable: boolean;
  thumbnail_url: string | null;
  video_url?: string | null; 
  viewCount: number; 

  employers?: { 
    rating?: number;
    verified?: boolean;
    profiles?: { full_name?: string } | null; 
    id?: string | null;
  } | null; 
  locations?: { city_name?: string } | null; 
}

export default function JobCard({ item, onApply, userId, isActive }: { item: Job; onApply: () => void; userId: string | null; isActive: boolean; }) {
  const [isSaved, setIsSaved] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const { showAlert } = useAlert();

  const player = useVideoPlayer(item.video_url || null, player => {
    player.loop = true;
    player.muted = true;
  });

  const fetchSaveStatus = async () => {
    if (!userId) return;

    const { data } = await supabase
      .from('job_saves')
      .select('job_posting_id')
      .eq('user_id', userId)
      .eq('job_posting_id', item.id)
      .maybeSingle();

    if (data) {
      setIsSaved(true);
    }
  };

  useEffect(() => {
    fetchSaveStatus();
  }, [userId, item.id]);

  useEffect(() => {
    if (!item.video_url || !player) return;

    if (isActive) {
      player.currentTime = 0;
      player.play();          
    } else {
      player.pause();
    }
  }, [isActive, player, item.video_url]);

  const handleSave = async () => {
    if (!userId) {
      showAlert("Sign In Required", "You need to be signed in to save jobs.");
      return;
    }

    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    if (newSavedState) {
      const { error } = await supabase.from('job_saves').insert({ user_id: userId, job_posting_id: item.id });
      if (error && error.code !== '23505') setIsSaved(false);
      else if (!error) await trackEvent(userId, item.id, 'save');
    } else {
      const { error } = await supabase.from('job_saves').delete().eq('user_id', userId).eq('job_posting_id', item.id);
      if (error) setIsSaved(true);
    }
  };

  const employerName = item.employers?.profiles?.full_name || 'Unknown Employer';
  const employerRating = item.employers?.rating || 0;
  const isVerified = item.employers?.verified || false;
  
  const cityName = item.locations?.city_name || 'Remote';
  
  const currencyCode = item.currencies?.currency_text || '';
  const formattedPay = `${item.is_negotiable ? 'Max ' : ''}${item.pay_amount} ${currencyCode}`;
  
  const fallbackImage = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";

  return (
    <View style={styles.jobCard}>
      
      {item.video_url ? (
        <VideoView player={player} style={styles.bgImage} contentFit="cover" fullscreenOptions={{enable: true}} nativeControls={false} />
      ) : (
        <Image source={{ uri: item.thumbnail_url || fallbackImage }} style={styles.bgImage} />
      )}

      <View style={styles.darkOverlay} />
      
      <View style={styles.contentOverlay}>
        <View style={styles.jobInfoContainer}>          
          <Text style={styles.employer}>@{employerName.replace(/\s+/g, '').toLowerCase()}</Text>
          <Text style={styles.jobTitle}>{item.title}</Text>
          <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
          
          <View style={styles.tagsRow}>
            <View style={styles.tag}><Briefcase size={12} color="white" /><Text style={styles.tagText}>{item.schedule_type}</Text></View>
            <View style={styles.tag}><MapPin size={12} color="white" /><Text style={styles.tagText}>{cityName}</Text></View>
          </View>
          
          <View style={styles.payRow}>
            {/* REMOVED: <DollarSign size={18} color="#4ade80" /> */}
            <Text style={styles.payText}>{formattedPay}</Text>
          </View>
        </View>

        <View style={styles.actionButtonsContainer}>
          <TouchableOpacity style={styles.actionIcon} onPress={() => setIsProfileModalOpen(true)}>
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
          
          <TouchableOpacity style={[styles.applyBtnBubble, { backgroundColor: item.is_negotiable ? Colors.primary : '#2563eb' }]} onPress={onApply}>
            <Text style={styles.applyBtnText}>{item.is_negotiable ? 'BID' : 'APPLY'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ProfileModal 
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={item.employers?.id || null}
        fallbackName={employerName}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  jobCard: { height: height - 20, width: width, marginBottom: 20 }, 
  bgImage: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  contentOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 110, paddingHorizontal: 15 },
  jobInfoContainer: { flex: 1, paddingRight: 20 },

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
  profilePicPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white' },
  applyBtnBubble: { borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});