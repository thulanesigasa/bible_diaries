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
        tabBarStyle: {
          display: hideTabBar ? 'none' : 'flex',
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 24 : 16,
          left: 16,
          right: 16,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          height: 64,
          paddingBottom: Platform.OS === 'ios' ? 12 : 8,
          paddingTop: 8,
          borderWidth: 1,
          borderColor: 'rgba(15, 23, 42, 0.08)',
          shadowColor: '#0F172A',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.06,
          shadowRadius: 15,
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
              fontSize: 10, 
              fontWeight: focused ? '700' : '500', 
              color: focused ? '#0EA5E9' : '#64748B',
              marginTop: 1
            }}>
              {children}
            </Text>
            {focused && (
              <View style={{ 
                width: 4, 
                height: 4, 
                borderRadius: 2, 
                backgroundColor: '#0EA5E9', 
                marginTop: 3
              }} />
            )}
          </View>
        )
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color, size }) => (
            <BookOpen size={size || 22} color={color} />
          ),
          headerTitle: 'bible_diaries',
        }}
      />
      <Tabs.Screen
        name="filters"
        options={{
          title: 'Filters',
          tabBarIcon: ({ color, size }) => (
            <Filter size={size || 22} color={color} />
          ),
          headerTitle: 'Explore Categories',
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color, size }) => (
            <Users size={size || 22} color={color} />
          ),
          headerTitle: 'Fellowship',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageSquare size={size || 22} color={color} />
          ),
          headerTitle: 'Conversations',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color, size }) => (
            <Settings size={size || 22} color={color} />
          ),
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
