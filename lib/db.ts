import { initializeModels, createSequelizeClient } from '@/models';
import { DataTypes } from 'sequelize';

export type DbModels = ReturnType<typeof initializeModels>;

declare global {
  // eslint-disable-next-line no-var
  var __sequelizeModels: DbModels | undefined;
  // eslint-disable-next-line no-var
  var __sequelizeModelsPromise: Promise<DbModels> | undefined;
}

function shouldAutoSyncSchema() {
  const envValue = process.env.DB_AUTO_SYNC;
  if (typeof envValue === 'string') {
    return envValue === 'true';
  }

  return process.env.NODE_ENV !== 'production';
}

async function ensureRoomAmenitiesColumn(models: DbModels) {
  const table = await models.sequelize.getQueryInterface().describeTable('rooms');

  if (!table.amenities) {
    await models.sequelize.getQueryInterface().addColumn('rooms', 'amenities', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON array de comodidades',
    });
  }

  if (!table.photo_urls) {
    await models.sequelize.getQueryInterface().addColumn('rooms', 'photo_urls', {
      type: DataTypes.TEXT,
      allowNull: true,
      defaultValue: null,
      comment: 'JSON array de URLs das fotos',
    });
  }
}

async function ensureReservationUnitNumberColumn(models: DbModels) {
  const table = await models.sequelize.getQueryInterface().describeTable('reservations');

  if (!table.unit_number) {
    await models.sequelize.getQueryInterface().addColumn('reservations', 'unit_number', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
      comment: 'Número da unidade física (1..quantity) ocupada pela reserva',
    });
  }
}

async function ensureReservationStayColumns(models: DbModels) {
  const queryInterface = models.sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('reservations');

  if (!table.checked_in_at) {
    await queryInterface.addColumn('reservations', 'checked_in_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.checked_out_at) {
    await queryInterface.addColumn('reservations', 'checked_out_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }
}

async function ensureUserTeamColumns(models: DbModels) {
  const queryInterface = models.sequelize.getQueryInterface();
  const table = await queryInterface.describeTable('users');

  if (!table.name) {
    await queryInterface.addColumn('users', 'name', {
      type: DataTypes.STRING(120),
      allowNull: false,
      defaultValue: '',
    });
  }

  if (!table.phone) {
    await queryInterface.addColumn('users', 'phone', {
      type: DataTypes.STRING(30),
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.team_role) {
    await queryInterface.addColumn('users', 'team_role', {
      type: DataTypes.ENUM('Recepcao', 'Limpeza', 'Manutencao', 'Gestao'),
      allowNull: false,
      defaultValue: 'Recepcao',
    });
  }

  if (!table.employment_status) {
    await queryInterface.addColumn('users', 'employment_status', {
      type: DataTypes.ENUM('active', 'inactive'),
      allowNull: false,
      defaultValue: 'active',
    });
  }

  if (!table.shift_status) {
    await queryInterface.addColumn('users', 'shift_status', {
      type: DataTypes.ENUM('off', 'on_shift'),
      allowNull: false,
      defaultValue: 'off',
    });
  }

  if (!table.shift_label) {
    await queryInterface.addColumn('users', 'shift_label', {
      type: DataTypes.ENUM('morning', 'afternoon', 'night'),
      allowNull: false,
      defaultValue: 'morning',
    });
  }

  if (!table.last_punch_at) {
    await queryInterface.addColumn('users', 'last_punch_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null,
    });
  }

  if (!table.dashboard_permissions) {
    await queryInterface.addColumn('users', 'dashboard_permissions', {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: '[]',
    });
  }
}

export async function getDb(): Promise<DbModels> {
  if (!global.__sequelizeModelsPromise) {
    global.__sequelizeModelsPromise = (async () => {
      if (!global.__sequelizeModels) {
        const sequelize = createSequelizeClient();
        global.__sequelizeModels = initializeModels(sequelize);

        await sequelize.authenticate();
        if (shouldAutoSyncSchema()) {
          await sequelize.sync({ alter: true });
        }
        // Migrações incrementais só precisam rodar uma vez, no cold start —
        // repeti-las a cada requisição soma um describeTable() por chamada.
        await ensureRoomAmenitiesColumn(global.__sequelizeModels);
        await ensureUserTeamColumns(global.__sequelizeModels);
        await ensureReservationUnitNumberColumn(global.__sequelizeModels);
        await ensureReservationStayColumns(global.__sequelizeModels);
      }

      return global.__sequelizeModels;
    })().catch((error) => {
      global.__sequelizeModels = undefined;
      global.__sequelizeModelsPromise = undefined;
      throw error;
    });
  }

  return global.__sequelizeModelsPromise;
}
