# Where this is, and what's next

Last updated 2026-09-24. Two repos: this app, and the studio at
`~/Documents/web_projects/content_kitchen` (`/add-dir` it before any API work).

## State

**Studio — done and deployed.** `main` is pushed and live. Verified by probe:
`/api/webhooks/revenuecat` and `/api/cron/send-reminders` answer 401 to an
unsigned request, `/api/v1/me` and `/api/v1/billing` answer 405 to POST. All
four migrations are applied to production and verified.

**App — wired to `/api/v1`.** Notes, posts, channels, calendar, activity, the
signed-in user, and the kitchen switcher. `src/data/mock.ts` holds only copy
that no endpoint serves.

**Nothing has been run on a device.** Not one screen, not the publish flow, not
the splash transition. Everything below is written and type-checked, not seen.

## Next: a posts screen

The biggest hole, and it needs no accounts or credentials — every endpoint is
built and tested. Right now posts are two rows on Home and nothing else:
published and scheduled posts are effectively invisible, and a draft can be
saved but never reopened.

1. New route `src/app/posts.tsx`, reached from Home's "Recent posts" header.
   `SectionHeader` in `src/components/ui.tsx` renders an action label but takes
   no `onPress` — add one. I removed the "See all" label rather than leave a
   link that went nowhere.
2. Filter by status: `GET /api/v1/posts?status=scheduled|published|draft|failed`
   (`listPosts` in `src/api/posts.ts` already takes it). Paginated with `page`.
3. Open a post: text, targets, per-platform status, and the failure reason —
   `PostDto.platforms[].error` carries it, and nothing surfaces that today.
4. Manage:
   - reschedule → `PATCH /api/v1/posts/:id` with `scheduledFor`
   - edit text → same endpoint with `text`; drafts and scheduled only, Zernio
     refuses published ones and the 422 says why
   - delete → `DELETE /api/v1/posts/:id`
   `src/api/posts.ts` has no client functions for these yet; add `updatePost`
   and `deletePost` beside `publishPost`. They need **no** idempotency key —
   setting the same text twice is the same result, unlike creating.
5. Reopen a draft in `compose.tsx`, which already accepts `text` as a param —
   it needs a `postId` too, so saving edits an existing draft instead of
   creating a second one.
6. Then make the calendar's post rows tappable. They are deliberately
   `disabled` in `src/app/(tabs)/calendar.tsx:206` only because there was
   nowhere to go.

Where it lives is a design call: a fifth tab, or a pushed screen off Home.
CLAUDE.md says the scope is deliberately small, so a pushed screen is the
safer read — but it is your call.

## Next: editable notes

`PATCH /api/v1/notes/:id` is built, and `useNotes` already exposes `update`.
Nothing calls it, so a note is fixed once saved.

1. Edit the text in `src/app/note/[id].tsx` — make the body a `TextInput` that
   saves on blur, or add an edit affordance.
2. **Wire the reminder's "Change" button.** It is a `Pressable` with no
   `onPress` (`note/[id].tsx:124`) — the one visibly dead control left in the
   app. It needs the same date/time picker the publish sheet uses
   (`@react-native-community/datetimepicker`, already installed), and should
   also be able to clear the reminder: send `remindAt: null`, which the
   endpoint distinguishes from omitting the field.
3. Changing the time re-arms the reminder server-side — `updateNote` resets
   `reminder_sent_at` — so an edited reminder fires again at the new time.
   Nothing extra to do in the app.
4. While in there: the **"Used" filter** on the Notes tab is a no-op that falls
   through to All, because nothing records which post a note became. Either
   record that link when a note is turned into a post, or drop the filter.

## Next: RevenueCat, app side

The studio side is finished — `/api/webhooks/revenuecat`, `GET /api/v1/billing`,
`migrations/20260915_billing_rails.sql`, and 25 unit tests covering the rails.
What's left is entirely in this repo.

1. `eas init`, then a dev build. `react-native-purchases` has native code and
   does not run in Expo Go, so the simulator needs a dev client first.
2. `npx expo install react-native-purchases`, configure with the `appl_` public
   SDK key (safe to commit; it ships in the binary).
