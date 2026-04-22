import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Platform, Alert, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Briefcase, Users, ChevronRight, X, DollarSign, Clock, Bookmark } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';

import JobCard, { Job } from '@/app/components/jobCard';
import { JobPreviewModal } from '../components/jobPreviewModal';

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
  const [activeTab, setActiveTab] = useState<'posted' | 'saved'>('posted');
  
  const [userId, setUserId] = useState<string | null>(null);

  const [postedJobs, setPostedJobs] = useState<MyJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<MyJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      setIsLoading(false);
      return;
    }
    
    setUserId(user.id);

    // 1. Fetch Jobs the user POSTED
    const { data: postedData, error: postedError } = await supabase
      .from('job_postings')
      .select('*, id:job_id')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    if (!postedError && postedData) setPostedJobs(postedData);

    // 2. Fetch Jobs the user SAVED
    // UPDATED: Now fetches the nested relations so the JobCard has the employer name and city!
    const { data: savedData, error: savedError } = await supabase
      .from('job_saves')
      .select(`
        job_postings ( 
          *, 
          id:job_id,
          employers ( rating, verified, profiles ( full_name ) ),
          locations!job_location_id ( city_name )
        )
      `)
      .eq('user_id', user.id);

    if (!savedError && savedData) {
      const formattedSaved = savedData.map((s: any) => s.job_postings).filter(Boolean);
      setSavedJobs(formattedSaved);
    }

    setIsLoading(false);
  };

  const handleJobClick = async (job: MyJob) => {
    if (activeTab === 'posted') {
      setSelectedJob(job);
      setIsLoadingApplicants(true);

      const { data, error } = await supabase
        .from('applications') 
        .select(`*, profiles!applicant_id ( full_name )`)
        .eq('job_id', job.id)
        .order('created_at', { ascending: false });

      setApplicants(data || []);
      setIsLoadingApplicants(false);
    } else {
      setPreviewJob(job as unknown as Job); 
    }
  };

  const renderListCard = ({ item }: { item: MyJob }) => (
    <TouchableOpacity style={styles.jobCardList} onPress={() => handleJobClick(item)}>
      <View style={styles.jobCardListHeader}>
        <View style={styles.titleRow}>
          {activeTab === 'posted' ? (
            <Briefcase size={18} color={Colors.primary} />
          ) : (
            <Bookmark size={18} color={Colors.primary} fill={Colors.primary} />
          )}
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
          {activeTab === 'posted' && <Users size={16} color={Colors.primary} />}
          <ChevronRight size={18} color={Colors.textMuted} />
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

  const currentData = activeTab === 'posted' ? postedJobs : savedJobs;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.mainHeaderRow}>
          <View>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <Text style={styles.subHeader}>Manage your activity</Text>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'posted' && styles.activeTab]} 
            onPress={() => setActiveTab('posted')}
          >
            <Briefcase size={16} color={activeTab === 'posted' ? 'white' : '#a1a1aa'} />
            <Text style={[styles.tabText, activeTab === 'posted' && styles.activeTabText]}>Posted</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'saved' && styles.activeTab]} 
            onPress={() => (setActiveTab('saved'), fetchDashboardData())}
          >
            <Bookmark size={16} color={activeTab === 'saved' ? 'white' : '#a1a1aa'} />
            <Text style={[styles.tabText, activeTab === 'saved' && styles.activeTabText]}>Saved</Text>
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 50 }} />
        ) : currentData.length === 0 ? (
          <View style={styles.emptyState}>
            {activeTab === 'posted' ? (
              <Briefcase size={48} color={Colors.textMuted} />
            ) : (
              <Bookmark size={48} color={Colors.textMuted} />
            )}
            <Text style={styles.emptyText}>
              {activeTab === 'posted' ? "You haven't posted any jobs yet." : "You haven't saved any jobs yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            key={activeTab} 
            data={currentData}
            keyExtractor={(item) => item.id}
            renderItem={renderListCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

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

      <JobPreviewModal 
        userId={userId} 
        onClose={() => setPreviewJob(null)} 
        job={previewJob}
      />


    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.background || 'black', paddingTop: Platform.OS === 'android' ? 40 : 10 },
  container: { flex: 1, paddingHorizontal: 20 },
  
  mainHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, marginTop: 10 },
  headerTitle: { color: 'white', fontSize: 32, fontWeight: 'bold' },
  subHeader: { color: Colors.textMuted, fontSize: 14 },
  
  tabContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 12, padding: 4, marginBottom: 20, borderWidth: 1, borderColor: '#27272a' },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 8 },
  activeTab: { backgroundColor: '#27272a' },
  tabText: { color: '#a1a1aa', fontSize: 14, fontWeight: '600' },
  activeTabText: { color: 'white' },
  
  listContainer: { paddingBottom: 40 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 },

  jobCardList: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  jobCardListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  jobTitleList: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  
  jobCardListFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight || '#27272a', paddingTop: 15 },
  payTextList: { color: Colors.textSubtle, fontSize: 14, fontWeight: '600' },
  actionRowList: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  modalContainer: { flex: 1, backgroundColor: Colors.background || 'black', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25, marginTop: Platform.OS === 'ios' ? 10 : 40 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalSub: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  closeBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 8, borderRadius: 20 },

  closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100, backgroundColor: 'rgba(24, 24, 27, 0.8)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: '#3f3f46' },

  applicantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface || '#18181b', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  applicantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceHighlight || '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  applicantInfo: { flex: 1 },
  applicantName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  applicantStatus: { color: Colors.textMuted || '#71717a', fontSize: 13 },
  bidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  bidText: { color: '#fbbf24', fontWeight: 'bold', marginLeft: 2 }
});