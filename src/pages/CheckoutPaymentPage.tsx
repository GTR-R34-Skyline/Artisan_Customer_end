import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react';
import { Button, EmptyState, Eyebrow, LoadingState, StatusLabel } from '../components/DesignSystem';
import {
  createRazorpayCheckoutSession,
  formatCurrency,
  getCheckoutSnapshot,
  markRazorpayPaymentFailed,
  retryCheckoutPayment,
  verifyRazorpayPayment,
} from '../services/checkout.service';
import { CheckoutSnapshot, paymentStatusLabel } from '../types/checkout';

type PaymentScreen = 'ready' | 'preparing' | 'checkout' | 'verifying' | 'success' | 'failed' | 'cancelled';

interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  theme?: { color?: string };
  modal?: {
    ondismiss?: () => void;
  };
  handler: (response: RazorpaySuccessResponse) => void;
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

const loadRazorpayScript = (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-artisan-razorpay="1"]');
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => reject(new Error('Razorpay could not be loaded.')), { once: true });
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.artisanRazorpay = '1';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay could not be loaded.'));
    document.body.appendChild(script);
  });

const CheckoutPaymentPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [snapshot, setSnapshot] = useState<CheckoutSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [screen, setScreen] = useState<PaymentScreen>('ready');
  const [processing, setProcessing] = useState(false);
  const [resultMessage, setResultMessage] = useState('');

  const loadSnapshot = useCallback(async () => {
    if (!orderId) return;
    const next = await getCheckoutSnapshot(orderId);
    setSnapshot(next);

    const paymentStatus = (next.payment?.status || '').toLowerCase();
    if (paymentStatus === 'success') {
      setScreen('success');
    } else if (paymentStatus === 'failed') {
      setScreen('failed');
    } else {
      setScreen('ready');
    }
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    setLoading(true);
    setError('');
    loadSnapshot()
      .catch(() => setError('This payment could not be loaded.'))
      .finally(() => setLoading(false));
  }, [orderId, loadSnapshot]);

  const handlePay = async () => {
    if (!orderId || !snapshot?.payment) return;

    setProcessing(true);
    setScreen('preparing');
    setError('');
    setResultMessage('');

    try {
      await loadRazorpayScript();
      const session = await createRazorpayCheckoutSession(orderId);
      if (!window.Razorpay) {
        throw new Error('Razorpay Checkout is unavailable in this browser.');
      }

      setScreen('checkout');

      const rzp = new window.Razorpay({
        key: session.keyId,
        amount: session.amountPaise,
        currency: session.currency,
        name: 'ARTISAN',
        description: `Order ${session.orderId.slice(0, 8)}`,
        order_id: session.razorpayOrderId,
        prefill: {
          name: session.prefill.name || undefined,
          email: session.prefill.email || undefined,
          contact: session.prefill.contact || undefined,
        },
        theme: { color: '#c45c26' },
        modal: {
          ondismiss: () => {
            setScreen('cancelled');
            setResultMessage('Payment was cancelled. Your order is not marked as paid.');
            setProcessing(false);
          },
        },
        handler: (response) => {
          void (async () => {
            setScreen('verifying');
            setProcessing(true);
            try {
              const result = await verifyRazorpayPayment({
                orderId,
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              await loadSnapshot();
              const paymentStatus = String(result.payment_status || '').toLowerCase();
              if (paymentStatus === 'success') {
                setScreen('success');
                setResultMessage('Payment verified successfully.');
              } else {
                setScreen('failed');
                setResultMessage('Payment verification did not complete.');
              }
            } catch (verifyError) {
              setScreen('failed');
              setError(
                verifyError instanceof Error
                  ? verifyError.message
                  : 'Payment verification failed.',
              );
            } finally {
              setProcessing(false);
            }
          })();
        },
      });

      rzp.on('payment.failed', (response) => {
        void (async () => {
          try {
            await markRazorpayPaymentFailed(orderId);
            await loadSnapshot();
          } catch {
            // Local failure UI still shows even if status update fails.
          }
          setScreen('failed');
          setResultMessage(response.error?.description || 'The payment failed.');
          setProcessing(false);
        })();
      });

      rzp.open();
    } catch (payError) {
      setScreen('failed');
      setError(payError instanceof Error ? payError.message : 'Payment could not be started.');
      setProcessing(false);
    }
  };

  const handleRetry = async () => {
    if (!orderId) return;
    setProcessing(true);
    setError('');
    try {
      await retryCheckoutPayment(orderId);
      await loadSnapshot();
      setScreen('ready');
      setResultMessage('');
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : 'Payment could not be retried.');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <LoadingState label="Opening payment" />
      </div>
    );
  }

  if (error && !snapshot) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Payment unavailable." description={error} />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Payment unavailable." description="This order could not be found." />
      </div>
    );
  }

  const amount = snapshot.payment?.amount ?? snapshot.order.totalAmount;

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <Eyebrow>Secure payment</Eyebrow>
      <h1 className="mt-3 font-display text-4xl tracking-[-0.03em] text-charcoal sm:text-5xl">Complete payment</h1>
      <p className="mt-4 max-w-xl text-sm leading-7 text-stone-600">
        Pay securely with Razorpay. UPI, cards, and other enabled methods are available in the Razorpay checkout.
      </p>

      <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_0.45fr]">
        <section className="panel p-6 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">Amount payable</p>
              <p className="mt-2 font-display text-5xl text-charcoal">{formatCurrency(amount)}</p>
            </div>
            <StatusLabel tone={screen === 'success' ? 'success' : screen === 'failed' ? 'warning' : 'neutral'}>
              {paymentStatusLabel(snapshot.payment?.status)}
            </StatusLabel>
          </div>

          {screen === 'ready' && (
            <div className="mt-10 space-y-6">
              <p className="text-sm leading-7 text-stone-600">
                You will be redirected to Razorpay Checkout to complete this payment. Your order is marked paid only after
                ARTISAN verifies the payment on the server.
              </p>
              {error && <p className="border-l-2 border-amber-700 pl-4 text-sm leading-6 text-stone-700">{error}</p>}
              <Button onClick={handlePay} disabled={processing} className="w-full sm:w-auto">
                Pay {formatCurrency(amount)}
              </Button>
            </div>
          )}

          {(screen === 'preparing' || screen === 'checkout' || screen === 'verifying') && (
            <div className="mt-12 flex items-center gap-4 text-sm text-stone-600">
              <Loader2 className="h-5 w-5 animate-spin" strokeWidth={1.5} />
              {screen === 'preparing' && 'Preparing secure payment…'}
              {screen === 'checkout' && 'Waiting for Razorpay Checkout…'}
              {screen === 'verifying' && 'Verifying payment with ARTISAN…'}
            </div>
          )}

          {screen === 'success' && (
            <div className="mt-12 space-y-4">
              <div className="flex items-start gap-3 text-forest">
                <CheckCircle2 className="mt-0.5 h-5 w-5" strokeWidth={1.5} />
                <div>
                  <p className="font-medium">{resultMessage || 'Payment completed successfully.'}</p>
                  {snapshot.payment?.transactionId && (
                    <p className="mt-2 text-sm text-stone-600">Payment reference: {snapshot.payment.transactionId}</p>
                  )}
                </div>
              </div>
              <Button onClick={() => navigate(`/checkout/confirmation/${snapshot.order.id}`)}>View confirmation</Button>
            </div>
          )}

          {screen === 'failed' && (
            <div className="mt-12 space-y-4">
              <div className="flex items-start gap-3 text-amber-800">
                <XCircle className="mt-0.5 h-5 w-5" strokeWidth={1.5} />
                <div>
                  <p className="font-medium">{resultMessage || error || 'The payment failed.'}</p>
                  <p className="mt-2 text-sm text-stone-600">Your order was not marked as paid and stock was not reduced.</p>
                </div>
              </div>
              <Button onClick={handleRetry} disabled={processing}>
                <RefreshCw className="h-4 w-4" strokeWidth={1.5} /> Retry payment
              </Button>
            </div>
          )}

          {screen === 'cancelled' && (
            <div className="mt-12 space-y-4">
              <p className="text-sm leading-7 text-stone-600">
                {resultMessage || 'Payment was cancelled. You can try again when you are ready.'}
              </p>
              <Button onClick={() => { setScreen('ready'); setResultMessage(''); }} disabled={processing}>
                Try again
              </Button>
            </div>
          )}
        </section>

        <aside className="panel h-fit p-6">
          <Eyebrow>Order</Eyebrow>
          <p className="mt-4 text-sm text-stone-500">Order #{snapshot.order.id.slice(0, 8)}</p>
          <div className="mt-6 space-y-4">
            {snapshot.items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-4 text-sm">
                <div>
                  <p className="text-stone-950">{item.title || 'Selected work'}</p>
                  <p className="mt-1 text-stone-500">Qty {item.quantity}</p>
                </div>
                <p className="text-stone-950">{formatCurrency(item.subtotal)}</p>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default CheckoutPaymentPage;
