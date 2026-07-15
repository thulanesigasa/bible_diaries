import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useApp } from '../app/_layout';

interface AvatarProps {
  src?: string | null;
  fullName?: string | null;
  email?: string | null;
  size?: number;
  style?: any;
  accent?: string;
}

export function getInitials(fullName?: string | null, email?: string | null) {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return parts[0][0].toUpperCase();
  }
  if (email) {
    return email[0].toUpperCase();
  }
  return 'U';
}

export default function Avatar({ src, fullName, email, size = 40, style, accent }: AvatarProps) {
  const [imageError, setImageError] = useState(false);
  let appAccent = '#0EA5E9';
  try {
    const app = useApp();
    if (app && app.accent) {
      appAccent = app.accent;
    }
  } catch (e) {
    // Context might not be available during initial mount/auth
  }

  const activeAccent = accent !== undefined ? accent : appAccent;

  const initials = getInitials(fullName, email);
  const fontSize = size * 0.4;
  const hasImage = src && src !== '' && !imageError;

  if (hasImage) {
    return (
      <Image
        source={{ uri: src }}
        onError={() => setImageError(true)}
        style={[
          {
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style
        ]}
      />
    );
  }

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: activeAccent,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: `${activeAccent}33`,
        },
        style
      ]}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontWeight: 'bold',
          fontSize: fontSize,
        }}
      >
        {initials}
      </Text>
    </View>
  );
}
