const Order = require('./Order');
const Return = require('./Return');
const ReturnItem = require('./ReturnItem');
const SyncLog = require('./SyncLog');

// Définir les relations
Order.hasMany(Return, {
  foreignKey: 'orderId',
  as: 'returns'
});

Return.belongsTo(Order, {
  foreignKey: 'orderId',
  as: 'order'
});

Return.hasMany(ReturnItem, {
  foreignKey: 'returnId',
  as: 'items'
});

ReturnItem.belongsTo(Return, {
  foreignKey: 'returnId',
  as: 'return'
});

module.exports = {
  Order,
  Return,
  ReturnItem,
  SyncLog
};
