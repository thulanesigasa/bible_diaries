import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  Platform,
} from 'react-native';
import { SvgXml } from 'react-native-svg';

// Chevron down SVG from svgrepo.com
const chevronDownSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6 9 12 15 18 9"></polyline>
</svg>
`;

// Search SVG from svgrepo.com
const searchSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="11" cy="11" r="8"></circle>
  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
</svg>
`;

// Close SVG from svgrepo.com
const closeSvg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="18" y1="6" x2="6" y2="18"></line>
  <line x1="6" y1="6" x2="18" y2="18"></line>
</svg>
`;

export interface CountryItem {
  name: string;
  code: string;
  flag: string;
}

export const COUNTRIES: CountryItem[] = [
  // Southern Africa
  { name: 'South Africa', code: '+27', flag: '🇿🇦' },
  { name: 'Botswana', code: '+267', flag: '🇧🇼' },
  { name: 'Eswatini', code: '+268', flag: '🇸🇿' },
  { name: 'Lesotho', code: '+266', flag: '🇱🇸' },
  { name: 'Namibia', code: '+264', flag: '🇳🇦' },
  { name: 'Zimbabwe', code: '+263', flag: '🇿🇼' },
  { name: 'Zambia', code: '+260', flag: '🇿🇲' },
  { name: 'Malawi', code: '+265', flag: '🇲🇼' },
  { name: 'Mozambique', code: '+258', flag: '🇲🇿' },
  { name: 'Angola', code: '+244', flag: '🇦🇴' },

  // East Africa
  { name: 'Kenya', code: '+254', flag: '🇰🇪' },
  { name: 'Tanzania', code: '+255', flag: '🇹🇿' },
  { name: 'Uganda', code: '+256', flag: '🇺🇬' },
  { name: 'Rwanda', code: '+250', flag: '🇷🇼' },
  { name: 'Burundi', code: '+257', flag: '🇧🇮' },
  { name: 'Ethiopia', code: '+251', flag: '🇪🇹' },
  { name: 'Eritrea', code: '+291', flag: '🇪🇷' },
  { name: 'Djibouti', code: '+253', flag: '🇩🇯' },
  { name: 'Somalia', code: '+252', flag: '🇸🇴' },
  { name: 'South Sudan', code: '+211', flag: '🇸🇸' },
  { name: 'Sudan', code: '+249', flag: '🇸🇩' },
  { name: 'Madagascar', code: '+261', flag: '🇲🇬' },
  { name: 'Mauritius', code: '+230', flag: '🇲🇺' },
  { name: 'Seychelles', code: '+248', flag: '🇸🇨' },
  { name: 'Comoros', code: '+269', flag: '🇰🇲' },

  // West Africa
  { name: 'Nigeria', code: '+234', flag: '🇳🇬' },
  { name: 'Ghana', code: '+233', flag: '🇬🇭' },
  { name: 'Senegal', code: '+221', flag: '🇸🇳' },
  { name: 'Côte d\'Ivoire', code: '+225', flag: '🇨🇮' },
  { name: 'Cameroon', code: '+237', flag: '🇨🇲' },
  { name: 'Benin', code: '+229', flag: '🇧🇯' },
  { name: 'Burkina Faso', code: '+226', flag: '🇧🇫' },
  { name: 'Cabo Verde', code: '+238', flag: '🇨🇻' },
  { name: 'Gambia', code: '+220', flag: '🇬🇲' },
  { name: 'Guinea', code: '+224', flag: '🇬🇳' },
  { name: 'Guinea-Bissau', code: '+245', flag: '🇬🇼' },
  { name: 'Liberia', code: '+231', flag: '🇱🇷' },
  { name: 'Mali', code: '+223', flag: '🇲🇱' },
  { name: 'Mauritania', code: '+222', flag: '🇲🇷' },
  { name: 'Niger', code: '+227', flag: '🇳🇪' },
  { name: 'Sierra Leone', code: '+232', flag: '🇸🇱' },
  { name: 'Togo', code: '+228', flag: '🇹🇬' },

  // Central Africa
  { name: 'Central African Republic', code: '+236', flag: '🇨🇫' },
  { name: 'Chad', code: '+235', flag: '🇹🇩' },
  { name: 'Congo - Brazzaville', code: '+242', flag: '🇨🇬' },
  { name: 'Congo - Kinshasa (DRC)', code: '+243', flag: '🇨🇩' },
  { name: 'Equatorial Guinea', code: '+240', flag: '🇬🇶' },
  { name: 'Gabon', code: '+241', flag: '🇬🇦' },
  { name: 'São Tomé & Príncipe', code: '+239', flag: '🇸🇹' },

  // North Africa
  { name: 'Algeria', code: '+213', flag: '🇩🇿' },
  { name: 'Egypt', code: '+20', flag: '🇪🇬' },
  { name: 'Libya', code: '+218', flag: '🇱🇾' },
  { name: 'Morocco', code: '+212', flag: '🇲🇦' },
  { name: 'Tunisia', code: '+216', flag: '🇹🇳' },

  // Global Diaspora & International
  { name: 'United Kingdom', code: '+44', flag: '🇬🇧' },
  { name: 'United States', code: '+1', flag: '🇺🇸' },
  { name: 'Canada', code: '+1', flag: '🇨🇦' },
  { name: 'Australia', code: '+61', flag: '🇦🇺' },
  { name: 'New Zealand', code: '+64', flag: '🇳🇿' },
  { name: 'India', code: '+91', flag: '🇮🇳' },
  { name: 'Germany', code: '+49', flag: '🇩🇪' },
  { name: 'France', code: '+33', flag: '🇫🇷' },
  { name: 'Netherlands', code: '+31', flag: '🇳🇱' },
  { name: 'Brazil', code: '+55', flag: '🇧🇷' },
  { name: 'Jamaica', code: '+1876', flag: '🇯🇲' },
];

interface PhoneInputProps {
  countryCode: string;
  phoneNumber: string;
  onCountryCodeChange: (code: string) => void;
  onPhoneNumberChange: (cleanNumber: string) => void;
  inputRef?: React.RefObject<TextInput | null>;
  returnKeyType?: 'next' | 'done' | 'go';
  returnKeyLabel?: string;
  blurOnSubmit?: boolean;
  onSubmitEditing?: () => void;
  editable?: boolean;
  accent?: string;
}

export default function PhoneInput({
  countryCode,
  phoneNumber,
  onCountryCodeChange,
  onPhoneNumberChange,
  inputRef,
  returnKeyType = 'next',
  returnKeyLabel = 'Next',
  blurOnSubmit = false,
  onSubmitEditing,
  editable = true,
  accent = '#0EA5E9',
}: PhoneInputProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Find active country item
  const selectedCountry = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];

  // Filtered countries for search
  const filteredCountries = COUNTRIES.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.code.includes(searchQuery)
  );

  /**
   * Handle text change with duplicate leading-0 stripping rule:
   * If user enters a number starting with 0, strip the 0 so it won't duplicate
   * the international country code in the database.
   */
  const handleTextChange = (rawText: string) => {
    // Keep only digits and spacing
    const digitsOnly = rawText.replace(/[^\d]/g, '');
    // Strip any leading 0s
    const cleanNumber = digitsOnly.replace(/^0+/, '');
    onPhoneNumberChange(cleanNumber);
  };

  const handleSelectCountry = (country: CountryItem) => {
    onCountryCodeChange(country.code);
    setModalVisible(false);
    setSearchQuery('');
  };

  return (
    <View style={styles.container}>
      {/* Country Code Trigger Button */}
      <TouchableOpacity
        style={styles.countryBtn}
        onPress={() => setModalVisible(true)}
        disabled={!editable}
        activeOpacity={0.7}
      >
        <Text style={styles.flagText}>{selectedCountry.flag}</Text>
        <Text style={styles.codeText}>{selectedCountry.code}</Text>
        <SvgXml xml={chevronDownSvg} width={14} height={14} style={styles.chevron} />
      </TouchableOpacity>

      {/* Number Input */}
      <View style={styles.inputWrapper}>
        <TextInput
          ref={inputRef}
          style={styles.numberInput}
          placeholder="71 234 5678"
          placeholderTextColor="#94A3B8"
          value={phoneNumber}
          onChangeText={handleTextChange}
          keyboardType="numbers-and-punctuation"
          returnKeyType={returnKeyType}
          returnKeyLabel={returnKeyLabel}
          blurOnSubmit={blurOnSubmit}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
        />
      </View>

      {/* Country Code Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Country Code</Text>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => {
                  setModalVisible(false);
                  setSearchQuery('');
                }}
              >
                <SvgXml xml={closeSvg} width={18} height={18} />
              </TouchableOpacity>
            </View>

            {/* Search Box */}
            <View style={styles.searchBox}>
              <SvgXml xml={searchSvg} width={16} height={16} style={{ marginRight: 8 }} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search country or code (e.g. +27)"
                placeholderTextColor="#94A3B8"
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            {/* Country List */}
            <FlatList
              data={filteredCountries}
              keyExtractor={(item) => `${item.name}-${item.code}`}
              renderItem={({ item }) => {
                const isSelected = item.code === countryCode;
                return (
                  <TouchableOpacity
                    style={[
                      styles.countryRow,
                      isSelected && { backgroundColor: `${accent}15` },
                    ]}
                    onPress={() => handleSelectCountry(item)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.listFlag}>{item.flag}</Text>
                    <Text style={[styles.listName, isSelected && { color: accent, fontWeight: '700' }]}>
                      {item.name}
                    </Text>
                    <Text style={[styles.listCode, isSelected && { color: accent, fontWeight: '700' }]}>
                      {item.code}
                    </Text>
                  </TouchableOpacity>
                );
              }}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 24 }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 48,
  },
  flagText: {
    fontSize: 18,
    marginRight: 6,
  },
  codeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
    marginRight: 4,
  },
  chevron: {
    marginLeft: 2,
  },
  inputWrapper: {
    flex: 1,
  },
  numberInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
    color: '#0F172A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    paddingTop: 18,
    paddingHorizontal: 20,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  countryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  listFlag: {
    fontSize: 20,
    marginRight: 12,
  },
  listName: {
    flex: 1,
    fontSize: 15,
    color: '#334155',
  },
  listCode: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});