3. **`Purchases.logIn(appUserId)`** with the `appUserId` from
   `GET /api/v1/billing` — it is the **workspace id**, not the user id, because
   a plan belongs to a kitchen. Getting this wrong attaches one purchase to
   every kitchen the user belongs to.
4. **Check `canPurchaseInApp` before showing a purchase.** On iOS this is the
   only defence against double-subscribing: the purchase goes phone-to-Apple
   without touching the studio, so nothing server-side can intervene. When it
   is false, show `purchaseBlockedReason`.
5. Wire `src/app/plans-ios.tsx` (still reads `PLANS` from `mock.ts`) and
   `src/app/billing.tsx` (still shows a hard-coded "Pro · $21.99 · App Store ·
   Renews 10 October"). Real values come from `GET /api/v1/billing` and `/me`.
6. Products live in one App Store subscription group, Pro ranked above Solo, so
   Apple handles upgrades without double-charging. Entitlements are `solo` and
   `pro`; the webhook needs no config if they keep those names.

**While testing:** set `REVENUECAT_ACCEPT_SANDBOX=true` on the production host,
and remove it afterwards. Without it sandbox purchases are ignored, which is
the default on purpose — a free sandbox purchase would otherwise upgrade a real
kitchen in the production database.

## Next: push, app side

Studio side is done: `device_push_tokens`, `POST`/`DELETE /api/v1/devices`,
`/api/cron/send-reminders`.

1. Needs the same dev build.
2. `expo-notifications`, ask permission, register the Expo token against
   `POST /api/v1/devices` after sign-in.
3. **Call `DELETE /api/v1/devices` BEFORE dropping the bearer token on
   sign-out** (`src/app/(tabs)/you.tsx`). Afterwards the request cannot prove
   whose device it is, and that phone keeps getting the old account's reminders.
4. Handle a tapped notification: the payload carries
   `{ noteId, url: 'spoofkitchen://note/<id>' }`.
5. Add the crontab line on the host — it is in the route file's comment. Until
   then no reminder is ever sent.

## Smaller, real

- **Multiple accounts per platform.** The studio added this (`a81966c`), but
  `src/app/onboarding/channels.tsx` shows one row per platform and
  `src/app/compose.tsx` picks platforms, not accounts — so a second Instagram
  account is invisible and posts go to every account on that platform.
- **Media in compose.** The picker and upload are not built; `POST /api/v1/media`
  is. Needs `expo-image-picker`.
- **AI rewrite** in compose, and the "three angles" on a note, were removed
  rather than left as dead buttons. Both need endpoints that do not exist.
- **Onboarding answers** (`niche`, `goal`) still go nowhere, on both platforms.
- **Apple and Google sign-in** are inert buttons on `welcome.tsx`.
- **Idempotency keys are never pruned** — `api_idempotency_keys` grows forever.
  It has a `created_at` index ready for a cleanup job.
- **Push receipts** are not checked, so dead tokens are only pruned when Expo
  rejects them outright, not when APNs does later.

## Paused

- **Instagram → Meta Business Suite.** Could not link a newly-registered
  business account. Probably irrelevant to this app: Zernio owns the Meta app,
  which is why `social-service-plan.md` chose an aggregator to skip App Review.
  Try connecting from the app's channels screen before debugging Business Suite.

## Blocked on decisions, not code

- Whether iOS sells only one kitchen per Apple ID. Apple allows one active
  subscription per subscription group per Apple ID, so a user owning two
  kitchens can only bill one through iOS; the second must use the web.
- Whether you are in Apple's Small Business Program. The $9.99/$21.99 prices
  assume Apple takes 30%. At 15% they net more than the web does.

## Commands

```bash
npm run typecheck   # tsc + the shadow guard — before every commit
npm run lint
npm run ios

# studio
cd ~/Documents/web_projects/content_kitchen && npx vitest run   # 247 pass;
# workspaces-actions.test.ts fails identically on main and has since the
# Better Auth migration — it imports auth.ts, which throws without DATABASE_URL
```

`EXPO_PUBLIC_API_URL` in `.env.local` picks the studio (see `.env.example`).
Restart Metro after changing it — it is inlined at bundle time.
