import { motion } from "framer-motion";
import { cn, formatDateLabel, differenceInDays, daysBetween } from "@/lib/utils";
import type {
  Reservation,
  Room,
  OtaSource,
  ReservationStatus,
} from "@/types/domain";

// Constantes visuais movidas para o componente que realmente as usa
const OTA_STYLES: Record<OtaSource, string> = {
  booking: "bg-booking text-white",
  expedia: "bg-expedia text-slate-950",
  hotels_com: "bg-hotels text-white",
  manual: "bg-violet-600 text-white",
};

const OTA_LABELS: Record<OtaSource, string> = {
  booking: "Booking.com",
  expedia: "Expedia",
  hotels_com: "Hotels.com",
  manual: "Manual",
};

const STATUS_LABELS: Record<ReservationStatus, string> = {
  confirmed: "Confirmada",
  pending: "Pendente",
  cancelled: "Cancelada",
  blocked: "Bloqueada",
};

function formatCurrency(value: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(value);
}

interface CalendarGridProps {
  rooms: Room[];
  days: Date[];
  visibleReservations: Reservation[];
  gridStart: Date;
  daysVisible: number;
  onOpenManualEntry: (roomId: string, date: Date) => void;
  onOpenReservation: (reservation: Reservation) => void;
}

export function CalendarGrid({
  rooms,
  days,
  visibleReservations,
  gridStart,
  daysVisible,
  onOpenManualEntry,
  onOpenReservation,
}: CalendarGridProps) {
  return (
    <div className="mt-6 overflow-x-auto">
      <div
        className="space-y-4"
        style={{ minWidth: `${260 + days.length * 108}px` }}
      >
        {/* Cabeçalho dos Dias */}
        <div
          className="grid gap-3"
          style={{
            gridTemplateColumns: `260px repeat(${days.length}, minmax(96px, 1fr))`,
          }}
        >
          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm font-medium text-slate-300">
            Acomodações
          </div>
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-4 text-center"
            >
              <p className="text-xs uppercase tracking-[0.28em] text-slate-500">
                {day.toLocaleDateString("pt-BR", { weekday: "short" })}
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-100">
                {formatDateLabel(day)}
              </p>
            </div>
          ))}
        </div>

        {/* Linhas dos Quartos */}
        {rooms.map((room) => {
          const roomReservations = visibleReservations.filter(
            (reservation) => reservation.roomId === room.id,
          );

          return (
            <div
              key={room.id}
              className="grid gap-3"
              style={{
                gridTemplateColumns: `260px repeat(${days.length}, minmax(96px, 1fr))`,
              }}
            >
              {/* Card do Quarto (Lado Esquerdo) */}
              <div className="rounded-[24px] border border-white/10 bg-slate-950/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-white">{room.name}</p>
                    <p className="mt-2 text-sm text-slate-400">
                      {room.maxGuests} hóspedes
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium",
                      room.status === "active"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                        : "border-amber-400/20 bg-amber-400/10 text-amber-200",
                    )}
                  >
                    {room.status === "active" ? "Ativo" : "Manutenção"}
                  </span>
                </div>
              </div>

              {/* Grade de Dias e Reservas (Lado Direito) */}
              <div
                className="relative grid h-[120px] gap-3 rounded-[24px] border border-white/10 bg-slate-950/50 p-3"
                style={{
                  gridColumn: `span ${days.length} / span ${days.length}`,
                  gridTemplateColumns: `repeat(${days.length}, minmax(96px, 1fr))`,
                }}
              >
                {/* Botões invisíveis para clicar no dia vazio e criar reserva */}
                {days.map((day) => (
                  <button
                    key={`${room.id}-${day.toISOString()}`}
                    onClick={() => onOpenManualEntry(room.id, day)}
                    className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] transition hover:border-sky-300/40 hover:bg-sky-400/5"
                    aria-label={`Criar lançamento para ${room.name} em ${formatDateLabel(day)}`}
                  />
                ))}

                {/* Os Blocos das Reservas */}
                {roomReservations.map((reservation) => {
                  const checkInDate = new Date(reservation.checkIn);
                  const checkOutDate = new Date(reservation.checkOut);

                  const startOffset = daysBetween(gridStart, checkInDate);
                  const duration = differenceInDays(checkOutDate, checkInDate);
                  const visibleDuration = Math.min(
                    duration,
                    daysVisible - Math.max(0, startOffset),
                  );

                  if (
                    visibleDuration <= 0 ||
                    startOffset >= daysVisible ||
                    checkOutDate <= gridStart
                  ) {
                    return null; // Reserva está fora da tela atual
                  }

                  const isCompactCard = visibleDuration <= 2;
                  const isUltraCompactCard = visibleDuration === 1;

                  return (
                    <motion.button
                      key={reservation.id}
                      layout
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => onOpenReservation(reservation)}
                      className={cn(
                        "absolute top-3 flex h-[96px] min-w-0 flex-col justify-between overflow-hidden rounded-[20px] border border-black/10 px-3 py-3 text-left shadow-lg shadow-slate-950/25 sm:px-4",
                        OTA_STYLES[reservation.otaSource] || OTA_STYLES.manual,
                      )}
                      style={{
                        left: `calc(${Math.max(0, startOffset)} * (100% / ${daysVisible}) + ${Math.max(0, startOffset)} * 0.75rem + 0.75rem)`,
                        width: `calc(${visibleDuration} * (100% / ${daysVisible}) + ${Math.max(visibleDuration - 1, 0)} * 0.75rem - 0.75rem)`,
                      }}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] opacity-80 sm:text-[11px] sm:tracking-[0.24em]">
                            {OTA_LABELS[reservation.otaSource] || "Site Direto"}
                          </p>
                          {!isUltraCompactCard ? (
                            <span className="truncate text-[10px] opacity-85 sm:text-[11px]">
                              {STATUS_LABELS[reservation.status]}
                            </span>
                          ) : null}
                        </div>
                        <p
                          className="mt-2 truncate text-xs font-semibold sm:text-sm"
                          title={reservation.customer.name}
                        >
                          {reservation.customer.name}
                        </p>
                        {!isCompactCard ? (
                          <p className="mt-1 truncate text-[11px] opacity-90">
                            {formatCurrency(
                              reservation.amount,
                              reservation.currency,
                            )}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-between gap-2 text-[10px] opacity-85 sm:text-[11px]">
                        {!isCompactCard ? (
                          <span className="truncate">
                            {reservation.channelReference}
                          </span>
                        ) : null}
                        <span className="truncate">
                          {reservation.checkIn
                            .slice(5, 10)
                            .split("-")
                            .reverse()
                            .join("/")}{" "}
                          →{" "}
                          {reservation.checkOut
                            .slice(5, 10)
                            .split("-")
                            .reverse()
                            .join("/")}
                        </span>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
