require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const cron = require('node-cron');
const sequelize = require('./config/database');
const { Order, Return, ReturnItem, SyncLog } = require('./models');
const SyncService = require('./services/SyncService');

// Routes
const ordersRouter = require('./routes/orders');
const syncRouter = require('./routes/sync');
const returnsRouter = require('./routes/returns');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Servir les fichiers statiques (tableau de bord)
app.use(express.static(path.join(__dirname, '../public')));

// Routes API
app.use('/api/orders', ordersRouter);
app.use('/api/sync', syncRouter);
app.use('/api/returns', returnsRouter);

// Route principale
app.get('/api', (req, res) => {
  res.json({
    name: 'OMS Multi-Platform',
    version: '1.0.0',
    description: 'Order Management System pour Shopify, WooCommerce, Adobe Commerce et PrestaShop',
    endpoints: {
      orders: {
        list: 'GET /api/orders',
        get: 'GET /api/orders/:id',
        stats: 'GET /api/orders/stats/summary',
        search: 'GET /api/orders/search/:query'
      },
      sync: {
        all: 'POST /api/sync/all',
        platform: 'POST /api/sync/:platform',
        platforms: 'GET /api/sync/platforms',
        logs: 'GET /api/sync/logs'
      },
      returns: {
        create: 'POST /api/returns',
        list: 'GET /api/returns',
        get: 'GET /api/returns/:id',
        updateStatus: 'PATCH /api/returns/:id/status',
        byOrder: 'GET /api/returns/order/:orderId',
        stats: 'GET /api/returns/stats/summary'
      }
    }
  });
});

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Initialisation de la base de données et démarrage du serveur
async function startServer() {
  try {
    // Test de connexion à la base de données
    console.log('🔌 Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✓ Connexion à la base de données établie avec succès');

    // Synchronisation des modèles
    console.log('📊 Synchronisation des modèles...');
    await sequelize.sync({ alter: true });
    console.log('✓ Modèles synchronisés');

    // Initialisation du service de synchronisation
    console.log('\n🔧 Initialisation des connecteurs e-commerce...');
    const syncService = new SyncService();

    // Configuration de la synchronisation automatique
    const syncInterval = parseInt(process.env.SYNC_INTERVAL || 15);
    if (syncInterval > 0) {
      console.log(`⏰ Synchronisation automatique configurée: toutes les ${syncInterval} minutes`);

      cron.schedule(`*/${syncInterval} * * * *`, async () => {
        console.log('\n🔄 Démarrage de la synchronisation automatique...');
        try {
          await syncService.syncAll();
        } catch (error) {
          console.error('Erreur lors de la synchronisation automatique:', error.message);
        }
      });
    }

    // Démarrage du serveur
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(50));
      console.log(`🚀 Serveur OMS démarré sur le port ${PORT}`);
      console.log(`📍 API disponible sur: http://localhost:${PORT}`);
      console.log(`📖 Documentation: http://localhost:${PORT}/`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('='.repeat(50) + '\n');
    });

  } catch (error) {
    console.error('❌ Erreur lors du démarrage du serveur:', error);
    process.exit(1);
  }
}

// Gestion des erreurs non capturées
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Démarrage
startServer();

module.exports = app;
