import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, TextInput, TouchableOpacity, 
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator, ScrollView
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';

import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { supabase } from './lib//supabase';
import { router } from 'expo-router';

const TOTAL_STEPS = 4;

// Pre-defined skills for the user to pick from
const AVAILABLE_SKILLS = [
  'React Native', 'UI/UX Design', 'Backend Dev', 'Marketing', 
  'Mechanic', 'Graphic Design', 'Data Entry', 'Copywriting', 
  'Video Editing', 'Sales', 'Customer Support', 'Landscaping'
];

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [age, setAge] = useState('');
  const [currentJob, setCurrentJob] = useState('');
  
  // NEW: Store selected tags in an array
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  // --- NEW: Strict Step-by-Step Validation ---
  const validateCurrentStep = () => {
    if (step === 1) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return false;
      }
      if (password.length < 6) {
        Alert.alert("Weak Password", "Supabase requires passwords to be at least 6 characters.");
        return false;
      }
    }
    
    if (step === 2) {
      const ageNum = parseInt(age);
      if (isNaN(ageNum) || ageNum < 16) {
        Alert.alert("Age Restriction", "You must be 16 or older to use this platform.");
        return false;
      }
      if (ageNum > 120) {
        Alert.alert("Really?", "Please enter a valid age.");
        return false;
      }
    }
    
    if (step === 3) {
      if (currentJob.trim().length === 0) {
        Alert.alert("Required", "Please tell us your current job or status (e.g., Student).");
        return false;
      }
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (step < TOTAL_STEPS) setStep(step + 1);
    }
  };

  const handlePrev = () => {
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const toggleTag = (skill: string) => {
    if (selectedTags.includes(skill)) {
      setSelectedTags(selectedTags.filter(t => t !== skill));
    } else {
      if (selectedTags.length >= 5) {
        Alert.alert("Limit Reached", "You can only select up to 5 core skills.");
        return;
      }
      setSelectedTags([...selectedTags, skill]);
    }
  };

  const handleCreateAccount = async () => {
    if (selectedTags.length === 0) {
      return Alert.alert("Required", "Please select at least one skill.");
    }
    
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          age: parseInt(age),
          current_job: currentJob,
          skills: selectedTags
        }
      }
    });

    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Welcome!', 'Your account has been created.');
      router.replace('/(tabs)/profile');
    }
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <>
            <Text style={styles.questionText}>Let's start with the basics.</Text>
            <Text style={styles.subQuestionText}>What email and password will you use to log in?</Text>
            <TextInput style={styles.input} placeholder="Email address" placeholderTextColor="#71717a" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoFocus />
            <TextInput style={[styles.input, { marginTop: 15 }]} placeholder="Create a password (min 6 chars)" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} secureTextEntry />
          </>
        );
      case 2:
        return (
          <>
            <Text style={styles.questionText}>How old are you?</Text>
            <Text style={styles.subQuestionText}>You must be at least 18 to bid on jobs.</Text>
            <TextInput style={styles.input} placeholder="e.g. 24" placeholderTextColor="#71717a" value={age} onChangeText={setAge} keyboardType="numeric" autoFocus />
          </>
        );
      case 3:
        return (
          <>
            <Text style={styles.questionText}>What is your current job?</Text>
            <Text style={styles.subQuestionText}>This helps us tailor the feed to your skills.</Text>
            <TextInput style={styles.input} placeholder="e.g. Software Engineer, Student, Barista" placeholderTextColor="#71717a" value={currentJob} onChangeText={setCurrentJob} autoFocus />
          </>
        );
      case 4:
        return (
          <>
            <Text style={styles.questionText}>What are you great at?</Text>
            <Text style={styles.subQuestionText}>Select up to 5 core skills.</Text>
            
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <View style={styles.pillContainer}>
                {AVAILABLE_SKILLS.map((skill) => {
                  const isActive = selectedTags.includes(skill);
                  return (
                    <TouchableOpacity 
                      key={skill} 
                      style={[styles.pill, isActive && styles.pillActive]}
                      onPress={() => toggleTag(skill)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.pillText, isActive && styles.pillTextActive]}>{skill}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        <View style={styles.contentContainer}>
          {renderStepContent()}
        </View>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePrev}>
            <ArrowLeft size={24} color="white" />
          </TouchableOpacity>

          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text>
              <ArrowRight size={20} color="white" style={{marginLeft: 8}} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#10b981' }]} onPress={handleCreateAccount} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : (
                <>
                  <Text style={styles.nextButtonText}>Create Account</Text>
                  <Check size={20} color="white" style={{marginLeft: 8}} />
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  keyboardView: { flex: 1, justifyContent: 'space-between' },
  
  progressContainer: { height: 4, backgroundColor: '#27272a', width: '100%', marginTop: Platform.OS === 'android' ? 40 : 10 },
  progressBar: { height: '100%', backgroundColor: '#8b5cf6' },
  
  contentContainer: { flex: 1, padding: 25, justifyContent: 'center' },
  questionText: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 10, lineHeight: 40 },
  subQuestionText: { color: '#a1a1aa', fontSize: 16, marginBottom: 30 },
  input: { backgroundColor: '#18181b', color: 'white', padding: 20, borderRadius: 15, fontSize: 20, borderWidth: 1, borderColor: '#27272a', fontWeight: '500' },
  
  // NEW PILL STYLES
  pillContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  pill: { backgroundColor: '#18181b', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 25, borderWidth: 1, borderColor: '#27272a' },
  pillActive: { backgroundColor: '#8b5cf6', borderColor: '#8b5cf6' },
  pillText: { color: '#a1a1aa', fontWeight: '600', fontSize: 16 },
  pillTextActive: { color: 'white' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: Platform.OS === 'ios' ? 10 : 30, borderTopWidth: 1, borderTopColor: '#27272a', backgroundColor: '#09090b' },
  iconButton: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  nextButton: { flex: 1, flexDirection: 'row', backgroundColor: '#8b5cf6', height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  nextButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});