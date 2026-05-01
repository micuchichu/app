import { router } from 'expo-router';
import { AsYouType, isValidPhoneNumber } from 'libphonenumber-js';
import { ArrowLeft, ArrowRight, CalendarIcon, Check, ChevronDown, MapIcon, X } from 'lucide-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { supabase } from './lib/supabase';

import { CountryPickerModal } from './components/countryPickerModal';
import { DatePickerModal } from './components/datePickerModal';
import { MapPickerModal } from './components/mapPickerModal';
import { CategorySelectModal, JobCategory } from '@/app/components/categorySelectModal';
import { useLocationManager } from './hooks/locationManager';
import { CountryRecord, useSignupData } from './hooks/signupData';
import { useAlert } from '@/app/components/alertContext';

import * as Linking from 'expo-linking';

const redirectTo = Linking.createURL('/auth/callback');

const TOTAL_STEPS = 3;

export default function SignupScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const { showAlert } = useAlert();

  const markTouched = (field: string) => setTouched(prev => ({ ...prev, [field]: true }));

  const locManager = useLocationManager();
  const { dbSkills, countryList, isLoadingCountries } = useSignupData();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState<CountryRecord | null>(null);
  const [isCountryModalOpen, setIsCountryModalOpen] = useState(false);
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [mapRegion, setMapRegion] = useState({ latitude: 37.78825, longitude: -122.4324, latitudeDelta: 0.0922, longitudeDelta: 0.0421 });
  
  const [currentJob, setCurrentJob] = useState('');
  
  const [selectedCategories, setSelectedCategories] = useState<JobCategory[]>([]);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);

  useEffect(() => {
    if (countryList.length > 0 && !selectedCountry) setSelectedCountry(countryList[0]);
  }, [countryList]);

  const isEmailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const isPasswordError = touched.password && password.length < 6;
  const isNameError = touched.fullName && fullName.trim().length < 2;
  const isDateError = touched.birthDate && !hasSelectedDate;
  const isPhoneError = touched.phoneNumber && (!selectedCountry || !isValidPhoneNumber(phoneNumber, selectedCountry.code as any));
  const isLocationError = touched.location && !locManager.gpsData && !locManager.selectedLocId;
  const isJobError = touched.currentJob && currentJob.trim().length === 0;

  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const animateTransition = (nextStep: number, direction: 'forward' | 'backward') => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: direction === 'forward' ? -50 : 50, duration: 200, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start(() => {
      setStep(nextStep);
      slideAnim.setValue(direction === 'forward' ? 50 : -50);
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 250, useNativeDriver: true }),
        Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true })
      ]).start();
    });
  };

  const getInputStyle = (hasError: boolean) => hasError ? { borderColor: '#ef4444', borderWidth: 1 } : {};

  const validateCurrentStep = () => {
    if (step === 1) {
      setTouched(prev => ({ ...prev, email: true, password: true }));
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || password.length < 6) return false;
    }
    if (step === 2) {
      setTouched(prev => ({ ...prev, fullName: true, birthDate: true, phoneNumber: true, location: true }));
      
      if (fullName.trim().length < 2 || !hasSelectedDate) return false;
      if (calculateAge(birthDate) < 16)
        return false;
      
      if (!selectedCountry || !isValidPhoneNumber(phoneNumber, selectedCountry.code as any)) return false;
      if (!locManager.gpsData && !locManager.selectedLocId) return false;
    }
    if (step === 3) {
      setTouched(prev => ({ ...prev, currentJob: true }));
      if (currentJob.trim().length === 0) return false;
      if (selectedCategories.length === 0) { showAlert("Required", "Please select at least one skill."); return false; }
    }
    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep() && step < TOTAL_STEPS) {
      animateTransition(step + 1, 'forward');
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      animateTransition(step - 1, 'backward');
    } else {
      router.back();
    }
  };

  const handleSelectCategory = (category: JobCategory) => {
    if (!selectedCategories.find(c => c.id === category.id)) {
      if (selectedCategories.length >= 5) {
        showAlert("Limit Reached", "Max 5 skills allowed.");
      } else {
        setSelectedCategories([...selectedCategories, category]);
      }
    }
    setIsCategoryModalVisible(false);
  };

  const handleRemoveCategory = (categoryId: number) => {
    setSelectedCategories(selectedCategories.filter(c => c.id !== categoryId));
  };

  const handleDateChange = (selectedDate: Date) => {
    setBirthDate(selectedDate);
    setHasSelectedDate(true);
    markTouched('birthDate');
  };

  const confirmMapLocation = async () => {
    locManager.setIsGettingLocation(true);
    setIsMapModalOpen(false);
    await locManager.processCoordinates(mapRegion.latitude, mapRegion.longitude);
    locManager.setIsGettingLocation(false);
    markTouched('location');
  };

  const handleCreateAccount = async () => {
    if (!validateCurrentStep()) return;
    setLoading(true);

    try {
      const formattedPhoneNumber = `${selectedCountry?.phone_prefix || ''} ${phoneNumber.trim()}`;

     const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      if (authError) throw authError;

      const userId = authData.user?.id;
      if (!userId) throw new Error("No user ID returned from signup.");

      let finalLocationId = locManager.selectedLocId;

      if (!finalLocationId && locManager.gpsData) {
        const { data: newLoc, error: locError } = await supabase
          .from('locations')
          .insert([{ 
            city_name: locManager.gpsData.city_name, 
            country_code: locManager.gpsData.country_code, 
            latitude: locManager.gpsData.latitude, 
            longitude: locManager.gpsData.longitude 
          }])
          .select('id')
          .single();

        if (locError) throw locError;
        finalLocationId = newLoc?.id;
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: fullName.trim(),
          age: calculateAge(birthDate), 
          email: email.trim(),
          phone_number: formattedPhoneNumber,
          profile_location_id: finalLocationId || null,
        }]);

      if (profileError) throw profileError;

      const { error: employeeError } = await supabase
        .from('employees')
        .insert([{
          id: userId,
          rating: 0,
          looking_for_job: true,
          active_user: true,
          jobs_done: 0
        }]);

      if (employeeError) throw employeeError;

      const { error: employerError } = await supabase
        .from('employers')
        .insert([{
          id: userId,
          rating: 0,
          verified: false
        }]);

      if (employerError) throw employerError;

      if (selectedCategories.length > 0) {
        const categoryInserts = selectedCategories.map(c => ({
          employee_id: userId,
          category_id: c.id
        }));

        const { error: catError } = await supabase
          .from('employee_job_categories')
          .insert(categoryInserts);
          
        if (catError) throw catError;
      }

      router.replace({ 
        pathname: '/verifyEmail', 
        params: { email: email.trim() } 
      });

    } catch (error: any) {
      console.error("Signup Error:", error);
      showAlert('Error', error.message || 'Something went wrong during signup.');
    } finally {
      setLoading(false);
    }
  };

  const calculateAge = (dob: Date) => {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  const isUnderageError = touched.birthDate && hasSelectedDate && calculateAge(birthDate) < 16;

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View style={styles.centeredContent}>
            <Text style={styles.questionText}>Let's start with the basics.</Text>
            <Text style={styles.subQuestionText}>What email and password will you use to log in?</Text>
            
            <TextInput style={[styles.input, getInputStyle(isEmailError)]} placeholder="Email address" placeholderTextColor="#71717a" value={email} onChangeText={setEmail} onBlur={() => markTouched('email')} autoCapitalize="none" keyboardType="email-address" autoFocus />
            {isEmailError && <Text style={styles.errorText}>Please enter a valid email.</Text>}
            
            <TextInput style={[styles.input, { marginTop: 15 }, getInputStyle(isPasswordError)]} placeholder="Create a password (min 6 chars)" placeholderTextColor="#71717a" value={password} onChangeText={setPassword} onBlur={() => markTouched('password')} secureTextEntry />
            {isPasswordError && <Text style={styles.errorText}>Password must be at least 6 characters.</Text>}
          </View>
        );
      case 2:
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 20 }}>
            <Text style={styles.questionText}>Tell us about yourself.</Text>
            <Text style={styles.subQuestionText}>This creates your public profile.</Text>
            
            <TextInput style={[styles.input, getInputStyle(isNameError)]} placeholder="Full Name (e.g. Jane Doe)" placeholderTextColor="#71717a" value={fullName} onChangeText={setFullName} onBlur={() => markTouched('fullName')} />
            
            <TouchableOpacity 
              style={[styles.input, { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, getInputStyle(isDateError || isUnderageError)]} 
              onPress={() => { setShowDatePicker(true); markTouched('birthDate'); }}
            >
              <Text style={{ color: hasSelectedDate ? 'white' : '#71717a', fontSize: 20 }}>
                {hasSelectedDate ? `${birthDate.getDate().toString().padStart(2, '0')}/${(birthDate.getMonth() + 1).toString().padStart(2, '0')}/${birthDate.getFullYear()}` : "Birth Date"}
              </Text>
              <CalendarIcon size={20} color={hasSelectedDate ? 'white' : '#71717a'} />
            </TouchableOpacity>
            
            {isUnderageError && <Text style={styles.errorText}>You must be at least 16 years old.</Text>}

            <DatePickerModal 
              visible={showDatePicker}
              date={birthDate}
              onClose={() => setShowDatePicker(false)}
              onChange={handleDateChange}
            />
            
            <View style={{ flexDirection: 'row', marginTop: 15, gap: 10 }}>
              <TouchableOpacity style={[styles.input, { width: 130, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15 }, getInputStyle(isPhoneError)]} onPress={() => setIsCountryModalOpen(true)}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  {selectedCountry && <Image source={{ uri: `https://flagcdn.com/w40/${selectedCountry.code.toLowerCase()}.png` }} style={{ width: 24, height: 16, borderRadius: 2 }} />}
                  <Text style={{ color: 'white', fontSize: 18, fontWeight: 'bold' }}>{selectedCountry ? selectedCountry.phone_prefix : '+1'}</Text>
                </View>
                <ChevronDown size={18} color="#71717a" />
              </TouchableOpacity>
              
              <TextInput 
                style={[styles.input, { flex: 1 }, getInputStyle(isPhoneError)]} placeholder="Phone Number" placeholderTextColor="#71717a" 
                value={phoneNumber} maxLength={19} keyboardType="phone-pad" onBlur={() => markTouched('phoneNumber')}
                onChangeText={(text) => {
                  const cleaned = text.replace(/[^0-9]/g, '');
                  const formatter = new AsYouType(selectedCountry?.code as any);
                  setPhoneNumber(formatter.input(cleaned));
                  markTouched('phoneNumber');
                }} 
              />
            </View>
            {isPhoneError && <Text style={styles.errorText}>Invalid phone number for {selectedCountry?.name}.</Text>}
            
            <TouchableOpacity style={[styles.input, { marginTop: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, getInputStyle(isLocationError)]} onPress={() => { setIsMapModalOpen(true); markTouched('location'); }}>
              <Text style={{ color: locManager.gpsData ? 'white' : '#71717a', fontSize: 20 }}>{locManager.gpsData ? locManager.gpsData.city_name : "Select Location on Map"}</Text>
              <MapIcon size={20} color="#71717a" />
            </TouchableOpacity>

            <MapPickerModal visible={isMapModalOpen} region={mapRegion} onRegionChange={setMapRegion} onClose={() => setIsMapModalOpen(false)} onConfirm={confirmMapLocation} />
            
            <CountryPickerModal 
              visible={isCountryModalOpen} 
              onClose={() => setIsCountryModalOpen(false)} 
              onSelect={setSelectedCountry} 
              countryList={countryList} 
              selectedCountryCode={selectedCountry?.code} 
              isLoading={isLoadingCountries} 
            />

          </ScrollView>
        );
      case 3:
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingBottom: 20 }}>
            <Text style={styles.questionText}>Professional Profile</Text>
            <Text style={styles.subQuestionText}>What is your current role, and what are you great at?</Text>
            
            <TextInput style={[styles.input, getInputStyle(isJobError)]} placeholder="Current Job (e.g. Software Engineer)" placeholderTextColor="#71717a" value={currentJob} onChangeText={setCurrentJob} onBlur={() => markTouched('currentJob')} />
            {isJobError && <Text style={[styles.errorText, { marginBottom: 15 }]}>Please enter your current status or job.</Text>}
            
            <Text style={[styles.subQuestionText, { marginBottom: 15, marginTop: 15 }]}>Select up to 5 core skills:</Text>
            
            <View style={styles.skillsContainer}>
              {selectedCategories.map((skill) => (
                <TouchableOpacity key={skill.id} style={styles.skillPillEdit} onPress={() => handleRemoveCategory(skill.id)}>
                  <Text style={styles.skillPillText}>{skill.name}</Text>
                  <X size={14} color="#d8b4fe" style={{ marginLeft: 6 }} />
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity 
              style={[styles.dropdownTrigger, selectedCategories.length === 0 && touched.currentJob && { borderColor: '#ef4444' }]} 
              onPress={() => setIsCategoryModalVisible(true)}
            >
              <Text style={styles.dropdownTriggerText}>Select a Category...</Text>
              <ChevronDown size={20} color="#71717a" />
            </TouchableOpacity>
          </ScrollView>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
        <View style={styles.progressContainer}>
          <View style={[styles.progressBar, { width: `${(step / TOTAL_STEPS) * 100}%` }]} />
        </View>

        <Animated.View style={[styles.contentContainer, { opacity: fadeAnim, transform: [{ translateX: slideAnim }] }]}>
          {renderStepContent()}
        </Animated.View>

        <View style={styles.bottomNav}>
          <TouchableOpacity style={styles.iconButton} onPress={handlePrev}><ArrowLeft size={24} color="white" /></TouchableOpacity>
          {step < TOTAL_STEPS ? (
            <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
              <Text style={styles.nextButtonText}>Next</Text><ArrowRight size={20} color="white" style={{marginLeft: 8}} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[styles.nextButton, { backgroundColor: '#10b981' }]} onPress={handleCreateAccount} disabled={loading}>
              {loading ? <ActivityIndicator color="white" /> : <><Text style={styles.nextButtonText}>Create Account</Text><Check size={20} color="white" style={{marginLeft: 8}} /></>}
            </TouchableOpacity>
          )}
        </View>
      </KeyboardAvoidingView>

      <CategorySelectModal
        visible={isCategoryModalVisible}
        onClose={() => setIsCategoryModalVisible(false)}
        categories={dbSkills as any}
        selectedCategories={selectedCategories}
        onSelectCategory={handleSelectCategory}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black' },
  keyboardView: { flex: 1, justifyContent: 'space-between' },
  progressContainer: { height: 4, backgroundColor: '#27272a', width: '100%', marginTop: Platform.OS === 'android' ? 40 : 10 },
  progressBar: { height: '100%', backgroundColor: '#8b5cf6' },
  contentContainer: { flex: 1, padding: 25 },
  centeredContent: { flex: 1, justifyContent: 'center' },
  questionText: { color: 'white', fontSize: 32, fontWeight: 'bold', marginBottom: 10, lineHeight: 40 },
  subQuestionText: { color: '#a1a1aa', fontSize: 16, marginBottom: 15 },
  input: { backgroundColor: '#18181b', color: 'white', padding: 20, borderRadius: 15, fontSize: 20, borderWidth: 1, borderColor: '#27272a', fontWeight: '500' },
  errorText: { color: '#ef4444', fontSize: 13, marginTop: 4, marginLeft: 4, fontWeight: '500' },
  
  skillsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, width: '100%' },
  skillPillEdit: { backgroundColor: 'rgba(139, 92, 246, 0.25)', paddingVertical: 10, paddingLeft: 16, paddingRight: 12, borderRadius: 20, borderWidth: 1, borderColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  skillPillText: { color: '#d8b4fe', fontWeight: '600', fontSize: 16 },
  dropdownTrigger: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#18181b', paddingHorizontal: 20, paddingVertical: 20, borderRadius: 15, borderWidth: 1, borderColor: '#27272a', marginTop: 5, width: '100%' },
  dropdownTriggerText: { color: '#71717a', fontSize: 20, fontWeight: '500' },

  bottomNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: Platform.OS === 'ios' ? 10 : 30, borderTopWidth: 1, borderTopColor: '#27272a', backgroundColor: '#09090b' },
  iconButton: { width: 55, height: 55, borderRadius: 27.5, backgroundColor: '#18181b', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#27272a' },
  nextButton: { flex: 1, flexDirection: 'row', backgroundColor: '#8b5cf6', height: 55, borderRadius: 27.5, justifyContent: 'center', alignItems: 'center', marginLeft: 15 },
  nextButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});