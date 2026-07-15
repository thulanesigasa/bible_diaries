import React, { useState } from 'react';

export function getInitials(fullName, email) {
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

export default function Avatar({ src, fullName, email, size = 40, className = '', style = {} }) {
  const [imageError, setImageError] = useState(false);

  // Check if image is available, not a generic unsplash placeholder, and hasn't failed to load
  const hasImage = 
    src && 
    src !== '' && 
    !imageError;

  const initials = getInitials(fullName, email);
  const fontSize = size * 0.4;

  if (hasImage) {
    return (
      <img
        src={src}
        alt={fullName || 'User Avatar'}
        className={className}
        onError={() => setImageError(true)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '1.5px solid rgba(var(--gold-accent-rgb), 0.15)',
          ...style
        }}
      />
    );
  }

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: 'var(--gold-accent)',
        color: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: '700',
        fontSize: fontSize,
        border: '1.5px solid rgba(var(--gold-accent-rgb), 0.2)',
        userSelect: 'none',
        ...style
      }}
      title={fullName}
    >
      {initials}
    </div>
  );
}
