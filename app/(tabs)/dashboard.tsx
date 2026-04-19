import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, SafeAreaView, Platform } from 'react-native';
// NEW: Added LayoutList and LayoutGrid icons
import { Briefcase, Users, ChevronRight, X, DollarSign, Clock, LayoutGrid, LayoutList } from 'lucide-react-native';

import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import { GlobalStyles } from '../constants/globalStyles';

// --- TYPES ---
interface MyJob {
  id: string; 
  title: string;
  pay_amount: number;
  pay_currency: string;
  is_negotiable: boolean;
  active: boolean;
  created_at: string;
}

interface Applicant {
  id: string;
  bid_amount?: number;
  status: string;
  profiles?: { full_name?: string } | null;
}

export default function DashboardScreen() {
  const [myJobs, setMyJobs] = useState<MyJob[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  
  const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  // --- NEW STATE: Tracks current view mode ---
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  useEffect(() => {
    fetchMyJobs();
  }, []);

  const fetchMyJobs = async () => {
    setIsLoadingJobs(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoadingJobs(false);
      return;
    }

    const { data, error } = await supabase
      .from('job_postings')
      .select('*, id:job_id')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching my jobs:", error);
    } else {
      setMyJobs(data || []);
    }
    setIsLoadingJobs(false);
  };

  const openJobDetails = async (job: MyJob) => {
    setSelectedJob(job);
    setIsLoadingApplicants(true);

    const { data, error } = await supabase
      .from('applications') 
      .select(`
        *,
        profiles!applicant_id ( full_name )
      `)
      .eq('job_id', job.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.log("No applicants found or table doesn't exist yet:", error.message);
      setApplicants([]);
    } else {
      setApplicants(data || []);
    }
    setIsLoadingApplicants(false);
  };

  // --- RENDERERS ---

  // 1. ORIGINAL LIST RENDERER (Cleaned up slightly)
  const renderListCard = ({ item }: { item: MyJob }) => (
    <TouchableOpacity style={styles.jobCardList} onPress={() => openJobDetails(item)}>
      <View style={styles.jobCardListHeader}>
        <View style={styles.titleRow}>
          <Briefcase size={18} color={Colors.primary} />
          <Text style={styles.jobTitleList} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.active ? 'rgba(74, 222, 128, 0.15)' : 'rgba(161, 161, 170, 0.15)' }]}>
          <Text style={[styles.statusText, { color: item.active ? '#4ade80' : '#a1a1aa' }]}>
            {item.active ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.jobCardListFooter}>
        <Text style={styles.payTextList}>
          {item.is_negotiable ? 'Budget: ' : ''}${item.pay_amount} {item.pay_currency}
        </Text>
        <View style={styles.actionRowList}>
          <Users size={16} color={Colors.primary} />
          <ChevronRight size={18} color={Colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );

  // 2. NEW GRID RENDERER (Square-ish cards, much less detail to fit 2-columns)
  const renderGridCard = ({ item }: { item: MyJob }) => (
    <TouchableOpacity style={styles.jobCardGrid} onPress={() => openJobDetails(item)}>
      <View style={styles.jobCardGridContent}>
        <View style={styles.gridIconHeader}>
          <View style={[styles.statusCircle, { backgroundColor: item.active ? '#4ade80' : '#a1a1aa' }]} />
          <Users size={16} color={Colors.textMuted} />
        </View>

        <Text style={styles.jobTitleGrid} numberOfLines={2}>{item.title}</Text>
        
        <Text style={styles.payTextGrid}>
          ${item.pay_amount} {item.pay_currency}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const renderApplicantCard = ({ item }: { item: Applicant }) => (
    <View style={styles.applicantCard}>
      <View style={styles.applicantAvatar}>
        <Users size={20} color="white" />
      </View>
      <View style={styles.applicantInfo}>
        <Text style={styles.applicantName}>{item.profiles?.full_name || 'Anonymous User'}</Text>
        <Text style={styles.applicantStatus}>Status: {item.status || 'Pending'}</Text>
      </View>
      {item.bid_amount ? (
        <View style={styles.bidBadge}>
          <DollarSign size={14} color="#fbbf24" />
          <Text style={styles.bidText}>{item.bid_amount}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* --- HEADER WITH SIDE SWITCHER --- */}
        <View style={styles.mainHeaderRow}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.subHeader}>{myJobs.length} Jobs Total</Text>
          </View>

          {/* NEW: Small segmented view switcher on the side */}
          <View style={styles.switcherPill}>
            <TouchableOpacity 
              style={[styles.switcherBtn, viewMode === 'list' && styles.switcherBtnActive]}
              onPress={() => setViewMode('list')}
            >
              <LayoutList size={16} color={viewMode === 'list' ? 'white' : '#a1a1aa'} />
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.switcherBtn, viewMode === 'grid' && styles.switcherBtnActive]}
              onPress={() => setViewMode('grid')}
            >
              <LayoutGrid size={16} color={viewMode === 'grid' ? 'white' : '#a1a1aa'} />
            </TouchableOpacity>
          </View>
        </View>

        {isLoadingJobs ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : myJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase size={48} color={Colors.textMuted} />
            <Text style={styles.emptyText}>You haven't posted any jobs yet.</Text>
          </View>
        ) : (
          <FlatList
            // IMPORTANT: The `key` must change when numColumns changes in FlatList!
            key={viewMode}
            data={myJobs}
            keyExtractor={(item) => item.id}
            // Dynamic columns and renderer based on state
            numColumns={viewMode === 'grid' ? 2 : 1}
            renderItem={viewMode === 'grid' ? renderGridCard : renderListCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* --- APPLICANTS MODAL (Remains unchanged) --- */}
      <Modal visible={!!selectedJob} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.modalTitle}>{selectedJob?.title}</Text>
              <Text style={styles.modalSub}>Applicant Review</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedJob(null)}>
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>

          {isLoadingApplicants ? (
             <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
          ) : applicants.length === 0 ? (
            <View style={styles.emptyState}>
              <Clock size={48} color={Colors.textMuted} />
              <Text style={styles.emptyText}>No applicants yet. Check back soon!</Text>
            </View>
          ) : (
            <FlatList
              data={applicants}
              keyExtractor={(item, index) => item.id || index.toString()}
              renderItem={renderApplicantCard}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background || 'black', paddingTop: Platform.OS === 'android' ? 40 : 10 },
  container: { flex: 1, paddingHorizontal: 20 },
  
  // Header with side switcher
  mainHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25, marginTop: 10 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  subHeader: { color: Colors.textMuted, fontSize: 14 },
  
  // NEW: View Switcher Pill (Pill-shaped, aligned right)
  switcherPill: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 20, padding: 4, borderWidth: 1, borderColor: '#27272a', alignSelf: 'flex-start' },
  switcherBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 16 },
  switcherBtnActive: { backgroundColor: '#3f3f46' }, // Slight highlight for the active view
  
  listContainer: { paddingBottom: 40 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 },

  // 1. ORIGINAL LIST CARD STYLES
  jobCardList: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  jobCardListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  jobTitleList: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  
  jobCardListFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight || '#27272a', paddingTop: 15 },
  payTextList: { color: Colors.textSubtle, fontSize: 14, fontWeight: '600' },
  actionRowList: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  // 2. NEW GRID CARD STYLES
  jobCardGrid: { width: '47.5%', backgroundColor: Colors.surface || '#18181b', borderRadius: 16, marginBottom: 15, marginRight: '5%', // Added gap for FlatList with 2 columns
    borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  // Need to ensure FlatList renders correctly - marginRight on grid card, except for even ones
  // Alternatively, can use columnWrapperStyle but that can cause performance issues in list re-renders.
  // I am applying marginRight to all and then FlashList will automatically apply it differently on the odd vs even rows.

  // A square, tidy structure
  jobCardGridContent: { padding: 15, alignItems: 'flex-start' },
  gridIconHeader: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  statusCircle: { width: 8, height: 8, borderRadius: 4 }, // Smaller, minimalist status indicator for grid
  jobTitleGrid: { color: 'white', fontSize: 15, fontWeight: 'bold', height: 40, marginBottom: 6 }, // Title must be smaller and take 2 lines max
  payTextGrid: { color: Colors.textSubtle, fontSize: 13, fontWeight: '600' },

  // Modal Styles (Remains unchanged)
  modalContainer: { flex: 1, backgroundColor: Colors.background || 'black', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25, marginTop: Platform.OS === 'ios' ? 10 : 40 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalSub: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  closeBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 8, borderRadius: 20 },

  applicantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface || '#18181b', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  applicantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceHighlight || '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  applicantInfo: { flex: 1 },
  applicantName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  applicantStatus: { color: Colors.textMuted || '#71717a', fontSize: 13 },
  bidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  bidText: { color: '#fbbf24', fontWeight: 'bold', marginLeft: 2 }
});