import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CircleCheck, CircleAlert, LoaderCircle, ArrowRight, Receipt } from 'lucide-react';
import { verifyPayment } from '../services/billingService';
import { Button } from '../components/ui';
import BrandMark from '../components/BrandMark';
import { formatCedis } from '../utils/billing';

const MAX_TRIES = 8;

export default function BillingCallback() {
  const [params] = useSearchParams();
  const provider = params.get('provider') === 'flutterwave' ? 'flutterwave' : 'paystack';
  const reference = params.get('reference') || params.get('trxref') || params.get('tx_ref') || '';
  const transactionId = params.get('transaction_id') || '';
  const flwStatus = params.get('status');
  const campaignId = params.get('campaign');
  const [state, setState] = useState({ phase: 'checking' });
  const tries = useRef(0);

  useEffect(() => {
    let timer;
    let cancelled = false;

    if (provider === 'flutterwave' && flwStatus === 'cancelled') {
      setState({ phase: 'failed', message: 'You cancelled the payment. No money was taken.' });
      return undefined;
    }
    if (!reference && !transactionId) {
      setState({ phase: 'failed', message: 'We could not find a payment reference in this link.' });
      return undefined;
    }

    const check = async () => {
      tries.current += 1;
      try {
        const res = await verifyPayment({ provider, reference, transactionId });
        if (cancelled) return;
        if (res.paid && res.fulfilled) {
          setState({ phase: 'success', data: res });
          return;
        }
        if (res.paid && !res.fulfilled) {
          setState({ phase: 'failed', message: res.message || 'Payment received but not applied yet. Contact support with your reference.' });
          return;
        }
        if (['failed', 'abandoned', 'reversed', 'cancelled'].includes(res.status)) {
          setState({ phase: 'failed', message: 'The payment was not completed. No money was taken — you can try again.' });
          return;
        }
        if (tries.current < MAX_TRIES) {
          setState({ phase: 'waiting' });
          timer = setTimeout(check, 3000);
        } else {
          setState({ phase: 'pending', message: 'Your payment is still processing. Approve the MoMo prompt on your phone if you haven’t. Your plan activates automatically once it clears.' });
        }
      } catch (err) {
        if (cancelled) return;
        if (tries.current < 3) {
          timer = setTimeout(check, 3000);
        } else {
          setState({ phase: 'pending', message: err.message || 'We could not confirm the payment yet. It will activate automatically once it clears.' });
        }
      }
    };
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [provider, reference, transactionId, flwStatus]);

  const dashboard = campaignId ? `/dashboard/${campaignId}` : '/dashboard';
  const billing = campaignId ? `/dashboard/${campaignId}/billing` : '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-canvas">
      <div className="card p-8 sm:p-10 w-full max-w-md text-center animate-fade-up">
        <div className="flex justify-center"><BrandMark size={40} /></div>

        {(state.phase === 'checking' || state.phase === 'waiting') && (
          <>
            <LoaderCircle className="w-10 h-10 mx-auto mt-8 text-link animate-spin" />
            <h1 className="mt-5 text-xl font-bold text-ink">Confirming your payment…</h1>
            <p className="mt-2 text-sm text-ink-2">
              {state.phase === 'waiting' ? 'Waiting for your provider. If you paid with MoMo, approve the prompt on your phone.' : 'This usually takes a few seconds.'}
            </p>
          </>
        )}

        {state.phase === 'success' && (
          <>
            <span className="mx-auto mt-8 w-14 h-14 rounded-full bg-success-soft text-success flex items-center justify-center">
              <CircleCheck className="w-8 h-8" />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold text-ink">
              {state.data.product === 'spotlight' ? 'Spotlight is live!' : 'Welcome to CampaignHub Pro'}
            </h1>
            <p className="mt-2 text-ink-2">
              {state.data.itemName} for “{state.data.campaignTitle}”.
            </p>
            <div className="mt-6 rounded-xl bg-surface-2 p-4 text-sm text-left space-y-1.5">
              <p className="flex justify-between"><span className="text-ink-3">Amount</span><span className="font-semibold text-ink">{formatCedis(state.data.amount)}</span></p>
              <p className="flex justify-between gap-3"><span className="text-ink-3">Reference</span><span className="font-medium text-ink num text-xs break-all">{state.data.reference}</span></p>
            </div>
            <Button to={state.data.campaignId ? `/dashboard/${state.data.campaignId}` : dashboard} block size="lg" className="mt-6" iconRight={ArrowRight}>
              Go to my campaign
            </Button>
            <Button to={state.data.campaignId ? `/dashboard/${state.data.campaignId}/billing` : billing} variant="ghost" icon={Receipt} className="mt-2">
              View receipt
            </Button>
          </>
        )}

        {(state.phase === 'failed' || state.phase === 'pending') && (
          <>
            <span className={`mx-auto mt-8 w-14 h-14 rounded-full flex items-center justify-center ${state.phase === 'failed' ? 'bg-danger-soft text-danger' : 'bg-warning-soft text-warning'}`}>
              <CircleAlert className="w-8 h-8" />
            </span>
            <h1 className="mt-5 text-xl font-bold text-ink">{state.phase === 'failed' ? 'Payment not completed' : 'Payment processing'}</h1>
            <p className="mt-2 text-sm text-ink-2">{state.message}</p>
            {reference && <p className="mt-3 text-xs text-ink-3 num break-all">Reference: {reference}</p>}
            <div className="mt-6 flex flex-col gap-2">
              <Button to={billing}>{state.phase === 'failed' ? 'Try again' : 'Back to billing'}</Button>
              <Button to="/support" variant="ghost">Contact support</Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
