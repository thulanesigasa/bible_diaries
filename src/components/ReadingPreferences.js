'use client';
import { Minus, Plus, RotateCcw, Check } from 'lucide-react';
import { DEFAULT_SETTINGS } from '../../shared/diary-settings.mjs';
import { READING_SIZES, READING_FONTS, READING_SPACING, READING_SAMPLE } from '../../shared/settings-presentation.mjs';
export default function ReadingPreferences({ settings, disabled, onChange }) {
  const i = READING_SIZES.indexOf(settings.font_size);
  const family = v => v === 'mono' ? 'monospace' : v === 'serif' ? 'Georgia,serif' : 'sans-serif';
  const choice = (key, label, selected, change, detail, ff) => <button key={key} type="button" disabled={disabled} aria-pressed={selected} onClick={change} className="reading-choice" style={{ fontFamily: ff }}><span>{label}{selected && <Check size={14} aria-hidden="true" />}</span>{detail && <small>{detail}</small>}</button>;
  return <div className="reading-preferences">
    <p className="reading-intro">Make reflections comfortable to read. Your choices are saved to your account; menus keep their own text size.</p>
    <section className="reading-preview" aria-label="Reading preview"><small>READING PREVIEW</small><h2 style={{ fontFamily: family(settings.font_family) }}>A moment to reflect</h2><p style={{ fontSize: settings.font_size, lineHeight: settings.line_spacing, fontFamily: family(settings.font_family) }}>{READING_SAMPLE}</p><span>This preview updates after each saved choice.</span></section>
    <fieldset disabled={disabled}><legend>Text size</legend><div className="reading-stepper"><button type="button" aria-label="Decrease reading text size" disabled={disabled || i <= 0} onClick={() => onChange({ font_size: READING_SIZES[i - 1] })}><Minus size={18} /></button><span>Aa <small>{settings.font_size} pt</small></span><button type="button" aria-label="Increase reading text size" disabled={disabled || i >= READING_SIZES.length - 1} onClick={() => onChange({ font_size: READING_SIZES[i + 1] })}><Plus size={18} /></button></div><div className="reading-choices">{READING_SIZES.map(n => choice(`size-${n}`, String(n), settings.font_size === n, () => onChange({ font_size: n })))}</div></fieldset>
    <fieldset disabled={disabled}><legend>Font style</legend><p>Choose how your reflection text looks.</p><div className="reading-choices">{READING_FONTS.map(([v, label, detail]) => choice(v, label, settings.font_family === v, () => onChange({ font_family: v }), detail, family(v)))}</div></fieldset>
    <fieldset disabled={disabled}><legend>Line spacing</legend><p>Give each line a little more breathing room.</p><div className="reading-choices">{READING_SPACING.map(([v, label]) => choice(`spacing-${v}`, label, settings.line_spacing === v, () => onChange({ line_spacing: v })))}</div></fieldset>
    <button className="reading-reset" type="button" disabled={disabled} onClick={() => onChange({ font_size: DEFAULT_SETTINGS.font_size, font_family: DEFAULT_SETTINGS.font_family, line_spacing: DEFAULT_SETTINGS.line_spacing })}><RotateCcw size={16} /> Restore reading defaults</button>
  </div>;
}
