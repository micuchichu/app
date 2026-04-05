import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Switch, Alert, ActivityIndicator } from 'react-native';
import { Camera } from 'lucide-react-native';
import { styles } from './post';
import { currencySymbol } from '../_layout';
import { supabase } from '../../lib/supabase';

export function HireTab() {
    const [title, setTitle] = useState('');
    const [jobType, setJobType] = useState('Microjob');
    const [isNegotiable, setIsNegotiable] = useState(true);
    const [payAmount, setPayAmount] = useState('');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handlePostJob = async () => {
        if (!title || !payAmount || !description || !location) {
            Alert.alert("Missing Info", "Please fill out all fields.");
            return;
        }

        setIsSubmitting(true);

        const { error } = await supabase.from('jobs').insert([
            {
                employer: "Demo Employer",
                title: title,
                type: jobType,
                payAmount: `${isNegotiable ? 'Max ' : ''}${payAmount}${currencySymbol()}`,
                negotiable: isNegotiable,
                location: location,
                description: description,
                image: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=800&q=80",
                viewCount: 0
            }
        ]);

        setIsSubmitting(false);

        if (error) {
            Alert.alert("Error", error.message);
        } else {
            Alert.alert("Success!", "Your job has been posted.");

            setTitle('');
            setPayAmount('');
            setDescription('');
            setLocation('');
        }
    };

    return (
        <View style={styles.formSection}>
            <Text style={styles.subHeader}>Post a Job</Text>
            
            <TouchableOpacity style={styles.uploadBox}>
              <Camera size={40} color="#71717a" />
              <Text style={styles.uploadText}>Upload 30s Pitch Video or Image</Text>
            </TouchableOpacity>

            <Text style={styles.inputLabel}>Job Title</Text>
            <TextInput style={styles.formInput} placeholder="e.g. Fix 3 Flat Tires" placeholderTextColor="#71717a" value={title} onChangeText={setTitle} />

            <Text style={styles.inputLabel}>Location</Text>
            <TextInput style={styles.formInput} placeholder="e.g. Chicago, IL or Remote" placeholderTextColor="#71717a" value={location} onChangeText={setLocation} />

            <Text style={styles.inputLabel}>Job Description</Text>
            <TextInput style={[styles.formInput, { height: 80, textAlignVertical: 'top' }]} placeholder="What needs to be done?" placeholderTextColor="#71717a" multiline value={description} onChangeText={setDescription} />

            <Text style={styles.inputLabel}>Job Type</Text>
            <View style={styles.pillContainer}>
              {['Microjob', 'Part-time', 'Full-time'].map((type) => (
                <TouchableOpacity key={type} style={[styles.pill, jobType === type && styles.pillActive]} onPress={() => setJobType(type)}>
                  <Text style={[styles.pillText, jobType === type && styles.pillTextActive]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.inputLabel}>Negotiable Pay (Bidding)</Text>
              <Switch value={isNegotiable} onValueChange={setIsNegotiable} trackColor={{ false: "#3f3f46", true: "#8b5cf6" }} />
            </View>

            <Text style={styles.inputLabel}>{isNegotiable ? "Maximum Budget" : "Fixed Pay Amount"}</Text>
            <TextInput style={styles.formInput} placeholder={`e.g. 25.00`} placeholderTextColor="#71717a" keyboardType="numeric" value={payAmount} onChangeText={setPayAmount} />

            <TouchableOpacity style={styles.primaryButton} onPress={handlePostJob} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color="white" /> : <Text style={styles.submitBtnText}>Post Job</Text>}
            </TouchableOpacity>
        </View>
    );
}