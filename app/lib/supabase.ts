import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://rgbiqrhlafggkfbzedwi.supabase.co';
const supabaseAnonKey = 'sb_secret_8Kra1p9wtfuAS1BQeeZPLA_e15nC-nf';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);