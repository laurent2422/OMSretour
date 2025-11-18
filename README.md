# OMS Multi-Platform

Order Management System (OMS) pour centraliser les commandes de plusieurs plateformes e-commerce :
- Shopify
- WooCommerce
- Adobe Commerce (Magento)
- PrestaShop

## Fonctionnalités

### Gestion des commandes
- **Centralisation des commandes** : Import automatique des commandes depuis toutes vos boutiques
- **Synchronisation automatique** : Mise à jour périodique configurable
- **API REST complète** : Accédez à vos commandes via une API
- **Tableau de bord web** : Visualisez et gérez vos commandes facilement
- **Filtrage et recherche** : Trouvez rapidement les commandes qui vous intéressent
- **Statistiques** : Vue d'ensemble de votre activité e-commerce

### Gestion des retours
- **Demandes de retour** : Les clients peuvent créer des demandes de retour pour leurs commandes
- **Types de retour multiples** :
  - **Retour simple** : Retour du produit sans remplacement
  - **Échange** : Remplacement par un autre produit
  - **Remboursement** : Remboursement financier direct
  - **Bon cadeau** : Crédit sous forme de bon cadeau
- **Workflow complet** : Gestion du cycle de vie complet (en attente → approuvé → en cours → terminé)
- **Suivi** : Numéros de suivi, photos, notes internes
- **Statistiques des retours** : Analysez les taux de retour et les montants

## Prérequis

- Node.js 14+ et npm
- PostgreSQL 12+
- Accès API aux plateformes e-commerce que vous souhaitez connecter

## Installation

### 1. Cloner le repository

```bash
git clone <repository-url>
cd OMSretour
```

### 2. Installer les dépendances

```bash
npm install
```

### 3. Configuration

Créer un fichier `.env` à la racine du projet en copiant `.env.example` :

```bash
cp .env.example .env
```

Puis éditer `.env` avec vos paramètres :

```env
# Base de données PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_NAME=oms_database
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe

# Port du serveur
PORT=3000

# Shopify (optionnel)
SHOPIFY_SHOP_NAME=votre-boutique.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx

# WooCommerce (optionnel)
WOOCOMMERCE_URL=https://votre-boutique.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx

# Adobe Commerce / Magento (optionnel)
ADOBE_COMMERCE_URL=https://votre-magento.com
ADOBE_COMMERCE_ACCESS_TOKEN=xxxxx

# PrestaShop (optionnel)
PRESTASHOP_URL=https://votre-prestashop.com
PRESTASHOP_API_KEY=xxxxx

# Intervalle de synchronisation automatique (en minutes)
SYNC_INTERVAL=15
```

### 4. Créer la base de données

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE oms_database;

# Quitter
\q
```

### 5. Démarrer l'application

```bash
# Mode production
npm start

# Mode développement (avec rechargement automatique)
npm run dev
```

L'application sera accessible sur `http://localhost:3000`

## Configuration des plateformes

### Shopify

1. Aller dans votre admin Shopify : `https://votre-boutique.myshopify.com/admin`
2. Aller dans **Apps** → **Develop apps** → **Create an app**
3. Donner un nom à l'app et créer
4. Dans **API credentials**, configurer les **Admin API scopes** :
   - `read_orders`
   - `read_products`
   - `read_customers`
5. Installer l'app et copier l'**Admin API access token**
6. Ajouter les credentials dans `.env`

### WooCommerce

1. Aller dans **WooCommerce** → **Settings** → **Advanced** → **REST API**
2. Cliquer sur **Add key**
3. Description : `OMS Integration`
4. User : Choisir un utilisateur admin
5. Permissions : **Read**
6. Générer la clé et copier les credentials
7. Ajouter dans `.env`

### Adobe Commerce (Magento 2)

1. Se connecter à l'admin Magento
2. Aller dans **System** → **Integrations** → **Add New Integration**
3. Nommer l'intégration : `OMS Integration`
4. Dans l'onglet **API**, donner accès à :
   - Sales (Orders, Invoices, Shipments)
   - Customers
5. Activer l'intégration et copier l'**Access Token**
6. Ajouter dans `.env`

### PrestaShop

