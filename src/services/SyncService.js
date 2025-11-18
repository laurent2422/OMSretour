const ShopifyConnector = require('../connectors/ShopifyConnector');
const WooCommerceConnector = require('../connectors/WooCommerceConnector');
const AdobeCommerceConnector = require('../connectors/AdobeCommerceConnector');
const PrestaShopConnector = require('../connectors/PrestaShopConnector');
const SyncLog = require('../models/SyncLog');

class SyncService {
  constructor() {
    this.connectors = {};
    this.initializeConnectors();
  }

  /**
   * Initialise les connecteurs configurés
   */
  initializeConnectors() {
    // Shopify
    if (process.env.SHOPIFY_ACCESS_TOKEN && process.env.SHOPIFY_SHOP_NAME) {
      try {
        this.connectors.shopify = new ShopifyConnector({
          shopName: process.env.SHOPIFY_SHOP_NAME,
          accessToken: process.env.SHOPIFY_ACCESS_TOKEN
        });
        console.log('✓ Connecteur Shopify initialisé');
      } catch (error) {
        console.error('✗ Erreur initialisation Shopify:', error.message);
      }
    }

    // WooCommerce
    if (process.env.WOOCOMMERCE_URL && process.env.WOOCOMMERCE_CONSUMER_KEY) {
      try {
        this.connectors.woocommerce = new WooCommerceConnector({
          url: process.env.WOOCOMMERCE_URL,
          consumerKey: process.env.WOOCOMMERCE_CONSUMER_KEY,
          consumerSecret: process.env.WOOCOMMERCE_CONSUMER_SECRET
        });
        console.log('✓ Connecteur WooCommerce initialisé');
      } catch (error) {
        console.error('✗ Erreur initialisation WooCommerce:', error.message);
      }
    }

    // Adobe Commerce
    if (process.env.ADOBE_COMMERCE_URL && process.env.ADOBE_COMMERCE_ACCESS_TOKEN) {
      try {
        this.connectors.adobe_commerce = new AdobeCommerceConnector({
          url: process.env.ADOBE_COMMERCE_URL,
          accessToken: process.env.ADOBE_COMMERCE_ACCESS_TOKEN
        });
        console.log('✓ Connecteur Adobe Commerce initialisé');
      } catch (error) {
        console.error('✗ Erreur initialisation Adobe Commerce:', error.message);
      }
    }

    // PrestaShop
    if (process.env.PRESTASHOP_URL && process.env.PRESTASHOP_API_KEY) {
      try {
        this.connectors.prestashop = new PrestaShopConnector({
          url: process.env.PRESTASHOP_URL,
          apiKey: process.env.PRESTASHOP_API_KEY
        });
        console.log('✓ Connecteur PrestaShop initialisé');
      } catch (error) {
        console.error('✗ Erreur initialisation PrestaShop:', error.message);
      }
    }

    const connectorCount = Object.keys(this.connectors).length;
    console.log(`\n${connectorCount} connecteur(s) e-commerce configuré(s)\n`);
  }

  /**
   * Synchronise les commandes d'une plateforme spécifique
   */
  async syncPlatform(platform, options = {}) {
    const connector = this.connectors[platform];

    if (!connector) {
      throw new Error(`Connecteur non trouvé ou non configuré pour: ${platform}`);
    }

    // Créer un log de synchronisation
    const syncLog = await SyncLog.create({
      platform,
      status: 'in_progress',
      startTime: new Date()
    });

    try {
      console.log(`\n🔄 Synchronisation ${platform} démarrée...`);
      const stats = await connector.syncOrders(options);

      // Mettre à jour le log
      await syncLog.update({
        status: 'success',
        ordersImported: stats.imported,
        ordersUpdated: stats.updated,
        endTime: new Date()
      });

      console.log(`✓ Synchronisation ${platform} terminée avec succès`);
      return stats;
    } catch (error) {
      // Enregistrer l'erreur
      await syncLog.update({
        status: 'error',
        errorMessage: error.message,
        endTime: new Date()
      });

      console.error(`✗ Erreur lors de la synchronisation ${platform}:`, error.message);
      throw error;
    }
  }

  /**
   * Synchronise toutes les plateformes configurées
   */
  async syncAll(options = {}) {
    const results = {};
    const platforms = Object.keys(this.connectors);

    console.log(`\n📦 Synchronisation de ${platforms.length} plateforme(s)...\n`);

    for (const platform of platforms) {
      try {
        results[platform] = await this.syncPlatform(platform, options);
      } catch (error) {
        results[platform] = {
          error: error.message,
          imported: 0,
          updated: 0
        };
      }
    }

    // Résumé
    const totalImported = Object.values(results).reduce((sum, r) => sum + (r.imported || 0), 0);
    const totalUpdated = Object.values(results).reduce((sum, r) => sum + (r.updated || 0), 0);

    console.log(`\n📊 Résumé de la synchronisation:`);
    console.log(`   Commandes importées: ${totalImported}`);
    console.log(`   Commandes mises à jour: ${totalUpdated}`);
    console.log(`   Total: ${totalImported + totalUpdated}\n`);

    return results;
  }

  /**
   * Obtient la liste des plateformes configurées
   */
  getConfiguredPlatforms() {
    return Object.keys(this.connectors);
  }

  /**
   * Vérifie si une plateforme est configurée
   */
  isPlatformConfigured(platform) {
    return !!this.connectors[platform];
  }
}

module.exports = SyncService;
