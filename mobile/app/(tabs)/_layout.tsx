import React from 'react';
import { Tabs } from 'expo-router';
import { TouchableOpacity, View, Text, Platform } from 'react-native';
import { BookOpen, Filter, Users, MessageSquare, Settings } from 'lucide-react-native';
import { useApp } from '../_layout';

export default function TabLayout() {
  const { hideTabBar } = useApp();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0EA5E9',
        tabBarInactiveTintColor: '#94A3B8',
        safeAreaInsets: { bottom: 0, top: 0, left: 0, right: 0 }, // Disable default safe area overrides
        tabBarStyle: {
          display: hideTabBar ? 'none' : 'flex',
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: '22%',
          right: '22%',
          backgroundColor: '#FFFFFF',
          borderRadius: 16, // Curved rectangular shape
          height: 50, // More compact height
          paddingBottom: 4,
          paddingTop: 4,
          borderWidth: 1,
          borderColor: 'rgba(15, 23, 42, 0.08)',
          borderTopWidth: 0, // Strip default top border
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 12,
          elevation: 5,
        },
        headerStyle: {
          backgroundColor: '#FFFFFF',
          shadowColor: 'transparent',
          elevation: 0,
          borderBottomWidth: 1,
          borderBottomColor: 'rgba(15, 23, 42, 0.08)',
        },
        headerTitleStyle: {
          fontWeight: 'bold',
          color: '#0F172A',
          fontSize: 18,
          fontFamily: 'SpaceMono',
        },
        tabBarLabel: ({ focused, children }) => (
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ 
              fontSize: 8.5, 
              fontWeight: focused ? '700' : '500', 
              color: focused ? '#0EA5E9' : '#64748B',
              marginTop: 1
            }}>
              {children}
            </Text>
            {focused && (
              <View style={{ 
                width: 3, 
                height: 3, 
                borderRadius: 1.5, 
                backgroundColor: '#0EA5E9', 
                marginTop: 2
              }} />
            )}
          </View>
        )
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <BookOpen size={16} color={color} />
          ),
          headerTitle: 'bible_diaries',
        }}
      />
      <Tabs.Screen
        name="filters"
        options={{
          title: 'Filters',
          tabBarIcon: ({ color }) => (
            <Filter size={16} color={color} />
          ),
          headerTitle: 'Explore Categories',
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => (
            <Users size={16} color={color} />
          ),
          headerTitle: 'Fellowship',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => (
            <MessageSquare size={16} color={color} />
          ),
          headerTitle: 'Conversations',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <Settings size={16} color={color} />
          ),
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
