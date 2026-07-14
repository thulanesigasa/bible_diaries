import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

interface AvatarProps {
  src?: string | null;
  fullName?: string | null;
  email?: string | null;
  size?: number;
  style?: any;
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

export default function Avatar({ src, fullName, email, size = 40, style }: AvatarProps) {
  const [imageError, setImageError] = useState(false);

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
          backgroundColor: '#0EA5E9',
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: 1.5,
          borderColor: 'rgba(14, 165, 233, 0.2)',
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
