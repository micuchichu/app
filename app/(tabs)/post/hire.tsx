import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ChevronDown, Map as MapIcon, MapPinnedIcon, MapPin, InfoIcon } from 'lucide-react-native';
import * as Location from 'expo-location';

import { styles } from './post';
import { useLocationManager } from '@/app/hooks/locationManager';
import { useJobSubmit } from '@/app/hooks/jobSubmit';

import Switch from '@/app/components/switch';
import { MapPickerModal } from '@/app/components/mapPickerModal';
import { LocationDropdownModal } from '@/app/components/locationDropdownModal';
import InfoModal from '@/app/components/infoModal';
import { MediaPickerBox } from '@/app/components/mediaPickerBox';

export function HireTab() {
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

    return (
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

                <TouchableOpacity style={localStyles.iconButton} onPress={openMapPicker}>
                    <MapIcon size={22} color="#8b5cf6" />
                </TouchableOpacity>

                <TouchableOpacity style={localStyles.iconButton} onPress={locManager.handleInstantGPS}>
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
              <Switch isEnabled={isNegotiable} toggleSwitch={() => setIsNegotiable(!isNegotiable)} />
            </View>

            <InfoModal
                isVisible={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} 
                title="What does 'Negotiable' mean?"
                description="Marking a job as 'Negotiable' means that the pay is flexible and can be discussed between the poster and potential workers. This can help attract more applicants who may be interested in the job but want to negotiate the price based on their skills and experience."
            />

            <Text style={styles.inputLabel}>{isNegotiable ? "Proposed budget" : "Fixed Pay Amount"}</Text>
            <TextInput style={styles.formInput} placeholder={`e.g. 25.00`} placeholderTextColor="#71717a" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />

            <TouchableOpacity style={styles.primaryButton} onPress={handlePostJob} disabled={isSubmitting}>
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
    );
}

const localStyles = StyleSheet.create({
    iconButton: { backgroundColor: '#18181b', borderWidth: 1, borderColor: '#27272a', borderRadius: 10, width: 55, justifyContent: 'center', alignItems: 'center' },
});