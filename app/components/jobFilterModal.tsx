import React, { useState } from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView, Platform } from 'react-native';
import { X, RotateCcw } from 'lucide-react-native';
import Slider from '@react-native-community/slider';

import { Colors } from '@/app/constants/colors';

export interface FilterState {
  distance: number; 
  workModes: string[];
  scheduleTypes: string[];
  peopleNeeded: string;
}

interface JobFilterModalProps {
  visible: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters?: FilterState;
}

const DEFAULT_FILTERS: FilterState = {
  distance: 105, 
  workModes: [],
  scheduleTypes: [],
  peopleNeeded: 'Any',
};

export const JobFilterModal = ({ visible, onClose, onApply, currentFilters }: JobFilterModalProps) => {
  const [filters, setFilters] = useState<FilterState>(currentFilters || DEFAULT_FILTERS);

  const toggleArrayItem = (array: string[], item: string) => {
    if (array.includes(item)) return array.filter(i => i !== item);
    return [...array, item];
  };

  const handleApply = () => {
    onApply(filters);
    onClose();
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.bottomSheet}>
          
          <View style={styles.headerRow}>
            <TouchableOpacity onPress={handleReset} style={styles.headerBtn}>
              <RotateCcw size={18} color={Colors.textMuted || '#71717a'} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Filters</Text>
            <TouchableOpacity onPress={onClose} style={styles.headerBtn}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            
            <View style={styles.sliderHeader}>
              <Text style={styles.sectionTitle}>Max Distance</Text>
              <Text style={styles.sliderValueText}>
                {filters.distance > 100 ? 'No Limit' : `${filters.distance} km`}
              </Text>
            </View>
            
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={5} 
                maximumValue={105} 
                step={5} 
                value={filters.distance}
                onValueChange={(val) => setFilters({ ...filters, distance: val })}
                minimumTrackTintColor={Colors.primary || '#8b5cf6'}
                maximumTrackTintColor="rgba(255, 255, 255, 0.4)" 
                thumbTintColor={Colors.primary || '#8b5cf6'}
              />
            </View>

            <Text style={styles.sectionTitle}>Work Mode</Text>
            <View style={styles.pillContainer}>
              {['In-Person', 'Online', 'Hybrid'].map(mode => {
                const isActive = filters.workModes.includes(mode);
                return (
                  <TouchableOpacity 
                    key={mode} 
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => setFilters({ ...filters, workModes: toggleArrayItem(filters.workModes, mode) })}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{mode}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Schedule Type</Text>
            <View style={styles.pillContainer}>
              {['Microjob', 'Part-time', 'Full-time'].map(type => {
                const isActive = filters.scheduleTypes.includes(type);
                return (
                  <TouchableOpacity 
                    key={type} 
                    style={[styles.pill, isActive && styles.pillActive]}
                    onPress={() => setFilters({ ...filters, scheduleTypes: toggleArrayItem(filters.scheduleTypes, type) })}
                  >
                    <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>People Needed</Text>
            <View style={styles.pillContainer}>
              {['1', '2', '3', '4', '5+', 'Any'].map(num => (
                <TouchableOpacity 
                  key={num} 
                  style={[styles.pill, filters.peopleNeeded === num && styles.pillActive]}
                  onPress={() => setFilters({ ...filters, peopleNeeded: num })}
                >
                  <Text style={[styles.pillText, filters.peopleNeeded === num && styles.pillTextActive]}>{num}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Show Results</Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  bottomSheet: { backgroundColor: Colors.surface || '#18181b', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '80%', borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.surfaceHighlight || '#27272a' },
  headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  headerBtn: { padding: 5 },
  
  scrollContent: { padding: 20, paddingBottom: 40 },
  sectionTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 12, marginTop: 10 },
  
  sliderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  sliderValueText: { color: Colors.primary || '#8b5cf6', fontSize: 18, fontWeight: 'bold' },
  
  sliderWrapper: { alignItems: 'center', marginBottom: 30, marginTop: 5 },
  slider: { 
    width: Platform.OS === 'ios' ? '70%' : '66%',
    height: 40, 
    transform: [{ scale: Platform.OS === 'ios' ? 1.5 : 1.6 }],
  },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  pill: { backgroundColor: '#27272a', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: '#3f3f46' },
  pillActive: { backgroundColor: 'rgba(139, 92, 246, 0.2)', borderColor: Colors.primary || '#8b5cf6' },
  pillText: { color: Colors.textSubtle || '#a1a1aa', fontWeight: '600', fontSize: 14 },
  pillTextActive: { color: Colors.primary || '#8b5cf6' },

  footer: { padding: 20, paddingBottom: Platform.OS === 'ios' ? 40 : 20, borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight || '#27272a' },
  applyBtn: { backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 16, alignItems: 'center' },
  applyBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});