import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Image, ScrollView, Dimensions } from 'react-native';
import { X, MapPin, Users, Bookmark, Briefcase, Sparkles, Navigation, DollarSign } from 'lucide-react-native';
import { Colors } from '@/app/constants/colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface MapBottomSheetProps {
  panY: Animated.Value;
  panHandlers: any;
  selectedJob: any;
  selectedCluster: any;
  isExpanded: boolean;
  jobsCount: number;
  microjobCount: number;
  partTimeCount: number;
  onCloseJob: () => void;
  onSelectJob: (job: any) => void;
}

export default function MapBottomSheet({ panY, panHandlers, selectedJob, selectedCluster, isExpanded, jobsCount, microjobCount, partTimeCount, onCloseJob, onSelectJob }: MapBottomSheetProps) {
  const fallbackImage = require('@/assets/nomedia.png');

  return (
    <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: panY }] }]}>
      <View style={styles.massiveDragZone} {...panHandlers}>
        <View style={styles.dragHandle} />
      </View>

      <View style={styles.sheetContent}>
        
        {selectedCluster ? (
          <View style={{ flex: 1 }}>
            <View style={styles.titleRow}>
              <View>
                <Text style={styles.jobTitle}>{selectedCluster.jobs.length} Jobs in this area</Text>
                <Text style={styles.overviewSub}>Swipe to view, tap to open details</Text>
              </View>
              <TouchableOpacity style={styles.closeX} onPress={onCloseJob}>
                <X size={20} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false} 
              contentContainerStyle={styles.clusterScrollContainer}
            >
              {selectedCluster.jobs.map((job: any) => (
                <TouchableOpacity 
                  key={job.id} 
                  style={styles.clusterCard}
                  onPress={() => onSelectJob(job)}
                >
                  <Text style={styles.clusterCardTitle} numberOfLines={1}>{job.title}</Text>
                  <Text style={styles.clusterCardPay}>${job.pay_amount} {job.pay_currency}</Text>
                  <View style={styles.clusterCardTag}>
                    <Text style={styles.clusterCardTagText}>{job.schedule_type}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : 

        selectedJob ? (
          <>
            <View style={styles.titleRow}>
              <View style={{ flex: 1, paddingRight: 15 }}>
                {selectedJob.is_sponsored && (
                  <View style={styles.sponsoredBadge}>
                    <Sparkles size={12} color="#fbbf24" />
                    <Text style={styles.sponsoredText}>Sponsored</Text>
                  </View>
                )}
                <Text style={styles.jobTitle} numberOfLines={isExpanded ? 2 : 1}>{selectedJob.title}</Text>
                
                <View style={styles.payRow}>
                  <Text style={styles.jobPay}>${selectedJob.pay_amount} {selectedJob.pay_currency}</Text>
                  {selectedJob.is_negotiable && <Text style={styles.negotiableText}>(Negotiable)</Text>}
                </View>
              </View>
              
              {isExpanded && (
                <TouchableOpacity style={styles.closeX} onPress={onCloseJob}>
                  <X size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScrollView} contentContainerStyle={styles.badgesContainer}>
              <View style={styles.infoBadge}><Briefcase size={14} color="#a1a1aa" /><Text style={styles.infoBadgeText}>{selectedJob.schedule_type}</Text></View>
              <View style={styles.infoBadge}><MapPin size={14} color="#a1a1aa" /><Text style={styles.infoBadgeText}>{selectedJob.work_mode}</Text></View>
              <View style={styles.infoBadge}><Users size={14} color="#a1a1aa" /><Text style={styles.infoBadgeText}>{selectedJob.people_needed} Needed</Text></View>
              {selectedJob.save_count > 0 && (
                <View style={styles.infoBadge}><Bookmark size={14} color="#fbbf24" /><Text style={styles.infoBadgeText}>{selectedJob.save_count} Saves</Text></View>
              )}
            </ScrollView>

            {isExpanded && (
              <View style={{ flex: 1 }}>
                <Text style={styles.jobDescription} numberOfLines={3}>{selectedJob.description}</Text>
                <View style={styles.mediaContainer}>
                  <Image source={selectedJob.thumbnail_url ? { uri: selectedJob.thumbnail_url } : fallbackImage} style={styles.mediaPreview} />
                </View>
                <TouchableOpacity style={styles.applyBtn}>
                  <Text style={styles.applyBtnText}>{selectedJob.is_negotiable ? 'Place a Bid' : 'Apply Now'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : 

        (
          <>
            <View style={styles.overviewHeader}>
              <View style={styles.radarIconBg}>
                <Navigation size={24} color={Colors.primary || "#8b5cf6"} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.overviewTitle}>{jobsCount} Jobs Nearby</Text>
                <Text style={styles.overviewSub}>Tap a pin to view details, or swipe down to hide</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{microjobCount}</Text>
                <Text style={styles.statLabel}>Microjobs</Text>
              </View>
              <View style={styles.statBoxDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statNumber}>{partTimeCount}</Text>
                <Text style={styles.statLabel}>Part-time</Text>
              </View>
              <View style={styles.statBoxDivider} />
              <View style={styles.statBox}>
                <DollarSign size={20} color="#4ade80" />
                <Text style={styles.statLabel}>Paid Gigs</Text>
              </View>
            </View>
          </>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bottomSheet: { position: 'absolute', bottom: 0, width: '100%', height: SCREEN_HEIGHT, backgroundColor: Colors.surface || '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a', shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 },
  massiveDragZone: { width: '100%', height: 50, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent', zIndex: 10 },
  dragHandle: { width: 50, height: 6, backgroundColor: '#52525b', borderRadius: 3 },
  sheetContent: { paddingHorizontal: 25, flex: 1 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  sponsoredBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 6 },
  sponsoredText: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold', marginLeft: 4 },
  jobTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', marginBottom: 4 },
  payRow: { flexDirection: 'row', alignItems: 'baseline' },
  jobPay: { color: '#4ade80', fontSize: 18, fontWeight: '800' },
  negotiableText: { color: '#a1a1aa', fontSize: 14, marginLeft: 6 },
  closeX: { backgroundColor: '#27272a', padding: 8, borderRadius: 20 },
  badgesScrollView: { maxHeight: 35, minHeight: 35, marginBottom: 15 },
  badgesContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingRight: 20 },
  infoBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27272a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  infoBadgeText: { color: 'white', fontSize: 12, marginLeft: 6, textTransform: 'capitalize' },
  jobDescription: { color: '#a1a1aa', fontSize: 15, lineHeight: 22, marginBottom: 20 },
  mediaContainer: { width: '100%', height: 200, borderRadius: 20, overflow: 'hidden', backgroundColor: '#27272a', borderWidth: 1, borderColor: '#3f3f46', marginBottom: 20 },
  mediaPreview: { width: '100%', height: '100%', resizeMode: 'cover' },
  applyBtn: { backgroundColor: Colors.primary || '#8b5cf6', width: '100%', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  overviewHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  radarIconBg: { backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: 12, borderRadius: 16, marginRight: 15 },
  overviewTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  overviewSub: { color: Colors.textMuted || '#71717a', fontSize: 13, marginTop: 4 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surfaceHighlight || '#27272a', borderRadius: 16, padding: 15 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxDivider: { width: 1, height: 30, backgroundColor: '#3f3f46' },
  statNumber: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  statLabel: { color: Colors.textSubtle || '#a1a1aa', fontSize: 12, marginTop: 4 },

  clusterScrollContainer: { gap: 15, paddingRight: 20, paddingTop: 10 },
  clusterCard: { 
    backgroundColor: '#27272a', 
    width: 220, 
    height: 120,
    padding: 15, 
    borderRadius: 16, 
    borderWidth: 1, 
    borderColor: '#3f3f46',
    justifyContent: 'space-between'
  },
  clusterCardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  clusterCardPay: { color: '#4ade80', fontSize: 15, fontWeight: 'bold' },
  clusterCardTag: { backgroundColor: '#18181b', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start' },
  clusterCardTagText: { color: '#a1a1aa', fontSize: 12, textTransform: 'capitalize' }
});