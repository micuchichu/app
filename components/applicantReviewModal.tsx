import * as Clipboard from 'expo-clipboard';
import { Check, ChevronDown, Clock, Copy, MessageCircle, Star, User, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Modal,
    PanResponder,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    UIManager,
    View
} from 'react-native';

import { Colors } from '@/constants/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export interface Applicant {
  employee_id: string;
  pay_bidded?: number;
  status?: string;
  employees?: { rating?: number; profiles?: { full_name?: string; email?: string; phone_number?: string; } | null } | null;
}

interface ApplicantReviewModalProps {
  visible: boolean;
  onClose: () => void;
  jobTitle: string;
  jobCurrencyCode: string;
  applicants: Applicant[];
  isLoading: boolean;
  onSelectApplicant: (applicant: Applicant) => void;
  onAcceptApplicant?: (applicantId: string) => void;
  onRejectApplicant?: (applicantId: string) => void;
  onRateApplicant?: (applicantId: string, rating: number) => void;
}

function ApplicantCard({ 
  item, 
  jobCurrencyCode, 
  onSelectApplicant, 
  onAcceptApplicant, 
  onRejectApplicant, 
  onOpenRate,
  onOpenContact
}: any) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pan = useRef(new Animated.Value(0)).current;
  const expandAnim = useRef(new Animated.Value(0)).current;

  const applicantName = item.employees?.profiles?.full_name || 'Anonymous User';
  const status = item.status?.toLowerCase() || 'pending';
  const isPending = status === 'pending';
  const rating = item.employees?.rating || 0;

  useEffect(() => {
    Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
  }, [status]);

  const toggleExpand = () => {
    const nextState = !isExpanded;
    setIsExpanded(nextState);
    
    Animated.timing(expandAnim, {
      toValue: nextState ? 1 : 0,
      duration: 300,
      useNativeDriver: false, 
    }).start();
  };

  const spin = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const dropdownMaxHeight = expandAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 200]
  });

  const dropdownOpacity = expandAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0, 0, 1] 
  });

  const cardOpacity = pan.interpolate({
    inputRange: [-SCREEN_WIDTH * 0.5, 0, SCREEN_WIDTH * 0.5],
    outputRange: [0.3, 1, 0.3],
    extrapolate: 'clamp'
  });

  const acceptOpacity = pan.interpolate({
    inputRange: [0, 30],
    outputRange: [0, 1],
    extrapolate: 'clamp'
  });

  const rejectOpacity = pan.interpolate({
    inputRange: [-30, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp'
  });

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return isPending && Math.abs(gestureState.dx) > 15 && Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
      },
      onPanResponderMove: (_, gestureState) => {
        pan.setValue(gestureState.dx);
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dx > SCREEN_WIDTH * 0.3) {
          Animated.timing(pan, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }).start(() => {
            onAcceptApplicant?.(item.employee_id);
          });
        } 
        else if (gestureState.dx < -SCREEN_WIDTH * 0.3) {
          Animated.timing(pan, { toValue: -SCREEN_WIDTH, duration: 250, useNativeDriver: true }).start(() => {
            onRejectApplicant?.(item.employee_id);
          });
        } 
        else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    })
  ).current;

  return (
    <View style={styles.cardWrapper}>
      
      {isPending && (
        <View style={styles.swipeBackground}>
          <Animated.View style={[styles.swipeAccept, { opacity: acceptOpacity }]}>
            <Check size={28} color="white" />
            <Text style={styles.swipeText}>Accept</Text>
          </Animated.View>

          <Animated.View style={[styles.swipeReject, { opacity: rejectOpacity }]}>
            <Text style={styles.swipeText}>Reject</Text>
            <X size={28} color="white" />
          </Animated.View>
        </View>
      )}

      <Animated.View 
        style={[styles.logCard, { transform: [{ translateX: pan }], opacity: cardOpacity }]} 
        {...(isPending ? panResponder.panHandlers : {})}
      >
        <TouchableOpacity 
          style={styles.logCardHeader} 
          activeOpacity={0.7} 
          onPress={toggleExpand}
        >
          <TouchableOpacity style={styles.avatarContainer} onPress={() => onSelectApplicant(item)}>
            <User size={24} color="white" />
          </TouchableOpacity>
          
          <View style={styles.logInfoContainer}>
            <Text style={styles.logName} numberOfLines={1}>{applicantName}</Text>
            
            <View style={styles.statsRow}>
              <View style={styles.ratingRow}>
                <Star size={14} color="#fbbf24" fill={rating > 0 ? "#fbbf24" : "transparent"} />
                <Text style={styles.ratingText}>
                  {rating > 0 ? rating.toFixed(1) : 'New'}
                </Text>
              </View>

              <View style={styles.dotDivider} />

              {item.pay_bidded ? (
                <View style={styles.bidHighlight}>
                  <Text style={styles.bidHighlightText}>{item.pay_bidded} {jobCurrencyCode}</Text>
                </View>
              ) : (
                <Text style={styles.noBidText}>No Bid</Text>
              )}
            </View>
          </View>

          <Animated.View style={{ transform: [{ rotate: spin }], marginLeft: 10 }}>
            <ChevronDown size={22} color="#71717a" />
          </Animated.View>
        </TouchableOpacity>

        <Animated.View style={[styles.expandedContent, { maxHeight: dropdownMaxHeight, opacity: dropdownOpacity }]}>
          <View style={styles.circularActionsRow}>
            {isPending && (
              <>
                <TouchableOpacity style={[styles.circleBtn, { backgroundColor: 'rgba(248, 113, 113, 0.2)' }]} onPress={() => onRejectApplicant?.(item.employee_id)}>
                  <X size={26} color="#f87171" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.circleBtn, { backgroundColor: 'rgba(74, 222, 128, 0.2)' }]} onPress={() => onAcceptApplicant?.(item.employee_id)}>
                  <Check size={26} color="#4ade80" />
                </TouchableOpacity>
              </>
            )}

            {status === 'accepted' && (
              <TouchableOpacity style={[styles.circleBtn, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]} onPress={() => onOpenRate(item)}>
                <Star size={24} color="#fbbf24" fill="#fbbf24" />
              </TouchableOpacity>
            )}

            <TouchableOpacity style={[styles.circleBtn, { backgroundColor: 'rgba(139, 92, 246, 0.2)' }]} onPress={() => onOpenContact(item)}>
              <MessageCircle size={24} color="#d8b4fe" />
            </TouchableOpacity>
          </View>

          <View style={styles.bottomActionRow}>
            <TouchableOpacity style={styles.bottomActionBtn} onPress={() => onSelectApplicant(item)}>
              <User size={18} color="#d4d4d8" style={{ marginRight: 8 }} />
              <Text style={styles.bottomActionText}>View Profile</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </View>
  );
}

