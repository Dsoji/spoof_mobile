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
