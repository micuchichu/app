import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Briefcase, User, Users, ChevronRight, X, Info, Bookmark, Send } from 'lucide-react-native';

import { supabase } from '@/app/lib/supabase';
import { Colors } from '@/app/constants/colors';

import { Job } from '@/app/components/jobCard';
import { JobPreviewModal } from '../components/jobPreviewModal';
import { ProfileModal } from '@/app/components/profileModal';
import { ApplicantReviewModal, Applicant } from '../components/applicantReviewModal';
import InfoModal from '../components/infoModal';
import { useAlert } from '../components/alertContext';

interface MyJob {
  id: string; 
  title: string;
  pay_amount: number;
  currencies?: { currency_text: string } | null; 
  is_negotiable: boolean;
  active: boolean;
  created_at: string;
  application_status?: string; 
  job_postings_candidates?: { employee_id: string }[]; 
}

export default function DashboardScreen() {
  const [activeTab, setActiveTab] = useState<'posted' | 'saved' | 'applied'>('posted');
  
  const [userId, setUserId] = useState<string | null>(null);

  const [postedJobs, setPostedJobs] = useState<MyJob[]>([]);
  const [savedJobs, setSavedJobs] = useState<MyJob[]>([]);
  const [appliedJobs, setAppliedJobs] = useState<MyJob[]>([]); 
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedJob, setSelectedJob] = useState<MyJob | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [isLoadingApplicants, setIsLoadingApplicants] = useState(false);

  const [previewJob, setPreviewJob] = useState<Job | null>(null);

  const [selectedApplicantProfile, setSelectedApplicantProfile] = useState<Applicant | null>(null);
  const [isInfoModalOpen, setInfoModalOpen] = useState(false);

  const { showAlert } = useAlert();

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

    const { data: postedData, error: postedError } = await supabase
      .from('job_postings')
      .select('*, id:job_id, currencies ( currency_text ), job_postings_candidates ( employee_id )')
      .eq('employer_id', user.id)
      .order('created_at', { ascending: false });

    if (!postedError && postedData) setPostedJobs(postedData);

    const { data: savedData, error: savedError } = await supabase
      .from('job_saves')
      .select(`
        job_postings ( 
          *, 
          id:job_id,
          employers ( rating, verified, profiles ( full_name ) ),
          locations!job_location_id ( city_name ),
          currencies ( currency_text )
        )
      `)
      .eq('user_id', user.id);

    if (!savedError && savedData) {
      const formattedSaved = savedData.map((s: any) => s.job_postings).filter(Boolean);
      setSavedJobs(formattedSaved);
    }

    const { data: appliedData, error: appliedError } = await supabase
      .from('job_postings_candidates')
      .select(`
        status,
        job_postings (
          *,
          id:job_id,
          employers ( rating, verified, profiles ( full_name ) ),
          locations!job_location_id ( city_name ),
          currencies ( currency_text )
        )
      `)
      .eq('employee_id', user.id);

    if (!appliedError && appliedData) {
      const formattedApplied = appliedData.map((a: any) => ({
        ...a.job_postings,
        application_status: a.status
      })).filter((j: any) => j && j.id);
      
      setAppliedJobs(formattedApplied);
    }

    setIsLoading(false);
  };

  const handleJobClick = async (job: MyJob) => {
    if (activeTab === 'posted') {
      setSelectedJob(job);
      setIsLoadingApplicants(true);

      const { data, error } = await supabase
        .from('job_postings_candidates') 
        .select(`
          *, 
          employees!employee_id ( 
            rating,
            profiles ( full_name, email, phone_number ) 
          )
        `)
        .eq('job_id', job.id);

      if (error) {
        console.error("Error fetching applicants:", error);
      }

      setApplicants(data || []);
      setIsLoadingApplicants(false);
    } else {
      setPreviewJob(job as unknown as Job); 
    }
  };

  const handleAcceptApplicant = async (applicantId: string) => {
    if (!selectedJob) return;

    try {
      const { error } = await supabase
        .from('job_postings_candidates')
        .update({ status: 'accepted' })
        .eq('job_id', selectedJob.id)
        .eq('employee_id', applicantId);

      if (error) throw error;

      setApplicants(prev => 
        prev.map(app => app.employee_id === applicantId ? { ...app, status: 'accepted' } : app)
      );
      
      showAlert("Success", "You have accepted this applicant!");
    } catch (error: any) {
      showAlert("Error", error.message);
    }
  };

  const handleRejectApplicant = async (applicantId: string) => {
    if (!selectedJob) return;

    try {
      const { error } = await supabase
        .from('job_postings_candidates')
        .update({ status: 'rejected' })
        .eq('job_id', selectedJob.id)
        .eq('employee_id', applicantId);

      if (error) throw error;

      setApplicants(prev => 
        prev.filter(app => app.employee_id !== applicantId)
      );
      
    } catch (error: any) {
      showAlert("Error", error.message); 
    }
    
    fetchDashboardData();
  };

  const handleRateApplicant = async (applicantId: string, newScore: number) => {
    if (!selectedJob) return;

    try {
      const { data: employeeData, error: fetchError } = await supabase
        .from('employees')
        .select('rating')
        .eq('id', applicantId)
        .single();

      if (fetchError) throw fetchError;

      const currentRating = employeeData?.rating || 0;

      let finalRating = newScore;
      if (currentRating > 0) {
        finalRating = ((currentRating * 9) + newScore) / 10;
      }

      const { error: updateError } = await supabase
        .from('employees')
        .update({ rating: finalRating })
        .eq('id', applicantId);

      if (updateError) throw updateError;

      setApplicants(prev => 
        prev.map(app => {
          if (app.employee_id === applicantId) {
            return {
              ...app,
              employees: {
                ...app.employees,
                rating: finalRating,
              }
            };
          }
          return app;
        })
      );
      
      showAlert("Success", "Rating submitted successfully!");
    } catch (error: any) {
      showAlert("Error", error.message);
    }
  };

  const getStatusColor = (status?: string) => {
    switch(status?.toLowerCase()) {
      case 'accepted': return { bg: 'rgba(74, 222, 128, 0.15)', text: '#4ade80' }; 
      case 'rejected': return { bg: 'rgba(248, 113, 113, 0.15)', text: '#f87171' }; 
      default: return { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24' }; 
    }
  };

  const renderListCard = ({ item }: { item: MyJob }) => {
    const isAppliedTab = activeTab === 'applied';
    const statusColors = getStatusColor(item.application_status);
    const currencyCode = item.currencies?.currency_text || '';

    return (
      <TouchableOpacity style={styles.jobCardList} onPress={() => handleJobClick(item)}>
        <View style={styles.jobCardListHeader}>
          <View style={styles.titleRow}>
            {activeTab === 'posted' ? (
              <Briefcase size={18} color={Colors.primary} />
            ) : activeTab === 'saved' ? (
              <Bookmark size={18} color={Colors.primary} fill={Colors.primary} />
            ) : (
              <Send size={18} color={Colors.primary} />
            )}
            <Text style={styles.jobTitleList} numberOfLines={1}>{item.title}</Text>
          </View>
          
          {isAppliedTab ? (
            <View style={[styles.statusBadge, { backgroundColor: statusColors.bg }]}>
              <Text style={[styles.statusText, { color: statusColors.text }]}>
                {item.application_status || 'Pending'}
              </Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: item.active ? 'rgba(74, 222, 128, 0.15)' : 'rgba(161, 161, 170, 0.15)' }]}>
              <Text style={[styles.statusText, { color: item.active ? '#4ade80' : '#a1a1aa' }]}>
                {item.active ? 'Active' : 'Closed'}
              </Text>
            </View>
          )}

        </View>

        <View style={styles.jobCardListFooter}>
          <Text style={styles.payTextList}>
            {item.is_negotiable ? 'Budget: ' : ''}{item.pay_amount} {currencyCode}
          </Text>
          <View style={styles.actionRowList}>
            {activeTab === 'posted' && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginRight: 5 }}>
                <Users size={14} color={Colors.primary} style={{ marginRight: 4 }} />
                <Text style={{ color: Colors.textMuted, fontSize: 13, fontWeight: 'bold' }}>
                  {item.job_postings_candidates?.length || 0}
                </Text>
              </View>
            )}
            <ChevronRight size={18} color={Colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const currentData = activeTab === 'posted' ? postedJobs : activeTab === 'saved' ? savedJobs : appliedJobs;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        <View style={styles.mainHeaderRow}>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.headerTitle}>Dashboard</Text>
              <TouchableOpacity onPress={() => setInfoModalOpen(true)}>
                <Info size={24} color={Colors.textSubtle} />
              </TouchableOpacity>
            </View>
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
            style={[styles.tab, activeTab === 'applied' && styles.activeTab]} 
            onPress={() => (setActiveTab('applied'), fetchDashboardData())}
          >
            <Send size={16} color={activeTab === 'applied' ? 'white' : '#a1a1aa'} />
            <Text style={[styles.tabText, activeTab === 'applied' && styles.activeTabText]}>Applied</Text>
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
            ) : activeTab === 'applied' ? (
              <Send size={48} color={Colors.textMuted} />
            ) : (
              <Bookmark size={48} color={Colors.textMuted} />
            )}
            <Text style={styles.emptyText}>
              {activeTab === 'posted' ? "You haven't posted any jobs yet." : 
               activeTab === 'applied' ? "You haven't applied to any jobs yet." : 
               "You haven't saved any jobs yet."}
            </Text>
          </View>
        ) : (
          <FlatList
            key={activeTab} 
            data={currentData}
            keyExtractor={(item, index) => item.id || index.toString()}
            renderItem={renderListCard}
            contentContainerStyle={styles.listContainer}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <ApplicantReviewModal 
        visible={!!selectedJob}
        onClose={() => setSelectedJob(null)}
        jobTitle={selectedJob?.title || 'Unknown Job'}
        jobCurrencyCode={selectedJob?.currencies?.currency_text || ''}
        applicants={applicants}
        isLoading={isLoadingApplicants}
        onSelectApplicant={(applicant) => setSelectedApplicantProfile(applicant)}
        onAcceptApplicant={handleAcceptApplicant}
        onRejectApplicant={handleRejectApplicant}
        onRateApplicant={handleRateApplicant}
      />

      <ProfileModal 
        visible={!!selectedApplicantProfile}
        onClose={() => setSelectedApplicantProfile(null)}
        userId={selectedApplicantProfile?.employee_id || null}
        fallbackName={selectedApplicantProfile?.employees?.profiles?.full_name}
      />

      <JobPreviewModal 
        userId={userId} 
        onClose={() => setPreviewJob(null)} 
        job={previewJob}
      />

      <InfoModal 
        isVisible={isInfoModalOpen} 
        onClose={() => setInfoModalOpen(false)} 
        title="Dashboard Overview"
        description="Welcome to your activity hub! Use the 'Posted' tab to review applicants for jobs you've created, the 'Applied' tab to track the status of your ongoing bids, and the 'Saved' tab to quickly access jobs you've bookmarked."
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
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 8, gap: 6 },
  activeTab: { backgroundColor: '#27272a' },
  tabText: { color: '#a1a1aa', fontSize: 13, fontWeight: '600' },
  activeTabText: { color: 'white' },
  
  listContainer: { paddingBottom: 40 },

  emptyState: { alignItems: 'center', justifyContent: 'center', marginTop: 80 },
  emptyText: { color: Colors.textMuted, fontSize: 16, marginTop: 15 },

  jobCardList: { backgroundColor: Colors.surface || '#18181b', borderRadius: 16, padding: 20, marginBottom: 15, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  jobCardListHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
  jobTitleList: { color: 'white', fontSize: 18, fontWeight: 'bold', marginLeft: 10, flexShrink: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold', textTransform: 'capitalize' },
  
  jobCardListFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight || '#27272a', paddingTop: 15 },
  payTextList: { color: Colors.textSubtle, fontSize: 14, fontWeight: '600' },
  actionRowList: { flexDirection: 'row', alignItems: 'center', gap: 6 },

  modalContainer: { flex: 1, backgroundColor: Colors.background || 'black', padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 25, marginTop: Platform.OS === 'ios' ? 10 : 40 },
  modalTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
  modalSub: { color: Colors.primary || '#8b5cf6', fontSize: 14, fontWeight: '600', marginTop: 4 },
  closeBtn: { backgroundColor: Colors.surfaceHighlight || '#27272a', padding: 8, borderRadius: 20 },

  closePreviewBtn: { position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 100, backgroundColor: 'rgba(24, 24, 27, 0.8)', padding: 10, borderRadius: 25, borderWidth: 1, borderColor: '#3f3f46' },

  row: { justifyContent: 'space-between', marginBottom: 10 },
  
  profileSearchCard: { backgroundColor: '#18181b', flex: 1, marginHorizontal: 5, padding: 15, borderRadius: 16, alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  profileSearchAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#3f3f46', justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 1, borderColor: Colors.primary || '#8b5cf6' },
  profileSearchName: { color: 'white', fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 2 },
  profileSearchJob: { color: '#a1a1aa', fontSize: 11, textAlign: 'center', textTransform: 'capitalize' },
  
  bidBadgeSmall: { backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginTop: 8 },
  bidTextSmall: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold' },

  applicantCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface || '#18181b', borderRadius: 12, padding: 15, marginBottom: 10, borderWidth: 1, borderColor: Colors.surfaceHighlight || '#27272a' },
  applicantAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.surfaceHighlight || '#3f3f46', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  applicantInfo: { flex: 1 },
  applicantName: { color: 'white', fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  applicantStatus: { color: Colors.textMuted || '#71717a', fontSize: 13, textTransform: 'capitalize' },
  bidBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(251, 191, 36, 0.15)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  bidText: { color: '#fbbf24', fontWeight: 'bold', marginLeft: 2 }
});