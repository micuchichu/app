import React, { useRef, useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, TouchableOpacity, 
  ScrollView, Dimensions, Platform, KeyboardAvoidingView, ActivityIndicator,
  TextInput, Modal
} from 'react-native';
import { Lock, ChevronDown, Map as MapIcon, MapPinnedIcon, MapPin, InfoIcon } from 'lucide-react-native';
import * as Location from 'expo-location';

import { supabase } from '@/app/lib/supabase';
import { useLocationManager } from '@/app/hooks/locationManager';
import { useJobSubmit } from '@/app/hooks/jobSubmit';
import Switch from '@/app/components/switch';
import { MapPickerModal } from '@/app/components/mapPickerModal';
import { LocationDropdownModal } from '@/app/components/locationDropdownModal';
import InfoModal from '@/app/components/infoModal';
import { MediaPickerBox } from '@/app/components/mediaPickerBox';
import { getDefaultCurrency, Currency } from '@/app/hooks/utils';

const screenWidth = Dimensions.get('window').width;
const contentWidth = screenWidth - 40;

export default function PostScreen() {  
  const [isGuest, setIsGuest] = useState(false);
  const [loadingAuth, setLoadingAuth] = useState(true);

  const locManager = useLocationManager();
  
  const {
      title, setTitle, description, setDescription, scheduleType, setScheduleType,
      payAmount, setPayAmount, isNegotiable, setIsNegotiable, media, setMedia,
      isSubmitting, uploadStatus, handlePostJob
  } = useJobSubmit(locManager);
  
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });

  const [selectedCurrency, setSelectedCurrency] = useState(getDefaultCurrency());
  const [isCurrencyDropdownOpen, setIsCurrencyDropdownOpen] = useState(false);
  
  const [dbCurrencies, setDbCurrencies] = useState<Currency[]>([]);

  useEffect(() => {
      const fetchCurrencies = async () => {
          const { data, error } = await supabase
              .from('currencies')
              .select('currency_text, currency_icon')
              .order('currency_text');
          
          if (data && !error) {
              setDbCurrencies(data.map(c => ({ code: c.currency_text, symbol: c.currency_icon })));
          }
      };

      fetchCurrencies();
  }, []);

  const uniqueCurrencies = Array.from(new Set([getDefaultCurrency(), ...dbCurrencies]));

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
          <ScrollView>
            <View style={{ width: contentWidth - 10, marginRight: 5, marginLeft: 5 }}>
                  <View style={styles.formSection}>            
                      <MediaPickerBox media={media} onMediaChange={setMedia} />
          
                      <Text style={styles.inputLabel}>Job Title</Text>
                      <TextInput style={styles.formInput} placeholder="e.g. Fix 3 Flat Tires" placeholderTextColor="#71717a" value={title} onChangeText={setTitle} />
          
                      <Text style={styles.inputLabel}>Job Description</Text>
                      <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="What needs to be done?" placeholderTextColor="#71717a" multiline value={description} onChangeText={setDescription} />
          
                      <Text style={styles.inputLabel}>Location</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                          <TouchableOpacity 
                            style={[styles.formInput, { flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderColor: locManager.gpsData ? '#4ade80' : '#27272a' }]} 
                            onPress={() => setIsDropdownOpen(true)}
                            disabled={locManager.isLoadingLocations || locManager.isGettingLocation}
                          >
                            {locManager.isLoadingLocations || locManager.isGettingLocation ? (
                               <ActivityIndicator size="small" color="#71717a" />
                            ) : (
                               <>
                                  <Text style={{ color: (locManager.selectedLocId || locManager.gpsData) ? 'white' : '#71717a', fontSize: 16 }}>{locManager.getDisplayLocationName()}</Text>
                                  {locManager.gpsData ? <MapPin size={20} color="#4ade80" /> : <ChevronDown size={20} color="#71717a" />}
                               </>
                            )}
                          </TouchableOpacity>
          
                          <TouchableOpacity style={styles.iconButton} onPress={openMapPicker}>
                              <MapIcon size={22} color="#8b5cf6" />
                          </TouchableOpacity>
          
                          <TouchableOpacity style={styles.iconButton} onPress={locManager.handleInstantGPS}>
                              <MapPinnedIcon size={22} color="#8b5cf6" />
                          </TouchableOpacity>
                      </View>
          
                      <MapPickerModal 
                          visible={isMapModalOpen} region={mapRegion} onRegionChange={setMapRegion} 
                          onClose={() => setIsMapModalOpen(false)} onConfirm={confirmMapLocation} 
                      />
          
                      <LocationDropdownModal 
                          visible={isDropdownOpen} locations={locManager.locations} selectedId={locManager.selectedLocId} 
                          onSelect={(id : number) => { locManager.setSelectedLocId(id); locManager.setGpsData(null); setIsDropdownOpen(false); }} 
                          onClose={() => setIsDropdownOpen(false)} 
                      />
          
                      <Text style={styles.inputLabel}>Job Type</Text>
                      <View style={styles.pillContainer}>
                        {['Microjob', 'Part-time', 'Full-time'].map((type) => (
                          <TouchableOpacity key={type} style={[styles.pill, scheduleType === type && styles.pillActive]} onPress={() => setScheduleType(type)}>
                            <Text style={[styles.pillText, scheduleType === type && styles.pillTextActive]}>{type}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
          
                      <View style={styles.switchRow}>
                        <Text style={styles.inputLabel}>Negotiable</Text>
                        <InfoIcon size={18} color="#71717a" onPress={() => setIsInfoModalOpen(true)} />
                        <View style={{ flex: 1 }} />
                        <Switch isEnabled={isNegotiable} toggleSwitch={() => setIsNegotiable(!isNegotiable)} />
                      </View>
          
                      <InfoModal
                          isVisible={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} 
                          title="What does 'Negotiable' mean?"
                          description="Marking a job as 'Negotiable' means that the pay is flexible and can be discussed between the poster and potential workers. This can help attract more applicants who may be interested in the job but want to negotiate the price based on their skills and experience."
                      />
          
                      <Text style={styles.inputLabel}>{isNegotiable ? "Proposed budget" : "Fixed Pay Amount"}</Text>
                      
                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                          <TextInput 
                            style={[styles.formInput, { flex: 1, marginBottom: 0 }]} 
                            placeholder="e.g. 25.00" 
                            placeholderTextColor="#71717a" 
                            keyboardType="numeric" 
                            value={payAmount} 
                            onChangeText={setPayAmount} 
                          />
          
                          <TouchableOpacity 
                            style={[styles.formInput, { width: 100, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 0 }]}
                            onPress={() => setIsCurrencyDropdownOpen(true)}
                          >
                            <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>{selectedCurrency.symbol}</Text>
                            <ChevronDown size={20} color="#71717a" />
                          </TouchableOpacity>
                      </View>
          
                      <Modal visible={isCurrencyDropdownOpen} transparent={true} animationType="fade">
                        <TouchableOpacity 
                          style={styles.modalOverlay} 
                          activeOpacity={1} 
                          onPress={() => setIsCurrencyDropdownOpen(false)}
                        >
                          <View style={styles.currencyDropdownMenu}>
                            {uniqueCurrencies.map((currency) => (
                              <TouchableOpacity 
                                key={currency.code} 
                                style={[
                                  styles.currencyOption, 
                                  selectedCurrency === currency && { backgroundColor: '#27272a' }
                                ]} 
                                onPress={() => { 
                                  setSelectedCurrency(currency); 
                                  setIsCurrencyDropdownOpen(false); 
                                }}
                              >
                                <Text style={[
                                  styles.currencyOptionText, 
                                  selectedCurrency === currency && { color: '#8b5cf6', fontWeight: 'bold' }
                                ]}>
                                  {currency.code} {currency.symbol}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>
                        </TouchableOpacity>
                      </Modal>
          
                      <TouchableOpacity style={styles.primaryButton} onPress={() => handlePostJob(selectedCurrency.code)} disabled={isSubmitting}>
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
            </View>
          </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

export const styles = StyleSheet.create({
  screenContainer: { flex: 1, backgroundColor: 'black', paddingHorizontal: 20, paddingTop: 60 },
  screenHeader: { color: 'white', fontSize: 28, fontWeight: 'bold', marginBottom: 20 },
  
  restrictedCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  restrictedHeader: { color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 10, textAlign: 'center' },
  restrictedSub: { color: '#a1a1aa', fontSize: 16, textAlign: 'center', marginBottom: 35, lineHeight: 22 },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#18181b', borderRadius: 25, padding: 4, marginBottom: 25, borderWidth: 1, borderColor: '#27272a' },
  toggleSlider: { position: 'absolute', top: 4, bottom: 4, left: 4, right: 4, backgroundColor: '#8b5cf6', borderRadius: 21, width: '50%'},
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 21 },
  toggleBtnActive: { backgroundColor: '#8b5cf6' },
  toggleText: { color: '#a1a1aa', fontWeight: 'bold', fontSize: 14 },
  toggleTextActive: { color: 'white' },

  formSection: { flex: 1 },
  subHeader: { color: 'white', fontSize: 20, fontWeight: 'bold', marginBottom: 20 },
  uploadBox: { height: 160, backgroundColor: '#18181b', borderRadius: 15, borderWidth: 2, borderColor: '#27272a', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 25 },
  uploadText: { color: '#71717a', marginTop: 10, fontWeight: '500' },
  inputLabel: { color: '#e4e4e7', fontSize: 14, fontWeight: 'bold', marginBottom: 8, marginTop: 10 },
  formInput: { backgroundColor: '#18181b', color: 'white', padding: 15, borderRadius: 10, fontSize: 16, borderWidth: 1, borderColor: '#27272a' },
  
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 5 },
  pill: { backgroundColor: '#18181b', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 20, borderWidth: 1, borderColor: '#27272a' },
  pillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  pillText: { color: '#a1a1aa', fontWeight: '600' },
  pillTextActive: { color: 'white' },
  switchRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10},
  infoIcon: { marginLeft: 6, marginRight: '55%' },
  
  primaryButton: { backgroundColor: '#8a5cf6', color: 'black', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 30, width: '100%', alignSelf: 'center' },
  submitBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  iconButton: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 10, width: 55, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' },
  currencyDropdownMenu: { backgroundColor: '#18181b', borderRadius: 16, width: 200, borderWidth: 1, borderColor: '#27272a', overflow: 'hidden' },
  currencyOption: { paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#27272a' },
  currencyOptionText: { color: 'white', textAlign: 'center', fontSize: 16 }
});