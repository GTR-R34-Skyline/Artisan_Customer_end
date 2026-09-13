import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button, EmptyState, Eyebrow, LoadingState, StatusLabel } from '../components/DesignSystem';
import { EmptyShipmentState, ShipmentTracker } from '../components/orders/ShipmentTracker';
import { useAuth } from '../auth/useAuthHook';
import { formatCurrency, formatOrderDate, getBuyerOrder } from '../services/checkout.service';
import { listShipmentsForOrder } from '../services/shipment.service';
import { BuyerOrderHistoryEntry, paymentStatusLabel } from '../types/checkout';
import { BuyerShipment, shipmentStatusLabel } from '../types/shipment';

const statusTone = (status: string | null | undefined): 'success' | 'warning' | 'neutral' => {
  const value = (status || '').toLowerCase();
  if (value === 'delivered' || value === 'success' || value === 'shipped') return 'success';
  if (value === 'failed' || value === 'cancelled' || value === 'canceled') return 'warning';
  return 'neutral';
};

const shipmentTone = (status: string | null | undefined): 'success' | 'warning' | 'neutral' => {
  const value = (status || '').toLowerCase();
  if (value === 'delivered') return 'success';
  if (value === 'pending' || value === 'seller_processing') return 'neutral';
  return 'warning';
};

const OrderDetailPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [entry, setEntry] = useState<BuyerOrderHistoryEntry | null>(null);
  const [shipments, setShipments] = useState<BuyerShipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [shipmentError, setShipmentError] = useState('');

  const load = useCallback(async (silent = false) => {
    if (!orderId) return;
    if (!silent) {
      setLoading(true);
      setError('');
      setShipmentError('');
    } else {
      setRefreshing(true);
    }

    try {
      const next = await getBuyerOrder(orderId);
      if (!next) {
        setEntry(null);
        setShipments([]);
        setError('This order could not be found.');
        return;
      }
      setEntry(next);

      try {
        // Always query with the real orders.id UUID from the loaded order — never a display short id.
        const nextShipments = await listShipmentsForOrder(next.order.id);
        setShipments(nextShipments);
        setShipmentError('');
      } catch (loadError) {
        setShipments([]);
        setShipmentError(
          loadError instanceof Error && loadError.message
            ? loadError.message
            : 'Shipment tracking could not be loaded right now. This is not the same as “no shipment yet”.',
        );
      }
    } catch {
      setEntry(null);
      setError('This order could not be loaded. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    void load();
  }, [authLoading, user, load]);

  useEffect(() => {
    if (loading || !entry) return;
    if (window.location.hash === '#tracking') {
      const node = document.getElementById('tracking');
      node?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, entry]);

  const vendorLabels = useMemo(() => {
    const map = new Map<string, string>();
    (entry?.items || []).forEach((item) => {
      if (!item.vendorId) return;
      if (!map.has(item.vendorId)) {
        map.set(item.vendorId, item.title ? `For ${item.title}` : 'Artisan shipment');
      }
    });
    return map;
  }, [entry]);

  if (authLoading || loading) {
    return <div className="mx-auto max-w-market px-4 py-16 lg:px-8"><LoadingState label="Opening your order" /></div>;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Sign in to track your order." description="Order tracking is available on the same buyer account used at checkout.">
          <Button onClick={() => navigate('/login', { state: { from: { pathname: `/orders/${orderId || ''}` } } })}>Sign in</Button>
        </EmptyState>
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="mx-auto max-w-market px-4 py-16 lg:px-8">
        <EmptyState title="Order unavailable." description={error || 'This order could not be found.'}>
          <Button variant="light" onClick={() => navigate('/orders')}>Back to orders</Button>
        </EmptyState>
      </div>
    );
  }

  const paid = (entry.payment?.status || '').toLowerCase() === 'success';
  // Delivery/tracking status must come from shipments.status only — never orders.status.
  const deliveryStatus = shipments.length === 1
    ? shipments[0].status
    : null;
  const deliverySummary = shipments.length === 1
    ? shipmentStatusLabel(shipments[0].status)
    : shipments.length > 1
      ? `${shipments.length} shipments`
      : null;

  return (
    <div className="mx-auto max-w-market px-4 pb-20 pt-8 lg:px-8 lg:pt-12">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => navigate('/orders')} className="text-sm font-semibold text-royal hover:text-terracotta">
          ← All orders
        </button>
        <button
          type="button"
          onClick={() => void load(true)}
          className="text-sm font-semibold text-stone-600 underline decoration-stone-300 underline-offset-4 hover:text-royal"
          disabled={refreshing}
        >
          {refreshing ? 'Refreshing…' : 'Refresh tracking'}
        </button>
      </div>

      <Eyebrow>Order detail</Eyebrow>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="font-display text-[1.85rem] tracking-[-0.03em] text-charcoal sm:text-5xl">
            Order #{entry.order.id.slice(0, 8)}
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Placed {formatOrderDate(entry.order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Delivery status</p>
            <div className="mt-1.5">
              {deliveryStatus ? (
                <StatusLabel tone={shipmentTone(deliveryStatus)}>{shipmentStatusLabel(deliveryStatus)}</StatusLabel>
              ) : shipments.length > 1 ? (
                <StatusLabel tone="neutral">{deliverySummary}</StatusLabel>
              ) : (
                <StatusLabel tone="neutral">Preparing for dispatch</StatusLabel>
              )}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Payment</p>
            <div className="mt-1.5">
              <StatusLabel tone={statusTone(entry.payment?.status)}>{paymentStatusLabel(entry.payment?.status)}</StatusLabel>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-8">
        <div className="space-y-6">
          <section id="tracking" className="scroll-mt-28 space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl tracking-[-0.03em] text-charcoal">Delivery tracking</h2>
            </div>
            <p className="text-sm leading-6 text-stone-600">
              Shipment progress below uses live courier status — separate from the order payment status above.
            </p>

            {shipmentError && (
              <p className="rounded-xl bg-mustard/15 px-4 py-3 text-sm leading-6 text-stone-800">{shipmentError}</p>
            )}

            {!shipmentError && shipments.length === 0 && <EmptyShipmentState />}

            {shipments.map((shipment, index) => (
              <ShipmentTracker
                key={shipment.id}
                shipment={shipment}
                orderPlacedAt={entry.order.createdAt}
                index={index}
                total={shipments.length}
                vendorLabel={shipment.vendorId ? vendorLabels.get(shipment.vendorId) || null : null}
              />
            ))}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Pieces in this order</p>
            <div className="mt-4 space-y-3">
              {entry.items.map((item) => (
                <div key={item.id} className="flex items-center gap-3">
                  <Link to={`/marketplace/${item.productId}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-sand">
                    {item.image ? <img src={item.image} alt="" className="h-full w-full object-cover" /> : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link to={`/marketplace/${item.productId}`} className="line-clamp-2 text-sm font-semibold text-charcoal hover:text-terracotta">
                      {item.title || 'Selected work'}
                    </Link>
                    <p className="mt-0.5 text-xs text-stone-500">Qty {item.quantity} · {formatCurrency(item.subtotal)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 border-t border-stone-200 pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Total</p>
              <p className="mt-1 font-display text-3xl text-charcoal">
                {formatCurrency(entry.payment?.amount ?? entry.order.totalAmount)}
              </p>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Delivery address</p>
            <p className="mt-3 text-sm leading-6 text-charcoal">{entry.order.shippingAddress || '—'}</p>
            <div className="mt-5 flex flex-col gap-2">
              {!paid && (
                <Button onClick={() => navigate(`/checkout/payment/${entry.order.id}`)}>Continue payment</Button>
              )}
              <Button variant="light" onClick={() => navigate('/marketplace')}>Continue browsing</Button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetailPage;
