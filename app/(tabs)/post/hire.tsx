import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image } from 'react-native';
import { Camera, ChevronDown, Map as MapIcon, MapPinnedIcon, MapPin, InfoIcon, X } from 'lucide-react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../../lib/supabase';
import { currencySymbol } from '../_layout';
import { styles } from './post';
import { useLocationManager } from '@/app/hooks/locationManager';
import Switch from '@/app/components/switch';
import { MapPickerModal } from '@/app/components/mapPickerModal';
import { LocationDropdownModal } from '@/app/components/locationDropdownModal';
import NegotiableInfoModal from '@/app/components/negotiableInfoModal';

export function HireTab() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduleType, setScheduleType] = useState('Microjob');
    const [payAmount, setPayAmount] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [peopleNeeded, setPeopleNeeded] = useState('1');
    const [workMode, setWorkMode] = useState('Online');
    
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');
    
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isMapModalOpen, setIsMapModalOpen] = useState(false);
    const [isInfoModalOpen, setIsInfoModalOpen] = useState(false);

    const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });

    const locManager = useLocationManager();

    const pickMedia = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'], 
            allowsEditing: true,
            quality: 0.7, 
        });

        if (!result.canceled) {
            setMedia(result.assets[0]);
        }
    };

    const uploadMedia = async (uri: string, mimeType: string | null | undefined) => {
    try {
            const isVideo = mimeType === 'video';
            const ext = isVideo ? 'mp4' : 'jpg';
            const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

            const response = await fetch(uri);
            const blob = await response.blob();

            const { error } = await supabase.storage
                .from('job-media') 
                .upload(fileName, blob, { contentType });

            if (error) throw error;

            const { data: publicUrlData } = supabase.storage
                .from('job-media')
                .getPublicUrl(fileName);

            return publicUrlData.publicUrl;
        } catch (error) {
            console.error("Upload error:", error);
            return null;
        }
    };

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

    const handlePostJob = async () => {
        if (!title || !payAmount || !description || (!locManager.selectedLocId && !locManager.gpsData)) {
            Alert.alert("Missing Info", "Please fill out all required fields and set a location.");
            return;
        }

        setIsSubmitting(true);
        setUploadStatus('Saving location...');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { Alert.alert("Error", "You must be logged in."); setIsSubmitting(false); return; }

        let finalLocationId = locManager.selectedLocId;

        if (locManager.gpsData) {
            const { data: newLoc, error: locError } = await supabase.from('locations')
                .insert([{ 
                    city_name: locManager.gpsData.city_name, 
                    country_code: locManager.gpsData.country_code, 
                    latitude: locManager.gpsData.latitude, 
                    longitude: locManager.gpsData.longitude 
                }]).select('id').single();

            if (locError) { 
                Alert.alert("Supabase Error", locError.message); 
                console.log("DB ERROR:", locError);
                setIsSubmitting(false); 
                return; 
            }
            if (!newLoc) {
                Alert.alert("Location Error", "Location saved, but database didn't return an ID.");
                setIsSubmitting(false);
                return;
            }
            finalLocationId = newLoc.id;
        }

        let finalThumbnailUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80"; // Fallback
        let finalVideoUrl = null;

        if (media) {
            setUploadStatus('Uploading media...');
            const uploadedUrl = await uploadMedia(media.uri, media.type);
            
            if (uploadedUrl) {
                if (media.type === 'video') {
                    finalVideoUrl = uploadedUrl;
                } else {
                    finalThumbnailUrl = uploadedUrl;
                }
            } else {
                Alert.alert("Upload Failed", "Could not upload your media. Proceeding with placeholder.");
            }
        }

        setUploadStatus('Posting job...');

        const cleanPay = parseFloat(payAmount.replace(/[^0-9.]/g, ''));
        const { error: jobError } = await supabase.from('job_postings').insert([{
            employer_id: user.id, 
            title, 
            description,
            work_mode: workMode.toLowerCase(),
            schedule_type: scheduleType.toLowerCase(),
            pay_amount: isNaN(cleanPay) ? 0 : cleanPay,
            pay_currency: currencySymbol(),
            is_negotiable: isNegotiable, 
            people_needed: parseInt(peopleNeeded) || 1, 
            is_sponsored: false, 
            active: true, 
            thumbnail_url: finalThumbnailUrl,
            video_url: finalVideoUrl,
            job_location_id: finalLocationId 
        }]);

        setIsSubmitting(false);
        setUploadStatus('');

        if (jobError) Alert.alert("Database Error", jobError.message);
        else {
            Alert.alert("Success!", "Your job has been posted.");
            setTitle(''); setPayAmount(''); setDescription(''); setMedia(null);
            locManager.setSelectedLocId(null); locManager.setGpsData(null);
        }
    };

    return (
        <View style={styles.formSection}>            
            {media ? (
                <View style={[styles.uploadBox, { overflow: 'hidden', padding: 0, borderWidth: 0 }]}>
                    <Image source={{ uri: media.uri }} style={{ width: '100%', height: '100%' }} />
                    <TouchableOpacity 
                        style={{ position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 15 }}
                        onPress={() => setMedia(null)}
                    >
                        <X size={20} color="white" />
                    </TouchableOpacity>
                    {media.type === 'video' && (
                        <View style={{ position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 }}>
                            <Text style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>Video</Text>
                        </View>
                    )}
                </View>
            ) : (
                <TouchableOpacity style={styles.uploadBox} onPress={pickMedia}>
                    <Camera size={40} color="#71717a" />
                    <Text style={styles.uploadText}>Upload a Video or Image</Text>
                </TouchableOpacity>
            )}

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
                visible={isMapModalOpen} 
                region={mapRegion} 
                onRegionChange={setMapRegion} 
                onClose={() => setIsMapModalOpen(false)} 
                onConfirm={confirmMapLocation} 
            />

            <LocationDropdownModal 
                visible={isDropdownOpen} 
                locations={locManager.locations} 
                selectedId={locManager.selectedLocId} 
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

            <NegotiableInfoModal 
                isVisible={isInfoModalOpen} 
                onClose={() => setIsInfoModalOpen(false)} 
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
    toggleTrack: { width: 50, height: 28, borderRadius: 15, padding: 1.5, borderWidth: 1 },
    toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 3 },
    Switch: { alignSelf: 'flex-end', marginLeft: 'auto' }
});