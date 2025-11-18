// Configuration de l'API
const API_BASE_URL = window.location.origin;

let currentPage = 1;
const ordersPerPage = 20;

// Chargement initial
document.addEventListener('DOMContentLoaded', () => {
    loadStats();
    loadOrders();
    loadSyncLogs();
});

// Chargement des statistiques
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/orders/stats/summary`);
        const result = await response.json();

        if (result.success) {
            const { data } = result;

            // Stats globales
            document.getElementById('total-orders').textContent = data.totalOrders || 0;
            document.getElementById('total-revenue').textContent =
                new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(data.revenue || 0);

            // Stats par plateforme
            const platformStats = {};
            data.byPlatform?.forEach(item => {
                platformStats[item.platform] = item.count;
            });

            document.getElementById('shopify-count').textContent = platformStats.shopify || 0;
            document.getElementById('woocommerce-count').textContent = platformStats.woocommerce || 0;
            document.getElementById('adobe-count').textContent = platformStats.adobe_commerce || 0;
            document.getElementById('prestashop-count').textContent = platformStats.prestashop || 0;
        }
    } catch (error) {
        console.error('Erreur lors du chargement des statistiques:', error);
    }
}

// Chargement des commandes
async function loadOrders(page = 1) {
    const loading = document.getElementById('loading');
    const errorDiv = document.getElementById('error');
    const tbody = document.getElementById('orders-tbody');

    loading.style.display = 'block';
    errorDiv.style.display = 'none';

    try {
        const platform = document.getElementById('platform-filter').value;
        const params = new URLSearchParams({
            page,
            limit: ordersPerPage,
            sortBy: 'orderDate',
            sortOrder: 'DESC'
        });

        if (platform) {
            params.append('platform', platform);
        }

        const response = await fetch(`${API_BASE_URL}/api/orders?${params}`);
        const result = await response.json();

        if (result.success) {
            displayOrders(result.data);
            displayPagination(result.pagination);
            currentPage = page;
        } else {
            throw new Error(result.error || 'Erreur inconnue');
        }
    } catch (error) {
        console.error('Erreur lors du chargement des commandes:', error);
        errorDiv.textContent = `Erreur: ${error.message}`;
        errorDiv.style.display = 'block';
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Erreur de chargement</td></tr>';
    } finally {
        loading.style.display = 'none';
    }
}

// Affichage des commandes
function displayOrders(orders) {
    const tbody = document.getElementById('orders-tbody');

    if (orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="no-data">Aucune commande trouvée</td></tr>';
        return;
    }

    tbody.innerHTML = orders.map(order => `
        <tr>
            <td>
                <span class="platform-badge platform-${order.platform}">
                    ${getPlatformLabel(order.platform)}
                </span>
            </td>
            <td><strong>${order.orderNumber}</strong></td>
            <td>
                <div>${order.customerName || 'N/A'}</div>
                <small style="color: #999;">${order.customerEmail || ''}</small>
            </td>
            <td><strong>${formatCurrency(order.totalPrice, order.currency)}</strong></td>
            <td>
                <span class="status-badge status-${getStatusClass(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td>${formatDate(order.orderDate)}</td>
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

    // Bouton précédent
    buttons.push(`
        <button ${pagination.page === 1 ? 'disabled' : ''}
                onclick="loadOrders(${pagination.page - 1})">
            ← Précédent
        </button>
    `);

    // Numéros de page
    for (let i = 1; i <= Math.min(pagination.totalPages, 5); i++) {
        buttons.push(`
            <button class="${i === pagination.page ? 'active' : ''}"
                    onclick="loadOrders(${i})">
                ${i}
            </button>
        `);
    }

    // Bouton suivant
    buttons.push(`
        <button ${pagination.page === pagination.totalPages ? 'disabled' : ''}
                onclick="loadOrders(${pagination.page + 1})">
            Suivant →
        </button>
    `);

    paginationDiv.innerHTML = buttons.join('');
}

// Chargement des logs de synchronisation
async function loadSyncLogs() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/sync/logs?limit=10`);
        const result = await response.json();

        if (result.success) {
            displaySyncLogs(result.data);
        }
    } catch (error) {
        console.error('Erreur lors du chargement des logs:', error);
    }
}

// Affichage des logs
function displaySyncLogs(logs) {
    const tbody = document.getElementById('logs-tbody');

    if (logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="no-data">Aucun log disponible</td></tr>';
        return;
    }

    tbody.innerHTML = logs.map(log => `
        <tr>
            <td>
                <span class="platform-badge platform-${log.platform}">
                    ${getPlatformLabel(log.platform)}
                </span>
            </td>
            <td>
                <span class="status-badge status-${log.status === 'success' ? 'success' : 'error'}">
                    ${log.status}
                </span>
            </td>
            <td>${log.ordersImported || 0}</td>
            <td>${log.ordersUpdated || 0}</td>
            <td>${formatDate(log.createdAt)}</td>
        </tr>
    `).join('');
}

// Synchronisation de toutes les plateformes
async function syncAll() {
    if (!confirm('Synchroniser toutes les plateformes ? Cela peut prendre quelques minutes.')) {
        return;
    }

    const btn = event.target;
    btn.disabled = true;
    btn.textContent = '🔄 Synchronisation en cours...';

    try {
        const response = await fetch(`${API_BASE_URL}/api/sync/all`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const result = await response.json();

        if (result.success) {
            alert('✓ Synchronisation terminée avec succès !');
            refreshData();
        } else {
            throw new Error(result.error || 'Erreur de synchronisation');
        }
    } catch (error) {
        console.error('Erreur lors de la synchronisation:', error);
        alert(`✗ Erreur: ${error.message}`);
    } finally {
        btn.disabled = false;
        btn.textContent = '🔄 Synchroniser toutes les plateformes';
    }
}

// Rafraîchir toutes les données
function refreshData() {
    loadStats();
    loadOrders(currentPage);
    loadSyncLogs();
}

// Recherche
let searchTimeout;
function handleSearch(event) {
    clearTimeout(searchTimeout);
    const query = event.target.value.trim();

    if (query.length < 2) {
        loadOrders();
        return;
    }

    searchTimeout = setTimeout(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/api/orders/search/${encodeURIComponent(query)}`);
            const result = await response.json();

            if (result.success) {
                displayOrders(result.data);
                document.getElementById('pagination').innerHTML = '';
            }
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
        }
    }, 500);
}

// Utilitaires
function getPlatformLabel(platform) {
    const labels = {
        'shopify': 'Shopify',
        'woocommerce': 'WooCommerce',
        'adobe_commerce': 'Adobe Commerce',
        'prestashop': 'PrestaShop'
    };
    return labels[platform] || platform;
}

function getStatusClass(status) {
    if (status?.includes('complete') || status?.includes('paid')) return 'success';
    if (status?.includes('error') || status?.includes('cancel')) return 'error';
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
