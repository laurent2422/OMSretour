const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Return = sequelize.define('Return', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Référence à la commande
  orderId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'order_id',
    references: {
      model: 'orders',
      key: 'id'
    }
  },
  // Numéro de retour
  returnNumber: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    field: 'return_number'
  },
  // Type de retour : return (retour simple), exchange (échange), refund (remboursement), gift_card (bon cadeau)
  returnType: {
    type: DataTypes.ENUM('return', 'exchange', 'refund', 'gift_card'),
    allowNull: false,
    defaultValue: 'return',
    field: 'return_type'
  },
  // Statut : pending (en attente), approved (approuvé), rejected (rejeté), processing (en cours), completed (terminé)
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'processing', 'completed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  // Informations client
  customerEmail: {
    type: DataTypes.STRING,
    allowNull: false,
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
  // Raison du retour
  reason: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Description détaillée
  description: {
    type: DataTypes.TEXT
  },
  // Pour les échanges : produit souhaité en remplacement
  exchangeProductInfo: {
    type: DataTypes.JSONB,
    field: 'exchange_product_info'
  },
  // Montant total du retour
  totalAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'total_amount'
  },
  // Montant du remboursement (peut être différent du montant total si frais de retour)
  refundAmount: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'refund_amount'
  },
  // Frais de retour
  returnFees: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    field: 'return_fees'
  },
  // Code du bon cadeau généré (si returnType = gift_card)
  giftCardCode: {
    type: DataTypes.STRING,
    field: 'gift_card_code'
  },
  // Adresse de retour
  returnAddress: {
    type: DataTypes.JSONB,
    field: 'return_address'
  },
  // Numéro de suivi du colis retour
  trackingNumber: {
    type: DataTypes.STRING,
    field: 'tracking_number'
  },
  // Photos/preuves du retour
  attachments: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  // Notes internes
  internalNotes: {
    type: DataTypes.TEXT,
    field: 'internal_notes'
  },
  // Date de la demande
  requestDate: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    field: 'request_date'
  },
  // Date d'approbation
  approvedDate: {
    type: DataTypes.DATE,
    field: 'approved_date'
  },
  // Date de complétion
  completedDate: {
    type: DataTypes.DATE,
    field: 'completed_date'
  }
}, {
  tableName: 'returns',
  timestamps: true,
  indexes: [
    { fields: ['order_id'] },
    { fields: ['return_number'], unique: true },
    { fields: ['status'] },
    { fields: ['return_type'] },
    { fields: ['customer_email'] },
    { fields: ['request_date'] }
  ]
});

module.exports = Return;
