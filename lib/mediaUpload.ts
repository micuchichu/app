import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { supabase } from './supabase';

export const uploadMediaToSupabase = async (uri: string, mimeType: string | null | undefined) => {
    try {
        const isVideo = mimeType === 'video';
        const ext = isVideo ? 'mp4' : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

        const base64 = await readAsStringAsync(uri, {
            encoding: 'base64', 
        });

        const { error } = await supabase.storage
            .from('job-media') 
            .upload(fileName, decode(base64), { 
                contentType,
                upsert: false 
            });

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