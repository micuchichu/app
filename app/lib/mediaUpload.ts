import { readAsStringAsync } from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import * as VideoThumbnails from 'expo-video-thumbnails';
import { supabase } from './supabase';

export const uploadMediaToSupabase = async (uri: string, mimeType: string | null | undefined) => {
    try {
        const isVideo = mimeType === 'video' || mimeType?.includes('video');
        const ext = isVideo ? 'mp4' : 'jpg';
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
        const contentType = isVideo ? 'video/mp4' : 'image/jpeg';

        const base64 = await readAsStringAsync(uri, { encoding: 'base64' });

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

        const mediaUrl = publicUrlData.publicUrl;
        let thumbnailUrl = mediaUrl;

        if (isVideo) {
            const thumbFileName = `thumb-${fileName}.jpg`;
            
            const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(uri, {
                time: 0, 
            });

            const thumbBase64 = await readAsStringAsync(thumbUri, { encoding: 'base64' });

            const { error: thumbError } = await supabase.storage
                .from('job-media')
                .upload(thumbFileName, decode(thumbBase64), { 
                    contentType: 'image/jpeg', 
                    upsert: false 
                });

            if (!thumbError) {
                const { data: thumbUrlData } = supabase.storage
                    .from('job-media')
                    .getPublicUrl(thumbFileName);
                thumbnailUrl = thumbUrlData.publicUrl;
            }
        }

        return {
            mediaUrl,
            thumbnailUrl
        };

    } catch (error) {
        console.error("Upload error:", error);
        return null;
    }
};