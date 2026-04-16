import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Bookmark, Briefcase, DollarSign, Eye, MapPin, Share2, User } from 'lucide-react-native';

import { trackEvent } from '../lib/ranking'; 
import { Colors } from '../constants/colors'; 

const { width, height } = Dimensions.get('window');

export interface Job {
  id: string;
  title: string;
  description: string;
  schedule_type: string;
  pay_amount: number;
  pay_currency: string;
  is_negotiable: boolean;
  thumbnail_url: string;
  viewCount: number; 
  employers?: { company_name?: string } | null; 
  locations?: { city_name?: string } | null; 
}

export default function JobCard({ item, onApply, userId }: { item: Job; onApply: () => void; userId: string | null; }) {
  const [isSaved, setIsSaved] = useState(false);

  const handleSave = async () => {
    setIsSaved(!isSaved);
    if (userId) await trackEvent(userId, item.id, 'save');
  };

  const employerName = item.employers?.company_name || 'Unknown Employer';
  const cityName = item.locations?.city_name || 'Remote';
  const formattedPay = `${item.is_negotiable ? 'Max ' : ''}${item.pay_amount} ${item.pay_currency}`;

  return (
    <View style={styles.jobCard}>
      <Image source={{ uri: item.thumbnail_url }} style={styles.bgImage} />
      <View style={styles.darkOverlay} />
      
      <View style={styles.contentOverlay}>
        <View style={styles.jobInfoContainer}>
          <View style={styles.viewCountBadge}>
            <Eye size={12} color="white" />
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
            style={[styles.applyBtnBubble, { backgroundColor: item.is_negotiable ? Colors.primary : '#2563eb' }]}
            onPress={onApply}
          >
            <Text style={styles.applyBtnText}>{item.is_negotiable ? 'BID' : 'APPLY'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  jobCard: { height: height, width: width }, 
  bgImage: { ...StyleSheet.absoluteFillObject },
  darkOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  contentOverlay: { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: 110, paddingHorizontal: 15 },
  jobInfoContainer: { flex: 1, paddingRight: 20 },
  
  // Tags & Info
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
  
  // Action Buttons
  actionButtonsContainer: { alignItems: 'center', paddingBottom: 10 },
  actionIcon: { alignItems: 'center', marginBottom: 20 },
  profilePicPlaceholder: { width: 45, height: 45, borderRadius: 22.5, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', borderWidth: 1.5, borderColor: 'white' },
  applyBtnBubble: { borderRadius: 25, width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 11 },
  actionText: { color: 'white', fontSize: 12, marginTop: 4, fontWeight: '500', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 },
});