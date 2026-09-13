import React, { useMemo } from 'react';
import { StatusLabel } from '../DesignSystem';
import {
  BuyerShipment,
  formatShipmentDate,
  formatShipmentDateTime,
  isShipmentPreparing,
  normalizeShipmentStatus,
  shipmentMilestoneTime,
  shipmentStatusLabel,
  shipmentStatusRank,
  SHIPMENT_TIMELINE_STAGES,
  ShipmentEvent,
  ShipmentTimelineStage,
} from '../../types/shipment';

interface ShipmentTrackerProps {
  shipment: BuyerShipment;
  orderPlacedAt: string | null;
  index?: number;
  total?: number;
  vendorLabel?: string | null;
}

interface TimelineRow {
  key: string;
  label: string;
  complete: boolean;
  current: boolean;
  location: string | null;
  description: string | null;
  time: string | null;
}

const eventsForStage = (events: ShipmentEvent[], stage: ShipmentTimelineStage): ShipmentEvent | null => {
  const matches = events.filter((event) => normalizeShipmentStatus(event.status) === stage);
  return matches.length ? matches[matches.length - 1] : null;
};

const buildTimeline = (shipment: BuyerShipment, orderPlacedAt: string | null): TimelineRow[] => {
  // Authoritative current progress comes from shipments.status only — never from events or orders.status.
  const shipmentStatus = normalizeShipmentStatus(shipment.status);
  const currentRank = shipmentStatusRank(shipmentStatus);
  const rows: TimelineRow[] = [
    {
      key: 'order_placed',
      label: 'Order placed',
      complete: true,
      current: isShipmentPreparing(shipmentStatus),
      location: null,
      description: 'Your order was placed successfully.',
      time: formatShipmentDateTime(orderPlacedAt),
    },
  ];

  SHIPMENT_TIMELINE_STAGES.forEach((stage, index) => {
    const stageRank = index + 1;
    const event = eventsForStage(shipment.events, stage);
    const complete = currentRank >= stageRank;
    const current = shipmentStatus === stage;
    const milestone = shipmentMilestoneTime(shipment, stage);

    rows.push({
      key: stage,
      label: shipmentStatusLabel(stage),
      complete,
      current,
      location: event?.location || null,
      description: event?.description || null,
      // Event history only — never invent times; milestones only when this stage is already reached via shipments.status
      time: formatShipmentDateTime(event?.eventTime || (complete ? milestone : null)),
    });
  });

  return rows;
};

const statusTone = (status: string): 'success' | 'warning' | 'neutral' => {
  const value = normalizeShipmentStatus(status);
  if (value === 'delivered') return 'success';
  if (isShipmentPreparing(value)) return 'neutral';
  return 'warning';
};

export const ShipmentTracker: React.FC<ShipmentTrackerProps> = ({
  shipment,
  orderPlacedAt,
  index = 0,
  total = 1,
  vendorLabel,
}) => {
  const timeline = useMemo(() => buildTimeline(shipment, orderPlacedAt), [shipment, orderPlacedAt]);
  const estimated = formatShipmentDate(shipment.estimatedDeliveryDate);
  const preparing = isShipmentPreparing(shipment.status);
  const title = total > 1 ? `Shipment ${index + 1}` : 'Tracking';
  // Current delivery status is always shipments.status — never orders.status.
  const deliveryStatus = shipmentStatusLabel(shipment.status);

  return (
    <section className="shipment-tracker panel overflow-hidden p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">{title}</p>
          {shipment.trackingNumber ? (
            <p className="mt-2 break-all font-display text-2xl tracking-[-0.02em] text-charcoal sm:text-3xl">
              {shipment.trackingNumber}
            </p>
          ) : (
            <p className="mt-2 font-display text-2xl text-charcoal">Preparing shipment</p>
          )}
          <p className="mt-1 text-sm text-stone-600">
            {[shipment.carrier, vendorLabel].filter(Boolean).join(' · ') || 'Carrier assigned at dispatch'}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Delivery status</p>
          <div className="mt-1.5">
            <StatusLabel tone={statusTone(shipment.status)}>{deliveryStatus}</StatusLabel>
          </div>
        </div>
      </div>

      {preparing ? (
        <p className="mt-5 rounded-md border border-dashed border-stone-300 bg-cream px-4 py-3 text-sm leading-6 text-stone-600">
          Preparing for dispatch. Tracking details will appear once the seller sends this shipment.
        </p>
      ) : (
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          {shipment.destination && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Destination</dt>
              <dd className="mt-1 text-charcoal">{shipment.destination}</dd>
            </div>
          )}
          {estimated && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Estimated delivery</dt>
              <dd className="mt-1 text-charcoal">{estimated}</dd>
            </div>
          )}
          {shipment.origin && (
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">Origin</dt>
              <dd className="mt-1 text-charcoal">{shipment.origin}</dd>
            </div>
          )}
        </dl>
      )}

      <ol className="shipment-timeline mt-7" aria-label="Shipment progress">
        {timeline.map((row) => (
          <li
            key={row.key}
            className={`shipment-timeline-step ${row.complete ? 'is-complete' : 'is-upcoming'} ${row.current ? 'is-current' : ''}`}
          >
            <span className="shipment-timeline-marker" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-charcoal">{row.label}</p>
                {row.time && <p className="text-xs text-stone-500">{row.time}</p>}
              </div>
              {row.location && <p className="mt-1 text-sm text-stone-600">{row.location}</p>}
              {row.description && <p className="mt-0.5 text-sm leading-6 text-stone-500">{row.description}</p>}
              {!row.complete && !row.current && (
                <p className="mt-1 text-xs text-stone-400">Upcoming</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
};

export const EmptyShipmentState: React.FC = () => (
  <div className="panel border border-dashed border-stone-300 bg-cream p-5 sm:p-6">
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">Tracking</p>
    <p className="mt-2 font-display text-2xl text-charcoal">Preparing for dispatch</p>
    <p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
      A shipment has not been created for this order yet. Tracking will appear here once the seller prepares your package.
    </p>
  </div>
);
