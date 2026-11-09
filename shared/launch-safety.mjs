export const POLICY_VERSION = "bd-launch-2026-11-09";
export const GUARDIAN_DECLARATION =
  "I am at least 18 and authorised as this child’s parent or legal guardian. I have read the privacy, safety and community notices and understand that public reflections can be copied by others.";
export const REPORT_REASONS = [
  ["child_safety", "Child safety or exploitation"],
  ["harassment", "Harassment or threats"],
  ["hate", "Hate or discrimination"],
  ["scam", "Scam or impersonation"],
  ["privacy", "Personal information or privacy"],
  ["self_harm", "Risk of self harm"],
  ["other", "Another concern"],
];
export function ageAt(birth, today = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return null;
  const d = new Date(birth + "T00:00:00Z");
  if (!Number.isFinite(d.getTime()) || d.toISOString().slice(0, 10) !== birth)
    return null;
  let age = today.getUTCFullYear() - d.getUTCFullYear();
  if (
    today.getUTCMonth() < d.getUTCMonth() ||
    (today.getUTCMonth() === d.getUTCMonth() &&
      today.getUTCDate() < d.getUTCDate())
  )
    age--;
  return age >= 0 && age <= 120 ? age : null;
}
