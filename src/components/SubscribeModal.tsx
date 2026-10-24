import { useState, useEffect } from 'react';
import { Crown, X, Upload, Loader2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { usePremium } from '@/context/PremiumContext';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/lib/premiumFeatures';
import type { PaymentDetails, UserSubscription } from '@/types';

export default function SubscribeModal({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const { settings, refresh } = usePremium();
  const [payments, setPayments] = useState<PaymentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [paymentRef, setPaymentRef] = useState('');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [existingSub, setExistingSub] = useState<UserSubscription | null>(null);

  useEffect(() => {
    (async () => {
      const [payRes, subRes] = await Promise.all([
        supabase.from('payment_details').select('*').eq('is_active', true).order('created_at', { ascending: false }),
        user ? supabase.from('user_subscriptions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(1).maybeSingle() : Promise.resolve({ data: null }),
      ]);
      setPayments((payRes.data || []) as PaymentDetails[]);
      setExistingSub(subRes.data as UserSubscription | null);
      setLoading(false);
    })();
  }, [user]);

  async function handleSubmit() {
    if (!user || !paymentRef.trim()) return;
    setSubmitting(true);
    setError(null);

    let receiptPath: string | null = null;
    if (receiptFile) {
      const ext = receiptFile.name.split('.').pop();
      const path = `${user.id}/receipt_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from('vinyl-receipts').upload(path, receiptFile);
      if (upErr) {
        setError(upErr.message);
        setSubmitting(false);
        return;
      }
      receiptPath = path;
    }

    const { data: insData, error: insErr } = await supabase.from('user_subscriptions').insert({
      user_id: user.id,
      status: 'pending',
      payment_ref: paymentRef.trim(),
      payment_amount: settings?.premium_price || 0,
      receipt_path: receiptPath,
      receipt_status: 'pending',
    }).select('id').single();

    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }

    const subId = insData?.id as string | undefined;

    if (subId) {
      try {
        const fnUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-subscription-webhook`;
        const { data: session } = await supabase.auth.getSession();
        const res = await fetch(fnUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session?.access_token || ''}`,
          },
          body: JSON.stringify({ subscriptionId: subId, userId: user.id }),
        });
        if (!res.ok) {
          await supabase.rpc('update_subscription_webhook_status', { p_sub_id: subId, p_status: 'failed' });
        }
      } catch {
        if (subId) {
          await supabase.rpc('update_subscription_webhook_status', { p_sub_id: subId, p_status: 'failed' });
        }
      }
    }

    setSuccess(true);
    refresh();
    setSubmitting(false);
  }

  const popupCopy = settings?.premium_popup_copy || { title: 'Upgrade to Premium', body: 'Unlock all features', cta_label: 'Subscribe' };
  const price = settings?.premium_price || 0;
  const currency = settings?.premium_currency || 'NGN';
  const hasPaymentConfig = payments.length > 0 && price > 0;

  if (loading) return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"><Loader2 className="w-6 h-6 animate-spin text-muted" /></div>;

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="glass-card w-full max-w-md p-6 text-center animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h2 className="text-lg font-bold mb-2">Submission Received!</h2>
          <p className="text-sm text-muted mb-4">Your payment receipt has been submitted. An admin will review and approve your premium subscription shortly.</p>
          <button onClick={onClose} className="btn-primary w-full">Done</button>
        </div>
      </div>
    );
  }

  if (existingSub && existingSub.receipt_status === 'pending') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="glass-card w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><Clock className="w-5 h-5 text-amber-400" /><h2 className="text-lg font-bold">Pending Approval</h2></div>
            <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/[0.05]"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-muted mb-4">Your subscription request is being reviewed. You'll get access once an admin approves it.</p>
          <div className="glass-card p-3 bg-ink-800/50 text-sm">
            <div className="flex justify-between py-1"><span className="text-muted">Payment Ref</span><span>{existingSub.payment_ref}</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Status</span><span className="badge-gold">Pending</span></div>
            <div className="flex justify-between py-1"><span className="text-muted">Submitted</span><span>{new Date(existingSub.created_at).toLocaleDateString()}</span></div>
          </div>
        </div>
      </div>
    );
  }

  if (existingSub && existingSub.receipt_status === 'rejected') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
        <div className="glass-card w-full max-w-md p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2"><XCircle className="w-5 h-5 text-red-400" /><h2 className="text-lg font-bold">Submission Rejected</h2></div>
            <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/[0.05]"><X className="w-5 h-5" /></button>
          </div>
          <p className="text-sm text-muted mb-4">Your previous submission was rejected. Please submit a new payment receipt.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="glass-card w-full max-w-lg p-6 animate-scale-in max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold">{popupCopy.title}</h2>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-muted hover:text-white hover:bg-white/[0.05] transition-colors"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-sm text-muted mb-5">{popupCopy.body}</p>

        {price > 0 && (
          <div className="glass-card p-4 mb-4 bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase">Premium Price</span>
              <span className="text-2xl font-extrabold text-amber-400">{formatPrice(price, currency)}</span>
            </div>
          </div>
        )}

        {!hasPaymentConfig ? (
          <div className="glass-card p-4 mb-4 bg-ink-800/50">
            <p className="text-sm text-muted text-center">Payment details are being finalized. Please check back soon.</p>
          </div>
        ) : (
          payments.length > 0 && (
            <div className="glass-card p-4 mb-4 bg-ink-800/50">
              <h3 className="text-xs font-semibold text-muted mb-3">Payment Instructions</h3>
              {payments.map((p) => (
                <div key={p.id} className="text-sm space-y-1">
                  {p.custom_heading && <p className="font-medium text-electric-400">{p.custom_heading}</p>}
                  <div className="flex justify-between"><span className="text-muted">Bank</span><span>{p.bank_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Account Name</span><span>{p.account_name}</span></div>
                  <div className="flex justify-between"><span className="text-muted">Account Number</span><span className="font-mono">{p.account_number}</span></div>
                  {p.routing_number && <div className="flex justify-between"><span className="text-muted">Routing</span><span className="font-mono">{p.routing_number}</span></div>}
                  {p.instructions && <p className="text-xs text-muted-2 mt-2">{p.instructions}</p>}
                  {p.custom_subtext && <p className="text-xs text-muted-2 mt-1">{p.custom_subtext}</p>}
                  {p.footer_note && <p className="text-xs text-muted-2 mt-2 pt-2 border-t border-white/[0.06]">{p.footer_note}</p>}
                </div>
              ))}
            </div>
          )
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Payment Reference Number</label>
            <input value={paymentRef} onChange={(e) => setPaymentRef(e.target.value)} className="input-field" placeholder="Transaction ID or receipt number" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1.5">Receipt Image (optional)</label>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
              className="input-field !py-2.5 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:bg-electric-500 file:text-white file:text-xs file:font-semibold hover:file:bg-electric-400"
            />
            {receiptFile && <p className="text-xs text-muted mt-1.5 flex items-center gap-1"><Upload className="w-3 h-3" /> {receiptFile.name}</p>}
          </div>
          {error && <div className="px-4 py-3 rounded-xl bg-magenta-500/10 border border-magenta-500/20 text-magenta-400 text-sm">{error}</div>}
          <button onClick={handleSubmit} disabled={submitting || !paymentRef.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : <><Crown className="w-4 h-4" /> {popupCopy.cta_label}</>}
          </button>
        </div>
      </div>
    </div>
  );
}
