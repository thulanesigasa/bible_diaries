# Project Rules & Bundling Guidelines (Bible Diaries)

This document establishes the official project-specific development rules, detailing documentation standards, historical errors logged during mobile app bundling, Expo EAS setup, and CI/CD automation, along with strict architectural rules to ensure seamless development and error-free builds moving forward.

---

# Part 1: README Standards & Project Documentation Rules

### Rule 1: Application Name & Purpose Mandate
- Every `README.md` must feature the official application name as the primary `<h1>` header at the very top.
- Immediately below the title, provide a concise explanation of the application purpose, its core philosophy, target audience, and the problem it solves.

### Rule 2: Strictly Prohibit Emojis — Use Badges Only
- **Never use emojis in any `README.md` file** under any circumstances (no emojis in headings, lists, badges, or body text).
- Use flat-square visual badges (e.g. from shields.io) to visually represent:
  - Platforms (Web, Android, iOS)
  - Frameworks (Next.js 16, Expo SDK 57, React 19)
  - Languages (TypeScript, JavaScript)
  - Backend & Databases (Supabase, PostgreSQL)
  - CI/CD & Build Statuses (GitHub Actions workflows)
  - Licenses (MIT)

### Rule 3: Mandatory Architecture & Directory Structure
- Every project and sub-project README must include a clean ASCII directory structure diagram.
- The diagram must clearly display the core folders, routes, components, libraries, configuration files, and assets so that any engineer can orient themselves immediately.

### Rule 4: Comprehensive Step-by-Step "How to Run" Guide
- Every README must include a dedicated execution guide detailing:
  1. Prerequisites (Node.js versions, database accounts, external API keys)
  2. Dependency installation (`npm install`)
  3. Environment variable setup (`.env.local` or `.env` examples)
  4. Backend/Database initialization (SQL scripts, migrations)
  5. Exact start command (`npm run dev` for web, `npm start` / `npm run android` for Expo mobile)

### Rule 5: Continuous Maintenance
- `README.md` must be updated whenever a new feature, component, API route, or directory is introduced. It must never become stale.

---

# Part 2: Mobile App Bundling, EAS & CI/CD Error Prevention Rules

## 1. Build-Time Environment Safety (No Fatal Module-Level Throws)

### Logged Error:
```
[expo-cli] Error: Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY environment variables.
✖ Export failed
/home/runner/work/bible_diaries/bible_diaries/mobile/node_modules/expo/bin/cli export --output-dir dist ... exited with non-zero code: 1
Error: update command failed.
```

### Root Cause:
During `eas update` (or `expo export`), Metro statically evaluates and exports all client application modules. When a module executes a top-level `throw new Error(...)` upon detecting missing environment variables at import time, the static build export immediately crashes with exit code 1.

### Mandatory Rules:
1. **Never Throw Fatal Errors at the Module Root**: In client-side modules (such as `src/lib/supabase.js`, API clients, or third-party wrappers), never write unhandled top-level `throw new Error(...)` during module evaluation.
2. **Provide Safe Fallback Values & Warnings**: Use fallback configuration strings or issue a soft `console.warn(...)` during initialization. Validate credentials only when an active network operation is performed at runtime.
3. **Forward Public Envs in CI Workflows**: Any `EXPO_PUBLIC_*` variable required by the client bundle must be explicitly declared and forwarded in the GitHub Actions workflow steps (`.github/workflows/ota-update.yml` and `.github/workflows/build-apk.yml`).

---

## 2. EAS Project Identification & UUID Integrity

### Logged Error:
```
Invalid UUID appId
Request ID: 7a9f248e-b7bb-4138-86bb-a859da739b8a
Error: GraphQL request failed.
```

### Root Cause:
Placing placeholder strings (such as `"bible-diaries"` or `"YOUR_EAS_PROJECT_ID"`) in `extra.eas.projectId` or `updates.url` in `app.json` causes EAS CLI GraphQL queries to fail because EAS strictly validates the UUID format (8-4-4-4-12 hexadecimal).

### Mandatory Rules:
1. **Never Insert Placeholder Strings for Project IDs**: Never populate `extra.eas.projectId` or `updates.url` with human-readable slugs or arbitrary placeholder strings.
2. **Use Valid EAS Project UUIDs Only**: The project ID must be the official 36-character UUID assigned by Expo (`fe39d2bf-81e4-4901-8583-caadeb91cc1c`).
3. **Automatic Project Initialization**: When linking a project for the first time, omit `extra.eas.projectId` and run `eas init --force --non-interactive` to allow EAS to link and inject the authentic UUID directly into `app.json`.

---

## 3. Expo Account & Project Ownership Alignment

### Logged Error:
```
Project config: Owner of project identified by "extra.eas.projectId" (thulanesigasa0) does not match owner specified in the "owner" field (pharez101). Learn more: https://expo.fyi/eas-project-id
Error: update command failed.
```

### Root Cause:
A mismatch between the `owner` field specified in `app.json` and the actual account owning the EAS project ID and generating the CI `EXPO_TOKEN`.

