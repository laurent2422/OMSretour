// Configuration de l'API
const API_BASE_URL = window.location.origin;

let currentPage = 1;
const returnsPerPage = 20;

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadReturns();
});

// Chargement des statistiques
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/returns/stats/summary`);
        const result = await response.json();

        if (result.success) {
            const { data } = result;

            document.getElementById('total-returns').textContent = data.totalReturns || 0;
            document.getElementById('total-refunds').textContent =
                new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.totalRefundAmount || 0);

            // Stats par statut
            const statusStats = {};
            data.byStatus?.forEach(item => {
                statusStats[item.status] = item.count;
            });

            document.getElementById('pending-returns').textContent = statusStats.pending || 0;
            document.getElementById('completed-returns').textContent = statusStats.completed || 0;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Chargement des retours
async function loadReturns(page = 1) {
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const tbody = document.getElementById('returns-tbody');

    loading.style.display = 'block';
    errorDiv.style.display = 'none';

    try {
        const status = document.getElementById('status-filter').value;
        const returnType = document.getElementById('type-filter').value;

        const params = new URLSearchParams({
            page,
            limit: returnsPerPage,
            sortBy: 'requestDate',
            sortOrder: 'DESC'
        });

        if (status) params.append('status', status);
        if (returnType) params.append('returnType', returnType);

        const response = await fetch(`${API_BASE_URL}/api/returns?${params}`);
        const result = await response.json();

        if (result.success) {
            displayReturns(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            throw new Error(result.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des retours:', error);
        errorDiv.textContent = `Erreur: ${error.message}`;
        errorDiv.style.display = 'block';
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Erreur de chargement</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Affichage des retours
function displayReturns(returns) {
    const tbody = document.getElementById('returns-tbody');

    if (returns.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">Aucun retour trouvé</td></tr>';
        return;
    }

    tbody.innerHTML = returns.map(ret => `
        <tr>
            <td><strong>${ret.returnNumber}</strong></td>
            <td>
                <span class="return-type-badge type-${ret.returnType}">
                    ${getReturnTypeLabel(ret.returnType)}
                </span>
            </td>
            <td>
                <div><strong>${ret.order?.orderNumber || 'N/A'}</strong></div>
                <small style="color: #999;">${ret.order?.platform || ''}</small>
            </td>
            <td>
                <div>${ret.customerName || 'N/A'}</div>
                <small style="color: #999;">${ret.customerEmail || ''}</small>
            </td>
            <td><strong>${formatCurrency(ret.totalAmount)}</strong></td>
            <td>
                <span class="status-badge status-${getStatusClass(ret.status)}">
                    ${getStatusLabel(ret.status)}
                </span>
            </td>
            <td>${formatDate(ret.requestDate)}</td>
            <td>
                <button class="btn btn-secondary" style="padding: 8px 15px; font-size: 0.9em;"
                        onclick="viewReturnDetails('${ret.id}')">
                    Voir
                </button>
            </td>
        </tr>
    `).join('');
}

// Affichage de la pagination
function displayPagination(pagination) {
    const paginationDiv = document.getElementById('pagination');

    if (pagination.totalPages <= 1) {
        paginationDiv.innerHTML = '';
        return;
    }

    const buttons = [];

    buttons.push(`
        <button ${pagination.page === 1 ? 'disabled' : ''}
                onclick="loadReturns(${pagination.page - 1})">
            ← Précédent
        </button>
    `);

    for (let i = 1; i <= Math.min(pagination.totalPages, 5); i++) {
        buttons.push(`
            <button class="${i === pagination.page ? 'active' : ''}"
                    onclick="loadReturns(${i})">
                ${i}
            </button>
        `);
    }

    buttons.push(`
        <button ${pagination.page === pagination.totalPages ? 'disabled' : ''}
                onclick="loadReturns(${pagination.page + 1})">
            Suivant →
        </button>
    `);

    paginationDiv.innerHTML = buttons.join('');
}

// Voir les détails d'un retour
async function viewReturnDetails(returnId) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}`);
        const result = await response.json();

        if (result.success) {
            displayReturnDetails(result.data);
            document.getElementById('detailModal').style.display = 'block';
        } else {
            alert('Erreur lors du chargement des détails');
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert('Erreur lors du chargement des détails');
    }
}

