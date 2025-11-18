const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ReturnItem = sequelize.define('ReturnItem', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  // Référence au retour
  returnId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'return_id',
    references: {
      model: 'returns',
      key: 'id'
    }
  },
  // Informations du produit
  productId: {
    type: DataTypes.STRING,
    field: 'product_id'
  },
  variantId: {
    type: DataTypes.STRING,
    field: 'variant_id'
  },
  sku: {
    type: DataTypes.STRING
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // Quantité retournée
  quantity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1
  },
  // Prix unitaire
  price: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  // Montant total de l'article
  totalPrice: {
    type: DataTypes.DECIMAL(10, 2),
    field: 'total_price'
  },
  // Raison spécifique pour cet article
  reason: {
    type: DataTypes.STRING
  },
  // Condition du produit retourné
  condition: {
    type: DataTypes.ENUM('new', 'like_new', 'used', 'damaged'),
    defaultValue: 'like_new'
  },
  // Notes sur l'état du produit
  conditionNotes: {
    type: DataTypes.TEXT,
    field: 'condition_notes'
  },
  // Photos de l'article
  images: {
    type: DataTypes.JSONB,
    defaultValue: []
  }
}, {
  tableName: 'return_items',
  timestamps: true,
  indexes: [
    { fields: ['return_id'] },
    { fields: ['sku'] },
    { fields: ['product_id'] }
  ]
});

module.exports = ReturnItem;
