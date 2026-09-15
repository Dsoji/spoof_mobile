# API contract

What this app needs from the studio.

Studio repo: `~/Documents/web_projects/content_kitchen`
(`/add-dir` it before starting.)

## Status

Built: auth, notes, channels, posts (with the idempotency key), media,
calendar, activity, plus `/me` and `/workspaces`. Outstanding: push and
billing.

Where the build differs from the spec below, the build wins:

- **Calendar** items carry a `startsAt` instant alongside `at`, include a
  third kind, `idea`, for `ideas.planned_at`, and the response lists any
  source it could not reach in `unavailable`. The `tz` query parameter decides
  which day an item falls on — always send it.
- **Activity** days carry a weighted `score` as well as the raw `count`.
  Levels are quartiles of the user's own last 90 active days.
- **Posts** `POST` *requires* `Idempotency-Key`. A replay returns 200 with
  `Idempotency-Replayed: true`; a key reused with a different body is a 422.
- **Auth** `request-code` accepts `{ email, name? }` and creates the account
  when the address is new, answering `needsName: true` if no name was sent.
- **`GET /api/v1/workspaces`** lists the user's kitchens. Every other route
  takes the chosen one as `?workspaceId=`, defaulting to the oldest.

## Shape

- Base path `/api/v1`. The studio already has seven Zernio paths missing a
  version segment; do not add more.
- Bearer token in `Authorization`, issued by Better Auth's bearer plugin.
- Every route resolves a `workspaceId` — a workspace owns the data, not a user.
- Errors: `{ error: string }` with a real status code. The studio's actions
  return `{ data, error }` tuples; route handlers should translate, not leak.

## Auth

`src/lib/auth.ts` already runs `emailOTP` with `SIGN_IN_CODE_LENGTH = 6`. Add
the bearer plugin; the flow is otherwise unchanged.

| Route | Backed by | Notes |
| --- | --- | --- |
| `POST /api/v1/auth/request-code` | `requestSignUpCode` / `resendSignInCode` | `src/app/actions/auth.ts` |
| `POST /api/v1/auth/verify` | `verifySignInCode` | returns a bearer token |
| `GET /api/v1/me` | `getOptionalUser` + workspace | user, workspace, plan, channel count |

Apple and Google are native SDK flows on the client; the server only needs to
accept the resulting identity. **Apple private-relay addresses** land in
`public.users.email`, which is `NOT NULL UNIQUE` — the same person signing in
with Apple-hidden on mobile and their real address on web becomes two accounts.
Decide the linking rule before shipping, and register the sending domain with
Apple or every Resend email to those users bounces.

## Notes

A note is a `board_items` row of type `text` on the workspace's library board
(`workspaces.library_board_id`, lazily created by `getOrCreateLibraryBoard`).
Payload is `{ text }` — see `src/lib/boards.ts:87`.

| Route | Backed by |
| --- | --- |
| `GET /api/v1/notes` | `getBoard(libraryBoardId, workspaceId)`, filtered to `type === 'text'` |
| `POST /api/v1/notes` | `addBoardItem(boardId, workspaceId, item)` |
| `PATCH /api/v1/notes/:id` | `updateBoardItem` |
| `DELETE /api/v1/notes/:id` | `deleteBoardItem` |

```jsonc
// GET /api/v1/notes
{ "notes": [ { "id": "uuid", "text": "…", "remindAt": null, "createdAt": "…" } ] }
```

**`remindAt` needs a column.** `board_items` has `created_at` and nothing else
time-related:

```sql
ALTER TABLE board_items ADD COLUMN IF NOT EXISTS remind_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_board_items_remind_at
    ON board_items (remind_at) WHERE remind_at IS NOT NULL;
```

Without it the calendar loses a third of its content and "remind me" reminds
no one.

**Log the write.** `src/app/actions/boards.ts` has zero `logActivity` calls, so
notes are invisible to the activity graph. Add `CREATE_BOARD_ITEM` to
`LogAction` and `'BOARD'` to `ResourceType` in `src/lib/logger.ts`.

## Channels

