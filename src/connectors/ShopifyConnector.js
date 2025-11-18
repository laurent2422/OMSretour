const axios = require('axios');
const Order = require('../models/Order');

class ShopifyConnector {
  constructor(config) {
    this.shopName = config.shopName || process.env.SHOPIFY_SHOP_NAME;
    this.accessToken = config.accessToken || process.env.SHOPIFY_ACCESS_TOKEN;
    this.apiVersion = '2024-01';

    if (!this.shopName || !this.accessToken) {
      throw new Error('Shopify configuration manquante: shopName et accessToken requis');
    }

    this.baseUrl = `https://${this.shopName}/admin/api/${this.apiVersion}`;
  }

  /**
   * Récupère les commandes depuis Shopify
   */
  async fetchOrders(options = {}) {
    try {
      const params = {
        limit: options.limit || 250,
        status: options.status || 'any',
        created_at_min: options.since || null
      };

      const response = await axios.get(`${this.baseUrl}/orders.json`, {
        headers: {
          'X-Shopify-Access-Token': this.accessToken,
          'Content-Type': 'application/json'
        },
        params
      });

      return response.data.orders || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes Shopify:', error.message);
      throw error;
    }
  }

  /**
   * Transforme une commande Shopify au format OMS
   */
  transformOrder(shopifyOrder) {
    return {
      externalOrderId: shopifyOrder.id.toString(),
      platform: 'shopify',
      orderNumber: shopifyOrder.order_number || shopifyOrder.name,
      status: shopifyOrder.fulfillment_status || 'pending',
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      customerEmail: shopifyOrder.email,
      customerName: shopifyOrder.customer ? `${shopifyOrder.customer.first_name} ${shopifyOrder.customer.last_name}` : null,
      customerPhone: shopifyOrder.phone,
      totalPrice: parseFloat(shopifyOrder.total_price || 0),
      subtotalPrice: parseFloat(shopifyOrder.subtotal_price || 0),
      taxPrice: parseFloat(shopifyOrder.total_tax || 0),
      shippingPrice: parseFloat(shopifyOrder.total_shipping_price_set?.shop_money?.amount || 0),
      currency: shopifyOrder.currency,
      shippingAddress: shopifyOrder.shipping_address ? {
        firstName: shopifyOrder.shipping_address.first_name,
        lastName: shopifyOrder.shipping_address.last_name,
        address1: shopifyOrder.shipping_address.address1,
        address2: shopifyOrder.shipping_address.address2,
        city: shopifyOrder.shipping_address.city,
        province: shopifyOrder.shipping_address.province,
        zip: shopifyOrder.shipping_address.zip,
        country: shopifyOrder.shipping_address.country,
        phone: shopifyOrder.shipping_address.phone
      } : null,
      billingAddress: shopifyOrder.billing_address ? {
        firstName: shopifyOrder.billing_address.first_name,
        lastName: shopifyOrder.billing_address.last_name,
        address1: shopifyOrder.billing_address.address1,
        address2: shopifyOrder.billing_address.address2,
        city: shopifyOrder.billing_address.city,
        province: shopifyOrder.billing_address.province,
        zip: shopifyOrder.billing_address.zip,
        country: shopifyOrder.billing_address.country,
        phone: shopifyOrder.billing_address.phone
      } : null,
      lineItems: shopifyOrder.line_items?.map(item => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variant_id,
        title: item.title,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku,
        vendor: item.vendor
      })) || [],
      rawData: shopifyOrder,
      orderDate: new Date(shopifyOrder.created_at),
      lastSyncDate: new Date()
    };
  }

  /**
   * Synchronise les commandes Shopify vers la base de données
   */
  async syncOrders(options = {}) {
    const stats = {
      imported: 0,
      updated: 0,
      errors: []
    };

    try {
      const orders = await this.fetchOrders(options);
      console.log(`${orders.length} commandes récupérées depuis Shopify`);

      for (const shopifyOrder of orders) {
        try {
          const transformedOrder = this.transformOrder(shopifyOrder);

          const [order, created] = await Order.upsert(transformedOrder, {
            returning: true
          });

          if (created) {
            stats.imported++;
          } else {
            stats.updated++;
          }
        } catch (error) {
          console.error(`Erreur lors de la synchronisation de la commande ${shopifyOrder.id}:`, error.message);
          stats.errors.push({
            orderId: shopifyOrder.id,
            error: error.message
          });
        }
      }

      console.log(`Synchronisation Shopify terminée: ${stats.imported} importées, ${stats.updated} mises à jour`);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la synchronisation Shopify:', error.message);
      throw error;
    }
  }
}

module.exports = ShopifyConnector;
