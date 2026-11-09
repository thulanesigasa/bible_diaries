// Presentation only: account preferences remain in diary_settings under owner RLS.
export const SETTINGS_SECTIONS = [
  ['Your experience', ['reading', 'achievements', 'saved']],
  ['Privacy & account', ['account', 'privacy', 'security', 'blocked', 'sessions', 'data']],
  ['Notifications', ['notifications', 'quiet']],
  ['Help & information', ['support', 'legal']],
];
export const READING_SIZES = Array.from({ length: 17 }, (_, i) => i + 8);
export const READING_FONTS = [['sans', 'Simple', 'Clean and familiar'], ['serif', 'Book', 'A traditional reading feel'], ['mono', 'Mono', 'Evenly spaced letters']];
export const READING_SPACING = [[1.4, 'Compact'], [1.6, 'Comfortable'], [1.8, 'Relaxed'], [2, 'Spacious']];
export const READING_SAMPLE = 'Today, I am learning to slow down, listen and trust God with the next step. There is room to reflect, to give thanks and to begin again.';
