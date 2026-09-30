# Where this is, and what's next

Last updated 2026-09-30. Two repos: this app, and the studio at
`~/Documents/web_projects/content_kitchen` (`/add-dir` it before any API work).

## State

**Studio — done and deployed.** `main` is pushed and live, including the inbox.
Verified by unauthenticated probe against `https://spoofkitchen.com`:
`/api/v1/me`, `/api/v1/notes`, `/api/v1/posts`, `/api/v1/billing`,
`/api/v1/inbox/conversations` and `/api/v1/inbox/posts` all answer **401** — the
route exists and the bearer gate works. All four migrations are applied to
production. (There is no route at `/api/v1/inbox` itself; probing that returns a
404 which means nothing.)

**App — wired to `/api/v1`.** Notes, posts, channels, the calendar, activity,
the signed-in user, the kitchen switcher, and the Chat inbox. `src/data/mock.ts`
holds only the onboarding questions and the price lists.

**Posts are done.** `src/app/posts.tsx` (list grouped by status, grid view,
status filters, paging) and `src/app/post/[id].tsx` (per-platform status and
failure reason, delete, reschedule via `WhenPicker`, "Edit draft" / "Edit text"
reopening `compose.tsx` with `postId` so it PATCHes instead of creating a
second). `updatePost` and `deletePost` are in `src/api/posts.ts`.

**`npm run ios` builds the real app.** It is `expo run:ios` now, not Expo Go, so
**push and RevenueCat are no longer blocked on `eas init`** — a local dev build
is enough for both. `ios/` and `android/` are generated and **gitignored**, so
every native change belongs in `app.json` or a config plugin under `plugins/`;
a hand edit inside `ios/` is gone at the next prebuild.

**Nothing has been run on a device.** Everything below is written and
type-checked, not seen.

## Broken in front of the user

These are not missing features — they are screens that state something false,
or controls that look live and do nothing. Worst first.

The dead controls are fixed as of `4577dfc`: Apple and Google on `welcome.tsx`
are `disabled` until the providers exist, both reminder controls open
`WhenPicker`, and the capture sheet's image button is gone until there is an
upload behind it. What is left is the billing story.

1. **`src/app/billing.tsx` tells every user they are on Pro.** The whole screen
   is hard-coded: "Pro", "$21.99/mo", "App Store", "Renews 10 October". It is
   reached from the You tab (`you.tsx:297`) *and* from the Chat tab's paywall
   ("See Pro", `chat.tsx:277`) — so a free user who taps the upgrade card lands
   on a screen claiming they already subscribed. Real values are in
   `GET /api/v1/billing` and `/api/v1/me`.
   Its three rows are also inert: "Manage in App Store" (`billing.tsx:66`,
   needs a deep link to Apple's settings), "Restore purchases" (`:72`, needs
   `Purchases.restorePurchases()`), "Billing history" (`:76`, no endpoint —
   drop it or link out to the studio).
2. **Nothing can actually be bought, on any path.** `plans.tsx`,
   `plans-ios.tsx` and `checkout.tsx` exist but **no screen navigates to any of
   them** — every upgrade affordance goes to `/billing` instead. And
   `checkout.tsx`'s "Pay ₦20,354" button calls `router.dismissAll()`: a
   checkout screen that takes no payment. Either wire the real flows or take
   the screens out, but do not ship a button that pretends to charge someone.
3. **The Notes tab's "Used" filter is a no-op** that falls through to All,
   because nothing records which post a note became. The code says so at
   `(tabs)/notes.tsx:25`. Record the link when a note becomes a post, or drop
   the filter.

## Next: editable notes

`PATCH /api/v1/notes/:id` is built and `useNotes` exposes `update`.

The reminder half is done (`4577dfc`): `note/[id].tsx` has a `Reminder`
component that sets, moves and clears the time, and the capture sheet can pick
an arbitrary one. **The text is still fixed once saved** — that is what is left.

1. Make the body in `src/app/note/[id].tsx` editable — a `TextInput` that saves
   on blur, or an explicit edit affordance. `update` takes `text` already.
2. Nothing to do about re-arming: changing the time resets `reminder_sent_at`
   server-side, so an edited reminder fires again at the new time.

## Next: finish Apple and Google sign-in

Both flows are **written and type-checked** on both sides — the studio's
`POST /api/v1/auth/social` (studio `13957db`) and the app's `src/api/social.ts`,
wired into `welcome.tsx`. Neither has run once. What is left is console work and
a build.

**Apple — one checkbox, no credentials.**

1. Apple Developer portal → Identifiers → the App ID `mobile.spoofkitchen.com` →
   tick **Sign in with Apple** → Save. There is deliberately no key and no
   Services ID to create: the native flow verifies against Apple's public keys
   with the bundle id as the audience.
