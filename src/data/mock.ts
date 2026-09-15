/**
 * Fixtures standing in for the API.
 *
 * What is left is copy, not data: the onboarding questions and the price
 * lists, neither of which comes from an endpoint. Everything that does —
 * notes, posts, channels, the calendar, activity, the signed-in user — is
 * fetched through `@/api`.
 */

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
