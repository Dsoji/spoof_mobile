# Spoof Kitchen — mobile

The pocket companion to the Spoof Kitchen studio. Expo SDK 57 · expo-router ·
React Native 0.86 · TypeScript.

**Scope is deliberately small.** Jot a note → turn it into a post → schedule it
→ watch the streak → answer the replies. There is no board canvas, no analytics
suite, no team management. Those stay on the web. If a request would add one of
them, ask before building it. The community inbox (DMs and comments) was asked
for and lives in the Chat tab — see `docs/API_CONTRACT.md` § Inbox.

## Where the backend lives

The studio is a **separate repo** on this machine:

```
~/Documents/web_projects/content_kitchen
```

This session cannot read it unless it is added as a working directory:

```
/add-dir ~/Documents/web_projects/content_kitchen
```

Do that before any task that touches the API, because the endpoints this app
needs do not exist yet and must be written *there*. Everything below cites real
paths in that repo.

## Current state

**Wired to the studio.** Every screen that shows data reads it from `/api/v1`
through `src/api/` — notes, posts, channels, the calendar, activity, the
signed-in user and the kitchen switcher. `src/data/mock.ts` holds only copy
that no endpoint serves: the onboarding questions and the price lists.

```bash
npm start          # Metro
npm run ios        # simulator
npm run typecheck  # tsc + the shadow guard — run before every commit
npm run lint
```

Which studio the app talks to is `EXPO_PUBLIC_API_URL` in `.env.local` — see
`.env.example`. Restart Metro after changing it; it is inlined at bundle time.

Shared data lives in `src/api/resources.ts`. Each resource is scoped to the
user or to the selected kitchen, and clears itself on sign-out or a switch —
do not cache API data in component state.

**Not wired yet:** billing (RevenueCat), push, media upload in compose, the AI
rewrite button, onboarding answers, and Apple/Google sign-in.

## What the studio owes this app

`docs/API_CONTRACT.md` is the spec. Items 1–5 are built, on the studio's
`mobile/api-v1*` branches:

1. ~~Bearer auth~~ — Better Auth's bearer plugin, plus `/api/v1/auth/*`.
2. ~~`/api/v1/*` route handlers~~ — backed by `src/lib/services/*`, which take
   a `userId` and never read a cookie. The Server Actions delegate to them.
3. ~~`board_items.remind_at`~~ — `migrations/20260910_board_item_remind_at.sql`.
4. ~~Activity logging for notes~~ — `CREATE_BOARD_ITEM` / `'BOARD'`.
5. ~~Idempotency key on publish~~ — `migrations/20260915_api_idempotency_keys.sql`.

**Both migrations must be applied** before notes or publishing work against a
database. The studio's `.env` points at production, so that is a deliberate step.

Server side built, app side still owed — both wait on a dev build, because
neither push tokens nor `react-native-purchases` work in Expo Go:

6. **Push.** The studio has `device_push_tokens`, `POST`/`DELETE
   /api/v1/devices`, and `/api/cron/send-reminders` (needs
   `migrations/20260915_push_reminders.sql` and a crontab entry). The app needs
   `eas init`, `expo-notifications`, a token registered on sign-in, and
   `DELETE /api/v1/devices` called **before** dropping the bearer token on
   sign-out — afterwards the request cannot prove whose device it is.
7. **RevenueCat.** The studio has `/api/webhooks/revenuecat` and
   `GET /api/v1/billing` (needs `migrations/20260915_billing_rails.sql`). The
   rule: **prevent double-subscribing** — the iOS paywall must check
   `canPurchaseInApp` before selling, and web checkout refuses a kitchen Apple
   already bills — and if both rails end up active anyway, the higher plan
   wins. The app must call `Purchases.logIn(appUserId)` with the `appUserId`
   that endpoint returns: it is the workspace id, because a plan belongs to a
   kitchen, not a person.

## Conventions

**Colours come from the studio.** `src/theme/tokens.ts` mirrors the `@theme`
block in `content_kitchen/src/app/globals.css`, hex for hex. Never invent a
colour, never round one to a nicer number. If a value is missing, add it to
`globals.css` first.

**Shadows are `boxShadow`, never native props.** RN's `shadow*` props are
iOS-only and Android renders `elevation` as a hard Material shadow, so a screen
built with them looks right on half the devices. Use `shadow.*` / `glow()` from
the theme. `scripts/forbid-native-shadows.mjs` fails the build otherwise;
escape hatch is `// allow-native-shadow` on the line.

**Font weights are families.** RN does not synthesise weights for custom faces —
`fontWeight: '800'` on a family shipping Regular silently renders Regular. Pick
`font.bold`, never `fontWeight`.

**Serif headings carry ~1.15 leading.** The brand brief asks for leading just
under 1; iOS tolerates it, Android clips DM Serif's ascenders.

**44pt minimum on anything tappable** (`HIT` in `src/theme/type.ts`). Status
badges that are not touch targets may be smaller.

**No fake chrome.** Never draw an iOS status bar or a virtual keyboard — they
render on top of the layout on a real device. Read safe-area insets.

**No CSS grid.** RN has none. The calendar and the activity heatmap are nested
flex rows.

## Things that are easy to get wrong

- **Scheduling is not a separate flow.** `publishPost(workspaceId, text,
  platforms, media, status, scheduledAt, platformSettings)` takes
  `'published' | 'scheduled' | 'draft'`. One call, three statuses. Do not add a
  "Schedule" entry point beside "New post" — that was already tried and removed.
- **`npm run ios` does not re-apply config plugins.** `expo run:ios` only
  prebuilds when `ios/` is absent; with one already there it goes straight to an
  incremental build, so a change to `app.json` or anything under `plugins/` is
  silently ignored and the symptom is a missing entitlement or Info.plist key —
  which surfaces as a runtime failure, not a build error. Run `npm run prebuild`
  (`expo prebuild --clean`) after any native config change. `ios/` and
  `android/` are gitignored and hold no hand edits, so regenerating is free.

- **A workspace, not a user, owns everything.** Every studio action takes a
  `workspaceId` and validates team-wide. New server actions touching social
  data must call the guards in `content_kitchen/src/lib/social-ownership.ts`.
- **The studio is behind a reverse proxy** (Helicarrier/Hetzner, not Vercel), so
  `request.url` reads as `localhost:8080`. Derive an origin from headers — see
  `src/lib/app-url.ts`.
- **Naira prices are VAT-inclusive.** `src/lib/billing-tax.ts` extracts 7.5%
  from the price rather than adding it on top. Never display price + VAT.
- **Onboarding answers currently go nowhere.** `/register` writes them to
  `user_metadata` and nothing reads them. Worth wiring before asking the same
  four questions on a second platform.

## Verifying

Run it and look. `npm run ios`, then drive the simulator and screenshot — do not
ask the user to check by hand. Typecheck and the shadow guard both run under
`npm run typecheck`.