| Route | Backed by |
| --- | --- |
| `GET /api/v1/channels` | `getConnectedAccounts(workspaceId)` |
| `POST /api/v1/channels/connect` | `getConnectLink(workspaceId, platform)` — returns a URL the app opens |

Plan caps live in `PLAN_LIMITS` (`src/lib/plan-limits.ts`): starter 1, solo 2,
pro 5, locked 0. Return the cap so the client can show "1 slot left" rather
than discovering it at failure.

## Posts

One call covers all three states.

| Route | Backed by |
| --- | --- |
| `GET /api/v1/posts?status=` | `getPosts(workspaceId, status, { page, pageSize })` |
| `POST /api/v1/posts` | `publishPost(workspaceId, text, platforms, media, status, scheduledAt, platformSettings)` |
| `PATCH /api/v1/posts/:id` | `updatePost` |
| `DELETE /api/v1/posts/:id` | `deletePost` |
| `POST /api/v1/media` | existing `src/app/api/upload/route.ts` |

`status` is `'published' | 'scheduled' | 'draft'`. Scheduling is not a separate
endpoint and must never become one.

**Idempotency is required here, not optional.** Zernio has none. Accept an
`Idempotency-Key` header, store it against the created post, and return the
existing post on replay. A mobile client on flaky data will retry, and a
duplicate publish is visible to a real audience.

Drafts live in Zernio, not Postgres — so offline draft-saving needs either a
local store that syncs or a drafts table of your own.

## Calendar

The only genuinely new logic. Merges three sources over a date range:

- `board_items.remind_at` (once it exists)
- `ideas.planned_at`
- scheduled posts from `getPosts(workspaceId, 'scheduled')`

```jsonc
// GET /api/v1/calendar?from=2026-09-01&to=2026-09-30
{
  "days": [
    { "date": "2026-09-11", "items": [
      { "kind": "reminder", "at": "08:00", "text": "…", "noteId": "uuid" },
      { "kind": "post", "at": "09:00", "text": "…", "platforms": ["instagram"], "postId": "…" }
    ] }
  ]
}
```

## Activity

Feeds the streak on Home and the graph on You. Source is `activity_logs`, which
is **already collecting** — the table and `logActivity` have existed since
`migrations/20260316_create_activity_logs.sql`.

```sql
select created_at::date as day, count(*)
from activity_logs
where user_id = $1 and created_at > now() - interval '1 year'
group by 1;
```

| Route | Returns |
| --- | --- |
| `GET /api/v1/activity` | `{ days: [{date, count, level}], streak, best, stats }` |

Two decisions to make before users see squares:

- **Weighting.** A raw count lets AI generations dominate — `AI_CHAT_INVOKED`
  and the five AI actions fire far more often than `PUBLISH_POST`. Decide the
  weights first; changing them later rewrites everyone's history.
- **Retention.** `activity_logs` stores `ip_address` and has no retention
  policy. Making it a permanent user-facing feature is worth a look against
  `src/app/compliance`.

## Billing

Two price lists, one plan column.

| | Web + Android | iOS |
| --- | --- | --- |
| Rail | Paystack | Apple IAP via RevenueCat |
| Solo | ₦9,500 / $7 | $9.99 |
| Pro | ₦20,354 / $15 | $21.99 |

Prices come from `PLAN_PRICES` in `src/lib/plan-limits.ts`. Naira is
VAT-inclusive — `src/lib/billing-tax.ts` extracts 7.5%, never adds it.

`POST /api/v1/billing/checkout` returns a Paystack URL for Android and web.
iOS never calls it; purchases go through StoreKit and land as a RevenueCat
webhook.

**The collision to design for:** `workspaces.plan` will have two writers. Mirror
`src/app/api/webhooks/paystack/route.ts` for RevenueCat, reuse
`src/lib/webhook-failures.ts`, and write down who wins when one person
subscribes on both rails. There is an existing Solo→Pro double-subscription gap
that this makes worse.

## Client wiring

When these land, replace `src/data/mock.ts` with a thin client in `src/api/`.
Keep the fixture shapes — the screens are already typed against them. Prefer
importing Zod schemas from `content_kitchen/src/lib/validations` over
redeclaring them; sharing types is why this is React Native and not Flutter.
