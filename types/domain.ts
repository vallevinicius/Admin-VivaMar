export type { RoomClosurePeriod, RoomSeasonalRate } from '@/lib/room-policies';
import type { RoomClosurePeriod, RoomSeasonalRate } from '@/lib/room-policies';

export type OtaSource = 'booking' | 'expedia' | 'hotels_com' | 'manual';

export type Room = {
  id: string;
  channexRoomTypeId: string;
  name: string;
  maxGuests: number;
  price: number;
  minStayNights?: number | null;
  minStayDays?: number | null;
  seasonalRates?: RoomSeasonalRate[];
  closurePeriods?: RoomClosurePeriod[];
  quantity: number;
  status: 'active' | 'maintenance';
  amenities?: string | string[] | null;
  amenitiesList?: string[];
  photoUrls?: string[];
};

export type ReservationStatus = 'confirmed' | 'pending' | 'cancelled' | 'blocked';

export type Customer = {
  name: string;
  email: string;
  phone: string;
  cpf?: string;
};

export type Reservation = {
  id: string;
  roomId: string;
  checkIn: string;
  checkOut: string;
  status: ReservationStatus;
  otaSource: OtaSource;
  channelReference: string;
  amount: number;
  currency: string;
  customer: Customer;
  notes: string;
};

export type ExpenseCategory = 'limpeza' | 'manutenção' | 'impostos' | 'insumos' | 'comissões' | 'outros';

export type Expense = {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: ExpenseCategory;
};
