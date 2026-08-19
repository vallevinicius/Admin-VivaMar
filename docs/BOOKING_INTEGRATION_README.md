# Booking.com Integration

Complete integration between Admin-Viva-Mar and Booking.com Partner API for real-time reservation synchronization.

## Overview

This integration enables bidirectional synchronization of reservations between your internal booking system and Booking.com. The system maintains data consistency through:

- **Real-time webhook processing** - Booking sends updates immediately
- **Scheduled background syncs** - Periodic reconciliation every 6 hours
- **Conflict detection** - Preserves recent local changes, uses Booking as source of truth otherwise
- **ACID transactions** - Ensures data consistency even under race conditions
- **Multi-tenant isolation** - Complete isolation between different properties

## Architecture

### Components

**BookingClient** (`lib/booking-client.ts`)
- OAuth2 authentication with automatic token refresh
- Manages credentials securely (environment-only, never hardcoded)
- Methods: `getReservations()`, `getReservation()`, `confirmReservation()`, `verifyWebhookSignature()`

**BookingSyncService** (`services/bookingSyncService.ts`)
- Synchronizes reservations from Booking API to local database
- Detects conflicts when local changes occurred within 5 minutes
- Returns operation counts: created, updated, conflicted
- Retry logic with exponential backoff for transient failures

**Webhook Receiver** (`app/api/webhooks/booking/route.ts`)
- Validates HMAC-SHA256 signature on all incoming webhooks
- Queues async processing to return 200 to Booking immediately
- Logs request ID for debugging and audit trail
- Returns 200 regardless of tenant existence (prevents Booking retry loops)

**Background Sync Job** (`app/api/webhooks/booking/sync-periodic/route.ts`)
- Runs every 6 hours (configured via cron)
- Syncs all active tenants with Booking integration enabled
- Validates `X-API-Key` header to prevent unauthorized access
- Returns detailed status with error tracking

## Security Features

### Authentication

OAuth2 client credentials flow with automatic token refresh 60 seconds before expiry. Tokens are cached in memory to reduce API calls.

```typescript
const token = await bookingClient.getAccessToken();
```

### Webhook Validation

All webhooks must include valid HMAC-SHA256 signature in `X-Booking-Signature` header. Uses `crypto.timingSafeEqual` to prevent timing attacks.

```typescript
const isValid = bookingClient.verifyWebhookSignature(body, signature);
if (!isValid) return res.status(401).json({ error: 'Invalid signature' });
```

### Data Isolation

- Pessimistic locking (LOCK.UPDATE) prevents race conditions
- ACID transactions ensure consistency
- Tenant isolation on all database queries
- No cross-tenant data leakage

### API Protection

- Internal API key validation on cron endpoints
- Request ID logging for traceability
- Error messages don't leak sensitive information

## Configuration

### Environment Variables

```env
# Booking.com OAuth2
BOOKING_CLIENT_ID=your_client_id
BOOKING_CLIENT_SECRET=your_client_secret
BOOKING_HOTEL_ID=your_property_id

# Webhook Security
BOOKING_WEBHOOK_SECRET=your_webhook_secret

# Internal API Protection
INTERNAL_API_KEY=random_32_character_key

# API Base URL (sandbox vs production)
BOOKING_API_BASE_URL=https://secure-supply-connect.booking.com/  # Staging
# BOOKING_API_BASE_URL=https://connect.booking.com/  # Production
```

### Database Schema

Migration adds `booking_hotel_id` column to tenants table:

```sql
ALTER TABLE tenants ADD COLUMN booking_hotel_id VARCHAR(20) COMMENT 'Property ID from Booking.com';
```

This column stores the Booking property ID and enables filtering for properties with Booking integration.

## Integration Flow

```
Booking sends webhook event
    ↓
Validate HMAC signature
    ↓
Find tenant by booking_hotel_id
    ↓
Queue background sync (setImmediate)
    ↓
Return 200 to Booking immediately
    ↓
Background: Fetch reservations from Booking API
    ↓
Apply ACID transactions with conflict detection
    ↓
Log all changes for audit trail
```

