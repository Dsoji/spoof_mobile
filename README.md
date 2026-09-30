# Spoof Kitchen — mobile

The pocket companion to the Spoof Kitchen studio: **jot a note, turn it into a
post, schedule it, watch the streak.** Not a port of the web dashboard — there
is no board canvas, no analytics suite, no team management here.

Expo SDK 57 · expo-router · React Native 0.86 · TypeScript.

## Status

**UI shell.** Every screen is built and navigable against fixtures in
`src/data/mock.ts`. Nothing talks to a server yet — see *What's missing* below.

```bash
npm start          # Metro
npm run ios        # simulator
npm run typecheck  # tsc + the shadow guard
```

## Layout

```
src/
  app/          expo-router routes (see below)
  components/   Icon, ui primitives, Prep, PlanCards
  data/mock.ts  fixtures, shaped like the real endpoints
  theme/        tokens, fonts, type scale
```

### Routes

| Route | Screen |
| --- | --- |
| `welcome`, `verify` | Passwordless sign-in — 6-digit OTP, Apple, Google |
| `onboarding/niche`, `goal`, `channels` | The prep questions, then connect a channel |
| `(tabs)/index` | Home — streak, quick actions, recent notes and posts |
| `(tabs)/notes` | The capture inbox |
| `(tabs)/calendar` | Reminders and scheduled posts, merged |
| `(tabs)/you` | Activity graph and stats |
| `capture`, `note/[id]`, `compose`, `publish` | Jot → note → post → publish |
| `plans`, `checkout` | Paystack paywall — web and Android |
| `plans-ios`, `billing` | App Store paywall and subscription management |

## Conventions

**Colours come from the studio, not from here.** `src/theme/tokens.ts` mirrors
the `@theme` block in the web app's `src/app/globals.css`, hex for hex. When a
colour changes there, change it here — a drifted palette is exactly what that
token block was written to prevent.

**Shadows are `boxShadow`, never the native props.** React Native's `shadow*`
props are iOS-only and Android renders `elevation` as a hard Material shadow,
so a screen built with them looks right on half your devices. Use the theme's
`shadow.*` and `glow()`. `npm run check:shadows` fails the build otherwise.

**Fonts are families, not weights.** RN does not synthesise weights for custom
faces — `fontWeight: '800'` on a family that ships Regular silently renders
Regular. Every weight is its own loaded family; call sites pick `font.bold`,
never `fontWeight`.

**44pt minimum on anything tappable.** `HIT` in `src/theme/type.ts`.

**No fake chrome.** The status bar and home indicator are real; screens read
safe-area insets rather than painting a stand-in.

## What's missing

The backend this app needs does not exist yet. In rough order:

1. **A mobile-facing API.** The studio's logic lives in Server Actions, which
   are only callable from its own React bundle. Mobile needs `/api/v1/*` route
   handlers over the same functions — notes, channels, posts, media, calendar,
   activity.
2. **Bearer auth.** Better Auth needs its bearer/Expo plugin so the OTP issues
   a token instead of a cookie.
3. **`board_items.remind_at`.** A note is a `board_items` row of type `text`,
   which has no date column — so "remind me" cannot reach the calendar or fire
   anything. One nullable timestamp plus an index.
4. **Activity logging for notes.** The graph reads `activity_logs`, already
   collecting from ideas, posting and AI — but `boards.ts` logs nothing, so
   jotting, the app's most common action, contributes zero.
5. **An idempotency key on publish.** A request can time out at the client and
   still succeed at the server. On mobile that means a second tap double-posts
   to a real audience.
6. **Push.** No device-token table, no scheduler. Reminders sit on the calendar
   and nothing nudges.
7. **RevenueCat + a `/api/webhooks/revenuecat` route.** iOS purchases go
   through Apple, marked up so the 30% commission still nets the Naira price.
   Both stores write `workspaces.plan`, so decide who wins when a user
   subscribes twice.

## Placeholders

Platform marks and the Apple/Google button glyphs are monograms and stand-ins —
swap in each vendor's official asset before shipping. Apple has specific rules
on its button's size, radius and label.
# spoof_mobile