1. Se connecter au back-office PrestaShop
2. Aller dans **Advanced Parameters** → **Webservice**
3. Activer les webservices
4. Cliquer sur **Add new webservice key**
5. Donner les permissions :
   - Orders: GET
   - Customers: GET
   - Addresses: GET
6. Générer la clé et copier
7. Ajouter dans `.env`

## Utilisation

### Tableau de bord web

Accédez à `http://localhost:3000` pour voir le tableau de bord.

Fonctionnalités disponibles :
- Vue d'ensemble des statistiques
- Liste des commandes avec filtres
- Recherche par numéro de commande ou email
- Synchronisation manuelle
- Historique des synchronisations

### API REST

#### Récupérer toutes les commandes

```bash
GET /api/orders
```

Paramètres query optionnels :
- `platform` : Filtrer par plateforme (shopify, woocommerce, adobe_commerce, prestashop)
- `status` : Filtrer par statut
- `customerEmail` : Filtrer par email client
- `orderNumber` : Filtrer par numéro de commande
- `startDate` : Date de début (ISO 8601)
- `endDate` : Date de fin (ISO 8601)
- `page` : Numéro de page (défaut: 1)
- `limit` : Nombre de résultats par page (défaut: 50)

Exemple :
```bash
curl http://localhost:3000/api/orders?platform=shopify&limit=10
```

#### Récupérer une commande spécifique

```bash
GET /api/orders/:id
```

#### Rechercher des commandes

```bash
GET /api/orders/search/:query
```

#### Obtenir les statistiques

```bash
GET /api/orders/stats/summary
```

#### Synchroniser toutes les plateformes

```bash
POST /api/sync/all
```

#### Synchroniser une plateforme spécifique

```bash
POST /api/sync/:platform
```

Plateformes : `shopify`, `woocommerce`, `adobe_commerce`, `prestashop`

#### Obtenir les logs de synchronisation

```bash
GET /api/sync/logs
```

#### Liste des plateformes configurées

```bash
GET /api/sync/platforms
```

### Exemples avec curl

```bash
# Synchroniser toutes les plateformes
curl -X POST http://localhost:3000/api/sync/all

# Synchroniser seulement Shopify
curl -X POST http://localhost:3000/api/sync/shopify

# Récupérer les commandes Shopify
curl "http://localhost:3000/api/orders?platform=shopify"

# Rechercher une commande
curl http://localhost:3000/api/orders/search/john@example.com

# Obtenir les statistiques
curl http://localhost:3000/api/orders/stats/summary
```

### API Gestion des retours

#### Créer une demande de retour

```bash
POST /api/returns
```

Body JSON :
```json
{
  "orderId": "uuid-de-la-commande",
  "returnType": "refund",
  "reason": "Produit défectueux",
  "description": "Le produit est arrivé endommagé",
  "items": [
    {
      "productId": "123",
      "variantId": "456",
      "sku": "PROD-001",
      "title": "T-shirt Rouge",
      "quantity": 1,
      "price": 25.00,
      "reason": "Taille incorrecte",
      "condition": "new"
    }
  ],
  "customerEmail": "client@example.com",
  "customerName": "Jean Dupont",
  "returnAddress": {
    "address1": "123 Rue Example",
    "city": "Paris",
    "zip": "75001",
    "country": "France"
  }
}
```

Types de retour disponibles :
- `return` : Retour simple
- `exchange` : Échange de produit
- `refund` : Remboursement
- `gift_card` : Bon cadeau

#### Récupérer tous les retours

```bash
GET /api/returns
```

Paramètres query optionnels :
- `status` : pending, approved, rejected, processing, completed, cancelled
- `returnType` : return, exchange, refund, gift_card
- `customerEmail` : Filtrer par email
- `returnNumber` : Filtrer par numéro de retour
- `page`, `limit` : Pagination

#### Récupérer un retour spécifique

```bash
GET /api/returns/:id
```

#### Mettre à jour le statut d'un retour

```bash
PATCH /api/returns/:id/status
```

Body JSON :
```json
{
  "status": "approved",
  "internalNotes": "Retour approuvé, client sera remboursé",
  "trackingNumber": "1Z999AA1234567890"
}
```

