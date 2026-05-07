export interface House {
  id: string;
  name: string;
  description: string;
  capacity: number;
  amenities: string[];
  priceBase: number;
  images: string[];
}

export interface Reservation {
  id: string;
  houseId: string;
  startDate: string; // ISO format
  endDate: string; // ISO format
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  status: 'confirmed' | 'cancelled' | 'deposit_paid';
  totalPrice: number;
  depositAmount: number;
  isDepositPaid: boolean;
  isFullyPaid: boolean;
  createdAt: any; // Firestore timestamp
}

export interface GlobalSettings {
  id: string;
  depositType: 'fixed' | 'percent';
  depositValue: number;
  daysToPayDeposit: number;
}

export interface SpecialPrice {
  id: string;
  houseId: string;
  startDate: string; // ISO date
  endDate: string; // ISO date
  price: number;
  label?: string; // e.g. "Majówka", "Wakacje"
}

export interface HouseSettings {
  id: string; // matches houseId
  basePrice: number;
}

export interface BlockedDate {
  id: string;
  houseId: string;
  date: string; // ISO format (date only)
  reason?: string;
}
