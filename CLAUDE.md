# Spoof Kitchen — mobile

The pocket companion to the Spoof Kitchen studio. Expo SDK 57 · expo-router ·
React Native 0.86 · TypeScript.

**Scope is deliberately small.** Jot a note → turn it into a post → schedule it
→ watch the streak. There is no board canvas, no analytics suite, no team
management, no community inbox. Those stay on the web. If a request would add
one of them, ask before building it.

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

**UI shell.** Every screen is built and navigable, all reading from
`src/data/mock.ts`. Nothing makes a network call. The fixtures are shaped like
the real responses, so wiring is a swap, not a rewrite.

```bash
npm start          # Metro
npm run ios        # simulator
npm run typecheck  # tsc + the shadow guard — run before every commit
```

## What the studio owes this app

`docs/API_CONTRACT.md` is the spec. In dependency order:

1. **Bearer auth.** `src/lib/auth.ts` runs Better Auth with `emailOTP`. Add the
   bearer plugin so the OTP issues a token instead of a cookie. Do NOT build a
   second auth system — the 6-digit flow is unchanged, only the credential
   carrier differs.
2. **`/api/v1/*` route handlers.** The studio's logic lives in Server Actions
   (`src/app/actions/*.ts`), which only its own React bundle can call. The work
   is extracting each action's body into a plain `src/lib/services/*` function
   that takes a `userId`, then having both the action and a route handler call
   it. Note `src/lib/auth-utils.ts`'s `getOptionalUser` reaches for
   `next/headers` — services must not.
3. **`board_items.remind_at`.** A note is a `board_items` row of type `text`,
   which has no date column, so "remind me" cannot reach the calendar or fire
   anything. One nullable `TIMESTAMPTZ` plus a partial index.
4. **Activity logging for notes.** `src/lib/logger.ts`'s `logActivity` is wired
   into ideas, social, ai, profile, invitations and auth — but **not**
   `src/app/actions/boards.ts`. So jotting, this app's most common action,
   contributes nothing to the graph on the You tab. Add `CREATE_BOARD_ITEM` to
   `LogAction` and `'BOARD'` to `ResourceType`.
5. **An idempotency key on publish.** Zernio has none. On mobile a request can
   time out at the client and still succeed at the server, so a second tap
   double-posts to a real audience.
6. **Push.** No device-token table, no scheduler. Copy the pattern in
   `src/app/api/cron/reap-channels/route.ts`.
7. **RevenueCat + `/api/webhooks/revenuecat`.** iOS purchases go through Apple,
   marked up so the 30% commission still nets the Naira price. Mirror
   `src/app/api/webhooks/paystack/route.ts`. Both stores write
   `workspaces.plan`, so there must be a rule for who wins when someone
   subscribes on both.

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
