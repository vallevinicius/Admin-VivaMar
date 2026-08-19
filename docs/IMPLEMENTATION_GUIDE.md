# Booking.com Integration - Implementation Guide

## Overview
This guide covers the complete Booking.com Partner API integration for Admin-Viva-Mar. The implementation follows security best practices and is production-ready.

## What Was Changed

### New Files
1. `lib/booking-client.ts` - OAuth2 client for Booking.com API
2. `services/bookingSyncService.ts` - Reservation synchronization service with conflict resolution
3. `app/api/webhooks/booking/route.ts` - Webhook receiver for real-time updates
4. `app/api/webhooks/booking/sync-periodic/route.ts` - Background sync job
5. `__tests__/bookingSyncService.test.ts` - Unit tests

### Modified Files
1. `lib/auth.ts` - Added JWT_SECRET validation (min 32 chars)
2. `lib/db.ts` - Added migration for `booking_hotel_id` column
3. `models/Tenant.ts` - Added `bookingHotelId` field
4. `.env.example` - Added Booking environment variables

## Security Features

### Authentication & Tokens
- OAuth2 with automatic token refresh (60s before expiry)
- Token cached to reduce API calls
- Credentials loaded from environment only

### Webhook Security
- HMAC-SHA256 signature verification using timing-safe comparison
- Request ID logging for traceability
- Async processing to avoid blocking responses

### Data Isolation
- Pessimistic locking on database transactions
- Tenant isolation on all queries
- No cross-tenant data leakage

### Conflict Resolution
- Local changes (< 5 min old) are preserved
- Booking is source of truth for older data
- Detailed logging of all conflicts

## Integration Flow

```
Booking sends webhook event
    ↓
Validate HMAC signature
    ↓
Parse payload, find tenant
    ↓
Queue background sync (async)
    ↓
Return 200 to Booking immediately
    ↓
Background: Fetch reservations from Booking API
    ↓
Apply ACID transactions with conflict detection
    ↓
Log all changes for audit trail
```

## Environment Setup

Required variables in `.env`:
```
BOOKING_CLIENT_ID=your_client_id
BOOKING_CLIENT_SECRET=your_client_secret
BOOKING_HOTEL_ID=your_property_id
BOOKING_WEBHOOK_SECRET=your_webhook_secret
INTERNAL_API_KEY=random_32_char_key
```

## Deployment Checklist

- [ ] All environment variables set
- [ ] Webhook URL registered in Booking Partner Portal
- [ ] Background sync job configured (cron every 6 hours)
- [ ] Tests passing locally
- [ ] Code review completed
- [ ] Staging deployment successful
- [ ] Production monitoring configured (Sentry, LogRocket, etc)

## Testing

Run unit tests:
```bash
npm test -- __tests__/bookingSyncService.test.ts
```

Manual webhook test:
```bash
curl -X POST http://localhost:3000/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -H "X-Booking-Signature: $(echo -n '{...}' | openssl dgst -sha256 -hmac $BOOKING_WEBHOOK_SECRET | cut -d' ' -f2)" \
  -d '{reservation payload}'
```

## Monitoring

Log all sync operations in production:
- Reservation creation/updates
- Conflict resolutions
- Failed syncs with retry counts
- Webhook processing times

Use these logs for debugging integration issues.

## Known Limitations

- Pagination not implemented for date ranges > 90 days (Booking limit)
- Cannot update Booking availability directly (read-only for now)
- Assumes room names match between systems

## Future Improvements

- Add availability/pricing updates to Booking
- Implement caching layer for reservations
- Add webhook retry mechanism
- Support multiple Booking accounts per tenant
