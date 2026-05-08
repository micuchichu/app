import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';

import { useAlert } from '@/components/alertContext';
import { JobCategory } from '@/components/categorySelectModal';
import { uploadMediaToSupabase } from '../lib/mediaUpload';
import { supabase } from '../lib/supabase';

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

    const handlePostJob = async (selectedCurrencyCode: string, categories: JobCategory[] = []) => {
        if (!title || !payAmount || !description || (!locManager.selectedLocId && !locManager.gpsData)) {
            showAlert("Missing Info", "Please fill out all required fields and set a location.");
            return;
        }

        setIsSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { showAlert("Error", "You must be logged in."); setIsSubmitting(false); return; }

        setUploadStatus('Verifying currency...');
        
        const { data: currencyData, error: currencyError } = await supabase
            .from('currencies')
            .select('currency_id') 
            .ilike('currency_text', selectedCurrencyCode.trim()) 
            .limit(1)
            .maybeSingle(); 

        if (currencyError || !currencyData) {
            showAlert("Currency Error", `Database Error: ${currencyError?.message || 'Currency not found'}`);
            setIsSubmitting(false);
            return;
        }
        
        const finalCurrencyId = currencyData.currency_id;

        setUploadStatus('Saving location...');
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

        if (!existingEmployer) {
            const { error: insertError } = await supabase
                .from('employers')
                .insert([{ id: user.id, rating: 0, verified: false, active_user: true, job_postings_made: 1 }]);

            if (insertError) {
                showAlert("Employer Creation Error", insertError.message);
                setIsSubmitting(false);
                return;
            }
        }

        const cleanPay = parseFloat(payAmount.replace(/[^0-9.]/g, ''));
        
        const { data: newJob, error: jobError } = await supabase.from('job_postings').insert([{
            employer_id: user.id, 
            title, 
            description,
            work_mode: workMode.toLowerCase(),
            schedule_type: scheduleType.toLowerCase(), 
            pay_amount: isNaN(cleanPay) ? 0 : cleanPay,
            currency_id: finalCurrencyId,
            is_negotiable: isNegotiable, 
            people_needed: parseInt(peopleNeeded) || 1, 
            is_sponsored: false, 
            active: true, 
            thumbnail_url: finalThumbnailUrl,
            video_url: finalVideoUrl,
            job_location_id: finalLocationId 
        }]).select('*').single();

        if (jobError) {
            showAlert("Database Error", jobError.message);
            setIsSubmitting(false);
            setUploadStatus('');
            return;
        }

        const returnedJob = newJob as any;
        const insertedJobId = returnedJob?.job_id || returnedJob?.id || returnedJob?.posting_id;

        if (categories.length > 0 && insertedJobId) {
            setUploadStatus('Saving tags...');
            
            const categoryInserts = categories.map((cat) => ({
                job_id: insertedJobId, 
                category_id: cat.id
            }));

            const { error: categoryError } = await supabase
                .from('job_postings_categories')
                .insert(categoryInserts);

            if (categoryError) {
                console.error("Failed to save categories: ", categoryError);
            }
        }

        setIsSubmitting(false);
        setUploadStatus('');
        showAlert("Success!", "Your job has been posted.");
        
        setTitle(''); 
        setPayAmount(''); 
        setDescription(''); 
        setMedia(null);
        locManager.setSelectedLocId(null); 
        locManager.setGpsData(null);
    };

    return {
        title, setTitle, description, setDescription, scheduleType, setScheduleType,
        payAmount, setPayAmount, isNegotiable, setIsNegotiable, peopleNeeded, setPeopleNeeded,
        workMode, setWorkMode, media, setMedia, isSubmitting, uploadStatus, handlePostJob
    };
};