import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { PremiumFeature, UserSubscription, AppSettings } from '@/types';

interface PremiumContextValue {
  isPremium: boolean;
  subscription: UserSubscription | null;
  features: PremiumFeature[];
  featureMap: Record<string, boolean>;
  settings: AppSettings | null;
  loading: boolean;
  hasFeature: (feature: string) => boolean;
  refresh: () => Promise<void>;
}

const PremiumContext = createContext<PremiumContextValue | null>(null);

export function usePremium() {
  const ctx = useContext(PremiumContext);
  if (!ctx) throw new Error('usePremium must be used within PremiumProvider');
  return ctx;
}

export function PremiumProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [featureList, setFeatureList] = useState<PremiumFeature[]>([]);
  const [featureMap, setFeatureMap] = useState<Record<string, boolean>>({});
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [serverTier, setServerTier] = useState<'premium' | 'free'>('free');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    await supabase.rpc('expire_subscriptions');

    const [subRes, featRes, settingsRes, tierRes] = await Promise.all([
      supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.from('premium_features').select('*'),
      supabase.from('app_settings').select('id, max_rooms_free, max_rooms_premium, premium_popup_copy, premium_price, premium_currency, payment_webhook_url, discovery_enabled').eq('id', 1).maybeSingle(),
      supabase.rpc('get_entitlements', { p_user_id: user.id }),
    ]);

    if (subRes.data) setSubscription(subRes.data as UserSubscription);
    else setSubscription(null);

    if (featRes.data) {
      const list = featRes.data as PremiumFeature[];
      setFeatureList(list);
      const map: Record<string, boolean> = {};
      list.forEach((f) => { map[f.feature] = f.is_premium; });
      setFeatureMap(map);
    }

    if (settingsRes.data) setSettings(settingsRes.data as AppSettings);
    if (tierRes.data) setServerTier(tierRes.data as 'premium' | 'free');

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!user) {
      setSubscription(null);
      setFeatureList([]);
      setFeatureMap({});
      setSettings(null);
      return;
    }
    refresh();
  }, [user, refresh]);

  const isPremium = serverTier === 'premium';

  const hasFeature = useCallback((feature: string) => {
    if (!featureMap[feature]) return true;
    return isPremium;
  }, [featureMap, isPremium]);

  return (
    <PremiumContext.Provider value={{ isPremium, subscription, features: featureList, featureMap, settings, loading, hasFeature, refresh }}>
      {children}
    </PremiumContext.Provider>
  );
}