## API Endpoints

### POST /api/webhooks/booking

Receives real-time updates from Booking.com.

**Headers:**
- `X-Booking-Signature`: HMAC-SHA256 signature (required)
- `Content-Type`: application/json

**Response:**
- `200 OK` - Webhook queued (always returns 200)
- `401 Unauthorized` - Invalid signature

### POST /api/webhooks/booking/sync-periodic

Background sync job (call every 6 hours).

**Headers:**
- `X-API-Key`: INTERNAL_API_KEY (required)

**Response:**
```json
{
  "synced": 5,
  "failed": 0,
  "errors": []
}
```

## Conflict Resolution

When Booking sends an update for a reservation that exists locally:

1. Check if local record was modified within last 5 minutes
2. If yes: Log conflict, preserve local data, don't overwrite
3. If no: Update local record with Booking data (Booking is source of truth)

This prevents losing recent manual changes while keeping stale data in sync.

## Testing

### Unit Tests

```bash
npm test -- __tests__/bookingSyncService.test.ts
```

Tests cover:
- Reservation fetching
- Status mapping (CONFIRMED, PENDING, CANCELLED)
- Conflict detection
- Retry logic with exponential backoff
- Error handling

### Manual Webhook Test

```bash
curl -X POST http://localhost:3000/api/webhooks/booking \
  -H "Content-Type: application/json" \
  -H "X-Booking-Signature: $(echo -n '{...}' | openssl dgst -sha256 -hmac $BOOKING_WEBHOOK_SECRET | cut -d' ' -f2)" \
  -d '{reservation payload}'
```

### Integration Testing (Staging)

1. Register webhook URL in Booking Partner Portal (staging environment)
2. Test with sample reservation data
3. Verify database updates
4. Check logs for conflicts or errors

## Monitoring & Debugging

### Logs to Monitor

- **Webhook processing**: Request ID, signature validation, tenant lookup
- **Sync operations**: Created, updated, conflicted counts per tenant
- **Retries**: Attempt count, backoff duration, final status
- **Errors**: API failures, database errors, validation failures

### Common Issues

**"Invalid signature"**
- Verify `X-Booking-Signature` header matches webhook body
- Check `BOOKING_WEBHOOK_SECRET` matches Booking Partner Portal

**"Tenant not found"**
- Ensure `BOOKING_HOTEL_ID` matches value in Booking Partner Portal
- Verify `booking_hotel_id` is set in database for the tenant

**"OAuth2 authentication failed"**
- Verify credentials: `BOOKING_CLIENT_ID`, `BOOKING_CLIENT_SECRET`
- Check if using sandbox vs production URLs

## Deployment Checklist

- [ ] All environment variables set and validated
- [ ] Webhook URL registered in Booking Partner Portal
- [ ] Background sync job configured (cron every 6 hours)
- [ ] Unit tests passing locally
- [ ] Code review completed
- [ ] Staging deployment successful and tested
- [ ] Production environment variables secured
- [ ] Monitoring and alerting configured
- [ ] Database backups enabled
- [ ] Incident response plan documented

## Known Limitations

- Pagination not implemented for date ranges > 90 days (Booking API limit)
- Cannot update Booking availability directly (read-only for now)
- Assumes room names match between systems for accurate mapping
- Webhook retry not implemented on our side (Booking handles retries)

## Future Improvements

- Add availability and pricing updates to Booking
- Implement Redis caching layer for reservation data
- Add webhook delivery retry mechanism
- Support multiple Booking accounts per tenant
- Real-time dashboard for sync status
- Automated conflict resolution with configurable rules

## Support & Questions

For integration issues:
1. Check logs for detailed error messages
2. Review webhook signature validation
3. Verify tenant configuration and credentials
4. Contact Booking Partner support with request ID

## Related Documentation

- [Booking.com Partner API Documentation](https://partner.booking.com/en/documentation/api)
- [Implementation Guide](./IMPLEMENTATION_GUIDE.md)
- [Security Best Practices](./SECURITY.md)
