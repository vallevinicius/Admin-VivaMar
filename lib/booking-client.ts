import crypto from 'crypto';

/**
 * Tipo para reserva vinda da API do Booking
 * ⚠️ IDs do Booking são STRINGS, não números
 */
export interface BookingReservation {
  id: string; // ID único no Booking
  property_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  check_in_date: string; // YYYY-MM-DD
  check_out_date: string; // YYYY-MM-DD
  status: 'CONFIRMED' | 'CANCELLED' | 'PENDING';
  room_name: string;
  total_price: number;
  currency: string;
  booking_reference: string;
  special_requests?: string;
}

/**
 * Cliente OAuth2 da API do Booking.com
 *
 * SEGURANÇA:
 * - Nunca exponha CLIENT_SECRET em frontend
 * - Tokens são cached (8h) — refresh 60s antes de expirar
 * - WebHook signature é verificado com HMAC-SHA256
 */
export class BookingClient {
  private clientId: string;
  private clientSecret: string;
  private hotelId: string;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenExpiresAt: number = 0;

  constructor() {
    this.clientId = process.env.BOOKING_CLIENT_ID || '';
    this.clientSecret = process.env.BOOKING_CLIENT_SECRET || '';
    this.hotelId = process.env.BOOKING_HOTEL_ID || '';
    this.baseUrl = process.env.BOOKING_API_BASE_URL || 'https://secure-supply-connect.booking.com/';

    if (!this.clientId || !this.clientSecret || !this.hotelId) {
      throw new Error(
        'Credenciais Booking não configuradas: BOOKING_CLIENT_ID, BOOKING_CLIENT_SECRET, BOOKING_HOTEL_ID são obrigatórios'
      );
    }
  }

  /**
   * Obter token OAuth2 com cache
   * ⚠️ CRÍTICO: Refresh 60s ANTES de expirar para evitar race conditions
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiresAt > Date.now()) {
      return this.accessToken;
    }

    const response = await fetch(`${this.baseUrl}oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials',
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Booking OAuth2 failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { access_token: string; expires_in: number };
    this.accessToken = data.access_token;
    // Refresh 60s antes de expirar
    this.tokenExpiresAt = Date.now() + (data.expires_in - 60) * 1000;

    return this.accessToken;
  }

  /**
   * Fetch reservas do Booking em um período
   * ⚠️ IMPORTANTE: Implementar paginação para períodos grandes
   */
  async getReservations(startDate: string, endDate: string): Promise<BookingReservation[]> {
    const token = await this.getAccessToken();

    const params = new URLSearchParams({
      property_id: this.hotelId,
      start_date: startDate,
      end_date: endDate,
      limit: '100',
    });

    const response = await fetch(`${this.baseUrl}v1/reservations?${params.toString()}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Booking getReservations failed: ${response.status} ${error}`);
    }

    const data = (await response.json()) as { reservations: BookingReservation[] };
    return data.reservations || [];
  }

  /**
   * Fetch uma reserva específica pelo ID
   */
  async getReservation(bookingId: string): Promise<BookingReservation> {
    const token = await this.getAccessToken();

    const response = await fetch(`${this.baseUrl}v1/reservations/${encodeURIComponent(bookingId)}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Booking getReservation failed: ${response.status} ${error}`);
    }

    return response.json();
  }

  /**
   * Confirmar reserva (alguns parceiros precisam confirmar em 24h)
   */
  async confirmReservation(bookingId: string): Promise<void> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${this.baseUrl}v1/reservations/${encodeURIComponent(bookingId)}/confirm`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Booking confirmReservation failed: ${response.status} ${error}`);
    }
  }

  /**
   * Validar assinatura HMAC-SHA256 de webhook
   * ⚠️ CRÍTICO: Sempre validar assinatura antes de processar webhook
   */
  verifyWebhookSignature(body: string, signature: string): boolean {
    const secret = process.env.BOOKING_WEBHOOK_SECRET;
    if (!secret) {
      console.warn('[Booking] BOOKING_WEBHOOK_SECRET não configurado, webhook não pode ser validado');
      return false;
    }

    const computed = crypto.createHmac('sha256', secret).update(body).digest('hex');

    // Usar timingSafeEqual para evitar timing attack
    try {
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computed));
    } catch {
      // timingSafeEqual throws se tamanhos forem diferentes
      return false;
    }
  }
}

/**
 * Instância singleton
 * ⚠️ NOTA: Credenciais são carregadas AQUI, não no constructor
 * Se .env mudar, é necessário restart do app
 */
export const bookingClient = new BookingClient();
