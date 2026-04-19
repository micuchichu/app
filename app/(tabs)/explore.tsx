import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Search, Map, TrendingUp, Filter, Clock, MapPin, Briefcase, ChevronRight } from 'lucide-react-native';

import { JobsMapModal } from '../components/jobsMapModal';

import { Colors } from '../constants/colors';
import { GlobalStyles } from '../constants/globalStyles';

export default function ExploreScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const [isMapVisible, setIsMapVisible] = useState(false);

  const categories = ['All', 'Nearby', 'Microjobs', 'Part-time', 'Urgent', 'High Paying'];

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* --- HEADER & SEARCH --- */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Explore</Text>
          <View style={styles.searchContainer}>
            <Search size={20} color={Colors.textSubtle} style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search jobs, skills, or employers..."
              placeholderTextColor={Colors.textSubtle}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            <TouchableOpacity style={styles.filterBtn}>
              <Filter size={20} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
          
          {/* --- CATEGORIES --- */}
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesContainer}
          >
            {categories.map((cat) => (
              <TouchableOpacity 
                key={cat} 
                style={[styles.categoryPill, activeCategory === cat && styles.categoryPillActive]}
                onPress={() => setActiveCategory(cat)}
              >
                <Text style={[styles.categoryText, activeCategory === cat && styles.categoryTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* --- MAP VIEW CTA --- */}
          <TouchableOpacity style={styles.mapCard} onPress={() => setIsMapVisible(true)}>
            <View style={styles.mapCardContent}>
              <View style={styles.mapIconBg}>
                <Map size={24} color={Colors.primary} />
              </View>
              <View style={styles.mapCardTextContainer}>
                <Text style={styles.mapCardTitle}>Jobs Near Me</Text>
                <Text style={styles.mapCardSub}>Explore opportunities on the map</Text>
              </View>
              <ChevronRight size={24} color={Colors.textSubtle} />
            </View>
          </TouchableOpacity>

          {/* --- TRENDING CATEGORIES --- */}
          <Text style={styles.sectionTitle}>
            <TrendingUp size={20} color={Colors.primary} style={{ marginRight: 8 }} />
            Trending Categories
          </Text>

          <View style={styles.gridContainer}>
            <TouchableOpacity style={styles.gridCard}>
              <Briefcase size={28} color="#4ade80" />
              <Text style={styles.gridCardTitle}>Labor & Moving</Text>
              <Text style={styles.gridCardCount}>124 active</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridCard}>
              <Clock size={28} color="#fbbf24" />
              <Text style={styles.gridCardTitle}>Quick Tasks</Text>
              <Text style={styles.gridCardCount}>86 active</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridCard}>
              <MapPin size={28} color="#f87171" />
              <Text style={styles.gridCardTitle}>Local Delivery</Text>
              <Text style={styles.gridCardCount}>42 active</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.gridCard}>
              <TrendingUp size={28} color="#60a5fa" />
              <Text style={styles.gridCardTitle}>Freelance Tech</Text>
              <Text style={styles.gridCardCount}>210 active</Text>
            </TouchableOpacity>
          </View>

          <JobsMapModal 
            visible={isMapVisible} 
            onClose={() => setIsMapVisible(false)} 
          />

        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background || 'black' },
  container: { flex: 1, paddingHorizontal: 20 },
  
  // Header & Search
  header: { marginBottom: 20, paddingTop: Platform.OS === 'android' ? 20 : 10 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 15 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  searchIcon: { position: 'absolute', left: 15, zIndex: 1 },
  searchInput: { flex: 1, backgroundColor: Colors.surfaceHighlight || '#27272a', color: 'white', paddingVertical: 14, paddingLeft: 45, paddingRight: 15, borderRadius: 12, fontSize: 16 },
  filterBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 14, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  
  // Categories
  categoriesContainer: { paddingBottom: 25, gap: 10 },
  categoryPill: { backgroundColor: Colors.surface || '#18181b', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  categoryPillActive: { backgroundColor: Colors.primary || '#8b5cf6', borderColor: Colors.primary || '#8b5cf6' },
  categoryText: { color: Colors.textSubtle || '#a1a1aa', fontWeight: '600', fontSize: 14 },
  categoryTextActive: { color: 'white' },

  // Map CTA
  mapCard: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 30, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  mapCardContent: { flexDirection: 'row', alignItems: 'center' },
  mapIconBg: { backgroundColor: 'rgba(139, 92, 246, 0.15)', padding: 12, borderRadius: 12, marginRight: 15 },
  mapCardTextContainer: { flex: 1 },
  mapCardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  mapCardSub: { color: Colors.textMuted || '#71717a', fontSize: 14 },

  // Section Title
  sectionTitle: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 15, flexDirection: 'row', alignItems: 'center' },

  // Grid Categories
  gridContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 15, justifyContent: 'space-between' },
  gridCard: { backgroundColor: Colors.surface || '#18181b', width: '47%', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  gridCardTitle: { color: 'white', fontSize: 16, fontWeight: 'bold', marginTop: 15, marginBottom: 5 },
  gridCardCount: { color: Colors.textMuted || '#71717a', fontSize: 13 },
});