import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { withLayoutContext } from 'expo-router';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
import { Home, Search, PlusSquare, User, Table } from 'lucide-react-native';

const MaterialTopTabs = createMaterialTopTabNavigator();
const SwipeableTabs = withLayoutContext(MaterialTopTabs.Navigator);

export default function TabLayout() {
  return (
    <SwipeableTabs
      initialRouteName="explore"
      tabBarPosition="bottom"
      
      screenOptions={{
        swipeEnabled: true,
        
        tabBarStyle: styles.navBar,
        tabBarActiveTintColor: 'white',
        tabBarInactiveTintColor: '#71717a',
        
        tabBarIndicatorStyle: { backgroundColor: 'transparent' },
        
        tabBarShowIcon: true,
        tabBarLabelStyle: styles.navText,
      }}
    >
      <SwipeableTabs.Screen
        name="post" 
        options={{ 
          title: 'Post', 
          tabBarIcon: ({ color }: { color: string }) => <PlusSquare size={24} color={color} />
        }} 
      />

      <SwipeableTabs.Screen 
        name="feed" 
        options={{ 
          title: 'Feed', 
          tabBarIcon: ({ color }: { color: string }) => <Home size={24} color={color} /> 
        }} 
      />
      
      <SwipeableTabs.Screen 
        name="explore" 
        options={{ 
          title: 'Explore', 
          tabBarIcon: ({ color }: { color: string }) => <Search size={24} color={color} />
        }} 
      />
    
      <SwipeableTabs.Screen 
        name="dashboard" 
        options={{ 
          title: 'Dashboard', 
          tabBarIcon: ({ color }: { color: string }) => <Table size={24} color={color} /> 
        }} 
      />

      <SwipeableTabs.Screen 
        name="profile" 
        options={{ 
          title: 'Profile', 
          tabBarIcon: ({ color }: { color: string }) => <User size={24} color={color} /> 
        }} 
      />

    </SwipeableTabs>
  );
}

const styles = StyleSheet.create({
  navBar: { 
    backgroundColor: '#09090b', 
    borderTopWidth: 0.5, 
    borderTopColor: '#27272a',
    paddingBottom: Platform.OS === 'ios' ? 20 : 10,
    paddingTop: 10,
    height: Platform.OS === 'ios' ? 90 : 120,
  },
  navText: {
    fontSize: 10,
    textTransform: 'none',
    marginTop: 4,
  }
});
