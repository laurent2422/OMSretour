const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Order = sequelize.define('Order', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // ID de la commande sur la plateforme source
  externalOrderId: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'external_order_id'
  },
  // Plateforme source (shopify, woocommerce, adobe_commerce, prestashop)
  platform: {
    type: DataTypes.ENUM('shopify', 'woocommerce', 'adobe_commerce', 'prestashop'),
    allowNull: false
  },
  // Numéro de commande
  orderNumber: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'order_number'
  },
  // Statut de la commande
  status: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Statut financier
  financialStatus: {
    type: DataTypes.STRING,
    field: 'financial_status'
  },
  // Statut de livraison
  fulfillmentStatus: {
    type: DataTypes.STRING,
    field: 'fulfillment_status'
  },
  // Informations client
  customerEmail: {
    type: DataTypes.STRING,
    field: 'customer_email'
  },
  customerName: {
    type: DataTypes.STRING,
    field: 'customer_name'
  },
  customerPhone: {
    type: DataTypes.STRING,
    field: 'customer_phone'
  },
  // Montants
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'total_price'
  },
  subtotalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'subtotal_price'
  },
  taxPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'tax_price'
  },
  shippingPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'shipping_price'
  },
  currency: {
    type: DataTypes.STRING(3),
    defaultValue: 'EUR'
  },
  // Adresses
  shippingAddress: {
    type: DataTypes.JSONB,
    field: 'shipping_address'
  },
  billingAddress: {
    type: DataTypes.JSONB,
    field: 'billing_address'
  },
  // Articles de la commande
  lineItems: {
    type: DataTypes.JSONB,
    field: 'line_items'
  },
  // Données brutes de la plateforme
  rawData: {
    type: DataTypes.JSONB,
    field: 'raw_data'
  },
  // Dates
  orderDate: {
    type: DataTypes.DATE,
    field: 'order_date'
  },
  lastSyncDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'last_sync_date'
  }
}, {
  tableName: 'orders',
  timestamps: true,
  indexes: [
    {
      unique: true,
      fields: ['external_order_id', 'platform']
    },
    {
      fields: ['platform']
    },
    {
      fields: ['status']
    },
    {
      fields: ['order_date']
    },
    {
      fields: ['customer_email']
    }
  ]
});

module.exports = Order;
