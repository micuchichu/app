import React, { useRef, useEffect, useState } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  Platform, Modal, Animated, PanResponder, Dimensions 
} from 'react-native';
import { X, User, Star, MessageCircle } from 'lucide-react-native';

import { Colors } from '@/app/constants/colors';
import { ProfileModal } from './profileModal';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const HIDDEN_POSITION = SCREEN_HEIGHT;
const VISIBLE_POSITION = SCREEN_HEIGHT - SHEET_HEIGHT; 

interface ServiceModalProps {
  visible: boolean;
  onClose: () => void;
  service: any | null;
}

export function ServiceModal({ visible, onClose, service }: ServiceModalProps) {
  const panY = useRef(new Animated.Value(HIDDEN_POSITION)).current;
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      Animated.spring(panY, {
        toValue: VISIBLE_POSITION,
        useNativeDriver: true,
        bounciness: 5,
      }).start();
    } else {
      panY.setValue(HIDDEN_POSITION);
    }
  }, [visible]);

  const closeSheet = () => {
    Animated.timing(panY, {
      toValue: HIDDEN_POSITION,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          panY.setValue(VISIBLE_POSITION + gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 150 || gesture.vy > 0.5) {
          closeSheet();
        } else {
          Animated.spring(panY, {
            toValue: VISIBLE_POSITION,
            useNativeDriver: true,
            bounciness: 5,
          }).start();
        }
      },
    })
  ).current;

  if (!service) return null;

  const providerName = service.employers?.profiles?.full_name || 'Anonymous Freelancer';
  const providerRating = service.employees?.rating || 0;
  const currencyCode = service.currencies?.currency_text || '';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeSheet}>
      <View style={styles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeSheet} />
        
        <Animated.View style={[styles.sheetCard, { transform: [{ translateY: panY }] }]}>
          
          <View style={styles.dragZone} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
          </View>

          <View style={styles.header}>
            <Text style={styles.headerTitle}>Service Details</Text>
            <TouchableOpacity style={styles.closeBtn} onPress={closeSheet}>
              <X size={22} color="#a1a1aa" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            
            <TouchableOpacity style={styles.providerCard} onPress={() => setIsProfileModalOpen(true)}>
              <View style={styles.providerAvatar}>
                <User size={24} color="white" />
              </View>
              <View style={styles.providerInfo}>
                <Text style={styles.providerName}>{providerName}</Text>
                <View style={styles.ratingRow}>
                  <Star size={14} color="#fbbf24" fill={providerRating > 0 ? "#fbbf24" : "transparent"} />
                  <Text style={styles.ratingText}>
                    {providerRating > 0 ? providerRating.toFixed(1) : 'New Provider'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.serviceTitle}>{service.title}</Text>
            
            <View style={styles.priceTag}>
              <Text style={styles.priceText}>
                {service.pay_amount} {currencyCode}
              </Text>
            </View>

            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.descriptionText}>
              {service.description || 'No description provided.'}
            </Text>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.contactBtn}>
              <MessageCircle size={20} color="white" style={{ marginRight: 8 }} />
              <Text style={styles.contactBtnText}>Message Provider</Text>
            </TouchableOpacity>
          </View>

        </Animated.View>
      </View>

      <ProfileModal 
        visible={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)}
        userId={service.employer_id || null} 
      />

    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  
  sheetCard: { 
    position: 'absolute',
    bottom: 0,
    backgroundColor: '#18181b', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    height: SHEET_HEIGHT,
    width: '100%',
    borderWidth: 1,
    borderColor: '#27272a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.4,
    shadowRadius: 15,
    elevation: 20
  },

  dragZone: { width: '100%', height: 35, alignItems: 'center', justifyContent: 'center' },
  dragHandle: { width: 40, height: 5, backgroundColor: '#3f3f46', borderRadius: 3 },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 25, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  closeBtn: { padding: 5, backgroundColor: '#27272a', borderRadius: 20 },

  scrollContent: { padding: 25, paddingBottom: 100 },
  
  providerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#000', padding: 15, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: '#27272a' },
  providerAvatar: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  providerInfo: { flex: 1 },
  providerName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  ratingRow: { flexDirection: 'row', alignItems: 'center' },
  ratingText: { color: '#fbbf24', fontSize: 13, fontWeight: '600', marginLeft: 4 },

  serviceTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 15, lineHeight: 32 },
  
  priceTag: { alignSelf: 'flex-start', backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(74, 222, 128, 0.3)', marginBottom: 25 },
  priceText: { color: '#4ade80', fontSize: 18, fontWeight: 'bold' },

  sectionLabel: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  descriptionText: { color: '#d4d4d8', fontSize: 15, lineHeight: 24 },

  footer: { position: 'absolute', bottom: 0, width: '100%', paddingHorizontal: 25, paddingTop: 15, paddingBottom: Platform.OS === 'ios' ? 40 : 25, backgroundColor: '#18181b', borderTopWidth: 1, borderTopColor: '#27272a' },
  contactBtn: { flexDirection: 'row', backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  contactBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});