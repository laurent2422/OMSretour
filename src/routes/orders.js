const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const sequelize = require('../config/database');
const { Op } = require('sequelize');

/**
 * GET /api/orders
 * Récupère toutes les commandes avec filtres et pagination
 */
router.get('/', async (req, res) => {
  try {
    const {
      platform,
      status,
      customerEmail,
      orderNumber,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'orderDate',
      sortOrder = 'DESC'
    } = req.query;

    // Construire les filtres
    const where = {};

    if (platform) {
      where.platform = platform;
    }

    if (status) {
      where.status = status;
    }

    if (customerEmail) {
      where.customerEmail = { [Op.iLike]: `%${customerEmail}%` };
    }

    if (orderNumber) {
      where.orderNumber = { [Op.iLike]: `%${orderNumber}%` };
    }

    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.orderDate[Op.lte] = new Date(endDate);
      }
    }

    // Calculer l'offset
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Récupérer les commandes
    const { rows: orders, count: total } = await Order.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      attributes: { exclude: ['rawData'] } // Exclure les données brutes par défaut
    });

    res.json({
      success: true,
      data: orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des commandes:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orders/:id
 * Récupère une commande spécifique par ID
 */
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);

    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Commande non trouvée'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Erreur lors de la récupération de la commande:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orders/stats/summary
 * Récupère les statistiques des commandes
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.orderDate = {};
      if (startDate) {
        where.orderDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.orderDate[Op.lte] = new Date(endDate);
      }
    }

    // Total des commandes
    const totalOrders = await Order.count({ where });

    // Total par plateforme
    const ordersByPlatform = await Order.findAll({
      where,
      attributes: [
        'platform',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_price')), 'total']
      ],
      group: ['platform'],
      raw: true
    });

    // Total par statut
    const ordersByStatus = await Order.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Chiffre d'affaires total
    const revenue = await Order.sum('totalPrice', { where });

    res.json({
      success: true,
      data: {
        totalOrders,
        revenue: parseFloat(revenue || 0).toFixed(2),
        byPlatform: ordersByPlatform,
        byStatus: ordersByStatus
      }
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/orders/search/:query
 * Recherche de commandes par numéro ou email client
 */
router.get('/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 20 } = req.query;

    const orders = await Order.findAll({
      where: {
        [Op.or]: [
          { orderNumber: { [Op.iLike]: `%${query}%` } },
          { customerEmail: { [Op.iLike]: `%${query}%` } },
          { customerName: { [Op.iLike]: `%${query}%` } }
        ]
      },
      limit: parseInt(limit),
      order: [['orderDate', 'DESC']],
      attributes: { exclude: ['rawData'] }
    });

    res.json({
      success: true,
      data: orders,
      count: orders.length
    });
  } catch (error) {
    console.error('Erreur lors de la recherche:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
