const axios = require('axios');
const Order = require('../models/Order');

class PrestaShopConnector {
  constructor(config) {
    this.baseUrl = config.url || process.env.PRESTASHOP_URL;
    this.apiKey = config.apiKey || process.env.PRESTASHOP_API_KEY;

    if (!this.baseUrl || !this.apiKey) {
      throw new Error('PrestaShop configuration manquante: url et apiKey requis');
    }

    // Enlever le slash final si présent
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    this.apiUrl = `${this.baseUrl}/api`;
  }

  /**
   * Effectue une requête vers l'API PrestaShop
   */
  async makeRequest(resource, params = {}) {
    try {
      const response = await axios.get(`${this.apiUrl}/${resource}`, {
        auth: {
          username: this.apiKey,
          password: ''
        },
        params: {
          output_format: 'JSON',
          ...params
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Erreur lors de la requête PrestaShop (${resource}):`, error.message);
      throw error;
    }
  }

  /**
   * Récupère les commandes depuis PrestaShop
   */
  async fetchOrders(options = {}) {
    try {
      const params = {
        display: 'full',
        limit: options.limit || 100
      };

      if (options.since) {
        params['filter[date_add]'] = `>[${options.since}]`;
      }

      const data = await this.makeRequest('orders', params);
      return data.orders || [];
    } catch (error) {
      console.error('Erreur lors de la récupération des commandes PrestaShop:', error.message);
      throw error;
    }
  }

  /**
   * Récupère les détails d'une commande
   */
  async getOrderDetails(orderId) {
    try {
      const data = await this.makeRequest(`orders/${orderId}`);
      return data.order || null;
    } catch (error) {
      console.error(`Erreur lors de la récupération des détails de la commande ${orderId}:`, error.message);
      return null;
    }
  }

  /**
   * Récupère les informations client
   */
  async getCustomer(customerId) {
    try {
      const data = await this.makeRequest(`customers/${customerId}`);
      return data.customer || null;
    } catch (error) {
      console.error(`Erreur lors de la récupération du client ${customerId}:`, error.message);
      return null;
    }
  }

  /**
   * Récupère une adresse
   */
  async getAddress(addressId) {
    try {
      const data = await this.makeRequest(`addresses/${addressId}`);
      return data.address || null;
    } catch (error) {
      console.error(`Erreur lors de la récupération de l'adresse ${addressId}:`, error.message);
      return null;
    }
  }

  /**
   * Transforme une commande PrestaShop au format OMS
   */
  async transformOrder(psOrder) {
    // Récupérer les informations complémentaires
    const customer = psOrder.id_customer ? await this.getCustomer(psOrder.id_customer) : null;
    const shippingAddress = psOrder.id_address_delivery ? await this.getAddress(psOrder.id_address_delivery) : null;
    const billingAddress = psOrder.id_address_invoice ? await this.getAddress(psOrder.id_address_invoice) : null;

    return {
      externalOrderId: psOrder.id.toString(),
      platform: 'prestashop',
      orderNumber: psOrder.reference,
      status: psOrder.current_state,
      financialStatus: psOrder.payment ? 'paid' : 'pending',
      fulfillmentStatus: psOrder.current_state,
      customerEmail: customer?.email || null,
      customerName: customer ? `${customer.firstname} ${customer.lastname}` : null,
      customerPhone: shippingAddress?.phone || billingAddress?.phone || null,
      totalPrice: parseFloat(psOrder.total_paid || 0),
      subtotalPrice: parseFloat(psOrder.total_products || 0),
      taxPrice: parseFloat(psOrder.total_paid_tax_incl - psOrder.total_paid_tax_excl || 0),
      shippingPrice: parseFloat(psOrder.total_shipping || 0),
      currency: psOrder.id_currency,
      shippingAddress: shippingAddress ? {
        firstName: shippingAddress.firstname,
        lastName: shippingAddress.lastname,
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        city: shippingAddress.city,
        province: shippingAddress.id_state,
        zip: shippingAddress.postcode,
        country: shippingAddress.id_country,
        phone: shippingAddress.phone,
        company: shippingAddress.company
      } : null,
      billingAddress: billingAddress ? {
        firstName: billingAddress.firstname,
        lastName: billingAddress.lastname,
        address1: billingAddress.address1,
        address2: billingAddress.address2,
        city: billingAddress.city,
        province: billingAddress.id_state,
        zip: billingAddress.postcode,
        country: billingAddress.id_country,
        phone: billingAddress.phone,
        company: billingAddress.company
      } : null,
      lineItems: psOrder.associations?.order_rows?.map(item => ({
        id: item.id,
        productId: item.product_id,
        title: item.product_name,
        quantity: parseInt(item.product_quantity),
        price: parseFloat(item.product_price),
        sku: item.product_reference
      })) || [],
      rawData: psOrder,
      orderDate: new Date(psOrder.date_add),
      lastSyncDate: new Date()
    };
  }

  /**
   * Synchronise les commandes PrestaShop vers la base de données
   */
  async syncOrders(options = {}) {
    const stats = {
      imported: 0,
      updated: 0,
      errors: []
    };

    try {
      const orders = await this.fetchOrders(options);
      console.log(`${orders.length} commandes récupérées depuis PrestaShop`);

      for (const psOrder of orders) {
        try {
          const transformedOrder = await this.transformOrder(psOrder);

          const [order, created] = await Order.upsert(transformedOrder, {
            returning: true
          });

          if (created) {
            stats.imported++;
          } else {
            stats.updated++;
          }
        } catch (error) {
          console.error(`Erreur lors de la synchronisation de la commande ${psOrder.id}:`, error.message);
          stats.errors.push({
            orderId: psOrder.id,
            error: error.message
          });
        }
      }

      console.log(`Synchronisation PrestaShop terminée: ${stats.imported} importées, ${stats.updated} mises à jour`);
      return stats;
    } catch (error) {
      console.error('Erreur lors de la synchronisation PrestaShop:', error.message);
      throw error;
    }
  }
}

module.exports = PrestaShopConnector;
