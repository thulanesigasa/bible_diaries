import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  Platform,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

// Download arrow SVG icon (from svgrepo.com — CC0 licensed)
const downloadSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>
`;

const sparkSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z"/>
</svg>
`;

interface UpdateModalProps {
  visible: boolean;
  isDownloading: boolean;
  onUpdate: () => void;
  onDismiss: () => void;
  // accent follows the app's 60-30-10 accent color
  accent?: string;
}

/**
 * UpdateModal
 *
 * Non-intrusive bottom-sheet style modal that appears when an OTA update
 * is available. Users can apply the update immediately or dismiss it.
 * The update downloads and the app reloads — no reinstall required.
 */
export default function UpdateModal({
  visible,
  isDownloading,
  onUpdate,
  onDismiss,
  accent = '#0EA5E9',
}: UpdateModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* Icon badge */}
          <View style={[styles.iconBadge, { backgroundColor: accent + '1A' }]}>
            <SvgXml xml={sparkSvg} width={28} height={28} color={accent} />
          </View>

          {/* Heading */}
          <Text style={styles.title}>New Version Available</Text>
          <Text style={styles.body}>
            A fresh update for Bible Diaries is ready. Tap below to apply it
            instantly — no reinstall needed.
          </Text>

          {/* Primary CTA */}
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: accent }]}
            onPress={onUpdate}
            disabled={isDownloading}
            activeOpacity={0.85}
          >
            {isDownloading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <SvgXml xml={downloadSvg} width={18} height={18} color="#FFFFFF" style={styles.btnIcon} />
                <Text style={styles.btnText}>Update Now</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Secondary dismiss */}
          {!isDownloading && (
            <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} activeOpacity={0.7}>
              <Text style={styles.dismissText}>Remind me later</Text>
            </TouchableOpacity>
          )}

          {isDownloading && (
            <Text style={styles.downloadingHint}>Downloading update, please wait…</Text>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#0F172A',   // 30% surface — dark panel
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: Platform.OS === 'ios' ? 48 : 32,
    alignItems: 'center',
  },
  iconBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#F1F5F9',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  body: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    minHeight: 56,
    marginBottom: 12,
  },
  btnIcon: {
    marginRight: 8,
  },
  btnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  dismissBtn: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  dismissText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '500',
  },
  downloadingHint: {
    marginTop: 8,
    color: '#64748B',
    fontSize: 13,
    textAlign: 'center',
  },
});