// Afficher les détails
function displayReturnDetails(ret) {
    const detailsDiv = document.getElementById('return-details');

    const itemsHtml = ret.items?.map(item => `
        <tr>
            <td>${item.title}</td>
            <td>${item.quantity}</td>
            <td>${formatCurrency(item.price)}</td>
            <td>${formatCurrency(item.totalPrice)}</td>
            <td>${item.condition || 'N/A'}</td>
        </tr>
    `).join('') || '';

    detailsDiv.innerHTML = `
        <div style="margin-top: 20px;">
            <h3>Informations générales</h3>
            <p><strong>Numéro de retour:</strong> ${ret.returnNumber}</p>
            <p><strong>Type:</strong> <span class="return-type-badge type-${ret.returnType}">${getReturnTypeLabel(ret.returnType)}</span></p>
            <p><strong>Statut:</strong> <span class="status-badge status-${getStatusClass(ret.status)}">${getStatusLabel(ret.status)}</span></p>
            <p><strong>Commande:</strong> ${ret.order?.orderNumber || 'N/A'} (${ret.order?.platform || 'N/A'})</p>
            <p><strong>Client:</strong> ${ret.customerName} - ${ret.customerEmail}</p>
            <p><strong>Date de demande:</strong> ${formatDate(ret.requestDate)}</p>

            <h3 style="margin-top: 30px;">Raison du retour</h3>
            <p><strong>${ret.reason}</strong></p>
            ${ret.description ? `<p>${ret.description}</p>` : ''}

            <h3 style="margin-top: 30px;">Articles retournés</h3>
            <table style="width: 100%; margin-top: 10px;">
                <thead>
                    <tr style="background: #f0f0f0;">
                        <th style="padding: 10px; text-align: left;">Produit</th>
                        <th style="padding: 10px;">Qté</th>
                        <th style="padding: 10px;">Prix</th>
                        <th style="padding: 10px;">Total</th>
                        <th style="padding: 10px;">État</th>
                    </tr>
                </thead>
                <tbody>${itemsHtml}</tbody>
            </table>

            <h3 style="margin-top: 30px;">Montants</h3>
            <p><strong>Montant total:</strong> ${formatCurrency(ret.totalAmount)}</p>
            ${ret.returnFees ? `<p><strong>Frais de retour:</strong> ${formatCurrency(ret.returnFees)}</p>` : ''}
            ${ret.refundAmount ? `<p><strong>Montant du remboursement:</strong> ${formatCurrency(ret.refundAmount)}</p>` : ''}
            ${ret.giftCardCode ? `<p><strong>Code bon cadeau:</strong> <code style="background: #f0f0f0; padding: 5px 10px; border-radius: 5px;">${ret.giftCardCode}</code></p>` : ''}

            ${ret.trackingNumber ? `
                <h3 style="margin-top: 30px;">Suivi</h3>
                <p><strong>Numéro de suivi:</strong> ${ret.trackingNumber}</p>
            ` : ''}

            ${ret.internalNotes ? `
                <h3 style="margin-top: 30px;">Notes internes</h3>
                <p>${ret.internalNotes}</p>
            ` : ''}

            <div style="margin-top: 30px; display: flex; gap: 10px;">
                ${ret.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="updateReturnStatus('${ret.id}', 'approved')">
                        Approuver
                    </button>
                    <button class="btn" style="background: #e74c3c; color: white;"
                            onclick="updateReturnStatus('${ret.id}', 'rejected')">
                        Rejeter
                    </button>
                ` : ''}
                ${ret.status === 'approved' ? `
                    <button class="btn btn-primary" onclick="updateReturnStatus('${ret.id}', 'processing')">
                        Marquer en cours
                    </button>
                ` : ''}
                ${ret.status === 'processing' ? `
                    <button class="btn btn-primary" onclick="updateReturnStatus('${ret.id}', 'completed')">
                        Marquer terminé
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

// Mettre à jour le statut
async function updateReturnStatus(returnId, newStatus) {
    if (!confirm(`Confirmer le changement de statut vers "${getStatusLabel(newStatus)}" ?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/returns/${returnId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Statut mis à jour avec succès');
            closeDetailModal();
            loadReturns(currentPage);
            loadStats();
        } else {
            alert(`✗ Erreur: ${result.error}`);
        }
    } catch (error) {
        console.error('Erreur:', error);
        alert(`✗ Erreur: ${error.message}`);
    }
}

// Fermer la modal
function closeDetailModal() {
    document.getElementById('detailModal').style.display = 'none';
}

// Recherche
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    const query = event.target.value.trim();

    if (query.length < 2) {
        loadReturns();
        return;
    }

    searchTimeout = setTimeout(() => {
        loadReturns();
    }, 500);
}

// Utilitaires
function getReturnTypeLabel(type) {
    const labels = {
        'return': 'Retour',
        'exchange': 'Échange',
        'refund': 'Remboursement',
        'gift_card': 'Bon cadeau'
    };
    return labels[type] || type;
}

function getStatusLabel(status) {
    const labels = {
        'pending': 'En attente',
        'approved': 'Approuvé',
        'rejected': 'Rejeté',
        'processing': 'En cours',
        'completed': 'Terminé',
        'cancelled': 'Annulé'
    };
    return labels[status] || status;
}

function getStatusClass(status) {
    if (status === 'completed') return 'success';
    if (status === 'rejected' || status === 'cancelled') return 'error';
    return 'pending';
}

function formatCurrency(amount, currency = 'EUR') {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: currency || 'EUR'
    }).format(amount || 0);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('fr-FR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
