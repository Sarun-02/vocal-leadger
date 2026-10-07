/**
 * Build-time configuration. Values come from `.env.local` (see `.env.example`).
 * Nothing secret belongs here: every VITE_* variable is embedded in the APK.
 */
function readUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' || url.hostname === 'localhost' ? url.toString() : null;
  } catch {
    return null;
  }
}

export const config = {
  /** Optional remote transcript parser. Null → offline parser only. */
  aiParserUrl: readUrl(import.meta.env.VITE_AI_PARSER_URL),
  /** Network timeout for the optional AI parser. */
  aiParserTimeoutMs: 6000,
  appVersion: '1.0.0',
} as const;
