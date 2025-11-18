const express = require('express');
const router = express.Router();
const SyncService = require('../services/SyncService');
const SyncLog = require('../models/SyncLog');

const syncService = new SyncService();

/**
 * POST /api/sync/all
 * Synchronise toutes les plateformes configurées
 */
router.post('/all', async (req, res) => {
  try {
    const results = await syncService.syncAll(req.body);

    res.json({
      success: true,
      message: 'Synchronisation de toutes les plateformes terminée',
      data: results
    });
  } catch (error) {
    console.error('Erreur lors de la synchronisation globale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/sync/:platform
 * Synchronise une plateforme spécifique
 */
router.post('/:platform', async (req, res) => {
  try {
    const { platform } = req.params;

    if (!syncService.isPlatformConfigured(platform)) {
      return res.status(400).json({
        success: false,
        error: `Plateforme non configurée: ${platform}`
      });
    }

    const results = await syncService.syncPlatform(platform, req.body);

    res.json({
      success: true,
      message: `Synchronisation ${platform} terminée`,
      data: results
    });
  } catch (error) {
    console.error(`Erreur lors de la synchronisation ${req.params.platform}:`, error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/platforms
 * Obtient la liste des plateformes configurées
 */
router.get('/platforms', (req, res) => {
  try {
    const platforms = syncService.getConfiguredPlatforms();

    res.json({
      success: true,
      data: {
        platforms,
        count: platforms.length
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des plateformes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/sync/logs
 * Récupère l'historique des synchronisations
 */
router.get('/logs', async (req, res) => {
  try {
    const { platform, limit = 50, page = 1 } = req.query;

    const where = {};
    if (platform) {
      where.platform = platform;
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: logs, count: total } = await SyncLog.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: logs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des logs:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
