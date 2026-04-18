import { useState } from 'react';
import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../lib/supabase'; // Adjust path if needed
import { currencySymbol } from './utils'; // Adjust path if needed
import { uploadMediaToSupabase } from '../lib/mediaUpload';

export const useJobSubmit = (locManager: any) => {
    // --- FORM STATE ---
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [scheduleType, setScheduleType] = useState('Microjob');
    const [payAmount, setPayAmount] = useState('');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [peopleNeeded, setPeopleNeeded] = useState('1');
    const [workMode, setWorkMode] = useState('Online');
    const [media, setMedia] = useState<ImagePicker.ImagePickerAsset | null>(null);

    // --- SUBMIT STATE ---
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadStatus, setUploadStatus] = useState('');

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

        // 1. Save GPS Location if needed
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

        let finalThumbnailUrl = "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80";
        let finalVideoUrl = null;

        if (media) {
            setUploadStatus('Uploading media...');
            const uploadedUrl = await uploadMediaToSupabase(media.uri, media.type);
            
            if (uploadedUrl) {
                if (media.type === 'video') finalVideoUrl = uploadedUrl;
                else finalThumbnailUrl = uploadedUrl;
            } else {
                Alert.alert("Upload Failed", "Could not upload your media. Proceeding with placeholder.");
            }
        }

        setUploadStatus('Posting job...');

        const { data: existingEmployer, error: employerFetchError } = await supabase
            .from('employers')
            .select('id')
            .eq('id', user.id) 
            .maybeSingle();

        if (employerFetchError) {
            Alert.alert("Database Error", employerFetchError.message);
            setIsSubmitting(false);
            return;
        }

        let finalEmployerId = existingEmployer?.id;

        if (!existingEmployer) {
            const { data: newEmployer, error: insertError } = await supabase
                .from('employers')
                .insert([{ id: user.id, rating: -1, verified: false, active_user: true, job_postings_made: 1 }])
                .select('id')
                .single();

            if (insertError) {
                Alert.alert("Employer Creation Error", insertError.message);
                setIsSubmitting(false);
                return;
            }
            finalEmployerId = newEmployer.id;
        }

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
            // Reset Form
            setTitle(''); setPayAmount(''); setDescription(''); setMedia(null);
            locManager.setSelectedLocId(null); locManager.setGpsData(null);
        }
    };

    return {
        title, setTitle, description, setDescription, scheduleType, setScheduleType,
        payAmount, setPayAmount, isNegotiable, setIsNegotiable, peopleNeeded, setPeopleNeeded,
        workMode, setWorkMode, media, setMedia, isSubmitting, uploadStatus, handlePostJob
    };
};