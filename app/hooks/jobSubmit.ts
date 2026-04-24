import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../lib/supabase';
import { getDefaultCurrency } from './utils';
import { uploadMediaToSupabase } from '../lib/mediaUpload';
import { useAlert } from '@/app/components/alertContext';

export const useJobSubmit = (locManager: any) => {
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
    const { showAlert } = useAlert();

    const handlePostJob = async (selectedCurrency: string) => {
        if (!title || !payAmount || !description || (!locManager.selectedLocId && !locManager.gpsData)) {
            showAlert("Missing Info", "Please fill out all required fields and set a location.");
            return;
        }

        setIsSubmitting(true);
        setUploadStatus('Saving location...');

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { showAlert("Error", "You must be logged in."); setIsSubmitting(false); return; }

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
                showAlert("Supabase Error", locError.message); 
                setIsSubmitting(false); 
                return; 
            }
            if (!newLoc) {
                showAlert("Location Error", "Location saved, but database didn't return an ID.");
                setIsSubmitting(false);
                return;
            }
            finalLocationId = newLoc.id;
        }

        let finalThumbnailUrl: string | null = null;
        let finalVideoUrl: string | null = null;

        if (media) {
            setUploadStatus('Uploading media...');
            const uploadResult = await uploadMediaToSupabase(media.uri, media.type);
            
            if (uploadResult) {
                if (media.type === 'video') {
                    finalVideoUrl = uploadResult.mediaUrl;
                    finalThumbnailUrl = uploadResult.thumbnailUrl;
                } else {
                    finalThumbnailUrl = uploadResult.mediaUrl;
                }
            } else {
                showAlert("Upload Failed", "Could not upload your media. Please try again.");
                setIsSubmitting(false);
                return;
            }
        }

        setUploadStatus('Posting job...');

        const { data: existingEmployer, error: employerFetchError } = await supabase
            .from('employers')
            .select('id')
            .eq('id', user.id) 
            .maybeSingle();

        if (employerFetchError) {
            showAlert("Database Error", employerFetchError.message);
            setIsSubmitting(false);
            return;
        }

        let finalEmployerId = existingEmployer?.id;

        if (!existingEmployer) {
            const { data: newEmployer, error: insertError } = await supabase
                .from('employers')
                .insert([{ id: user.id, rating: 0, verified: false, active_user: true, job_postings_made: 1 }])
                .select('id')
                .single();

            if (insertError) {
                showAlert("Employer Creation Error", insertError.message);
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
            
            currency_id: selectedCurrency, 
            
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

        if (jobError) showAlert("Database Error", jobError.message);
        else {
            showAlert("Success!", "Your job has been posted.");
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