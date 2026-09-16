# Expo SDK 57 & Mobile Rules

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

---

## Mobile App Bundling, CI/CD & EAS Rules

### Rule 1: Build-Time Environment Safety (No Fatal Top-Level Throws)
- **Never** write unhandled top-level `throw new Error(...)` for missing environment variables in client modules (e.g. `src/lib/supabase.js`).
- Build-time bundling (`expo export` / `eas update`) statically evaluates modules. Top-level fatal throws crash the build with exit code 1.
- Provide safe fallbacks or soft warnings (`console.warn`) and ensure `EXPO_PUBLIC_*` variables are forwarded in `.github/workflows/`.

### Rule 2: EAS Project UUID Integrity
- `extra.eas.projectId` and `updates.url` in `app.json` must always be the authentic 36-character UUID (`fe39d2bf-81e4-4901-8583-caadeb91cc1c`).
- Never put string placeholders (e.g. `"bible-diaries"` or `"YOUR_EAS_PROJECT_ID"`). It breaks GraphQL validation with `Invalid UUID appId`.

### Rule 3: Expo Account Ownership Alignment
- `owner` in `app.json` must strictly match the Expo username of the account owning the EAS project and CI token: `"thulanesigasa0"`.
- Never put a mismatched username; EAS update will abort with ownership mismatch errors.

### Rule 4: CLI Prerequisites & Node Modules Guard
- Always ensure `npm install` has been run inside `mobile/` before running any Expo Router or EAS commands.
- Ensure `eas-cli` is installed globally (`npm install --global eas-cli`) or invoke via `npx eas-cli`.

### Rule 5: Strictly Prohibit `npm audit fix --force`
- **Never** run `npm audit fix --force` in this workspace. It attempts to downgrade Expo from SDK 57 to SDK 46 (2022), breaking React 19, React Native 0.86, and Expo Router.
- Build-time transitive warnings in Metro/Xcode/PostCSS are harmless to client devices. Use `npx expo install --fix` for official patch alignment.

### Rule 6: OTA vs. Native Rebuild Boundaries
- **OTA Updates (No Reinstall)**: Pure JavaScript, React components, styles, and assets are published via `ota-update.yml` or push to `main`. Delivered seamlessly via `<UpdateModal>`.
- **Full APK Rebuilds**: Required whenever native dependencies in `package.json` change, Expo SDK changes, or native properties in `app.json` change. Triggered via version tags (`v*.*.*`) or the manual **Build Android APK** workflow.

### Rule 7: GitHub CLI Keyring Workaround in PowerShell
- Always prepend `Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue;` before every `gh` command.
