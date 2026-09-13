import { supabase } from '../lib/supabase';
import { BuyerShipment, ShipmentEvent } from '../types/shipment';

const asRecord = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

const toStringValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const isDev = Boolean(import.meta.env.DEV);

const devLog = (message: string, details: Record<string, unknown>) => {
  if (!isDev) return;
  // Development-only diagnostics — never render secrets in the UI.
  console.info(`[buyer-tracking] ${message}`, details);
};

const mapEvent = (row: Record<string, unknown>): ShipmentEvent => ({
  id: toStringValue(row.id) || '',
  shipmentId: toStringValue(row.shipment_id) || '',
  status: toStringValue(row.status) || '',
  location: toStringValue(row.location),
  description: toStringValue(row.description),
  actorType: toStringValue(row.actor_type),
  actorId: toStringValue(row.actor_id),
  eventTime: toStringValue(row.event_time) || toStringValue(row.created_at),
  createdAt: toStringValue(row.created_at),
});

const mapShipment = (row: Record<string, unknown>, events: ShipmentEvent[]): BuyerShipment => ({
  id: toStringValue(row.id) || '',
  orderId: toStringValue(row.order_id) || '',
  vendorId: toStringValue(row.vendor_id),
  buyerId: toStringValue(row.buyer_id),
  courierId: toStringValue(row.courier_id),
  carrier: toStringValue(row.carrier),
  trackingNumber: toStringValue(row.tracking_number),
  status: (() => {
    // Always map shipments.status — never confuse with orders.status.
    const raw = row.status;
    if (typeof raw === 'string' && raw.trim()) return raw.trim();
    if (raw != null && typeof raw !== 'object') return String(raw).trim() || 'pending';
    return 'pending';
  })(),
  origin: toStringValue(row.origin),
  destination: toStringValue(row.destination),
  estimatedDeliveryDate: toStringValue(row.estimated_delivery_date),
  dispatchedAt: toStringValue(row.dispatched_at),
  pickedUpAt: toStringValue(row.picked_up_at),
  deliveredAt: toStringValue(row.delivered_at),
  createdAt: toStringValue(row.created_at),
  updatedAt: toStringValue(row.updated_at),
  events: events
    .filter((event) => event.shipmentId === (toStringValue(row.id) || ''))
    .sort((a, b) => {
      const aTime = a.eventTime ? new Date(a.eventTime).getTime() : 0;
      const bTime = b.eventTime ? new Date(b.eventTime).getTime() : 0;
      return aTime - bTime;
    }),
});

const requireBuyerSession = async () => {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData.session?.user;
  if (!user) {
    throw new Error('Sign in to view shipment tracking.');
  }
  return user;
};

const assembleShipments = (
  shipmentRows: Record<string, unknown>[],
  eventRows: Record<string, unknown>[],
): BuyerShipment[] => {
  const events = eventRows.map(mapEvent);
  return shipmentRows.map((row) => mapShipment(row, events));
};

/**
 * Direct RLS-scoped table read.
 * Courier filters by courier_id; vendors by vendor_id. Buyer policy is currently
 * missing on this project, so this often returns [] with no error.
 */
const listShipmentsForOrderDirect = async (
  orderId: string,
  buyerId: string,
): Promise<BuyerShipment[]> => {
  const { data: shipmentRows, error: shipmentError } = await supabase
    .from('shipments')
    .select(
      'id, order_id, vendor_id, buyer_id, courier_id, carrier, tracking_number, status, origin, destination, estimated_delivery_date, dispatched_at, picked_up_at, delivered_at, created_at, updated_at',
    )
    .eq('order_id', orderId)
    .eq('buyer_id', buyerId)
    .order('created_at', { ascending: true });

  if (shipmentError) throw shipmentError;

  const rows = (shipmentRows || []).map(asRecord);
  if (!rows.length) return [];

  const shipmentIds = rows
    .map((row) => toStringValue(row.id))
    .filter((id): id is string => Boolean(id));

  const { data: eventRows, error: eventsError } = await supabase
    .from('shipment_events')
    .select('id, shipment_id, status, location, description, actor_type, actor_id, event_time, created_at')
    .in('shipment_id', shipmentIds)
    .order('event_time', { ascending: true });

  if (eventsError) throw eventsError;

  return assembleShipments(rows, (eventRows || []).map(asRecord));
};

/**
 * Ownership-checked edge read (same marketplace-checkout gateway sellers already use).
 * Verifies orders.buyer_id === auth user, then returns that buyer's shipments for the order UUID.
 */
