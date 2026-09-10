/**
 * Fixtures standing in for the API.
 *
 * Shaped to match what the endpoints will actually return, so wiring them up
 * later is a swap rather than a rewrite:
 *   post   → a Zernio post as `getPosts` returns it
 *   day    → the merge of note reminders, ideas.planned_at and scheduled posts
 *
 * Notes are no longer here: they come from `@/api/useNotes`, backed by
 * /api/v1/notes in the studio. Everything below is still a fixture.
 */

export type Post = {
    id: string;
    caption: string;
    status: 'scheduled' | 'published' | 'draft';
    whenLabel: string;
    platforms: string[];
    metaLabel?: string;
};

export const me = {
    name: 'Dami',
    initial: 'D',
    workspace: 'Brew by Lagos',
    email: 'dami@brewbylagos.com',
    plan: 'Pro',
};

export const posts: Post[] = [
    {
        id: 'p1',
        caption: 'Everyone’s grinding their beans wrong…',
        status: 'scheduled',
        whenLabel: 'Fri, 9:00',
        platforms: ['Instagram', 'TikTok'],
    },
    {
        id: 'p2',
        caption: 'Behind the counter at 6am — the opening set',
        status: 'published',
        whenLabel: '2d ago',
        platforms: ['Instagram'],
        metaLabel: '2d ago · 1.2k views',
    },
];

export const channels = [
    { name: 'Instagram', connected: true, handle: '@brewbylagos' },
    { name: 'TikTok', connected: false },
    { name: 'YouTube', connected: false },
    { name: 'X', connected: false },
    { name: 'LinkedIn', connected: false },
];

/** The four /register prep questions, copy lifted verbatim from the web flow. */
export const NICHES = [
    'Beauty', 'Fashion', 'Food & Drink', 'Fitness', 'Travel', 'Tech',
    'Gaming', 'Finance', 'Education', 'Lifestyle', 'Music', 'Comedy',
];

export const GOALS = [
    { value: 'grow', icon: 'trend', title: 'Grow my audience', desc: 'Reach more of the right people.' },
    { value: 'sales', icon: 'cart', title: 'Drive sales', desc: 'Turn content into revenue.' },
    { value: 'time', icon: 'clock', title: 'Save time', desc: 'A week of content in an hour.' },
    { value: 'consistent', icon: 'repeat', title: 'Stay consistent', desc: 'Never miss a posting day.' },
] as const;

/** Prices mirror PLAN_PRICES in the web app's src/lib/plan-limits.ts. */
export const PLANS = {
    paystack: [
        {
            key: 'solo',
            name: 'Solo',
            tagline: 'Just you, posting',
            price: '₦9,500',
            features: ['2 connected channels', 'Unlimited ideas and scheduling', 'One seat — just you'],
        },
        {
            key: 'pro',
            name: 'Pro',
            tagline: 'Every platform, plus a team',
            price: '₦20,354',
            popular: true,
            features: ['All 5 channels', 'Up to 5 teammates', 'Advanced analytics', 'Client share links and inbox'],
        },
    ],
    /** Marked up so Apple's 30% still nets the Naira price. */
    appStore: [
        {
            key: 'solo',
            name: 'Solo',
            tagline: 'Just you, posting',
            price: '$9.99',
            features: ['2 connected channels', 'Unlimited ideas and scheduling', 'One seat — just you'],
        },
        {
            key: 'pro',
            name: 'Pro',
            tagline: 'Every platform, plus a team',
            price: '$21.99',
            popular: true,
            features: ['All 5 channels', 'Up to 5 teammates', 'Advanced analytics', 'Client share links and inbox'],
        },
    ],
};

/** September 2026. The 1st is a Tuesday; the 10th is a Thursday. */
export const CALENDAR = {
    monthLabel: 'September',
    year: '2026',
    today: 10,
    selected: 11,
    /** day → dots. 'post' is brand purple, 'remind' is accent orange. */
    marks: {
        2: ['post'], 4: ['post'], 7: ['remind'], 9: ['post'],
        10: ['remind'], 11: ['remind', 'post', 'remind'], 12: ['remind'],
        15: ['post'], 17: ['post', 'remind'], 21: ['post'], 24: ['post'], 29: ['post'],
    } as Record<number, ('post' | 'remind')[]>,
    /** The selected day's merged agenda. */
    agenda: [
        { time: '8:00', kind: 'remind' as const, text: 'create content relating to coffee' },
        { time: '9:00', kind: 'post' as const, text: 'Everyone’s grinding their beans wrong…', platforms: ['Instagram', 'TikTok'] },
        { time: '14:00', kind: 'remind' as const, text: 'ask Tunde for the roastery b-roll' },
    ],
};

/**
 * Activity levels, 0–4, in column-major order (each run of 7 is one week).
 * Stands in for a grouped count over `activity_logs` — which is already
 * collecting, except from boards.ts, so notes contribute nothing to it yet.
 */
export const ACTIVITY = (() => {
    const COLS = 18;
    const ROWS = 7;
    let seed = 1234;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff), seed / 0x7fffffff);
    const out: number[] = [];
    for (let c = 0; c < COLS; c++) {
        const density = 0.18 + (c / COLS) * 0.55;
        for (let r = 0; r < ROWS; r++) {
            let lv = rnd() < density ? 1 + Math.floor(rnd() * 4) : 0;
            if (c >= COLS - 2 && r < 5) lv = Math.max(lv, 3);
            if (r >= 5 && rnd() < 0.6) lv = Math.max(0, lv - 2);
            out.push(lv);
        }
    }
    return { cells: out, cols: COLS, rows: ROWS };
})();

/** Last 14 days, for the compact strip on Home. */
export const STREAK = { days: 12, strip: [1, 0, 2, 1, 3, 0, 2, 3, 4, 2, 3, 4, 4, 3] };

export const STATS = [
    { value: '64', label: 'notes jotted' },
    { value: '23', label: 'posts published' },
    { value: '36%', label: 'notes that shipped' },
];
