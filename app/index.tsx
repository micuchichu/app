// app/index.tsx
import { Redirect } from 'expo-router';

export default function Index() {
  // This physically forces the app to open the login screen first.
  // Don't worry, if _layout.tsx sees they are actually logged in, 
  // it will instantly intercept this and send them to the Feed instead!
  return <Redirect href="./_layout" />;
}