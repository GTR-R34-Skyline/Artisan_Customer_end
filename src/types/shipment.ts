export type ShipmentStatus =
  | 'pending'
  | 'dispatched'
  | 'picked_up'
  | 'in_transit'
  | 'at_destination_hub'
  | 'out_for_delivery'
  | 'delivered'
  | string;

export interface ShipmentEvent {
  id: string;
  shipmentId: string;
  status: string;
  location: string | null;
  description: string | null;
  actorType: string | null;
  actorId: string | null;
  eventTime: string | null;
  createdAt: string | null;
}

export interface BuyerShipment {
  id: string;
  orderId: string;
  vendorId: string | null;
  buyerId: string | null;
  courierId: string | null;
  carrier: string | null;
  trackingNumber: string | null;
  status: ShipmentStatus;
  origin: string | null;
  destination: string | null;
  estimatedDeliveryDate: string | null;
  dispatchedAt: string | null;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  events: ShipmentEvent[];
}

/** Ordered delivery stages for the customer timeline (after order placed). */
export const SHIPMENT_TIMELINE_STAGES = [
  'dispatched',
  'picked_up',
  'in_transit',
  'at_destination_hub',
  'out_for_delivery',
  'delivered',
] as const;

export type ShipmentTimelineStage = (typeof SHIPMENT_TIMELINE_STAGES)[number];

export const shipmentStatusRank = (status: string | null | undefined): number => {
  const value = (status || '').toLowerCase().trim();
  if (value === 'pending' || value === 'seller_processing') return 0;
  const index = SHIPMENT_TIMELINE_STAGES.indexOf(value as ShipmentTimelineStage);
  return index >= 0 ? index + 1 : 0;
};

export const normalizeShipmentStatus = (status: string | null | undefined): string =>
  (status || '').toLowerCase().trim();

export const shipmentStatusLabel = (status: string | null | undefined): string => {
  switch (normalizeShipmentStatus(status)) {
    case 'pending':
    case 'seller_processing':
      return 'Preparing for dispatch';
    case 'dispatched':
      return 'Dispatched';
    case 'picked_up':
      return 'Picked up';
    case 'in_transit':
      return 'In transit';
    case 'at_destination_hub':
      return 'At destination hub';
    case 'out_for_delivery':
      return 'Out for delivery';
    case 'delivered':
      return 'Delivered';
    default:
      return status ? status.replace(/_/g, ' ') : 'Unknown';
  }
};

export const isShipmentPreparing = (status: string | null | undefined): boolean => {
  const value = normalizeShipmentStatus(status);
  return value === 'pending' || value === 'seller_processing' || value === '';
};

export const formatShipmentDate = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export const formatShipmentDateTime = (value: string | null | undefined): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const shipmentMilestoneTime = (
  shipment: BuyerShipment,
  stage: ShipmentTimelineStage,
): string | null => {
  switch (stage) {
    case 'dispatched':
      return shipment.dispatchedAt;
    case 'picked_up':
      return shipment.pickedUpAt;
    case 'delivered':
      return shipment.deliveredAt;
    default:
      return null;
  }
};
