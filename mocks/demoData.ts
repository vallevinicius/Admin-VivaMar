import type { Expense, Reservation, Room } from '@/types/channex';

export const DEMO_TENANT_ID = 999;
export const DEMO_TENANT_NAME = 'Pousada Viva Mar';
export const DEMO_USER_EMAIL = 'gestao@pousadavivamar.com';
export const DEMO_USER_PASSWORD = 'vivamar123';

const demoRooms: Room[] = [
  { id: 'vm-bangalow-01', channexRoomTypeId: 'vm-rt-01', name: 'Bangalô Oceano', maxGuests: 2, price: 420, quantity: 1, status: 'active' },
  { id: 'vm-suite-02', channexRoomTypeId: 'vm-rt-02', name: 'Suíte Coral Premium', maxGuests: 3, price: 590, quantity: 1, status: 'active' },
  { id: 'vm-familia-03', channexRoomTypeId: 'vm-rt-03', name: 'Suíte Família Maré Alta', maxGuests: 5, price: 740, quantity: 1, status: 'active' },
  { id: 'vm-jardim-04', channexRoomTypeId: 'vm-rt-04', name: 'Quarto Jardim Tropical', maxGuests: 2, price: 360, quantity: 1, status: 'maintenance' },
];

let demoReservations: Reservation[] = [
  {
    id: 'vm-res-1001',
    roomId: 'vm-bangalow-01',
    checkIn: '2026-03-24',
    checkOut: '2026-03-28',
    status: 'confirmed',
    otaSource: 'booking',
    channelReference: 'VM-BKG-4821',
    amount: 2280,
    currency: 'BRL',
    customer: { name: 'Mariana Costa', email: 'mariana.costa@email.com', phone: '+55 81 99811-2200' },
    notes: 'Lua de mel. Solicita espumante no check-in.',
  },
  {
    id: 'vm-res-1002',
    roomId: 'vm-suite-02',
    checkIn: '2026-03-26',
    checkOut: '2026-03-30',
    status: 'confirmed',
    otaSource: 'expedia',
    channelReference: 'VM-EXP-3091',
    amount: 3140,
    currency: 'BRL',
    customer: { name: 'Rafael Nunes', email: 'rafael.nunes@email.com', phone: '+55 11 97777-2121' },
    notes: 'Chegada prevista às 20h.',
  },
  {
    id: 'vm-res-1003',
    roomId: 'vm-familia-03',
    checkIn: '2026-03-29',
    checkOut: '2026-04-03',
    status: 'pending',
    otaSource: 'hotels_com',
    channelReference: 'VM-HTL-7772',
    amount: 4120,
    currency: 'BRL',
    customer: { name: 'Família Prado', email: 'contato@prado.com', phone: '+55 31 96666-1200' },
    notes: 'Viajam com 2 crianças.',
  },
  {
    id: 'vm-res-1004',
    roomId: 'vm-jardim-04',
    checkIn: '2026-03-25',
    checkOut: '2026-03-27',
    status: 'blocked',
    otaSource: 'manual',
    channelReference: 'VM-MAN-BLOCK',
    amount: 0,
    currency: 'BRL',
    customer: { name: 'Bloqueio Operacional', email: '', phone: '' },
    notes: 'Ajuste de ar-condicionado e pintura.',
  },
  {
    id: 'vm-res-1005',
    roomId: 'vm-bangalow-01',
    checkIn: '2026-04-01',
    checkOut: '2026-04-06',
    status: 'confirmed',
    otaSource: 'manual',
    channelReference: 'VM-MAN-RES',
    amount: 2870,
    currency: 'BRL',
    customer: { name: 'Paulo Menezes', email: 'paulo@cliente.com', phone: '+55 85 95555-4455' },
    notes: 'Pacote com passeio de jangada.',
  },
];

let demoExpenses: Expense[] = [
  { id: '1', description: 'Reposição de enxoval premium', amount: 1480, date: '2026-03-20', category: 'insumos' },
  { id: '2', description: 'Manutenção preventiva da piscina', amount: 920, date: '2026-03-18', category: 'manutenção' },
  { id: '3', description: 'Comissão OTA - março', amount: 1300, date: '2026-03-15', category: 'comissões' },
  { id: '4', description: 'Imposto municipal de hospedagem', amount: 780, date: '2026-03-12', category: 'impostos' },
];

export function getDemoRooms(): Room[] {
  return structuredClone(demoRooms);
}

export function getDemoReservations(): Reservation[] {
  return structuredClone(demoReservations).sort((a, b) => a.checkIn.localeCompare(b.checkIn));
}

export function getDemoExpenses(): Expense[] {
  return structuredClone(demoExpenses).sort((a, b) => b.date.localeCompare(a.date));
}

export function updateDemoReservation(updatedReservation: Reservation): Reservation {
  demoReservations = demoReservations.map((item) => (item.id === updatedReservation.id ? { ...updatedReservation } : item));
  return structuredClone(updatedReservation);
}

export function deleteDemoReservation(reservationId: string): void {
  demoReservations = demoReservations.filter((item) => item.id !== reservationId);
}

export function createDemoManualReservation(input: {
  roomId: string;
  checkIn: string;
  checkOut: string;
  entryType: 'manual_reservation' | 'blocked';
  amount: number;
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  notes: string;
}): Reservation {
  const id = `vm-manual-${Date.now()}`;
  const reservation: Reservation = {
    id,
    roomId: input.roomId,
    checkIn: input.checkIn.slice(0, 10),
    checkOut: input.checkOut.slice(0, 10),
    status: input.entryType === 'manual_reservation' ? 'confirmed' : 'blocked',
    otaSource: 'manual',
    channelReference: input.entryType === 'manual_reservation' ? 'VM-MAN-RES' : 'VM-MAN-BLOCK',
    amount: input.entryType === 'manual_reservation' ? input.amount : 0,
    currency: 'BRL',
    customer: {
      name: input.guestName,
      email: input.guestEmail,
      phone: input.guestPhone,
    },
    notes: input.notes,
  };

  demoReservations = [...demoReservations, reservation];
  return structuredClone(reservation);
}

export function createDemoExpense(input: Omit<Expense, 'id'>): Expense {
  const expense: Expense = {
    ...input,
    id: String(Date.now()),
  };
  demoExpenses = [expense, ...demoExpenses];
  return structuredClone(expense);
}
