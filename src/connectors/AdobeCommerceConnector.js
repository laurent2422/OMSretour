const axios = require('axios');
const Order = require('../models/Order');

class AdobeCommerceConnector {
  constructor(config) {
    this.baseUrl = config.url || process.env.ADOBE_COMMERCE_URL;
    this.accessToken = config.accessToken || process.env.ADOBE_COMMERCE_ACCESS_TOKEN;

    if (!this.baseUrl || !this.accessToken) {
      throw new Error('Adobe Commerce configuration manquante: url et accessToken requis');
    }

    // Enlever le slash final si présent
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    this.apiUrl = `${this.baseUrl}/rest/V1`;
  }

  /**
   * Récupère les commandes depuis Adobe Commerce (Magento)
   */
  async fetchOrders(options = {}) {
    try {
      const searchCriteria = [];

      if (options.since) {
        searchCriteria.push(`searchCriteria[filter_groups][0][filters][0][field]=created_at`);
        searchCriteria.push(`searchCriteria[filter_groups][0][filters][0][value]=${options.since}`);
        searchCriteria.push(`searchCriteria[filter_groups][0][filters][0][condition_type]=gt`);
      }

      searchCriteria.push(`searchCriteria[pageSize]=${options.limit || 100}`);
      searchCriteria.push(`searchCriteria[currentPage]=${options.page || 1}`);

      const queryString = searchCriteria.join('&');
      const url = `${this.apiUrl}/orders?${queryString}`;

      const response = await axios.get(url, {
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.items || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes Adobe Commerce:', error.message);
      throw error;
    }
  }

  /**
   * Transforme une commande Adobe Commerce au format OMS
   */
  transformOrder(magentoOrder) {
    return {
      externalOrderId: magentoOrder.entity_id.toString(),
      platform: 'adobe_commerce',
      orderNumber: magentoOrder.increment_id,
      status: magentoOrder.status,
      financialStatus: magentoOrder.status === 'complete' ? 'paid' : 'pending',
      fulfillmentStatus: magentoOrder.state,
      customerEmail: magentoOrder.customer_email,
      customerName: `${magentoOrder.customer_firstname} ${magentoOrder.customer_lastname}`,
      customerPhone: magentoOrder.billing_address?.telephone || null,
      totalPrice: parseFloat(magentoOrder.grand_total || 0),
      subtotalPrice: parseFloat(magentoOrder.subtotal || 0),
      taxPrice: parseFloat(magentoOrder.tax_amount || 0),
      shippingPrice: parseFloat(magentoOrder.shipping_amount || 0),
      currency: magentoOrder.order_currency_code,
      shippingAddress: magentoOrder.extension_attributes?.shipping_assignments?.[0]?.shipping?.address ? {
        firstName: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.firstname,
        lastName: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.lastname,
        address1: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.street?.[0],
        address2: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.street?.[1],
        city: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.city,
        province: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.region,
        zip: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.postcode,
        country: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.country_id,
        phone: magentoOrder.extension_attributes.shipping_assignments[0].shipping.address.telephone
      } : null,
      billingAddress: magentoOrder.billing_address ? {
        firstName: magentoOrder.billing_address.firstname,
        lastName: magentoOrder.billing_address.lastname,
        address1: magentoOrder.billing_address.street?.[0],
        address2: magentoOrder.billing_address.street?.[1],
        city: magentoOrder.billing_address.city,
        province: magentoOrder.billing_address.region,
        zip: magentoOrder.billing_address.postcode,
        country: magentoOrder.billing_address.country_id,
        phone: magentoOrder.billing_address.telephone,
        email: magentoOrder.billing_address.email
      } : null,
      lineItems: magentoOrder.items?.map(item => ({
        id: item.item_id,
        productId: item.product_id,
        sku: item.sku,
        title: item.name,
        quantity: item.qty_ordered,
        price: parseFloat(item.price),
        total: parseFloat(item.row_total)
      })) || [],
      rawData: magentoOrder,
      orderDate: new Date(magentoOrder.created_at),
      lastSyncDate: new Date()
    };
  }

  /**
   * Synchronise les commandes Adobe Commerce vers la base de données
   */
  async syncOrders(options = {}) {
    const stats = {
      imported: 0,
      updated: 0,
      errors: []
    };

    try {
      const orders = await this.fetchOrders(options);
      console.log(`${orders.length} commandes récupérées depuis Adobe Commerce`);

      for (const magentoOrder of orders) {
        try {
          const transformedOrder = this.transformOrder(magentoOrder);

          const [order, created] = await Order.upsert(transformedOrder, {
            returning: true
          });

          if (created) {
            stats.imported++;
          } else {
            stats.updated++;
          }
        } catch (error) {
          console.error(`Erreur lors de la synchronisation de la commande ${magentoOrder.entity_id}:`, error.message);
          stats.errors.push({
            orderId: magentoOrder.entity_id,
            error: error.message
          });
        }
      }

      console.log(`Synchronisation Adobe Commerce terminée: ${stats.imported} importées, ${stats.updated} mises à jour`);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la synchronisation Adobe Commerce:', error.message);
      throw error;
    }
  }
}

module.exports = AdobeCommerceConnector;
