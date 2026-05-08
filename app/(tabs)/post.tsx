import * as Location from 'expo-location';
import { ChevronDown, InfoIcon, Lock, Map as MapIcon, MapPin, MapPinnedIcon, X } from 'lucide-react-native';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { CategorySelectModal, JobCategory } from '@/components/categorySelectModal';
import { CurrencyDropdownModal } from '@/components/currencyDropdownModal';
import InfoModal from '@/components/infoModal';
import { MapPickerModal } from '@/components/mapPickerModal';
import { MediaPickerBox } from '@/components/mediaPickerBox';
import Switch from '@/components/switch';
import { useJobSubmit } from '@/hooks/jobSubmit';
import { useLocationManager } from '@/hooks/locationManager';
import { Currency, getDefaultCurrency } from '@/hooks/utils';
import { supabase } from '@/lib/supabase';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 40;

export default function PostScreen() {  
  const [isGuest, setIsGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const locManager = useLocationManager();

  const {
      title, setTitle, description, setDescription, scheduleType, setScheduleType,
      workMode, setWorkMode, peopleNeeded, setPeopleNeeded, payAmount, setPayAmount,
      isNegotiable, setIsNegotiable, media, setMedia, isSubmitting, uploadStatus, handlePostJob
  } = useJobSubmit(locManager);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });

  const [infoModalData, setInfoModalData] = useState({
    visible: false,
    title: '',
    description: ''
  });

  const openInfoModal = (title: string, description: string) => {
    setInfoModalData({ visible: true, title, description });
  };

  const [selectedCurrency, setSelectedCurrency] = useState(getDefaultCurrency());
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  const [currencySearchQuery, setCurrencySearchQuery] = useState('');
  
  const [dbCurrencies, setDbCurrencies] = useState<Currency[]>([]);

  const [availableCategories, setAvailableCategories] = useState<JobCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  useEffect(() => {
      const fetchCurrencies = async () => {
          const { data, error } = await supabase
              .from('currencies')
              .select('currency_text')
              .order('currency_text');
          
          if (data && !error) {
              setDbCurrencies(data.map(c => ({ code: c.currency_text, symbol: '' })));
          }
      };

      const fetchJobCategories = async () => {
        const { data, error } = await supabase
          .from('job_categories')
          .select('id, name, parent_id')
          .order('name');
  
        if (data && !error) {
          setAvailableCategories(data);
        }
      };

      fetchCurrencies();
      fetchJobCategories();
  }, []);

  const uniqueCurrencies = Array.from(new Map([getDefaultCurrency(), ...dbCurrencies].map(item => [item.code, item])).values())
    .sort((a, b) => a.code.localeCompare(b.code));

  const filteredCurrencies = uniqueCurrencies.filter(currency => 
    currency.code.toLowerCase().includes(currencySearchQuery.toLowerCase())
  );

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.is_anonymous || !user?.email) {
        setIsGuest(true);
      }
      setLoadingAuth(false);
    };
    checkAuth();
  }, []);

  const openMapPicker = async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
          let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
          setMapRegion({ latitude: location.coords.latitude, longitude: location.coords.longitude, latitudeDelta: 0.05, longitudeDelta: 0.05 });
      }
      setIsMapModalOpen(true);
  };

  const confirmMapLocation = async () => {
      locManager.setIsGettingLocation(true);
      setIsMapModalOpen(false);
      await locManager.processCoordinates(mapRegion.latitude, mapRegion.longitude);
      locManager.setIsGettingLocation(false);
  };

  const handleSelectCategory = (category: JobCategory) => {
    if (!selectedCategories.find(c => c.id === category.id)) {
      setSelectedCategories([...selectedCategories, category]);
    }
    setIsCategoryModalVisible(false);
  };

  const handleRemoveCategory = (categoryId: number) => {
    setSelectedCategories(selectedCategories.filter(c => c.id !== categoryId));
  };

  const handleGoToLogin = async () => {
    await supabase.auth.signOut();
  };

  if (loadingAuth) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#8b5cf6" />
      </View>
    );
  }

  if (isGuest) {
    return (
      <View style={[styles.screenContainer, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 40 }]}>
        <View style={styles.restrictedCircle}>
          <Lock size={40} color="#a1a1aa" />
        </View>
        <Text style={styles.restrictedHeader}>Account Required</Text>
        <Text style={styles.restrictedSub}>You need to be logged in to create a job posting or offer your services.</Text>
        
        <TouchableOpacity style={styles.primaryButton} onPress={handleGoToLogin}>
          <Text style={styles.submitBtnText}>Log In / Sign Up</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.screenContainer}>
      <Text style={styles.screenHeader}>Post a Job</Text>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={{ width: contentWidth - 10, marginRight: 5, marginLeft: 5, paddingBottom: 40 }}>
            <View style={styles.islandContainer}>
              <MediaPickerBox media={media} onMediaChange={setMedia} />
            </View>

            <View style={styles.islandContainer}>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Job Title</Text>
              <TextInput style={styles.formInput} placeholder="e.g. Fix 3 Flat Tires" placeholderTextColor="#71717a" value={title} onChangeText={setTitle} />
              
              <View style={styles.islandDivider} />

              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Job Description</Text>
              <TextInput style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]} placeholder="What needs to be done?" placeholderTextColor="#71717a" multiline value={description} onChangeText={setDescription} />
            </View>
        
            <View style={styles.islandContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Job Schedule</Text>
                <TouchableOpacity onPress={() => openInfoModal("Job Schedule", "Microjobs are quick, one-off tasks. Part-time is regular but fewer hours. Full-time is standard 40 hours/week.")} style={styles.infoIconContainer}>
                  <InfoIcon size={18} color="#71717a" />
                </TouchableOpacity>
              </View>
              <View style={styles.pillContainer}>
                {['Microjob', 'Part-time', 'Full-time'].map((type) => (
                  <TouchableOpacity key={type} style={[styles.pill, scheduleType === type && styles.pillActive]} onPress={() => setScheduleType(type)}>
                    <Text style={[styles.pillText, scheduleType === type && styles.pillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.islandDivider} />

              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>Job Type</Text>
                <TouchableOpacity onPress={() => openInfoModal("Job Type", "Online jobs can be done from anywhere. On-site requires physical presence. Hybrid is a flexible mix of both.")} style={styles.infoIconContainer}>
                  <InfoIcon size={18} color="#71717a" />
                </TouchableOpacity>
              </View>
              <View style={[styles.pillContainer, { flex: 1, justifyContent: 'space-between' }]}>
                {['Online', 'On-site', 'Hybrid'].map((type) => (
                  <TouchableOpacity key={type} style={[styles.pill, workMode === type && styles.pillActive]} onPress={() => setWorkMode(type)}>
                    <Text style={[styles.pillText, workMode === type && styles.pillTextActive]}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.islandDivider} />

              <View style={styles.switchRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0, marginTop: 0 }]}>People Needed</Text>
                  <TouchableOpacity onPress={() => openInfoModal("People Needed", "Specify how many individuals you need to hire for this specific job posting.")} style={styles.infoIconContainer}>
                    <InfoIcon size={18} color="#71717a" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }} />
                <TextInput 
                  style={[styles.formInput, { width: 80, textAlign: 'center', paddingVertical: 10, marginBottom: 0 }]} 
                  placeholder="1" 
                  placeholderTextColor="#71717a" 
                  keyboardType="numeric" 
                  value={peopleNeeded} 
                  onChangeText={setPeopleNeeded} 
                  contextMenuHidden={true}
                />
              </View>

              <View style={styles.islandDivider} />
    
              <View style={styles.switchRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[styles.inputLabel, { marginBottom: 0, marginTop: 0 }]}>Negotiable</Text>
                  <TouchableOpacity onPress={() => openInfoModal("What does 'Negotiable' mean?", "Marking a job as 'Negotiable' means that the pay is flexible and can be discussed. This can help attract more applicants who may be interested but want to negotiate based on their skills.")} style={styles.infoIconContainer}>
                    <InfoIcon size={18} color="#71717a" />
                  </TouchableOpacity>
                </View>
                <View style={{ flex: 1 }} />
                <Switch isEnabled={isNegotiable} toggleSwitch={() => setIsNegotiable(!isNegotiable)} />
              </View>
    
              <View style={styles.islandDivider} />

              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { marginBottom: 0 }]}>{isNegotiable ? "Proposed budget" : "Fixed Pay Amount"}</Text>
                <TouchableOpacity onPress={() => openInfoModal(isNegotiable ? "Proposed Budget" : "Fixed Pay Amount", isNegotiable ? "Enter an estimated budget. You can negotiate the final price with the applicant later." : "Enter the exact flat rate you will pay upon completion of the job.")} style={styles.infoIconContainer}>
                  <InfoIcon size={18} color="#71717a" />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TextInput 
                    style={[styles.formInput, { flex: 1, marginBottom: 0 }]} 
                    placeholder="e.g. 25.00" 
                    placeholderTextColor="#71717a" 
                    keyboardType="numeric" 
                    value={payAmount} 
                    onChangeText={setPayAmount} 
                    contextMenuHidden={true}
                  />
  
                  <TouchableOpacity 
                    style={[styles.formInput, { width: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }]}
                    onPress={() => setIsCurrencyDropdownOpen(true)}
                  >
                    <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{selectedCurrency.code}</Text>
                    <ChevronDown size={20} color="#71717a" />
                  </TouchableOpacity>
              </View>
            </View>

            <View style={styles.islandContainer}>
              <Text style={[styles.inputLabel, { marginTop: 0 }]}>Location</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View 
                  style={[styles.formInput, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: locManager.gpsData ? '#4ade80' : 'transparent', borderWidth: locManager.gpsData ? 1 : 0 }]} 
                  >
                  {locManager.isLoadingLocations || locManager.isGettingLocation ? (
                      <ActivityIndicator size="small" color="#71717a" />
                  ) : (
                      <>
                        <Text style={{ color: (locManager.selectedLocId || locManager.gpsData) ? 'white' : '#71717a', fontSize: 16 }}>{locManager.getDisplayLocationName()}</Text>
                        {locManager.gpsData && <MapPin size={20} color="#4ade80" /> }
                      </>
                  )}
                </View>
  
                <TouchableOpacity style={styles.iconButton} onPress={openMapPicker}>
                    <MapIcon size={22} color="#8b5cf6" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={locManager.handleInstantGPS}>
                    <MapPinnedIcon size={22} color="#8b5cf6" />
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.islandContainer}>
              <View style={styles.labelRow}>
                <Text style={[styles.inputLabel, { marginTop: 0, marginBottom: 0 }]}>Job Tags</Text>
                <TouchableOpacity onPress={() => openInfoModal("Job Tags", "Add tags to categorize your job. This helps workers find your posting more easily.")} style={styles.infoIconContainer}>
                  <InfoIcon size={18} color="#71717a" />
                </TouchableOpacity>
              </View>

              <View style={styles.skillsContainer}>
                {selectedCategories.map((cat) => (
                  <TouchableOpacity key={cat.id} style={styles.skillPillEdit} onPress={() => handleRemoveCategory(cat.id)}>
                    <Text style={styles.skillPillText}>{cat.name}</Text>
                    <X size={14} color="#d8b4fe" style={{ marginLeft: 6 }} />
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity 
                style={styles.dropdownTrigger} 
                onPress={() => setIsCategoryModalVisible(true)}
              >
                <Text style={styles.dropdownTriggerText}>Select a Tag...</Text>
                <ChevronDown size={20} color="#71717a" />
              </TouchableOpacity>
            </View>

              <InfoModal
                  isVisible={infoModalData.visible} 
                  onClose={() => setInfoModalData(prev => ({...prev, visible: false}))} 
                  title={infoModalData.title}
                  description={infoModalData.description}
              />

              <CurrencyDropdownModal 
                visible={isCurrencyDropdownOpen} 
                onClose={() => setIsCurrencyDropdownOpen(false)}
                selectedCurrency={selectedCurrency}
                onSelectCurrency={setSelectedCurrency}
              />
        
              <MapPickerModal 
                  visible={isMapModalOpen} region={mapRegion} onRegionChange={setMapRegion} 
                  onClose={() => setIsMapModalOpen(false)} onConfirm={confirmMapLocation} 
              />

              <CategorySelectModal
                visible={isCategoryModalVisible}
                onClose={() => setIsCategoryModalVisible(false)}
                categories={availableCategories}
                selectedCategories={selectedCategories}
                onSelectCategory={handleSelectCategory}
              />

              <TouchableOpacity style={styles.primaryButton} onPress={() => handlePostJob(selectedCurrency.code, selectedCategories)} disabled={isSubmitting}>
                {isSubmitting ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <ActivityIndicator color="white" />
                    <Text style={styles.submitBtnText}>{uploadStatus}</Text>
                  </View>
                ) : (
                  <Text style={styles.submitBtnText}>Post Job</Text>
                )}
              </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: '#000000', paddingHorizontal: 20, paddingTop: 60 },
  screenHeader: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  islandContainer: { backgroundColor: '#141416', borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#27272a' },
  islandDivider: { height: 1, backgroundColor: '#27272a', marginVertical: 18, width: '100%' },

  restrictedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  restrictedHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  restrictedSub: { color: '#a1a1aa', fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 22 },

  uploadBox: { height: 160, backgroundColor: '#18181b', borderRadius: 15, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  uploadText: { color: '#71717a', marginTop: 10, fontWeight: '500' },
  
  labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  inputLabel: { color: '#e4e4e7', fontSize: 15, fontWeight: 'bold', marginBottom: 8 },
  formInput: { backgroundColor: '#27272a', color: 'white', padding: 15, borderRadius: 12, fontSize: 16 },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  pill: { backgroundColor: '#27272a', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20 },
  pillActive: { backgroundColor: '#8b5cf6' },
  pillText: { color: '#a1a1aa', fontWeight: '600' },
  pillTextActive: { color: 'white' },
  
  switchRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  infoIconContainer: { marginLeft: 8, padding: 4 },
  
  primaryButton: { backgroundColor: '#8a5cf6', color: 'black', padding: 18, borderRadius: 16, alignItems: 'center', marginTop: 10, width: '100%', alignSelf: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  iconButton: { backgroundColor: '#27272a', borderRadius: 12, width: 55, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  currencyDropdownMenu: { backgroundColor: '#18181b', borderRadius: 16, width: 220, maxHeight: 300, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden', paddingBottom: 10 },
  searchBarContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#09090b', borderRadius: 10, paddingHorizontal: 12, margin: 10, borderWidth: 1, borderColor: '#27272a' },
  searchInput: { flex: 1, color: 'white', padding: 10, fontSize: 14 },
  currencyOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  currencyOptionText: { color: 'white', textAlign: 'center', fontSize: 16 },

  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  skillPillEdit: { backgroundColor: 'rgba(139, 92, 246, 0.25)', paddingVertical: 8, paddingLeft: 14, paddingRight: 10, borderRadius: 20, borderWidth: 1, borderColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  skillPillText: { color: '#d8b4fe', fontWeight: '600', fontSize: 14 },
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#000', paddingHorizontal: 15, paddingVertical: 14, borderRadius: 8, borderWidth: 1, borderColor: '#3f3f46', marginTop: 5, width: '100%' },
  dropdownTriggerText: { color: '#a1a1aa', fontSize: 14 },
});