/**
 * Mirrors backend/app/seed.py — parcel/customer/rider IDs and coordinates
 * must match exactly, since these drive real geofence/proximity checks server-side.
 */
export interface DemoAct {
  id: 1 | 2 | 3;
  label: string;
  hint: string;
  parcelId: number;
  customerId: number;
  riderId: number;
  trackingNo: string;
  buyerName: string;
  buyerAddress: string;
  lat: number;
  lng: number;
  distance: string;
  fee: string;
}

export const DEMO_ACTS: DemoAct[] = [
  {
    id: 1,
    label: 'Act 1 · Contradiction',
    hint: 'Customer is present. Try marking it "Failed to Deliver" anyway.',
    parcelId: 1,
    customerId: 1,
    riderId: 1,
    trackingNo: 'SPX-ACT1-CONTRADICTION',
    buyerName: 'Maria Santos',
    buyerAddress: '123 Moonwalk St, Las Piñas, Metro Manila',
    lat: 14.4506,
    lng: 120.9833,
    distance: '3.2 km',
    fee: '₱85',
  },
  {
    id: 2,
    label: 'Act 2 · Clean Handshake',
    hint: 'Customer allows sharing + WiFi handshake, then mark Delivered.',
    parcelId: 2,
    customerId: 2,
    riderId: 1,
    trackingNo: 'SPX-ACT2-HANDSHAKE',
    buyerName: 'Juan Dela Cruz',
    buyerAddress: '456 Sucat Rd, Parañaque, Metro Manila',
    lat: 14.4783,
    lng: 120.9917,
    distance: '4.1 km',
    fee: '₱95',
  },
  {
    id: 3,
    label: 'Act 3 · Honest Failure',
    hint: 'Reject/ignore the location request, then mark "Failed to Deliver".',
    parcelId: 3,
    customerId: 3,
    riderId: 1,
    trackingNo: 'SPX-ACT3-HONEST-FAIL',
    buyerName: 'Ana Reyes',
    buyerAddress: '789 Shaw Blvd, Mandaluyong, Metro Manila',
    lat: 14.5547,
    lng: 121.0244,
    distance: '6.8 km',
    fee: '₱110',
  },
];
