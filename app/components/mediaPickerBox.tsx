import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Camera, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';

import { styles } from '@/app/(tabs)/post'; 

interface MediaPickerBoxProps {
    media: ImagePicker.ImagePickerAsset | null;
    onMediaChange: (media: ImagePicker.ImagePickerAsset | null) => void;
}

export const MediaPickerBox = ({ media, onMediaChange }: MediaPickerBoxProps) => {
    const pickMedia = async () => {
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images', 'videos'], 
            allowsEditing: true,
            quality: 0.7, 
        });

        if (!result.canceled) {
            onMediaChange(result.assets[0]);
        }
    };

    if (media) {
        return (
            <View style={[styles.uploadBox, { overflow: 'hidden', padding: 0, borderWidth: 0 }]}>
                <Image source={{ uri: media.uri }} style={{ width: '100%', height: '100%' }} />
                
                <TouchableOpacity 
                    style={localStyles.clearBtn}
                    onPress={() => onMediaChange(null)}
                >
                    <X size={20} color="white" />
                </TouchableOpacity>

                {media.type === 'video' && (
                    <View style={localStyles.videoBadge}>
                        <Text style={localStyles.videoText}>Video</Text>
                    </View>
                )}
            </View>
        );
    }

    return (
        <TouchableOpacity style={styles.uploadBox} onPress={pickMedia}>
            <Camera size={40} color="#71717a" />
            <Text style={styles.uploadText}>Upload a Video or Image</Text>
        </TouchableOpacity>
    );
};

const localStyles = StyleSheet.create({
    clearBtn: { position: 'absolute', top: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.6)', padding: 6, borderRadius: 15 },
    videoBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.6)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    videoText: { color: 'white', fontSize: 12, fontWeight: 'bold' }
});