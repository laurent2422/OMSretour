const WooCommerceAPI = require('woocommerce-api');
const Order = require('../models/Order');

class WooCommerceConnector {
  constructor(config) {
    this.url = config.url || process.env.WOOCOMMERCE_URL;
    this.consumerKey = config.consumerKey || process.env.WOOCOMMERCE_CONSUMER_KEY;
    this.consumerSecret = config.consumerSecret || process.env.WOOCOMMERCE_CONSUMER_SECRET;

    if (!this.url || !this.consumerKey || !this.consumerSecret) {
      throw new Error('WooCommerce configuration manquante: url, consumerKey et consumerSecret requis');
    }

    this.client = new WooCommerceAPI({
      url: this.url,
      consumerKey: this.consumerKey,
      consumerSecret: this.consumerSecret,
      wpAPI: true,
      version: 'wc/v3'
    });
  }

  /**
   * Récupère les commandes depuis WooCommerce
   */
  async fetchOrders(options = {}) {
    return new Promise((resolve, reject) => {
      const params = {
        per_page: options.limit || 100,
        page: options.page || 1,
        status: options.status || 'any'
      };

      if (options.since) {
        params.after = options.since;
      }

      this.client.get('orders', params, (err, data, res) => {
        if (err) {
          reject(new Error(`Erreur WooCommerce API: ${err.message}`));
        } else {
          try {
            const orders = JSON.parse(res);
            resolve(orders);
          } catch (parseError) {
            reject(new Error('Erreur de parsing de la réponse WooCommerce'));
          }
        }
      });
    });
  }

  /**
   * Transforme une commande WooCommerce au format OMS
   */
  transformOrder(wooOrder) {
    return {
      externalOrderId: wooOrder.id.toString(),
      platform: 'woocommerce',
      orderNumber: wooOrder.number,
      status: wooOrder.status,
      financialStatus: wooOrder.status === 'completed' ? 'paid' : 'pending',
      fulfillmentStatus: wooOrder.status,
      customerEmail: wooOrder.billing.email,
      customerName: `${wooOrder.billing.first_name} ${wooOrder.billing.last_name}`,
      customerPhone: wooOrder.billing.phone,
      totalPrice: parseFloat(wooOrder.total || 0),
      subtotalPrice: parseFloat(wooOrder.total - wooOrder.total_tax || 0),
      taxPrice: parseFloat(wooOrder.total_tax || 0),
      shippingPrice: parseFloat(wooOrder.shipping_total || 0),
      currency: wooOrder.currency,
      shippingAddress: wooOrder.shipping ? {
        firstName: wooOrder.shipping.first_name,
        lastName: wooOrder.shipping.last_name,
        address1: wooOrder.shipping.address_1,
        address2: wooOrder.shipping.address_2,
        city: wooOrder.shipping.city,
        province: wooOrder.shipping.state,
        zip: wooOrder.shipping.postcode,
        country: wooOrder.shipping.country,
        company: wooOrder.shipping.company
      } : null,
      billingAddress: wooOrder.billing ? {
        firstName: wooOrder.billing.first_name,
        lastName: wooOrder.billing.last_name,
        address1: wooOrder.billing.address_1,
        address2: wooOrder.billing.address_2,
        city: wooOrder.billing.city,
        province: wooOrder.billing.state,
        zip: wooOrder.billing.postcode,
        country: wooOrder.billing.country,
        company: wooOrder.billing.company,
        phone: wooOrder.billing.phone,
        email: wooOrder.billing.email
      } : null,
      lineItems: wooOrder.line_items?.map(item => ({
        id: item.id,
        productId: item.product_id,
        variantId: item.variation_id,
        title: item.name,
        quantity: item.quantity,
        price: parseFloat(item.price),
        sku: item.sku,
        total: parseFloat(item.total)
      })) || [],
      rawData: wooOrder,
      orderDate: new Date(wooOrder.date_created),
      lastSyncDate: new Date()
    };
  }

  /**
   * Synchronise les commandes WooCommerce vers la base de données
   */
  async syncOrders(options = {}) {
    const stats = {
      imported: 0,
      updated: 0,
      errors: []
    };

    try {
      const orders = await this.fetchOrders(options);
      console.log(`${orders.length} commandes récupérées depuis WooCommerce`);

      for (const wooOrder of orders) {
        try {
          const transformedOrder = this.transformOrder(wooOrder);

          const [order, created] = await Order.upsert(transformedOrder, {
            returning: true
          });

          if (created) {
            stats.imported++;
          } else {
            stats.updated++;
          }
        } catch (error) {
          console.error(`Erreur lors de la synchronisation de la commande ${wooOrder.id}:`, error.message);
          stats.errors.push({
            orderId: wooOrder.id,
            error: error.message
          });
        }
      }

      console.log(`Synchronisation WooCommerce terminée: ${stats.imported} importées, ${stats.updated} mises à jour`);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la synchronisation WooCommerce:', error.message);
      throw error;
    }
  }
}

module.exports = WooCommerceConnector;
