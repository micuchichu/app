import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CountryRecord {
  phone_prefix: string;
  name: string;
  code: string;
}

export function useSignupData() {
  const [dbSkills, setDbSkills] = useState<{ id: number, name: string }[]>([]);
  const [countryList, setCountryList] = useState<CountryRecord[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(true);

  useEffect(() => {
    const fetchDatabaseData = async () => {
      setIsLoadingCountries(true);
      const [skillsResponse, countriesResponse] = await Promise.all([
        supabase.from('job_categories').select('id, name').order('name'),
        supabase.from('countries').select('name, phone_prefix, code').order('name')
      ]);

      if (skillsResponse.data) setDbSkills(skillsResponse.data);
      
      if (countriesResponse.data) {
        const uniqueCountries = countriesResponse.data.reduce((acc: CountryRecord[], current) => {
          if (!acc.find(item => item.code === current.code)) return acc.concat([current]);
          return acc;
        }, []);
        setCountryList(uniqueCountries);
      }
      setIsLoadingCountries(false);
    };

    fetchDatabaseData();
  }, []);

  return { dbSkills, countryList, isLoadingCountries };
}