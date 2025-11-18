const express = require('express');
const router = express.Router();
const { Return, ReturnItem, Order } = require('../models');
const sequelize = require('../config/database');
const { Op } = require('sequelize');
const crypto = require('crypto');

/**
 * POST /api/returns
 * Créer une nouvelle demande de retour
 */
router.post('/', async (req, res) => {
  try {
    const {
      orderId,
      returnType,
      reason,
      description,
      items,
      exchangeProductInfo,
      returnAddress,
      customerEmail,
      customerName,
      customerPhone,
      attachments
    } = req.body;

    // Vérifier que la commande existe
    const order = await Order.findByPk(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        error: 'Commande non trouvée'
      });
    }

    // Générer un numéro de retour unique
    const returnNumber = `RET-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

    // Calculer le montant total
    const totalAmount = items.reduce((sum, item) => {
      return sum + (parseFloat(item.price) * parseInt(item.quantity));
    }, 0);

    // Créer le retour
    const newReturn = await Return.create({
      orderId,
      returnNumber,
      returnType,
      status: 'pending',
      customerEmail: customerEmail || order.customerEmail,
      customerName: customerName || order.customerName,
      customerPhone: customerPhone || order.customerPhone,
      reason,
      description,
      exchangeProductInfo,
      totalAmount,
      refundAmount: returnType === 'refund' || returnType === 'gift_card' ? totalAmount : null,
      returnAddress,
      attachments: attachments || []
    });

    // Créer les articles du retour
    const returnItems = await Promise.all(
      items.map(item => {
        const totalPrice = parseFloat(item.price) * parseInt(item.quantity);
        return ReturnItem.create({
          returnId: newReturn.id,
          productId: item.productId,
          variantId: item.variantId,
          sku: item.sku,
          title: item.title,
          quantity: item.quantity,
          price: item.price,
          totalPrice,
          reason: item.reason,
          condition: item.condition || 'like_new',
          conditionNotes: item.conditionNotes,
          images: item.images || []
        });
      })
    );

    // Générer un code bon cadeau si nécessaire
    if (returnType === 'gift_card') {
      const giftCardCode = `GC-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
      await newReturn.update({ giftCardCode });
    }

    // Récupérer le retour complet avec les articles
    const returnWithItems = await Return.findByPk(newReturn.id, {
      include: [
        { model: ReturnItem, as: 'items' },
        { model: Order, as: 'order' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Demande de retour créée avec succès',
      data: returnWithItems
    });

  } catch (error) {
    console.error('Erreur lors de la création du retour:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/returns
 * Récupérer toutes les demandes de retour
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      returnType,
      customerEmail,
      returnNumber,
      startDate,
      endDate,
      page = 1,
      limit = 50,
      sortBy = 'requestDate',
      sortOrder = 'DESC'
    } = req.query;

    const where = {};

    if (status) {
      where.status = status;
    }

    if (returnType) {
      where.returnType = returnType;
    }

    if (customerEmail) {
      where.customerEmail = { [Op.iLike]: `%${customerEmail}%` };
    }

    if (returnNumber) {
      where.returnNumber = { [Op.iLike]: `%${returnNumber}%` };
    }

    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        where.requestDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.requestDate[Op.lte] = new Date(endDate);
      }
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: returns, count: total } = await Return.findAndCountAll({
      where,
      limit: parseInt(limit),
      offset,
      order: [[sortBy, sortOrder]],
      include: [
        { model: ReturnItem, as: 'items' },
        {
          model: Order,
          as: 'order',
          attributes: ['id', 'orderNumber', 'platform', 'totalPrice', 'currency']
        }
      ]
    });

    res.json({
      success: true,
      data: returns,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des retours:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/returns/:id
 * Récupérer un retour spécifique
 */
router.get('/:id', async (req, res) => {
  try {
    const returnRecord = await Return.findByPk(req.params.id, {
      include: [
        { model: ReturnItem, as: 'items' },
        { model: Order, as: 'order' }
      ]
    });

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        error: 'Retour non trouvé'
      });
    }

    res.json({
      success: true,
      data: returnRecord
    });

  } catch (error) {
    console.error('Erreur lors de la récupération du retour:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * PATCH /api/returns/:id/status
 * Mettre à jour le statut d'un retour
 */
router.patch('/:id/status', async (req, res) => {
  try {
    const { status, internalNotes, trackingNumber } = req.body;

    const returnRecord = await Return.findByPk(req.params.id);

    if (!returnRecord) {
      return res.status(404).json({
        success: false,
        error: 'Retour non trouvé'
      });
    }

    const updates = { status };

    if (internalNotes) {
      updates.internalNotes = internalNotes;
    }

    if (trackingNumber) {
      updates.trackingNumber = trackingNumber;
    }

    // Mettre à jour les dates selon le statut
    if (status === 'approved') {
      updates.approvedDate = new Date();
    } else if (status === 'completed') {
      updates.completedDate = new Date();
    }

    await returnRecord.update(updates);

    const updatedReturn = await Return.findByPk(req.params.id, {
      include: [
        { model: ReturnItem, as: 'items' },
        { model: Order, as: 'order' }
      ]
    });

    res.json({
      success: true,
      message: 'Statut du retour mis à jour',
      data: updatedReturn
    });

  } catch (error) {
    console.error('Erreur lors de la mise à jour du statut:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/returns/order/:orderId
 * Récupérer tous les retours d'une commande
 */
router.get('/order/:orderId', async (req, res) => {
  try {
    const returns = await Return.findAll({
      where: { orderId: req.params.orderId },
      include: [
        { model: ReturnItem, as: 'items' },
        { model: Order, as: 'order' }
      ],
      order: [['requestDate', 'DESC']]
    });

    res.json({
      success: true,
      data: returns,
      count: returns.length
    });

  } catch (error) {
    console.error('Erreur lors de la récupération des retours de la commande:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/returns/stats/summary
 * Statistiques des retours
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const where = {};
    if (startDate || endDate) {
      where.requestDate = {};
      if (startDate) {
        where.requestDate[Op.gte] = new Date(startDate);
      }
      if (endDate) {
        where.requestDate[Op.lte] = new Date(endDate);
      }
    }

    // Total des retours
    const totalReturns = await Return.count({ where });

    // Par statut
    const byStatus = await Return.findAll({
      where,
      attributes: [
        'status',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // Par type
    const byType = await Return.findAll({
      where,
      attributes: [
        'returnType',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        [sequelize.fn('SUM', sequelize.col('total_amount')), 'total']
      ],
      group: ['returnType'],
      raw: true
    });

    // Montant total des remboursements
    const totalRefundAmount = await Return.sum('refundAmount', { where });

    res.json({
      success: true,
      data: {
        totalReturns,
        totalRefundAmount: parseFloat(totalRefundAmount || 0).toFixed(2),
        byStatus,
        byType
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

module.exports = router;