export function ApplicantReviewModal({ 
  visible, onClose, jobTitle, jobCurrencyCode, applicants, isLoading, 
  onSelectApplicant, onAcceptApplicant, onRejectApplicant, onRateApplicant
}: ApplicantReviewModalProps) {

  const [contactApplicant, setContactApplicant] = useState<Applicant | null>(null);
  const [copiedField, setCopiedField] = useState<'email' | 'phone' | null>(null);

  const [ratingApplicant, setRatingApplicant] = useState<Applicant | null>(null);
  const [selectedRating, setSelectedRating] = useState(0);

  const handleCopy = async (text: string, field: 'email' | 'phone') => {
    await Clipboard.setStringAsync(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const activeApplicants = applicants.filter(app => app.status?.toLowerCase() !== 'rejected');

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.modalTitle}>{jobTitle}</Text>
            <Text style={styles.modalSub}>Applicant Review</Text>
          </View>
          <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
            <X size={24} color="white" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : activeApplicants.length === 0 ? (
          <View style={styles.emptyState}>
            <Clock size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No active applicants yet. Check back soon!</Text>
          </View>
        ) : (
          <FlatList
            data={activeApplicants}
            keyExtractor={(item, index) => item.employee_id || index.toString()}
            renderItem={({ item }) => (
              <ApplicantCard 
                item={item} 
                jobCurrencyCode={jobCurrencyCode}
                onSelectApplicant={onSelectApplicant}
                onAcceptApplicant={onAcceptApplicant}
                onRejectApplicant={onRejectApplicant}
                onOpenRate={(app: Applicant) => { setRatingApplicant(app); setSelectedRating(0); }}
                onOpenContact={(app: Applicant) => setContactApplicant(app)}
              />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />
        )}
      </View>

      <Modal visible={!!contactApplicant} transparent animationType="fade" onRequestClose={() => setContactApplicant(null)}>
        <View style={styles.contactOverlay}>
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Contact Info</Text>
              <TouchableOpacity onPress={() => setContactApplicant(null)}>
                <X size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.contactSubtitle}>
              {contactApplicant?.employees?.profiles?.full_name || 'Anonymous User'}
            </Text>

            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Phone Number</Text>
                <Text style={styles.contactValue}>
                  {contactApplicant?.employees?.profiles?.phone_number || 'Not Provided'}
                </Text>
              </View>
              {contactApplicant?.employees?.profiles?.phone_number && (
                <TouchableOpacity 
                  style={styles.copyBtn} 
                  onPress={() => handleCopy(contactApplicant.employees!.profiles!.phone_number!, 'phone')}
                >
                  {copiedField === 'phone' ? <Check size={18} color="#4ade80" /> : <Copy size={18} color="white" />}
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.contactRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactLabel}>Email Address</Text>
                <Text style={styles.contactValue}>
                  {contactApplicant?.employees?.profiles?.email || 'Not Provided'}
                </Text>
              </View>
              {contactApplicant?.employees?.profiles?.email && (
                <TouchableOpacity 
                  style={styles.copyBtn} 
                  onPress={() => handleCopy(contactApplicant.employees!.profiles!.email!, 'email')}
                >
                  {copiedField === 'email' ? <Check size={18} color="#4ade80" /> : <Copy size={18} color="white" />}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={!!ratingApplicant} transparent animationType="fade" onRequestClose={() => setRatingApplicant(null)}>
        <View style={styles.contactOverlay}>
          <View style={styles.contactCard}>
            <View style={styles.contactHeader}>
              <Text style={styles.contactTitle}>Rate Provider</Text>
              <TouchableOpacity onPress={() => setRatingApplicant(null)}>
                <X size={22} color="#a1a1aa" />
              </TouchableOpacity>
            </View>
            
            <Text style={styles.contactSubtitle}>
              {ratingApplicant?.employees?.profiles?.full_name || 'Anonymous User'}
            </Text>

            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setSelectedRating(star)}>
                  <Star 
                    size={42} 
                    color={selectedRating >= star ? "#fbbf24" : "#3f3f46"} 
                    fill={selectedRating >= star ? "#fbbf24" : "transparent"} 
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.submitRatingBtn, selectedRating === 0 && styles.submitRatingBtnDisabled]} 
              disabled={selectedRating === 0}
              onPress={() => {
                if (ratingApplicant && selectedRating > 0) {
                  onRateApplicant?.(ratingApplicant.employee_id, selectedRating);
                  setRatingApplicant(null);
                  setSelectedRating(0);
                }
              }}
            >
              <Text style={styles.submitRatingText}>Submit Rating</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: { flex: 1, backgroundColor: Colors.background || 'black', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, marginTop: Platform.OS === 'ios' ? 10 : 40 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalSub: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  closeBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 8, borderRadius: 20 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 },
  listContainer: { paddingBottom: 40 },

  cardWrapper: { marginBottom: 12, position: 'relative' },
  
  swipeBackground: { ...StyleSheet.absoluteFillObject, backgroundColor: '#18181b', borderRadius: 20, overflow: 'hidden' },
  swipeAccept: { ...StyleSheet.absoluteFillObject, backgroundColor: '#22c55e', justifyContent: 'flex-start', alignItems: 'center', flexDirection: 'row', paddingLeft: 25 },
  swipeReject: { ...StyleSheet.absoluteFillObject, backgroundColor: '#ef4444', justifyContent: 'flex-end', alignItems: 'center', flexDirection: 'row', paddingRight: 25 },
  swipeText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginHorizontal: 10 },

  logCard: { backgroundColor: '#1c1c1e', borderRadius: 20, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  logCardHeader: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  avatarContainer: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 14, borderWidth: 1, borderColor: Colors.primary || '#8b5cf6' },
  logInfoContainer: { flex: 1, justifyContent: 'center' },
  
  logName: { color: 'white', fontSize: 17, fontWeight: 'bold' },
  
  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  dotDivider: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#52525b', marginHorizontal: 8 },

  bidHighlight: { backgroundColor: Colors.primary || '#8b5cf6', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  bidHighlightText: { color: '#fcfaf6', fontWeight: '900', fontSize: 12 },
  noBidText: { color: '#71717a', fontSize: 12, fontWeight: '600' },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#fbbf24', fontSize: 13, fontWeight: 'bold', marginLeft: 4, },

  expandedContent: { borderTopWidth: 1, borderTopColor: '#27272a', backgroundColor: '#141416', overflow: 'hidden' },
  circularActionsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20, gap: 20 },
  circleBtn: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  
  bottomActionRow: { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#27272a' },
  bottomActionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14 },
  bottomActionText: { color: '#d4d4d8', fontSize: 14, fontWeight: 'bold' },

  contactOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  contactCard: { width: '100%', backgroundColor: '#18181b', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#27272a' },
  contactHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contactTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
  contactSubtitle: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4, marginBottom: 20 },
  contactRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272a' },
  contactLabel: { color: '#a1a1aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  contactValue: { color: 'white', fontSize: 16, fontWeight: '600' }, 
  copyBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#27272a', justifyContent: 'center', alignItems: 'center' },

  starRow: { flexDirection: 'row', justifyContent: 'space-around', marginVertical: 25 },
  submitRatingBtn: { backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  submitRatingBtnDisabled: { backgroundColor: '#3f3f46', opacity: 0.6 },
  submitRatingText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});