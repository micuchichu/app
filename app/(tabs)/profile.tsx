import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    ScrollView,
    StyleSheet, Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';

import { router } from 'expo-router';
import { Briefcase, ChevronDown, Edit2, Layers, Lock, LogOut, PlusCircle, Star, Trash2, User, X } from 'lucide-react-native';

import { useAlert } from '@/components/alertContext';
import { Colors } from '@/constants/colors';
import { GlobalStyles } from '@/constants/globalStyles';
import { supabase } from '@/lib/supabase';

import { CategorySelectModal, JobCategory } from '@/components/categorySelectModal';
import { CreateGigModal } from '@/components/createGigModal';

export default function ProfileScreen() {
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [isGuest, setIsGuest] = useState(false);
  
  const [employerRating, setEmployerRating] = useState<number | null>(null);
  const [employeeRating, setEmployeeRating] = useState<number | null>(null);
  
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [bioInput, setBioInput] = useState('');

  const [userSkills, setUserSkills] = useState<JobCategory[]>([]);
  const [isEditingSkills, setIsEditingSkills] = useState(false);
  const [editableSkills, setEditableSkills] = useState<JobCategory[]>([]);
  
  const [availableCategories, setAvailableCategories] = useState<JobCategory[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  const [activeServices, setActiveServices] = useState<any[]>([]);

  const [isGigModalVisible, setIsGigModalVisible] = useState(false);
  const [editingService, setEditingService] = useState<any | null>(null);

  const { showAlert } = useAlert();

  useEffect(() => {
    fetchUserProfile();
    fetchJobCategories();
  }, []);

  const fetchJobCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('job_categories')
        .select('id, name, parent_id')
        .order('name');

      if (error) throw error;
      setAvailableCategories(data || []);
    } catch (error) {
      console.log("Error fetching job categories:", error);
    }
  };

  const fetchUserProfile = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;

      if (!user || user.is_anonymous || !user.email) {
        setIsGuest(true);
        setLoading(false);
        return;
      }

      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      const { data: employerData } = await supabase
        .from('employers')
        .select('rating')
        .eq('id', user.id)
        .maybeSingle();

      const { data: employeeData } = await supabase
        .from('employees')
        .select('rating')
        .eq('id', user.id)
        .maybeSingle();

      setEmployerRating(employerData?.rating || 0);
      setEmployeeRating(employeeData?.rating || 0);

      const { data: userCategoriesData } = await supabase
        .from('employee_job_categories')
        .select(`
          category_id,
          job_categories ( id, name )
        `)
        .eq('employee_id', user.id);

      const mappedSkills = userCategoriesData
        ?.map((row: any) => row.job_categories)
        .filter(Boolean) || [];

      const { data: servicesData } = await supabase
        .from('service_postings')
        .select('id, title, price, description, currencies ( currency_text )')
        .eq('employee_id', user.id)
        .order('created_at', { ascending: false });

      setActiveServices(servicesData || []);
      setUserSkills(mappedSkills);
      setUserData({ ...(profileData || {}), email: user.email });

    } catch (error) {
      console.log("Error fetching user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBio = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const newBio = bioInput.trim();
      const { error } = await supabase.from('profiles').update({ bio: newBio }).eq('id', user.id);
      if (error) throw error;

      setUserData({ ...userData, bio: newBio });
      setIsEditingBio(false);
    } catch (error: any) {
      showAlert("Error saving bio", error.message);
    }
  };

  const handleSelectSkill = (category: JobCategory) => {
    if (!editableSkills.find(s => s.id === category.id)) {
      setEditableSkills([...editableSkills, category]);
    }
    setIsCategoryModalVisible(false);
  };

  const handleRemoveSkill = (categoryId: number) => {
    setEditableSkills(editableSkills.filter(s => s.id !== categoryId));
  };

  const handleSaveSkills = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const initialCategoryIds = userSkills.map(s => s.id);
      const finalCategoryIds = editableSkills.map(s => s.id);

      const idsToDelete = initialCategoryIds.filter(id => !finalCategoryIds.includes(id));
      const idsToInsert = finalCategoryIds.filter(id => !initialCategoryIds.includes(id));

      const { data: existingEmployee, error: empFetchError } = await supabase
      .from('employees')
      .select('id')
      .eq('id', user.id) 
      .maybeSingle();

      if (empFetchError) {
        showAlert("Database Error", "Could not verify your profile. Please try again.");
        return;
      }

      if (!existingEmployee) {
        const { error: insertEmpError } = await supabase
          .from('employees')
          .insert([{ 
            id: user.id, 
            rating: 0, 
            looking_for_job: true, 
            active_user: true, 
            jobs_done: 0 
          }]); 

        if (insertEmpError) {
          console.error("Employee creation error:", insertEmpError);
          showAlert("Profile Error", "Could not initialize your worker profile.");
          return;
        }
      }

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('employee_job_categories')
          .delete()
          .eq('employee_id', user.id)
          .in('category_id', idsToDelete);

        if (deleteError) throw deleteError;
      }

      if (idsToInsert.length > 0) {
        const insertData = idsToInsert.map(categoryId => ({
          employee_id: user.id,
          category_id: categoryId
        }));

        const { error: insertError } = await supabase
          .from('employee_job_categories')
          .insert(insertData);

        if (insertError) throw insertError;
      }

      setUserSkills(editableSkills);
      setIsEditingSkills(false);
    } catch (error: any) {
      showAlert("Error saving skills", error.message);
    }
  };

  const handleDeleteService = (serviceId: string) => {
    Alert.alert(
      "Delete Service",
      "Are you sure you want to delete this service? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive", 
          onPress: async () => {
            try {
              const { error } = await supabase.from('service_postings').delete().eq('id', serviceId);
              if (error) throw error;
              
              setActiveServices(prev => prev.filter(s => s.id !== serviceId));
              showAlert("Success", "Service deleted successfully.");
            } catch (error: any) {
              showAlert("Error", error.message);
            }
          } 
        }
      ]
    );
  };

  const handleEditService = (service: any) => {
    setEditingService(service);
    setIsGigModalVisible(true);
  };

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) showAlert("Error signing out", error.message);
    else router.replace('/login');
  };

  const handleCloseGigModal = () => {
    setIsGigModalVisible(false);
    setEditingService(null);
    fetchUserProfile();
  };

  if (loading) {
    return (
      <View style={styles.mainWrapper}>
        <View style={styles.topBlackBar} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={styles.mainWrapper}>
        <View style={styles.topBlackBar} />
        <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
          <View style={styles.restrictedCircle}><Lock size={40} color={Colors.textMuted} /></View>
          <Text style={styles.restrictedHeader}>Account Required</Text>
          <Text style={styles.restrictedSub}>You need to be logged in to view and edit your profile.</Text>
          <TouchableOpacity style={[GlobalStyles.primaryButton, { width: '100%' }]} onPress={handleSignOut}>
            <Text style={GlobalStyles.primaryButtonText}>Log In / Sign Up</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const emailPrefix = userData?.email?.split('@')[0] || 'user';
  const displayName = userData?.full_name || emailPrefix;
  const currentJob = userData?.current_job || 'New Member';
  const age = userData?.age || '?';
  const bio = userData?.bio || '';

  return (
    <View style={styles.mainWrapper}>
      <View style={styles.topBlackBar} />
      
      <ScrollView style={styles.screenContainer} contentContainerStyle={{paddingBottom: 120}} keyboardShouldPersistTaps="handled">
        
        <View style={styles.islandCard}>
          <TouchableOpacity style={styles.settingsIcon} onPress={handleSignOut}>
            <LogOut size={24} color={Colors.error} />
          </TouchableOpacity>
          
          <View style={styles.largeAvatar}>
            <User size={40} color="white" />
          </View>
          
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileHandle}>{currentJob} • Age {age}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <View style={styles.ratingContainer}>
                {employerRating && employerRating > 0 ? (
                  <><Text style={styles.statNumber}>{employerRating.toFixed(1)}</Text><Star size={12} color="#fbbf24" fill="#fbbf24" style={{ marginLeft: 4 }} /></>
                ) : <Text style={styles.notRatedText}>Not rated</Text>}
              </View>
              <Text style={styles.statLabel}>Employer</Text>
            </View>
            <View style={styles.statBoxDivider} />
            <View style={styles.statBox}>
              <View style={styles.ratingContainer}>
                {employeeRating && employeeRating > 0 ? (
                  <><Text style={styles.statNumber}>{employeeRating.toFixed(1)}</Text><Star size={12} color="#fbbf24" fill="#fbbf24" style={{ marginLeft: 4 }} /></>
                ) : <Text style={styles.notRatedText}>Not rated</Text>}
              </View>
              <Text style={styles.statLabel}>Worker</Text>
            </View>
            <View style={styles.statBoxDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Done</Text>
            </View>
            <View style={styles.statBoxDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNumber}>0</Text>
              <Text style={styles.statLabel}>Bids</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.gigButton} 
          onPress={() => setIsGigModalVisible(true)}
        >
          <PlusCircle size={20} color="white" />
          <Text style={styles.gigButtonText}>Offer a Service</Text>
        </TouchableOpacity>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>About Me</Text>
          {!isEditingBio && bio !== '' && (
            <TouchableOpacity onPress={() => { setBioInput(bio); setIsEditingBio(true); }} style={styles.editBtn}>
              <Edit2 size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.islandCard}>
          {isEditingBio ? (
            <View style={styles.editSectionContainer}>
              <TextInput
                style={styles.textInputArea}
                multiline
                placeholder="Tell others about yourself..."
                placeholderTextColor={Colors.textMuted}
                value={bioInput}
                onChangeText={setBioInput}
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setIsEditingBio(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveBio}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : bio ? (
            <Text style={styles.bioText}>{bio}</Text>
          ) : (
            <TouchableOpacity style={styles.dashedAddBtn} onPress={() => { setBioInput(''); setIsEditingBio(true); }}>
              <Text style={styles.dashedAddBtnText}>+ Add a bio</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>My Expertise</Text>
          {!isEditingSkills && userSkills.length > 0 && (
            <TouchableOpacity onPress={() => { setEditableSkills([...userSkills]); setIsEditingSkills(true); }} style={styles.editBtn}>
              <Edit2 size={16} color={Colors.primary} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.islandCard}>
          {isEditingSkills ? (
            <View style={styles.editSectionContainer}>
              <View style={styles.skillsContainer}>
                {editableSkills.map((skill) => (
                  <TouchableOpacity key={skill.id} style={styles.skillPillEdit} onPress={() => handleRemoveSkill(skill.id)}>
                    <Text style={styles.skillPillText}>{skill.name}</Text>
                    <X size={14} color="#d8b4fe" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.dropdownTrigger} 
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>Select a Category...</Text>
                <ChevronDown size={20} color={Colors.textMuted} />
              </TouchableOpacity>

              <View style={styles.editActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => { setIsEditingSkills(false); setEditableSkills([...userSkills]); }}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveSkills}>
                  <Text style={styles.saveBtnText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : userSkills.length > 0 ? (
            <View style={styles.skillsContainer}>
              {userSkills.map((skill) => (
                <View key={skill.id} style={styles.skillPill}>
                  <Text style={styles.skillPillText}>{skill.name}</Text>
                </View>
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.dashedAddBtn} onPress={() => { setEditableSkills([]); setIsEditingSkills(true); }}>
              <Text style={styles.dashedAddBtnText}>+ Add your skills</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={[styles.sectionTitle, { marginTop: 10, marginBottom: 15 }]}>Active Services</Text>
        {activeServices.length > 0 ? (
          activeServices.map((service) => (
            <View key={service.id} style={styles.serviceCard}>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceTitle} numberOfLines={1}>{service.title}</Text>
                <View style={styles.servicePriceRow}>
                  <Text style={styles.servicePrice}>
                    {service.price} {service.currencies?.currency_text || ''}
                  </Text>
                  <View style={styles.serviceBadge}>
                    <Text style={styles.serviceBadgeText}>Active</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.serviceActions}>
                <TouchableOpacity 
                  style={styles.serviceActionBtn} 
                  onPress={() => handleEditService(service)}
                >
                  <Edit2 size={20} color={Colors.textMuted} />
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.serviceActionBtn, styles.deleteBtn]} 
                  onPress={() => handleDeleteService(service.id)}
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          <View style={styles.emptyServicesContainer}>
            <Layers size={32} color={Colors.surfaceHighlight} style={{ marginBottom: 10 }} />
            <Text style={styles.emptyServicesText}>You haven't offered any services yet.</Text>
          </View>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 15, marginBottom: 15 }]}>Recent Activity</Text>
        <View style={styles.activityCard}>
          <Briefcase size={20} color={Colors.primary} />
          <View style={styles.activityTextContainer}>
            <Text style={styles.activityTitle}>Account Created</Text>
            <Text style={styles.activitySubtitle}>Welcome to the platform!</Text>
          </View>
          <Text style={[styles.activityStatus, { color: '#4ade80' }]}>New</Text>
        </View>

      </ScrollView>

      <CreateGigModal 
        visible={isGigModalVisible} 
        onClose={handleCloseGigModal} 
        serviceToEdit={editingService} 
      />

      <CategorySelectModal
        visible={isCategoryModalVisible}
        onClose={() => setIsCategoryModalVisible(false)}
        categories={availableCategories}
        selectedCategories={editableSkills}
        onSelectCategory={handleSelectSkill}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: { flex: 1, backgroundColor: Colors.background },
  topBlackBar: { height: 40, backgroundColor: 'black', width: '100%', position: 'absolute', top: 0, zIndex: 100 },

  loadingContainer: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  screenContainer: { flex: 1, backgroundColor: Colors.background, padding: 20, paddingTop: Platform.OS === 'android' ? 60 : 60 },
  
  islandCard: { alignItems: 'center', backgroundColor: Colors.surface, padding: 20, borderRadius: 20, marginBottom: 20, position: 'relative' },
  
  profileHeader: { alignItems: 'center', width: '100%' },
  settingsIcon: { position: 'absolute', top: 0, right: 0 },
  largeAvatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: Colors.surfaceHighlight, justifyContent: 'center', alignItems: 'center', marginBottom: 10, borderWidth: 2, borderColor: Colors.primary },
  profileName: { color: 'white', fontSize: 22, fontWeight: 'bold', textTransform: 'capitalize' },
  profileHandle: { color: Colors.textMuted, fontSize: 14, marginBottom: 20, fontWeight: '500' },
  
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', borderTopWidth: 1, borderTopColor: Colors.surfaceHighlight, paddingTop: 20 },
  statBox: { flex: 1, alignItems: 'center' },
  statBoxDivider: { width: 1, height: 25, backgroundColor: Colors.surfaceHighlight },
  ratingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: 24 }, 
  statNumber: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  notRatedText: { color: Colors.textMuted, fontSize: 13, fontWeight: '600' }, 
  statLabel: { color: Colors.textMuted, fontSize: 12, marginTop: 4 },
  
  gigButton: { flexDirection: 'row', backgroundColor: Colors.primary || '#8b5cf6', paddingVertical: 16, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 25, shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  gigButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: 15 },
  sectionTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  editBtn: { padding: 8, backgroundColor: 'rgba(139, 92, 246, 0.15)', borderRadius: 20 },
  
  bioText: { color: '#d4d4d8', fontSize: 14, lineHeight: 22, width: '100%', textAlign: 'left' },
  
  dashedAddBtn: { borderStyle: 'dashed', borderWidth: 1, borderColor: Colors.surfaceHighlight || '#3f3f46', padding: 15, borderRadius: 12, alignItems: 'center', width: '100%' },
  dashedAddBtnText: { color: Colors.textMuted || '#a1a1aa', fontWeight: '600' },
  
  editSectionContainer: { width: '100%' },
  textInputArea: { color: 'white', fontSize: 14, minHeight: 100, textAlignVertical: 'top', backgroundColor: '#000', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46', width: '100%' },
  editActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 15 },
  cancelBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, backgroundColor: Colors.surfaceHighlight || '#27272a' },
  cancelBtnText: { color: 'white', fontWeight: '600' },
  saveBtn: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 8, backgroundColor: Colors.primary || '#8b5cf6' },
  saveBtnText: { color: 'white', fontWeight: 'bold' },

  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  skillPill: { backgroundColor: 'rgba(139, 92, 246, 0.15)', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(139, 92, 246, 0.5)' },
  skillPillEdit: { backgroundColor: 'rgba(139, 92, 246, 0.25)', paddingVertical: 8, paddingLeft: 14, paddingRight: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.primary, flexDirection: 'row', alignItems: 'center' },
  skillPillText: { color: '#d8b4fe', fontWeight: '600', fontSize: 14 },
  
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46', marginTop: 15, width: '100%' },
  dropdownTriggerText: { color: Colors.textMuted, fontSize: 14 },

  serviceCard: { backgroundColor: '#18181b', padding: 16, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: '#27272a', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceTitle: { color: 'white', fontWeight: 'bold', fontSize: 16, marginBottom: 8 },
  servicePriceRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  servicePrice: { color: '#4ade80', fontSize: 14, fontWeight: 'bold' },
  serviceBadge: { backgroundColor: 'rgba(74, 222, 128, 0.15)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  serviceBadgeText: { color: '#4ade80', fontSize: 12, fontWeight: 'bold' },
  
  serviceActions: { flexDirection: 'row', gap: 8, marginLeft: 15 },
  serviceActionBtn: { backgroundColor: '#27272a', padding: 10, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  deleteBtn: { backgroundColor: 'rgba(239, 68, 68, 0.15)' },

  emptyServicesContainer: { backgroundColor: '#18181b', padding: 25, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderWidth: 1, borderColor: '#27272a', borderStyle: 'dashed' },
  emptyServicesText: { color: Colors.textMuted, fontSize: 14, textAlign: 'center' },

  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.surface, padding: 15, borderRadius: 12, marginBottom: 10 },
  activityTextContainer: { marginLeft: 15, flex: 1 },
  activityTitle: { color: 'white', fontWeight: 'bold', marginBottom: 2 },
  activitySubtitle: { color: Colors.textMuted, fontSize: 12 },
  activityStatus: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold' },

  restrictedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: Colors.surface, justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: Colors.surfaceHighlight },
  restrictedHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  restrictedSub: { color: Colors.textMuted, fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 22 },
});