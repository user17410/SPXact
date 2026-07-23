/**
 * The one sample order both devices (rider + recipient) are aware of.
 * Mirrors backend/app/seed.py parcel/customer/rider #1 exactly — no accounts,
 * no order picker, just a fixed booking both phones already know about.
 */
export const LIVE_ORDER = {
  parcelId: 1,
  customerId: 1,
  riderId: 1,
  trackingNo: 'SPX-LIVE-0001',
  buyerName: 'Maria Santos',
  buyerAddress: '123 Moonwalk St, Las Piñas, Metro Manila',
  lat: 14.4506,
  lng: 120.9833,
  distance: '3.2 km',
  fee: '₱85',
};
