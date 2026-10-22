// Test copies only (scripts/testing): a check can say which window is "in front" (globalThis.__testForeground =
// { name, exe } or null), so blocker checks never depend on the owner's real windows (blocker-check.mjs).
// NEVER in a release: package.json `build.files` leaves this file out of the installer, and electron/screen.ts loads
// it only when the app is not packaged and runs as a test copy (DESKWATCH_PORT; the start-up guard allows that only
// with a scratch data folder). Checked on the built installer by scripts/release-check.mjs.
export type Fg = { name: string; exe: string };
export const testForeground = (): Fg | null | undefined => (globalThis as { __testForeground?: Fg | null }).__testForeground;
