export const STRIPE_PRICE_IDS = {
  start:   'price_1SnTgNFkPBkTRBNfbrMpB1Qr',
  pro:     'price_1SnTjVFkPBkTRBNfm1ZxQfdn',
  premium: 'price_1SnTmZFkPBkTRBNfAzqkRru9',
} as const;

export const PRICE_TO_PLAN: Record<string, { type: string; rank: number }> = {
  [STRIPE_PRICE_IDS.start]:   { type: 'start',   rank: 1 },
  [STRIPE_PRICE_IDS.pro]:     { type: 'pro',      rank: 2 },
  [STRIPE_PRICE_IDS.premium]: { type: 'premium',  rank: 3 },
};

export const PLAN_LIMITS: Record<string, { usage: number; email: number; requests: number }> = {
  gratis:  { usage: 10,     email: 1,      requests: 1  },
  start:   { usage: 300,    email: 5,      requests: 30 },
  pro:     { usage: 999999, email: 15,     requests: 50 },
  premium: { usage: 999999, email: 999999, requests: 100 },
};
