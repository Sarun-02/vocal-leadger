# Vocal Ledger

Voice-first expense tracker for Android, built from the Stitch design export in
[`design-reference/`](design-reference/). The UI is the design's HTML/Tailwind markup ported
to React components, packaged as a native Android app with Capacitor.

- **Offline-first**: transactions, budgets and settings live in an on-device SQLite database.
- **Voice entry**: Android's speech recogniser + an offline parser that understands phrases like
  “I spent 250 rupees on lunch”, “Bought groceries for 1200”, “Yesterday I spent 300 for dinner”,
  or several items at once (“14 for dinner, 14 for lunch and 14 for petrol”).
- **No backend, no secrets**: the only network use is an *optional* parsing endpoint you configure.

## Requirements

| Tool | Version |
|---|---|
| Node.js | 20+ (tested with 24) |
| JDK | 21 (e.g. Temurin) — set `JAVA_HOME` |
| Android SDK | Platform 36, Build-Tools 36 — set `ANDROID_HOME` or `android/local.properties` |

## Commands

```bash
npm install
npm test               # parser + statistics unit tests
npm run typecheck
npm run dev            # browser preview (uses localStorage instead of SQLite)

npm run android        # build web, sync, run on a connected device/emulator
npm run apk:debug      # → android/app/build/outputs/apk/debug/app-debug.apk
npm run apk:release    # → android/app/build/outputs/apk/release/app-release.apk
```

The `apk:*` scripts run the Gradle wrapper on any OS (`scripts/gradle.mjs`).

### Release signing

Release builds are signed only when a keystore is configured. Create
`android/keystore.properties` (git-ignored):

```properties
storeFile=keystore/vocal-ledger-release.jks
storePassword=...
keyAlias=vocal-ledger
keyPassword=...
```

or set `VOCAL_LEDGER_KEYSTORE`, `VOCAL_LEDGER_KEYSTORE_PASSWORD`, `VOCAL_LEDGER_KEY_ALIAS`,
`VOCAL_LEDGER_KEY_PASSWORD` in CI. **Back up the keystore** — Android only accepts updates
signed with the same key.

## Optional smart parsing

The built-in parser works offline. To plug in an LLM-backed parser, host an HTTPS endpoint and set
`VITE_AI_PARSER_URL` in `.env.local` (see `.env.example` for the request/response contract).
Keep API keys on that server — every `VITE_*` value is bundled into the APK. If the endpoint is
unreachable, the app falls back to the offline parser automatically.

## Project layout

```
src/
  screens/        one file per screen (Home, Voice, Review, Entry, Transactions, Budget, Detail, Profile, Login)
  components/     shared UI (header, bottom nav, sheets, rows, chips, insights)
  state/          React context: data store, toasts, Android back stack, voice→review handoff
  services/
    voice/        microphone permission flow + speech session (native plugin bridge)
    parsing/      offline transcript parser (+ tests) and optional remote parser
    auth/         local account (PBKDF2-hashed password, stored on device)
  db/             Repository interface, SQLite implementation, browser fallback
  lib/            formatting, dates, statistics (+ tests), validation, notifications
  data/           categories and payment methods
  config/         build-time configuration
android/app/src/main/java/com/vocalledger/app/VoiceInputPlugin.java   native speech recogniser bridge
design-reference/                                                    original Stitch export (source of truth for the UI)
```

## Permissions

- `RECORD_AUDIO` — requested only when you tap the microphone. If denied, the app explains why and
  offers “Type instead”; if permanently denied, it links to system settings.
- `INTERNET` — only used by the optional smart-parsing endpoint. Speech recognition itself is
  handled by the device's speech service (it may need a connection unless an offline speech pack
  is installed under Android Settings → Speech).
