import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import { supabase } from '../lib/supabase';

export interface LocationRecord {
  id: number;
  city_name: string;
  country_code: string;
}

export function useLocationManager() {
    const [locations, setLocations] = useState<LocationRecord[]>([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(true);
    const [selectedLocId, setSelectedLocId] = useState<number | null>(null);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [gpsData, setGpsData] = useState<{ city_name: string, country_code: string, latitude: number, longitude: number } | null>(null);

    useEffect(() => {
        fetchLocations();
    }, []);

    const fetchLocations = async () => {
        setIsLoadingLocations(true);
        const { data } = await supabase.from('location').select('id, city_name, country_code').order('city_name', { ascending: true });
        if (data) setLocations(data);
        setIsLoadingLocations(false);
    };

    const processCoordinates = async (lat: number, lng: number) => {
        const approxLat = parseFloat(lat.toFixed(8));
        const approxLng = parseFloat(lng.toFixed(8));
        let geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });

        if (geocode.length > 0) {
            const detectedCity = geocode[0].city || geocode[0].subregion || 'Unknown Area';
            const detectedCountry = geocode[0].isoCountryCode || 'US';
            setGpsData({ city_name: detectedCity, country_code: detectedCountry, latitude: approxLat, longitude: approxLng });
            setSelectedLocId(null); 
        } else {
            Alert.alert("Error", "Could not identify the city for this location.");
        }
    };

    const handleInstantGPS = async () => {
        setIsGettingLocation(true);
        try {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') throw new Error('Permission Denied');
            let location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
            await processCoordinates(location.coords.latitude, location.coords.longitude);
        } catch (error) {
            Alert.alert("Location Error", "Could not fetch GPS. Try using the map.");
        }
        setIsGettingLocation(false);
    };

    const getDisplayLocationName = () => {
      if (gpsData) return `${gpsData.city_name}`;
      if (selectedLocId) return locations.find(l => l.id === selectedLocId)?.city_name || "Select a location";
      return "Select a location";
    };

    return {
        locations, isLoadingLocations, selectedLocId, setSelectedLocId,
        gpsData, setGpsData, isGettingLocation, setIsGettingLocation,
        handleInstantGPS, processCoordinates, getDisplayLocationName
    };
}