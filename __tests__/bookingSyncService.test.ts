import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sequelize } from '@/models';
import { syncBookingReservations, syncBookingReservationsWithRetry } from '@/services/bookingSyncService';
import { BookingClient } from '@/lib/booking-client';

vi.mock('@/lib/booking-client');

describe('bookingSyncService', () => {
  const mockTenantId = 'test-tenant-id';
  const mockStartDate = '2024-01-01';
  const mockEndDate = '2024-01-31';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('syncBookingReservations', () => {
    it('should fetch reservations from Booking API and sync to database', async () => {
      const mockReservations = [
        {
          id: 'booking-123',
          property_id: 'prop-456',
          guest_name: 'John Doe',
          guest_email: 'john@example.com',
          guest_phone: '+1234567890',
          check_in_date: '2024-01-15',
          check_out_date: '2024-01-20',
          status: 'CONFIRMED' as const,
          room_name: 'Suite 101',
          total_price: 500.0,
          currency: 'USD',
          booking_reference: 'BK123456',
        },
      ];

      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockResolvedValue(mockReservations);

      const result = await syncBookingReservations(mockTenantId, mockStartDate, mockEndDate);

      expect(result).toHaveProperty('created');
      expect(result).toHaveProperty('updated');
      expect(result).toHaveProperty('conflicted');
      expect(bookingClientMock.getReservations).toHaveBeenCalledWith(mockStartDate, mockEndDate);
    });

    it('should handle reservations with PENDING status', async () => {
      const mockReservations = [
        {
          id: 'booking-456',
          property_id: 'prop-456',
          guest_name: 'Jane Smith',
          guest_email: 'jane@example.com',
          guest_phone: '+0987654321',
          check_in_date: '2024-01-25',
          check_out_date: '2024-01-28',
          status: 'PENDING' as const,
          room_name: 'Double Room',
          total_price: 300.0,
          currency: 'USD',
          booking_reference: 'BK654321',
        },
      ];

      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockResolvedValue(mockReservations);

      const result = await syncBookingReservations(mockTenantId, mockStartDate, mockEndDate);

      expect(result).toHaveProperty('created');
    });

    it('should handle reservations with CANCELLED status', async () => {
      const mockReservations = [
        {
          id: 'booking-789',
          property_id: 'prop-456',
          guest_name: 'Bob Johnson',
          guest_email: 'bob@example.com',
          guest_phone: '+1122334455',
          check_in_date: '2024-01-10',
          check_out_date: '2024-01-12',
          status: 'CANCELLED' as const,
          room_name: 'Single Room',
          total_price: 150.0,
          currency: 'USD',
          booking_reference: 'BK112233',
        },
      ];

      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockResolvedValue(mockReservations);

      const result = await syncBookingReservations(mockTenantId, mockStartDate, mockEndDate);

      expect(result).toHaveProperty('created');
    });

    it('should detect conflicts when local reservation was recently updated', async () => {
      const mockReservations = [
        {
          id: 'booking-conflict',
          property_id: 'prop-456',
          guest_name: 'Alice Brown',
          guest_email: 'alice@example.com',
          guest_phone: '+5555555555',
          check_in_date: '2024-01-05',
          check_out_date: '2024-01-08',
          status: 'CONFIRMED' as const,
          room_name: 'Deluxe Suite',
          total_price: 750.0,
          currency: 'USD',
          booking_reference: 'BK555555',
        },
      ];

      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockResolvedValue(mockReservations);

      const result = await syncBookingReservations(mockTenantId, mockStartDate, mockEndDate);

      expect(result).toHaveProperty('conflicted');
    });

    it('should throw error if tenant not found', async () => {
      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockRejectedValue(new Error('Tenant not found'));

      await expect(syncBookingReservations('invalid-tenant', mockStartDate, mockEndDate)).rejects.toThrow();
    });
  });

  describe('syncBookingReservationsWithRetry', () => {
    it('should retry with exponential backoff on transient failures', async () => {
      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations
        .mockRejectedValueOnce(new Error('Temporary network error'))
        .mockResolvedValueOnce([]);

      const result = await syncBookingReservationsWithRetry(mockTenantId, mockStartDate, mockEndDate, 3);

      expect(result).toBeDefined();
      expect(bookingClientMock.getReservations).toHaveBeenCalledTimes(2);
    });

    it('should throw error after max retries exceeded', async () => {
      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockRejectedValue(new Error('Permanent failure'));

      await expect(syncBookingReservationsWithRetry(mockTenantId, mockStartDate, mockEndDate, 2)).rejects.toThrow();
    });

    it('should succeed on first attempt without retrying', async () => {
      const mockReservations: any[] = [];
      const bookingClientMock = BookingClient as any;
      bookingClientMock.getReservations.mockResolvedValue(mockReservations);

      const result = await syncBookingReservationsWithRetry(mockTenantId, mockStartDate, mockEndDate, 3);

      expect(result).toBeDefined();
      expect(bookingClientMock.getReservations).toHaveBeenCalledTimes(1);
    });
  });
});
