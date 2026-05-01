import React, { useState, useEffect, useRef } from 'react';
import { 
  View, Text, Image, TouchableOpacity, StyleSheet, Dimensions, 
  Pressable, Animated
} from 'react-native';
import { Briefcase, MapPin, User, Send, Heart, Users, Play, Pause } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient'; 

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
  people_needed?: number; 

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
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(isActive);
  const [isUiHidden, setIsUiHidden] = useState(false);
  
  const { showAlert } = useAlert();

  const uiOpacity = useRef(new Animated.Value(1)).current;
  const heartScale = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

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

    if (data) setIsSaved(true);
  };

  useEffect(() => {
    fetchSaveStatus();
  }, [userId, item.id]);

  useEffect(() => {
    if (!item.video_url || !player) return;

    if (isActive) {
      player.currentTime = 0;
      player.play();          
      setIsPlaying(true);
    } else {
      player.pause();
      setIsPlaying(false);
    }
  }, [isActive, player, item.video_url]);

  const togglePlayPause = () => {
    if (!player) return;
    if (isPlaying) player.pause();
    else player.play();
    setIsPlaying(!isPlaying);
  };

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

  const handlePress = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      if (!isSaved) handleSave();
      
      heartScale.setValue(0);
      Animated.sequence([
        Animated.spring(heartScale, { toValue: 1, useNativeDriver: true, bounciness: 12 }),
        Animated.timing(heartScale, { toValue: 0, duration: 150, useNativeDriver: true })
      ]).start();
    }
    lastTap.current = now;
  };

  const fadeUI = (toValue: number) => {
    setIsUiHidden(toValue === 0);
    Animated.timing(uiOpacity, {
      toValue,
      duration: 200,
      useNativeDriver: true
    }).start();
  };

  const employerName = item.employers?.profiles?.full_name || 'Unknown Employer';
  const employerHandle = employerName.replace(/\s+/g, '').toLowerCase();
  const cityName = item.locations?.city_name || 'Remote';
  const currencyCode = item.currencies?.currency_text || '';
  const formattedPay = `${item.is_negotiable ? 'Max ' : ''}${item.pay_amount} ${currencyCode}`;
  
  const fallbackImage = require('@/assets/nomedia.png');

  return (
    <View style={styles.jobCard}>
      
      <View style={styles.topBlackBar} />

      {item.video_url ? (
        <VideoView 
          key={`video-${item.id}`} 
          player={player} 
          style={styles.bgImage} 
          contentFit="cover" 
          fullscreenOptions={{enable: true}} 
          nativeControls={false} 
          muted={true}
          />
      ) : (
        <Image source={item.thumbnail_url ? { uri: item.thumbnail_url } : fallbackImage} style={styles.bgImage} />
      )}

      <Pressable 
        style={StyleSheet.absoluteFill} 
        onPress={handlePress}
        onLongPress={() => fadeUI(0)}
        onPressOut={() => fadeUI(1)}
        delayLongPress={300}
      >
        <Animated.View style={[styles.giantHeartContainer, { transform: [{ scale: heartScale }], opacity: heartScale }]}>
          <Heart size={100} color="#ef4444" fill="#ef4444" />
        </Animated.View>
      </Pressable>

      <Animated.View 
        style={[StyleSheet.absoluteFill, { opacity: uiOpacity }]} 
        pointerEvents={isUiHidden ? 'none' : 'box-none'}
      >
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.85)']}
          style={styles.bottomGradient}
          pointerEvents="none"
        />
        
        <View style={styles.contentOverlay}>
          
          <View style={styles.jobInfoContainer}>          
            
            <TouchableOpacity style={styles.userRow} onPress={() => setIsProfileModalOpen(true)}>
              <View style={styles.smallAvatar}>
                <User size={16} color="white" />
              </View>
              <Text style={styles.employerName}>@{employerHandle}</Text>
            </TouchableOpacity>

            <View style={styles.titleRow}>
              <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.inlinePriceTag}>
                <Text style={styles.inlinePriceText}>{formattedPay}</Text>
              </View>
            </View>
            
            <View style={styles.tagsRow}>
              <View style={styles.tag}>
                <Briefcase size={12} color="white" />
                <Text style={styles.tagText}>{item.schedule_type}</Text>
              </View>
              <View style={styles.tag}>
                <Users size={12} color="white" />
                <Text style={styles.tagText}>{item.people_needed || 1} Needed</Text>
              </View>
              <View style={styles.tag}>
                <MapPin size={12} color="white" />
                <Text style={styles.tagText}>{cityName}</Text>
              </View>
            </View>
            
            <View>
              <Text 
                style={styles.description} 
                numberOfLines={isExpanded ? undefined : 2}
              >
                {item.description}
              </Text>
              {item.description.length > 80 && (
                <TouchableOpacity onPress={() => setIsExpanded(!isExpanded)}>
                  <Text style={styles.readMoreText}>{isExpanded ? "less" : "more"}</Text>
                </TouchableOpacity>
              )}
            </View>

          </View>

          <View style={styles.actionButtonsContainer}>

            <TouchableOpacity style={styles.actionIcon} onPress={handleSave}>
              <Heart size={32} color={isSaved ? "#ef4444" : "white"} fill={isSaved ? "#ef4444" : "transparent"} />
              <Text style={styles.actionText}>{isSaved ? "Saved" : "Save"}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionIcon} onPress={onApply}>
              <Send size={30} color="white" />
              <Text style={styles.actionText}>{item.is_negotiable ? 'Bid' : 'Apply'}</Text>
            </TouchableOpacity>
            
            {item.video_url && (
              <TouchableOpacity style={styles.actionIcon} onPress={togglePlayPause}>
                {isPlaying ? <Pause size={30} color="white" /> : <Play size={30} color="white" />}
                <Text style={styles.actionText}>{isPlaying ? 'Pause' : 'Play'}</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>
      </Animated.View>
      
      <ProfileModal 
        visible={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={(item as any).employer_id || null} 
        fallbackName={employerName}
      />

    </View>
  );
}

const styles = StyleSheet.create({
  jobCard: { height: height - 60, width: width, marginBottom: 20, marginTop: 40 }, 
  
  topBlackBar: { position: 'absolute', top: -40, left: 0, right: 0, height: 40, backgroundColor: 'black', zIndex: 10 },

  bgImage: { ...StyleSheet.absoluteFillObject },

  giantHeartContainer: { ...StyleSheet.absoluteFillObject, justifyContent: 'center', alignItems: 'center', zIndex: 5, },

  bottomGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '65%', },

  contentOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 90, paddingHorizontal: 12 },
  
  jobInfoContainer: { flex: 1, paddingRight: 10, paddingBottom: 10 },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  smallAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'white', marginRight: 8 },
  employerName: { color: 'white', fontSize: 16, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },

  titleRow: { flexDirection: 'row', marginBottom: 8, },
  jobTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4, marginRight: 10 },
  inlinePriceTag: { backgroundColor: 'rgba(74, 222, 128, 0.25)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.5)', },
  inlinePriceText: { color: '#4ade80', fontWeight: 'bold', fontSize: 14, },
  
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  tag: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.4)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 6, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  tagText: { color: 'white', fontSize: 12, marginLeft: 4, fontWeight: '600' }, 

  description: { color: 'white', fontSize: 14, marginBottom: 2, lineHeight: 20, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
  readMoreText: { color: 'white', fontWeight: 'bold', fontSize: 14, marginBottom: 10, textShadowColor: 'rgba(0,0,0,0.9)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4, opacity: 0.8 },
  
  actionButtonsContainer: { alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 10 },
  actionIcon: { alignItems: 'center', marginBottom: 25 },
  actionText: { color: 'white', fontSize: 13, marginTop: 6, fontWeight: '600', textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 4 },
});