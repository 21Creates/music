export const FEATURE_KEYS = {
  MIX_MODE: 'mix_mode',
  OFFLINE_ACCESS: 'offline_access',
  GAME_ACCESS: 'game_access',
  CHAT_ATTACHMENTS: 'chat_attachments',
  AD_FREE: 'ad_free',
  HI_RES_AUDIO: 'hi_res_audio',
  CUSTOM_THEMES: 'custom_themes',
  UNLIMITED_ROOMS: 'unlimited_rooms',
  LYRICS_VIEW: 'lyrics_view',
  EQUALIZER: 'equalizer',
  PRIORITY_QUEUE: 'priority_queue',
  CUSTOM_ROOM_URL: 'custom_room_url',
} as const;

export type FeatureKey = typeof FEATURE_KEYS[keyof typeof FEATURE_KEYS];

export const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR', 'CAD'] as const;

export function formatPrice(price: number, currency: string): string {
  const symbols: Record<string, string> = {
    NGN: '\u20A6',
    USD: '$',
    GBP: '\u00A3',
    EUR: '\u20AC',
    CAD: 'CA$',
  };
  const sym = symbols[currency] || `${currency} `;
  const formatted = Number(price || 0).toLocaleString('en-US', {
    minimumFractionDigits: price % 1 ? 2 : 0,
    maximumFractionDigits: 2,
  });
  return `${sym}${formatted}`;
}
