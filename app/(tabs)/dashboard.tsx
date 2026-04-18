import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, SafeAreaView, Platform } from 'react-native';
import { Briefcase, Users, ChevronRight, X, DollarSign, Clock } from 'lucide-react-native';

import { supabase } from '../lib/supabase';
import { Colors } from '../constants/colors';
import { GlobalStyles } from '../constants/globalStyles';

// --- TYPES ---
interface MyJob {
  id: string; // or job_id depending on how it returns from your select
  job_id: string; 
  title: string;
  pay_amount: number;
  pay_currency: string;
  is_negotiable: boolean;
  active: boolean;
  created_at: string;
}

interface Applicant {
  id: string;
  applicant_id: string;
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

    // Fetch jobs created by the current user
    const { data, error } = await supabase
      .from('job_postings')
      .select('*, id:job_id') // Aliasing job_id to id just like we did on the feed
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

    // Fetch applicants for this specific job. 
    // NOTE: Change 'applications' to whatever your actual table name is!
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

  const renderJobCard = ({ item }: { item: MyJob }) => (
    <TouchableOpacity style={styles.jobCard} onPress={() => openJobDetails(item)}>
      <View style={styles.jobCardHeader}>
        <View style={styles.titleRow}>
          <Briefcase size={20} color={Colors.primary || "#8b5cf6"} />
          <Text style={styles.jobTitle} numberOfLines={1}>{item.title}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.active ? 'rgba(74, 222, 128, 0.2)' : 'rgba(161, 161, 170, 0.2)' }]}>
          <Text style={[styles.statusText, { color: item.active ? '#4ade80' : '#a1a1aa' }]}>
            {item.active ? 'Active' : 'Closed'}
          </Text>
        </View>
      </View>

      <View style={styles.jobCardFooter}>
        <Text style={styles.payText}>
          {item.is_negotiable ? 'Budget: ' : ''}{item.pay_amount} {item.pay_currency}
        </Text>
        <View style={styles.actionRow}>
          <Text style={styles.viewApplicantsText}>View Applicants</Text>
          <ChevronRight size={18} color={Colors.textSubtle || "#a1a1aa"} />
        </View>
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
        <Text style={styles.headerTitle}>My Dashboard</Text>
        <Text style={styles.subHeader}>Manage your posted jobs and applicants.</Text>

        {isLoadingJobs ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : myJobs.length === 0 ? (
          <View style={styles.emptyState}>
            <Briefcase size={48} color={Colors.textMuted || "#71717a"} />
            <Text style={styles.emptyText}>You haven't posted any jobs yet.</Text>
          </View>
        ) : (
          <FlatList
            data={myJobs}
            keyExtractor={(item) => item.id}
            renderItem={renderJobCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* --- APPLICANTS MODAL --- */}
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
              <Clock size={48} color={Colors.textMuted || "#71717a"} />
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
  safeArea: { flex: 1, backgroundColor: Colors.background || 'black', paddingTop: Platform.OS === 'android' ? 40 : 0 },
  container: { flex: 1, paddingHorizontal: 20 },
  
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  subHeader: { color: Colors.textMuted || '#71717a', fontSize: 16, marginBottom: 25 },
  listContainer: { paddingBottom: 40 },

  // Empty State
  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.textMuted || '#71717a', fontSize: 16, marginTop: 15 },

  // Job Card
  jobCard: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  jobCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  jobTitle: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  
  jobCardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight || '#27272a', paddingTop: 15 },
  payText: { color: Colors.textSubtle || '#a1a1aa', fontSize: 14, fontWeight: '600' },
  actionRow: { flexDirection: 'row', alignItems: 'center' },
  viewApplicantsText: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: 'bold', marginRight: 4 },

  // Modal Styles
  modalContainer: { flex: 1, backgroundColor: Colors.background || 'black', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25, marginTop: Platform.OS === 'ios' ? 10 : 40 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalSub: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  closeBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 8, borderRadius: 20 },

  // Applicant Card
  applicantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface || '#18181b', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  applicantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceHighlight || '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  applicantInfo: { flex: 1 },
  applicantName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  applicantStatus: { color: Colors.textMuted || '#71717a', fontSize: 13 },
  bidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  bidText: { color: '#fbbf24', fontWeight: 'bold', marginLeft: 2 }
});