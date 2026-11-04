# CampusConnect UI, Language and Theme Update

## Included in this update

- English is the default application language.
- Language preference can be changed from **Settings → Language** to Bangla.
- Language preference is saved in the current browser using local storage.
- Light, Dark and System appearance modes are available in **Settings → Appearance**.
- Theme preference is saved in the current browser. System mode follows the device color-scheme preference.
- Logout is available only in **Settings → Account**. The header and account sidebar no longer expose a logout action.
- The authenticated application layout has been refreshed with a Facebook-inspired navigation/feed structure and Instagram-inspired rounded content cards, responsive spacing and mobile navigation.
- Existing authentication handlers, Supabase queries, profile/verification workflows, feed actions, groups and messaging handlers were not intentionally changed.

## Implementation notes

- `app/page.tsx`: language/theme preferences, settings view, settings navigation and single logout location.
- `app/globals.css`: refreshed social UI and light/dark design tokens.
- `lib/i18n.ts`: exact UI-label translations. User-generated post text, names and other submitted content are not automatically translated.
- `app/layout.tsx`: English document language remains the default.

## Validation

- TypeScript/TSX syntax transpilation passed for the modified application files.
- Full `tsc --noEmit` and Next.js production build could not be completed in this environment because dependency installation timed out; `react`, `next`, `lucide-react`, Supabase packages and their type declarations were not available locally.
- No live Supabase/Auth regression test was run. Existing database and backend logic were retained in the source; deploy to a staging project and test login, signup, verification, feed, groups and messages before production.