2. `npm run ios`. The `expo-apple-authentication` plugin writes the
   `com.apple.developer.applesignin` entitlement, which is why this needs a
   rebuild and not just a Metro restart. Confirm with
   `npx expo config --type introspect` — the entitlement should be there already.
3. Sign in. A brand-new account should land on `/onboarding/niche`, a returning
   one on the tabs.

**Google — one client ID.**

1. Google Cloud console → the studio's project → Credentials → Create OAuth
   client ID → **iOS**, bundle id `mobile.spoofkitchen.com`. It has no secret.
2. Put it in **both** repos: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID` in the app's
   `.env.local` (see `.env.example`) and `GOOGLE_IOS_CLIENT_ID` in the studio's
   `.env`. The app mints the token; the studio only accepts an audience it has
   been told about. Miss the second and every sign-in fails on a bad audience.
3. `npm run ios` again — `plugins/with-google-signin-scheme.js` derives the
   reverse-DNS URL scheme from that client ID and puts it in Info.plist. It
   throws if the value is not a Google client ID, which is what catches the web
   client ID being pasted by mistake.

**Known and accepted:** a user who picks "Hide My Email" arrives as a
`privaterelay.appleid.com` address. That is a real, different mailbox, so it
becomes its own account — Apple's design, not a bug. Still outstanding for those
users: register the sending domain with Apple, or Resend mail to them bounces.

## Next: RevenueCat, app side

The studio side is finished — `/api/webhooks/revenuecat`, `GET /api/v1/billing`,
`migrations/20260915_billing_rails.sql`, and 25 unit tests covering the rails.
What's left is entirely in this repo.

1. `npx expo install react-native-purchases`, then `npm run ios` to rebuild the
   native project. No EAS needed — `expo run:ios` prebuilds and builds locally.
2. Configure with the `appl_` public SDK key (safe to commit; it ships in the
   binary).
3. **`Purchases.logIn(appUserId)`** with the `appUserId` from
   `GET /api/v1/billing` — it is the **workspace id**, not the user id, because
   a plan belongs to a kitchen. Getting this wrong attaches one purchase to
   every kitchen the user belongs to.
4. **Check `canPurchaseInApp` before showing a purchase.** On iOS this is the
   only defence against double-subscribing: the purchase goes phone-to-Apple
   without touching the studio, so nothing server-side can intervene. When it
   is false, show `purchaseBlockedReason`.
5. Then fix everything under "Broken in front of the user" items 1 and 2 —
   `billing.tsx` from the endpoint, and a real route into a paywall.
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

1. `expo-notifications`, ask permission, register the Expo token against
   `POST /api/v1/devices` after sign-in. A dev build is enough — see State.
2. **Call `DELETE /api/v1/devices` BEFORE dropping the bearer token on
   sign-out.** `(tabs)/you.tsx:35` calls `clearToken()` and nothing else;
   afterwards the request cannot prove whose device it is, and that phone keeps
   getting the old account's reminders.
3. Handle a tapped notification: the payload carries
   `{ noteId, url: 'spoofkitchen://note/<id>' }`.
4. Add the crontab line on the host — it is in the route file's comment. Until
   then no reminder is ever sent, however well the app registers.

## Smaller, real

- **Multiple accounts per platform.** The studio added this (`a81966c`) and
  `Channel` now carries a per-account `id`, which the inbox uses. But
  `onboarding/channels.tsx` still renders one row per entry in `PLATFORMS`, and
  publishing targets `PostTarget.platform` rather than an account id — so a
  second Instagram account is invisible on the channels screen and a post goes
  to every account on that platform.
- **Media in compose is built**; what is left around it is smaller. A post with
  media and an empty caption is still refused, because the caption checks predate
  attachments and Instagram is the obvious case for it. Video tiles show an icon
  rather than a poster frame, which needs a thumbnail library the app does not
  ship. There is no reordering and no delete on Bunny — removing an attachment
  drops it locally and leaves the file, which costs storage and nothing else.
  The capture sheet deliberately has no media button: a note is a text row and
  the API has nowhere to put a file.
- **AI rewrite** in compose, and the "three angles" on a note, were removed
  rather than left as dead buttons. Both need endpoints that do not exist.
- **Onboarding answers** (`niche`, `goal`) still go nowhere, on both platforms.
- **One unused import** — `radius` in `checkout.tsx:7`. The only lint output
  the repo produces.
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
npm run ios         # expo run:ios — builds and installs the real app

# studio
cd ~/Documents/web_projects/content_kitchen && npx vitest run   # 247 pass;
# workspaces-actions.test.ts fails identically on main and has since the
# Better Auth migration — it imports auth.ts, which throws without DATABASE_URL
```

`EXPO_PUBLIC_API_URL` in `.env.local` picks the studio (see `.env.example`);
it currently points at production. Restart Metro after changing it — it is
inlined at bundle time.
