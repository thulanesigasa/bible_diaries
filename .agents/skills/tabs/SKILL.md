---
name: tabs
description: >-
  Trigger with /tabs or when creating, designing, or refactoring mobile bottom tab navigation in React Native and Expo Router.
  Implements the floating pill / curved rectangular tab bar with dynamic horizontal centering, 60-30-10 palette, Lucide icons,
  custom label with active indicator dot, and clean header styling.
---

# Mobile Bottom Tab Navigation Workflow (`/tabs`)

This workflow defines the standard architecture, geometry, and styling for mobile bottom tab navigation in React Native / Expo Router projects.

## Architecture & Layout Specifications

1. **Floating Pill / Curved Rectangular Container**:
   - **Positioning**: `position: 'absolute'`
   - **Bottom Offset**: `Platform.OS === 'ios' ? 28 : 24`
   - **Width**: Explicit bounded pill width: `280`
   - **Dynamic Centering**: Calculate dynamically using `useWindowDimensions()`:
     ```tsx
     const { width } = useWindowDimensions();
     const horizontalPadding = (width - 280) / 2;
     // apply: marginHorizontal: horizontalPadding
     ```
   - **Height**: Compact height `50` (with `paddingTop: 4`, `paddingBottom: 4`)
   - **Border Radius**: `borderRadius: 16`
   - **Color & Elevation**:
     - `backgroundColor: '#FFFFFF'` (30% panel/surface)
     - Hairline border: `borderWidth: 1, borderColor: 'rgba(15, 23, 42, 0.08)', borderTopWidth: 0`
     - Soft drop shadow:
       ```tsx
       shadowColor: '#0F172A',
       shadowOffset: { width: 0, height: 8 },
       shadowOpacity: 0.08,
       shadowRadius: 12,
       elevation: 5,
       ```

2. **Context-Driven State**:
   - Tab bar visibility and accent color are read from the global app context:
     ```tsx
     const { hideTabBar, accent } = useApp();
     ```
   - `display: hideTabBar ? 'none' : 'flex'`
   - `tabBarActiveTintColor: accent`
   - `tabBarInactiveTintColor: '#94A3B8'`

3. **Custom Tab Label & Active Indicator Dot**:
   - Tab items feature a custom `tabBarLabel` with centered text and a subtle 4x4 indicator dot below active items:
     ```tsx
     tabBarLabel: ({ focused, children }) => (
       <View style={{ alignItems: 'center', justifyContent: 'center' }}>
         <Text style={{ 
           fontSize: 8.5, 
           fontWeight: focused ? '700' : '500', 
           color: focused ? accent : '#64748B',
           marginTop: 1
         }}>
           {children}
         </Text>
         {focused && (
           <View style={{ 
             width: 4, 
             height: 4, 
             borderRadius: 2, 
             backgroundColor: accent, 
             marginTop: 2
           }} />
         )}
       </View>
     )
     ```

4. **Iconography**:
   - Use Lucide icons sized strictly at `16px` with passed `color`:
     ```tsx
     tabBarIcon: ({ color }) => <BookOpen size={16} color={color} />
     ```

5. **Screen Header Standards**:
   - White surface: `backgroundColor: '#FFFFFF'`
   - Elevation: `shadowColor: 'transparent'`, `elevation: 0`
   - Border: `borderBottomWidth: 1, borderBottomColor: 'rgba(15, 23, 42, 0.08)'`
   - Typography: `fontWeight: 'bold', color: '#0F172A', fontSize: 18, fontFamily: 'SpaceMono'`
   - Primary Tab Header Brand:
     ```tsx
     headerTitle: () => (
       <View style={{ flexDirection: 'row', alignItems: 'center' }}>
         <Image 
           source={require('../../assets/images/icon.png')} 
           style={{ width: 24, height: 24, marginRight: 8, borderRadius: 5 }} 
           resizeMode="contain" 
         />
         <Text style={{ fontWeight: 'bold', color: '#0F172A', fontSize: 18, fontFamily: 'SpaceMono' }}>
           app_name
         </Text>
       </View>
     )
     ```

## Full Reference Implementation

```tsx
import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, Platform, useWindowDimensions, Image } from 'react-native';
import { BookOpen, Filter, Users, MessageSquare, Settings } from 'lucide-react-native';
import { useApp } from '../_layout';

export default function TabLayout() {
  const { hideTabBar, accent } = useApp();
  const { width } = useWindowDimensions();
  const horizontalPadding = (width - 280) / 2;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: accent,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          display: hideTabBar ? 'none' : 'flex',
          position: 'absolute',
          bottom: Platform.OS === 'ios' ? 28 : 24,
          marginHorizontal: horizontalPadding,
          width: 280,
          backgroundColor: '#FFFFFF',
          borderRadius: 16,
          height: 50,
          paddingBottom: 4,
          paddingTop: 4,
          borderWidth: 1,
          borderColor: 'rgba(15, 23, 42, 0.08)',
          borderTopWidth: 0,
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
              color: focused ? accent : '#64748B',
              marginTop: 1
            }}>
              {children}
            </Text>
            {focused && (
              <View style={{ 
                width: 4, 
                height: 4, 
                borderRadius: 2, 
                backgroundColor: accent, 
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
          tabBarIcon: ({ color }) => <BookOpen size={16} color={color} />,
          headerTitle: () => (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={{ width: 24, height: 24, marginRight: 8, borderRadius: 5 }} 
                resizeMode="contain" 
              />
              <Text style={{ fontWeight: 'bold', color: '#0F172A', fontSize: 18, fontFamily: 'SpaceMono' }}>
                bible_diaries
              </Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="filters"
        options={{
          title: 'Filters',
          tabBarIcon: ({ color }) => <Filter size={16} color={color} />,
          headerTitle: 'Explore Categories',
        }}
      />
      <Tabs.Screen
        name="connect"
        options={{
          title: 'Connect',
          tabBarIcon: ({ color }) => <Users size={16} color={color} />,
          headerTitle: 'Fellowship',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color }) => <MessageSquare size={16} color={color} />,
          headerTitle: 'Conversations',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <Settings size={16} color={color} />,
          headerTitle: 'Settings',
        }}
      />
    </Tabs>
  );
}
```