const listShipmentsForOrderViaEdge = async (orderId: string): Promise<BuyerShipment[]> => {
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'list_order_shipments', orderId },
  });

  if (error) {
    throw new Error(error.message || 'Shipment tracking could not be loaded.');
  }

  const payload = asRecord(data);
  if (payload.success === false) {
    throw new Error(toStringValue(payload.error) || 'Shipment tracking could not be loaded.');
  }
  if (!payload.success) {
    throw new Error(toStringValue(payload.error) || 'Shipment tracking could not be loaded.');
  }

  const shipmentRows = Array.isArray(payload.shipments) ? payload.shipments.map(asRecord) : [];
  const eventRows = Array.isArray(payload.events) ? payload.events.map(asRecord) : [];
  return assembleShipments(shipmentRows, eventRows);
};

/**
 * Loads shipments for an order owned by the authenticated buyer.
 * Uses the actual orders.id UUID (never a shortened display id).
 * Current delivery status comes from shipments.status only.
 */
export const listShipmentsForOrder = async (orderId: string): Promise<BuyerShipment[]> => {
  const trimmed = orderId.trim();
  if (!trimmed) return [];

  const user = await requireBuyerSession();

  devLog('query start', {
    buyerId: user.id,
    orderId: trimmed,
    filter: 'order_id + buyer_id',
  });

  // Prefer direct RLS when the buyer SELECT policy exists.
  const direct = await listShipmentsForOrderDirect(trimmed, user.id);
  if (direct.length) {
    devLog('direct RLS hit', {
      buyerId: user.id,
      orderId: trimmed,
      count: direct.length,
      shipmentIds: direct.map((row) => row.id),
      statuses: direct.map((row) => row.status),
    });
    return direct;
  }

  // Fallback: ownership-checked edge function. Distinguishes "no rows under RLS"
  // from a true empty result once the server can see the buyer's shipments.
  const viaEdge = await listShipmentsForOrderViaEdge(trimmed);
  devLog('edge lookup', {
    buyerId: user.id,
    orderId: trimmed,
    count: viaEdge.length,
    shipmentIds: viaEdge.map((row) => row.id),
    statuses: viaEdge.map((row) => row.status),
    trackingNumbers: viaEdge.map((row) => row.trackingNumber),
  });
  return viaEdge;
};

const listShipmentSummariesDirect = async (
  orderIds: string[],
  buyerId: string,
): Promise<Map<string, { count: number; latestStatus: string | null }>> => {
  const result = new Map<string, { count: number; latestStatus: string | null }>();
  const { data, error } = await supabase
    .from('shipments')
    .select('order_id, status, created_at, buyer_id')
    .eq('buyer_id', buyerId)
    .in('order_id', orderIds)
    .order('created_at', { ascending: false });

  if (error) throw error;

  (data || []).forEach((row) => {
    const record = asRecord(row);
    const orderId = toStringValue(record.order_id);
    if (!orderId) return;
    const existing = result.get(orderId);
    if (!existing) {
      result.set(orderId, {
        count: 1,
        latestStatus: toStringValue(record.status),
      });
    } else {
      existing.count += 1;
    }
  });

  return result;
};

const listShipmentSummariesViaEdge = async (
  orderIds: string[],
): Promise<Map<string, { count: number; latestStatus: string | null }>> => {
  const result = new Map<string, { count: number; latestStatus: string | null }>();
  const { data, error } = await supabase.functions.invoke('marketplace-checkout', {
    body: { action: 'list_shipment_summaries', orderIds },
  });

  if (error) throw new Error(error.message || 'Shipment summaries could not be loaded.');

  const payload = asRecord(data);
  if (!payload.success) {
    throw new Error(toStringValue(payload.error) || 'Shipment summaries could not be loaded.');
  }

  (Array.isArray(payload.shipments) ? payload.shipments : []).forEach((row) => {
    const record = asRecord(row);
    const orderId = toStringValue(record.order_id);
    if (!orderId) return;
    const existing = result.get(orderId);
    if (!existing) {
      result.set(orderId, {
        count: 1,
        latestStatus: toStringValue(record.status),
      });
    } else {
      existing.count += 1;
    }
  });

  return result;
};

/** Lightweight summary for order list badges — buyer-owned orders only. */
export const listShipmentSummariesForOrders = async (
  orderIds: string[],
): Promise<Map<string, { count: number; latestStatus: string | null }>> => {
  const ids = orderIds.map((id) => id.trim()).filter(Boolean);
  if (!ids.length) return new Map();

  const user = await requireBuyerSession();
  const direct = await listShipmentSummariesDirect(ids, user.id);
  if (direct.size) return direct;
  return listShipmentSummariesViaEdge(ids);
};
