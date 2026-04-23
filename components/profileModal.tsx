import { Colors } from '@/constants/colors';
import { BadgeCheck, Calendar, MapPin, Star, User, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define the 3 snap points for the bottom sheet
const HIDDEN_Y = SCREEN_HEIGHT;
const SMALL_Y = SCREEN_HEIGHT - 380; // Collapsed state (shows basics)
const EXPANDED_Y = SCREEN_HEIGHT * 0.15; // Expanded state (almost full screen)

interface ProfileModalProps {
  visible: boolean;
  onClose: () => void;
  employerName: string;
  employerRating: number;
  isVerified: boolean;
}

export function ProfileModal({ visible, onClose, employerName, employerRating, isVerified }: ProfileModalProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isExpandedRef = useRef(false); 
  const panY = useRef(new Animated.Value(HIDDEN_Y)).current;

  // Handle Opening / Resetting
  useEffect(() => {
    if (visible) {
      setIsExpanded(false);
      isExpandedRef.current = false;
      // Spring up to the small state when opened
      Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
    } else {
      // Instantly reset when hidden by the parent component
      panY.setValue(HIDDEN_Y);
    }
  }, [visible]);

  // Smooth close animation function
  const closeWithAnimation = () => {
    Animated.timing(panY, { toValue: HIDDEN_Y, duration: 250, useNativeDriver: true }).start(() => {
      onClose(); // Tell the parent to unmount AFTER it slides off screen
    });
  };

  // --- SWIPE GESTURE HANDLER ---
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5, // Ignore tiny taps
      
      onPanResponderMove: (_, gestureState) => {
        const startY = isExpandedRef.current ? EXPANDED_Y : SMALL_Y;
        let newY = startY + gestureState.dy;
        if (newY < EXPANDED_Y) newY = EXPANDED_Y; // Prevent dragging too far up
        panY.setValue(newY);
      },
      
      onPanResponderRelease: (_, gestureState) => {
        const { dy, vy } = gestureState;

        if (dy < -50 || vy < -0.5) {
          // Swiped UP -> Expand
          isExpandedRef.current = true;
          setIsExpanded(true);
          Animated.spring(panY, { toValue: EXPANDED_Y, useNativeDriver: true, bounciness: 6 }).start();
        } 
        else if (dy > 50 || vy > 0.5) {
          // Swiped DOWN -> Collapse or Close
          if (isExpandedRef.current) {
             isExpandedRef.current = false;
             setIsExpanded(false);
             Animated.spring(panY, { toValue: SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
          } else {
             closeWithAnimation();
          }
        } 
        else {
           // Didn't swipe hard enough -> Snap back to current state
           Animated.spring(panY, { toValue: isExpandedRef.current ? EXPANDED_Y : SMALL_Y, useNativeDriver: true, bounciness: 6 }).start();
        }
      }
    })
  ).current;

  return (
    <Modal 
      visible={visible} 
      transparent={true} 
      animationType="fade" // Fades the dark background, but our Animated.View does the sliding
      onRequestClose={closeWithAnimation}
    >
      <View style={styles.modalOverlay}>
        
        {/* Background closer */}
        <TouchableOpacity 
          style={StyleSheet.absoluteFill} 
          activeOpacity={1} 
          onPress={closeWithAnimation}
        />

        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: panY }] }]}>
          
          {/* --- DRAG ZONE --- */}
          {/* We only attach the panHandlers to the top section so users can still scroll the bio below! */}
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.massiveDragArea}>
              <View style={styles.dragHandle} />
            </View>

            <TouchableOpacity style={styles.closeModalBtn} onPress={closeWithAnimation}>
              <X size={24} color="#a1a1aa" />
            </TouchableOpacity>

            <View style={styles.modalAvatarPlaceholder}>
              <User size={40} color="white" />
            </View>

            <View style={styles.modalNameRow}>
              <Text style={styles.modalEmployerName}>{employerName}</Text>
              {isVerified && <BadgeCheck size={20} color="#3b82f6" style={{ marginLeft: 6 }} />}
            </View>
            <Text style={styles.modalEmployerHandle}>@{employerName.replace(/\s+/g, '').toLowerCase()}</Text>

            <View style={styles.modalStatsRow}>
              <View style={styles.modalStatBox}>
                <Text style={styles.modalStatNumber}>
                  {employerRating > 0 ? employerRating.toFixed(1) : 'New'} <Star size={16} color="#fbbf24" fill={employerRating > 0 ? "#fbbf24" : "transparent"} />
                </Text>
                <Text style={styles.modalStatLabel}>Employer Rating</Text>
              </View>
              
              {isExpanded && (
                <>
                  <View style={styles.statDivider} />
                  <View style={styles.modalStatBox}>
                    <Text style={styles.modalStatNumber}>12</Text>
                    <Text style={styles.modalStatLabel}>Jobs Posted</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* --- EXPANDED CONTENT (Scrollable) --- */}
          {isExpanded && (
            <ScrollView showsVerticalScrollIndicator={false} style={styles.expandedContent} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={styles.sectionTitle}>About</Text>
              <Text style={styles.bioText}>
                Trusted local employer looking for reliable help. I communicate quickly and pay on time upon job completion!
              </Text>

              <View style={styles.infoRow}>
                <MapPin size={18} color="#a1a1aa" />
                <Text style={styles.infoText}>Based in New York, NY</Text>
              </View>
              <View style={styles.infoRow}>
                <Calendar size={18} color="#a1a1aa" />
                <Text style={styles.infoText}>Joined March 2024</Text>
              </View>

              <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Recent Badges</Text>
              <View style={styles.badgesContainer}>
                <View style={styles.badgePill}><Text style={styles.badgeText}>🚀 Fast Responder</Text></View>
                <View style={styles.badgePill}><Text style={styles.badgeText}>💸 Reliable Payer</Text></View>
              </View>
            </ScrollView>
          )}

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  
  bottomSheet: { 
    position: 'absolute', 
    top: 0, 
    width: '100%', 
    height: SCREEN_HEIGHT, 
    backgroundColor: '#18181b', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    borderWidth: 1, 
    borderColor: '#27272a',
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: -4 }, 
    shadowOpacity: 0.3, 
    shadowRadius: 10, 
    elevation: 10 
  },
  
  dragZone: { alignItems: 'center', width: '100%', paddingHorizontal: 25 },
  massiveDragArea: { width: '100%', height: 40, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
  dragHandle: { width: 50, height: 6, backgroundColor: '#52525b', borderRadius: 3 },

  closeModalBtn: { position: 'absolute', top: 15, right: 20, padding: 5, zIndex: 10 },
  
  modalAvatarPlaceholder: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginBottom: 15, borderWidth: 2, borderColor: Colors.primary || '#8b5cf6' },
  modalNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  modalEmployerName: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  modalEmployerHandle: { color: '#a1a1aa', fontSize: 14, marginBottom: 10 },
  
  modalStatsRow: { flexDirection: 'row', width: '100%', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#27272a', paddingVertical: 15, marginBottom: 10 },
  modalStatBox: { flex: 1, alignItems: 'center' },
  statDivider: { width: 1, height: 30, backgroundColor: '#27272a' },
  modalStatNumber: { color: 'white', fontSize: 20, fontWeight: 'bold', flexDirection: 'row', alignItems: 'center', gap: 6 },
  modalStatLabel: { color: '#a1a1aa', fontSize: 12, marginTop: 4 },

  expandedContent: { flex: 1, width: '100%', paddingHorizontal: 25, paddingTop: 10 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  bioText: { color: '#d4d4d8', fontSize: 14, lineHeight: 22, marginBottom: 20 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 },
  infoText: { color: '#a1a1aa', fontSize: 14 },
  badgesContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  badgePill: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.4)' },
  badgeText: { color: '#d8b4fe', fontSize: 12, fontWeight: 'bold' },
  
  footer: { paddingHorizontal: 25, paddingBottom: Platform.OS === 'ios' ? 40 : 25, paddingTop: 10 },
  viewProfileBtn: { backgroundColor: Colors.primary || '#8b5cf6', width: '100%', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
  viewProfileBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});