import React, { useRef, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Image,
  Animated,
  PanResponder,
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
 * Modern bottom-sheet modal that appears when an in-app OTA update is available.
 * Features:
 * - Authentic brand book logo
 * - "Good News to You" spiritual heading
 * - Pure white background (#FFFFFF)
 * - Swipe-down drag handle gesture to dismiss
 * - Tap-anywhere outside on backdrop to dismiss
 */
export default function UpdateModal({
  visible,
  isDownloading,
  onUpdate,
  onDismiss,
  accent = '#0EA5E9',
}: UpdateModalProps) {
  const translateY = useRef(new Animated.Value(0)).current;

  // Reset translate position when modal becomes visible
  useEffect(() => {
    if (visible) {
      translateY.setValue(0);
    }
  }, [visible, translateY]);

  // PanResponder to allow dragging down the sheet to dismiss
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isDownloading,
      onMoveShouldSetPanResponder: (_, gestureState) => !isDownloading && gestureState.dy > 5,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 90 || gestureState.vy > 0.5) {
          Animated.timing(translateY, {
            toValue: 500,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onDismiss();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            bounciness: 4,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        {/* Tap anywhere outside the sheet to dismiss */}
        <TouchableWithoutFeedback onPress={onDismiss} disabled={isDownloading}>
          <View style={styles.backdropTouchArea} />
        </TouchableWithoutFeedback>

        {/* Draggable bottom-sheet container */}
        <Animated.View
          style={[
            styles.sheet,
            { transform: [{ translateY }] },
          ]}
          {...panResponder.panHandlers}
        >
          {/* Small pill drag-down indicator */}
          <View style={styles.handleContainer}>
            <View style={styles.handleIndicator} />
          </View>

          {/* App Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={require('../assets/images/icon.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>

          {/* Headings */}
          <Text style={styles.title}>Good News to You</Text>
          <Text style={styles.body}>
            We have a fresh update for Bible Diaries ready to enrich your daily
            reflections and fellowship. Tap below to apply it instantly.
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
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  backdropTouchArea: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: '#FFFFFF', // 30% surface — pure white as requested
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    alignItems: 'center',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  handleContainer: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 10,
  },
  handleIndicator: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#CBD5E1', // Subtle grey drag pill
  },
  logoContainer: {
    width: 68,
    height: 68,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    marginTop: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  logoImage: {
    width: 50,
    height: 50,
    borderRadius: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: -0.4,
  },
  body: {
    fontSize: 14.5,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 32,
    width: '100%',
    minHeight: 52,
    marginBottom: 8,
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
    paddingVertical: 10,
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
