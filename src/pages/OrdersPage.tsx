import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button, EmptyState, Eyebrow, LoadingState, StatusLabel } from '../components/DesignSystem';
import { useAuth } from '../auth/useAuthHook';
import { formatCurrency, formatOrderDate, listBuyerOrders } from '../services/checkout.service';
import { listShipmentSummariesForOrders } from '../services/shipment.service';
import { BuyerOrderHistoryEntry, paymentStatusLabel } from '../types/checkout';
import { shipmentStatusLabel } from '../types/shipment';

const statusTone = (status: string | null | undefined): 'success' | 'warning' | 'neutral' => {
  const value = (status || '').toLowerCase();
  if (value === 'delivered' || value === 'success' || value === 'shipped') return 'success';
  if (value === 'confirmed' || value === 'paid') return 'success';
  if (value === 'failed' || value === 'cancelled' || value === 'canceled') return 'warning';
  return 'neutral';
};

const OrdersPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<BuyerOrderHistoryEntry[]>([]);
  const [shipmentSummary, setShipmentSummary] = useState<Map<string, { count: number; latestStatus: string | null }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    listBuyerOrders()
      .then(async (next) => {
        setOrders(next);
        try {
          const summaries = await listShipmentSummariesForOrders(next.map((entry) => entry.order.id));
          setShipmentSummary(summaries);
        } catch {
          setShipmentSummary(new Map());
        }
      })
      .catch(() => setError('Your orders could not be loaded. Please try again.'))
      .finally(() => setLoading(false));
  }, [authLoading, user]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Gathering your orders" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Sign in to see your orders." description="Past purchases are saved to the same buyer account you use at checkout.">
          <Button onClick={() => navigate('/login', { state: { from: { pathname: '/orders' } } })}>Sign in</Button>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <Eyebrow>Your account</Eyebrow>
      <h1 className="mt-2 font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl md:mt-3">Past orders</h1>
      <p className="mt-3 max-w-xl text-sm leading-7 text-stone-600">
        Orders placed with {profile?.full_name || user.email}. Open an order to track delivery or review payment.
      </p>

      {error && <p className="mt-8 rounded-xl bg-mustard/15 px-4 py-3 text-sm leading-6 text-stone-800">{error}</p>}

      {!error && orders.length === 0 ? (
        <div className="mt-10 space-y-6">
          <EmptyState
            title="No orders yet."
            description="When you complete checkout with this account, those orders will appear here."
          >
            <Button onClick={() => navigate('/marketplace')}>Browse marketplace</Button>
          </EmptyState>
        </div>
      ) : (
        <div className="mt-10 space-y-5">
          {orders.map((entry) => {
            const paid = (entry.payment?.status || '').toLowerCase() === 'success';
            const preview = entry.items[0];
            const summary = shipmentSummary.get(entry.order.id);
            return (
              <article key={entry.order.id} className="panel overflow-hidden p-5 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                      {formatOrderDate(entry.order.createdAt)} · #{entry.order.id.slice(0, 8)}
                    </p>
                    <h2 className="mt-2 font-display text-2xl text-charcoal">
                      {preview?.title || 'Handmade order'}
                      {entry.items.length > 1 ? ` +${entry.items.length - 1}` : ''}
                    </h2>
                    {summary?.latestStatus && summary.count > 1 && (
                      <p className="mt-2 text-sm text-stone-600">
                        Delivery: {summary.count} shipments
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3">
                    {summary?.latestStatus && summary.count === 1 && (
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Delivery status</p>
                        <div className="mt-1.5">
                          <StatusLabel tone={
                            (summary.latestStatus || '').toLowerCase() === 'delivered'
                              ? 'success'
                              : (summary.latestStatus || '').toLowerCase() === 'pending' || (summary.latestStatus || '').toLowerCase() === 'seller_processing'
                                ? 'neutral'
                                : 'warning'
                          }>
                            {shipmentStatusLabel(summary.latestStatus)}
                          </StatusLabel>
                        </div>
                      </div>
                    )}
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Payment</p>
                      <div className="mt-1.5">
                        <StatusLabel tone={statusTone(entry.payment?.status)}>{paymentStatusLabel(entry.payment?.status)}</StatusLabel>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {entry.items.map((item) => (
                    <div key={item.id} className="flex items-center gap-4">
                      <Link to={`/marketplace/${item.productId}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-sand">
                        {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/marketplace/${item.productId}`} className="truncate text-sm font-semibold text-charcoal hover:text-terracotta">
                          {item.title || 'Selected work'}
                        </Link>
                        <p className="mt-1 text-xs text-stone-500">Qty {item.quantity} · {formatCurrency(item.subtotal)}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-stone-200 pt-4">
                  <p className="font-display text-2xl text-charcoal">{formatCurrency(entry.payment?.amount ?? entry.order.totalAmount)}</p>
                  <div className="flex flex-wrap gap-2">
                    {paid ? (
                      <>
                        <Button onClick={() => navigate(`/orders/${entry.order.id}#tracking`)}>Track order</Button>
                        <Button variant="light" onClick={() => navigate(`/orders/${entry.order.id}`)}>View order</Button>
                      </>
                    ) : (
                      <Button onClick={() => navigate(`/checkout/payment/${entry.order.id}`)}>Continue payment</Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
