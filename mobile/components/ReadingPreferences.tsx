import React, {useEffect, useState} from 'react';
import ReadingSizeSlider from './ReadingSizeSlider';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Type, Minus, Plus, RotateCcw, Check } from 'lucide-react-native';
import { DEFAULT_SETTINGS } from '../../shared/diary-settings.mjs';
import { READING_SIZES, READING_FONTS, READING_SPACING, READING_SAMPLE } from '../../shared/settings-presentation.mjs';
export default function ReadingPreferences({ settings, disabled, accent, onChange }: { settings: any; disabled: boolean; accent: string; onChange: (patch: any) => void }) {
  const [size, setSize] = useState(settings.font_size);
  useEffect(() => {if (!disabled) setSize(settings.font_size);}, [settings.font_size, disabled]);
  const family = (v: string) => v === 'mono' ? 'SpaceMono' : v === 'serif' ? Platform.OS === 'ios' ? 'Georgia' : 'serif' : undefined;
  const choice = (key: string, label: string, selected: boolean, change: () => void, detail?: string, ff?: string) => <TouchableOpacity key={key} accessibilityRole="button" accessibilityState={{ selected, disabled }} disabled={disabled} onPress={change} style={[s.choice, selected && { borderColor: accent, backgroundColor: '#f0f7ff' }]}>
    <View style={s.choiceTop}><Text style={[s.choiceLabel, { fontFamily: ff, color: selected ? accent : '#334155' }]}>{label}</Text>{selected && <Check size={14} color={accent} />}</View>{detail && <Text style={s.detail}>{detail}</Text>}
  </TouchableOpacity>;
  return <View style={s.page}>
    <Text style={s.intro}>Make reflections comfortable to read. Your choices are saved to your account; menus keep their own text size.</Text>
    <View style={s.preview}><Text style={s.eyebrow}>READING PREVIEW</Text><Text style={[s.previewTitle, { fontFamily: family(settings.font_family) }]}>A moment to reflect</Text><Text style={{ fontSize: size, lineHeight: size * settings.line_spacing, fontFamily: family(settings.font_family), color: '#243347' }}>{READING_SAMPLE}</Text><Text style={s.previewFoot}>Drag the slider to preview. Your size saves when you release it.</Text></View>
    <View style={s.control}><View style={s.header}><Type size={18} color={accent} /><Text style={s.label}>Text size</Text><Text style={s.value}>{size} pt</Text></View>
      <ReadingSizeSlider value={size} disabled={disabled} accent={accent} onChange={setSize} onComplete={n => onChange({font_size:n})} />
    </View>
    <View style={s.control}><Text style={s.label}>Font style</Text><Text style={s.hint}>Choose how your reflection text looks.</Text><View style={s.choices}>{READING_FONTS.map(([v, label, detail]: string[]) => choice(v, label, settings.font_family === v, () => onChange({ font_family: v }), detail, family(v)))}</View></View>
    <View style={s.control}><Text style={s.label}>Line spacing</Text><Text style={s.hint}>Give each line a little more breathing room.</Text><View style={s.choices}>{READING_SPACING.map(([v, label]: any[]) => choice(`spacing-${v}`, label, settings.line_spacing === v, () => onChange({ line_spacing: v })))}</View></View>
    <TouchableOpacity accessibilityRole="button" disabled={disabled} style={s.reset} onPress={() => onChange({ font_size: DEFAULT_SETTINGS.font_size, font_family: DEFAULT_SETTINGS.font_family, line_spacing: DEFAULT_SETTINGS.line_spacing })}><RotateCcw size={16} color={accent} /><Text style={{ color: accent, fontSize: 13 }}>Restore reading defaults</Text></TouchableOpacity>
  </View>;
}
const s = StyleSheet.create({
  page: { gap: 22 }, intro: { fontSize: 13, lineHeight: 20, color: '#64748b' }, preview: { borderRadius: 14, borderWidth: 1, borderColor: '#e2ebf5', backgroundColor: '#f8fbff', padding: 20, gap: 13 },
  eyebrow: { fontSize: 10, letterSpacing: 1.6, color: '#58718e', fontWeight: '600' }, previewTitle: { fontSize: 20, color: '#172033', fontWeight: '600' }, previewFoot: { fontSize: 11, lineHeight: 16, color: '#64748b' },
  control: { gap: 9 }, header: { flexDirection: 'row', alignItems: 'center', gap: 8 }, label: { fontSize: 14, color: '#172033', fontWeight: '600' }, value: { marginLeft: 'auto', fontSize: 12, color: '#64748b' }, hint: { fontSize: 12, color: '#64748b', lineHeight: 18 },
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 }, stepButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 10 }, sizePreview: { fontSize: 25, color: '#334155' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { minHeight: 44, flexGrow: 1, flexBasis: 64, padding: 11, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 9 }, choiceTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 5 }, choiceLabel: { fontSize: 12, fontWeight: '500', flexShrink: 1 }, detail: { fontSize: 10, lineHeight: 15, color: '#64748b', marginTop: 5 }, reset: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 }, disabled: { opacity: .35 },
});
