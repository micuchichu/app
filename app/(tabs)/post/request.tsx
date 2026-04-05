import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Search } from 'lucide-react-native';
import { styles } from './post';
import { supabase } from '../../lib/supabase';

export function RequestTab() {
    const [title, setTitle] = useState('');
    const [rate, setRate] = useState('');
    const [bio, setBio] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostRequest = async () => {
        if (!title || !rate || !bio) {
            Alert.alert("Missing Info", "Please fill out all fields.");
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase.from('jobs').insert([
            {
                employer: "Freelancer Profile",
                title: title,
                type: "Service Request",
                payAmount: `$${rate}/hr minimum`,
                negotiable: true,
                location: "Remote",
                description: bio,
                image: "https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=800&q=80",
                viewCount: 0
            }
        ]);

        setIsSubmitting(false);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("Success!", "Your service request is live.");
            setTitle('');
            setRate('');
            setBio('');
        }
    };

    return (
        <View style={styles.formSection}>
            <Text style={styles.subHeader}>Offer Your Services</Text>

            <TouchableOpacity style={[styles.uploadBox, { borderColor: '#4ade80' }]}>
                <Search size={40} color="#71717a" />
                <Text style={styles.uploadText}>Upload your Portfolio or Resume</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>What services are you offering?</Text>
            <TextInput style={styles.formInput} placeholder="e.g. React Native Development" placeholderTextColor="#71717a" value={title} onChangeText={setTitle} />

            <Text style={styles.inputLabel}>Your Target Hourly Rate / Minimum Bid</Text>
            <TextInput style={styles.formInput} placeholder="e.g. 25.00" placeholderTextColor="#71717a" keyboardType="numeric" value={rate} onChangeText={setRate} />

            <Text style={styles.inputLabel}>Short Bio (Why should they hire you?)</Text>
            <TextInput style={[styles.formInput, { height: 100, textAlignVertical: 'top' }]} placeholder="I have 3 years of experience building mobile apps..." placeholderTextColor="#71717a" multiline value={bio} onChangeText={setBio} />

            <TouchableOpacity style={[styles.primaryButton, { backgroundColor: '#10b981' }]} onPress={handlePostRequest} disabled={isSubmitting}>
                {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Post Request</Text>}
            </TouchableOpacity>
        </View>
    );
}