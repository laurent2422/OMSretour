const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const SyncLog = sequelize.define('SyncLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  platform: {
    type: DataTypes.ENUM('shopify', 'woocommerce', 'adobe_commerce', 'prestashop'),
    allowNull: false
  },
  status: {
    type: DataTypes.ENUM('success', 'error', 'in_progress'),
    allowNull: false
  },
  ordersImported: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_imported'
  },
  ordersUpdated: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'orders_updated'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    field: 'error_message'
  },
  startTime: {
    type: DataTypes.DATE,
    field: 'start_time'
  },
  endTime: {
    type: DataTypes.DATE,
    field: 'end_time'
  }
}, {
  tableName: 'sync_logs',
  timestamps: true
});

module.exports = SyncLog;
