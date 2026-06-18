import { DataTypes, Model, Optional, Sequelize } from "sequelize";
import { Room } from "@/models/Room";

export type ReservationAttributes = {
  id: number;
  createdByUserId: number | null;
  roomId: number;
  tenantId: number;
  channexReservationId: string;
  otaSource: "booking" | "expedia" | "hotels_com" | "manual";
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  guestCpf: string | null;
  checkIn: string;
  checkOut: string;
  status: "confirmed" | "pending" | "cancelled" | "blocked";
  channelReference: string;
  amount: number;
  currency: string;
  notes: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type ReservationCreationAttributes = Optional<
  ReservationAttributes,
  "id" | "createdAt" | "updatedAt"
>;

export class Reservation
  extends Model<ReservationAttributes, ReservationCreationAttributes>
  implements ReservationAttributes
{
  declare id: number;
  declare createdByUserId: number | null;
  declare roomId: number;
  declare tenantId: number;
  declare channexReservationId: string;
  declare otaSource: "booking" | "expedia" | "hotels_com" | "manual";
  declare guestName: string;
  declare guestEmail: string;
  declare guestPhone: string;
  declare guestCpf: string | null;
  declare checkIn: string;
  declare checkOut: string;
  declare status: "confirmed" | "pending" | "cancelled" | "blocked";
  declare channelReference: string;
  declare amount: number;
  declare currency: string;
  declare notes: string;
  declare readonly createdAt: Date;
  declare readonly updatedAt: Date;

  static initialize(sequelize: Sequelize) {
    Reservation.init(
      {
        id: {
          type: DataTypes.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        createdByUserId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: true,
          field: "created_by_user_id",
          references: {
            model: "users",
            key: "id",
          },
        },
        roomId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: "room_id",
          references: {
            model: "rooms",
            key: "id",
          },
        },
        tenantId: {
          type: DataTypes.INTEGER.UNSIGNED,
          allowNull: false,
          field: "tenant_id",
          references: {
            model: "tenants",
            key: "id",
          },
        },
        channexReservationId: {
          type: DataTypes.STRING(100),
          allowNull: false,
          unique: true,
          field: "channex_reservation_id",
        },
        otaSource: {
          type: DataTypes.ENUM("booking", "expedia", "hotels_com", "manual"),
          allowNull: false,
          field: "ota_source",
        },
        guestName: {
          type: DataTypes.STRING(140),
          allowNull: false,
          field: "guest_name",
        },
        guestEmail: {
          type: DataTypes.STRING(160),
          allowNull: false,
          field: "guest_email",
        },
        guestPhone: {
          type: DataTypes.STRING(40),
          allowNull: false,
          field: "guest_phone",
        },
        guestCpf: {
          type: DataTypes.STRING(20),
          allowNull: true,
          field: "guest_cpf",
        },
        checkIn: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "check_in",
        },
        checkOut: {
          type: DataTypes.DATE,
          allowNull: false,
          field: "check_out",
        },
        status: {
          type: DataTypes.ENUM("confirmed", "pending", "cancelled", "blocked"),
          allowNull: false,
          defaultValue: "confirmed",
        },
        channelReference: {
          type: DataTypes.STRING(100),
          allowNull: false,
          field: "channel_reference",
        },
        amount: {
          type: DataTypes.DECIMAL(12, 2),
          allowNull: false,
          defaultValue: 0,
        },
        currency: {
          type: DataTypes.STRING(8),
          allowNull: false,
          defaultValue: "BRL",
        },
        notes: {
          type: DataTypes.TEXT,
          allowNull: false,
          defaultValue: "",
        },
      },
      {
        sequelize,
        tableName: "reservations",
        modelName: "Reservation",
      },
    );
  }

  static associate() {
    Reservation.belongsTo(Room, {
      foreignKey: "roomId",
      as: "room",
    });
  }
}