### Mandatory Rules:
1. **Strict Owner Alignment**: The `owner` field in `mobile/app.json` must strictly match the Expo username of the account owning the EAS project (`thulanesigasa0`).
2. **Token Verification**: Verify that the GitHub repository secret `EXPO_TOKEN` was generated by the account matching the `owner` field (`thulanesigasa0`).

---

## 4. CLI Prerequisites & Node Modules Guard

### Logged Errors:
```
eas : The term 'eas' is not recognized as the name of a cmdlet...
Failed to resolve plugin for module "expo-router" relative to "mobile". Do you have node modules installed?
Error: build:configure command failed.
```

### Root Cause:
Executing EAS or Expo commands before dependencies are installed locally, or assuming global CLI binaries exist without verifying installation.

### Mandatory Rules:
1. **Always Install Dependencies First**: Always ensure `npm install` has completed inside `mobile/` before running any Expo Router prebuild, config check, or EAS build commands.
2. **Use `npx` or Verified Global CLI**: In development environments or automated scripts, either ensure `npm install --global eas-cli` has executed or invoke commands via `npx eas-cli <command>`.

---

## 5. Strictly Prohibit `npm audit fix --force`

### Logged Warning & Context:
```
28 vulnerabilities (18 moderate, 10 high)
fix available via `npm audit fix --force`
Will install expo@46.0.21, which is a breaking change
```

### Root Cause:
`npm audit fix --force` relies on general npm version resolvers that do not recognize Expo's pinned SDK architecture. Running `--force` will downgrade Expo from SDK 57 to Expo 46 (from 2022) or corrupt `expo-router`, breaking React 19 and React Native 0.86 completely.

### Mandatory Rules:
1. **Never Run `npm audit fix --force`**: Under no circumstances should `--force` be used on `npm audit fix` in the mobile workspace.
2. **Build-Time Transitive Tooling Safety**: Recognize that flagged vulnerabilities are inside build-time utilities (Metro, Xcode parsers, PostCSS) and do not run on client devices.
3. **Use Official Expo Fixes**: For dependency version alignments, always use `npx expo install --fix`.

---

## 6. OTA vs. Native Binary Rebuild Boundaries

### Architecture Context:
The Bible Diaries mobile app utilizes `expo-updates` for Over-The-Air updates and GitHub Actions for automated cloud builds.

### Mandatory Rules:
1. **OTA Deliverable Changes**: JavaScript code, React components, CSS/styles, images, and non-native dependencies can be published seamlessly via OTA (`ota-update.yml` or push to `main`). Users receive the update via the in-app `<UpdateModal>` without reinstalling.
2. **Native Rebuild Trigger Changes**: If any change touches:
   - Native modules in `package.json` (libraries with Android/iOS native code)
   - Expo SDK version upgrades
   - Native configuration in `app.json` (permissions, package name, schemes, native icons)
   You MUST bump the version in `app.json` / `package.json` and trigger a full APK build via version tag (`v*.*.*`) or the manual **Build Android APK** workflow in GitHub Actions.

---

## 7. GitHub CLI Keyring Workaround in PowerShell

### Context:
Stale or invalid `GITHUB_TOKEN` environment variables override valid keyring credentials on Windows PowerShell, causing silent HTTP 401 failures on `gh` commands.

### Mandatory Rule:
Always prepend `Remove-Item Env:GITHUB_TOKEN -ErrorAction SilentlyContinue;` before any `gh` command (issues, PRs, workflow dispatch, runs).

---

## 8. Expo SDK 57 Dependency Alignment & Kotlin Compiler Daemon Crash

### Logged Error:
```
Execution failed for task ':expo-updates-gradle-plugin:compileKotlin'.
> A failure occurred while executing org.jetbrains.kotlin.compilerRunner.GradleCompilerRunnerWithWorkers$GradleKotlinCompilerWorkAction
   > Internal compiler error. See log for more details
e: Module was compiled with an incompatible version of Kotlin. The binary version of its metadata is 2.2.0, expected version is 2.0.0.
Could not receive a message from the daemon.
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.
```

### Root Cause:
In Expo SDK 57, Expo unified core package version numbers to the SDK major release line (`~57.0.x`). When `expo-updates` was pinned to an older release (e.g. `0.28.18` from earlier SDKs), its bundled Kotlin Gradle plugin was incompatible with Gradle 9.3 and Kotlin 2.2 required by React Native 0.86. This crashed the Kotlin daemon during Gradle compilation on EAS Build.

### Mandatory Rules:
1. **Pre-Build Verification with `expo-doctor`**: Always execute `npx expo-doctor` in `mobile/` before committing or initiating EAS builds. All 21/21 checks must pass with zero major/minor dependency mismatches.
2. **Strict SDK 57 Version Alignment**: Keep `expo-updates` and related native modules aligned to the SDK 57 version matrix (`expo-updates: ~57.0.22`, `expo: ~57.0.23`, `react-native: 0.86.3`).
3. **Use `npx expo install --fix`**: When any dependency divergence occurs, resolve it strictly via `npx expo install --fix` rather than ad-hoc version changes or `npm audit fix --force`.