#### Récupérer les retours d'une commande

```bash
GET /api/returns/order/:orderId
```

#### Statistiques des retours

```bash
GET /api/returns/stats/summary
```

### Exemples d'utilisation des retours

```bash
# Créer une demande de retour pour remboursement
curl -X POST http://localhost:3000/api/returns \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "abc-123",
    "returnType": "refund",
    "reason": "Produit non conforme",
    "items": [
      {
        "productId": "123",
        "title": "Article X",
        "quantity": 1,
        "price": 29.99,
        "sku": "ART-X"
      }
    ]
  }'

# Récupérer tous les retours en attente
curl "http://localhost:3000/api/returns?status=pending"

# Approuver un retour
curl -X PATCH http://localhost:3000/api/returns/abc-123/status \
  -H "Content-Type: application/json" \
  -d '{"status": "approved"}'

# Voir les statistiques des retours
curl http://localhost:3000/api/returns/stats/summary
```

## Déploiement avec Docker

Un `Dockerfile` et `docker-compose.yml` sont fournis pour faciliter le déploiement.

```bash
# Construire et démarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

## Structure du projet

```
OMSretour/
├── src/
│   ├── config/
│   │   └── database.js          # Configuration Sequelize
│   ├── connectors/
│   │   ├── ShopifyConnector.js
│   │   ├── WooCommerceConnector.js
│   │   ├── AdobeCommerceConnector.js
│   │   └── PrestaShopConnector.js
│   ├── models/
│   │   ├── Order.js             # Modèle de données commande
│   │   └── SyncLog.js           # Modèle log de synchronisation
│   ├── routes/
│   │   ├── orders.js            # Routes API commandes
│   │   └── sync.js              # Routes API synchronisation
│   ├── services/
│   │   └── SyncService.js       # Service de synchronisation
│   └── server.js                # Serveur Express principal
├── public/
│   ├── index.html               # Tableau de bord
│   ├── style.css
│   └── app.js
├── .env.example
├── package.json
└── README.md
```

## Modèle de données

Chaque commande est stockée avec les informations suivantes :

- `id` : Identifiant unique (UUID)
- `externalOrderId` : ID de la commande sur la plateforme source
- `platform` : Plateforme source (shopify, woocommerce, etc.)
- `orderNumber` : Numéro de commande visible
- `status` : Statut de la commande
- `financialStatus` : Statut financier
- `fulfillmentStatus` : Statut de livraison
- `customerEmail`, `customerName`, `customerPhone` : Informations client
- `totalPrice`, `subtotalPrice`, `taxPrice`, `shippingPrice` : Montants
- `currency` : Devise
- `shippingAddress` : Adresse de livraison (JSON)
- `billingAddress` : Adresse de facturation (JSON)
- `lineItems` : Articles de la commande (JSON)
- `rawData` : Données brutes de la plateforme (JSON)
- `orderDate` : Date de la commande
- `lastSyncDate` : Date de dernière synchronisation

## Sécurité

- N'exposez jamais vos fichiers `.env` ou tokens API
- Utilisez HTTPS en production
- Limitez l'accès à l'API avec un système d'authentification
- Sauvegardez régulièrement votre base de données

## Maintenance

### Sauvegarder la base de données

```bash
pg_dump -U postgres oms_database > backup.sql
```

### Restaurer la base de données

```bash
psql -U postgres oms_database < backup.sql
```

## Dépannage

### Erreur de connexion à la base de données

- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env`
- Vérifier que la base de données existe

### Erreur API plateforme

- Vérifier les tokens/clés API dans `.env`
- Vérifier les permissions de l'API
- Vérifier que l'URL de la boutique est correcte

### Synchronisation ne fonctionne pas

- Vérifier les logs dans la console
- Vérifier la table `sync_logs` dans la base de données
- Tester manuellement via l'API `/api/sync/:platform`

## Support

Pour toute question ou problème :
1. Vérifier la documentation ci-dessus
2. Consulter les logs de l'application
3. Créer une issue sur le repository

## Licence

MIT

## Auteurs

Développé avec Node.js, Express, Sequelize et PostgreSQL.
