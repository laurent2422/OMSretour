# 🚀 Guide de Démarrage Rapide - OMS Multi-Platform

## Étape 1: Installation

```bash
# Cloner le repository (déjà fait)
cd OMSretour

# Installer les dépendances
npm install
```

## Étape 2: Configuration PostgreSQL

```bash
# Se connecter à PostgreSQL
psql -U postgres

# Créer la base de données
CREATE DATABASE oms_database;

# Quitter
\q
```

## Étape 3: Configuration de l'environnement

```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos credentials
nano .env
```

**Configuration minimale** :
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=oms_database
DB_USER=postgres
DB_PASSWORD=votre_mot_de_passe_postgres

PORT=3000
```

## Étape 4: Démarrage

```bash
# Démarrer le serveur
npm start
```

Le serveur démarre sur `http://localhost:3000`

## Étape 5: Vérification

```bash
# Tester l'API
curl http://localhost:3000/health

# Réponse attendue:
# {"status":"healthy","database":"connected","timestamp":"..."}
```

## Étape 6: Accéder à l'interface

Ouvrir dans votre navigateur :
- **Tableau de bord** : http://localhost:3000
- **Gestion des commandes** : http://localhost:3000/
- **Gestion des retours** : http://localhost:3000/returns.html
- **Documentation API** : http://localhost:3000/api

## Configuration des Plateformes E-commerce

### Shopify
```env
SHOPIFY_SHOP_NAME=votre-boutique.myshopify.com
SHOPIFY_ACCESS_TOKEN=shpat_xxxxx
```

### WooCommerce
```env
WOOCOMMERCE_URL=https://votre-boutique.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
```

### Adobe Commerce (Magento)
```env
ADOBE_COMMERCE_URL=https://votre-magento.com
ADOBE_COMMERCE_ACCESS_TOKEN=xxxxx
```

### PrestaShop
```env
PRESTASHOP_URL=https://votre-prestashop.com
PRESTASHOP_API_KEY=xxxxx
```

## Test de Synchronisation

```bash
# Vérifier les plateformes configurées
curl http://localhost:3000/api/sync/platforms

# Synchroniser manuellement
curl -X POST http://localhost:3000/api/sync/all
```

## 🐳 Alternative : Docker

```bash
# Démarrer avec Docker Compose
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Arrêter
docker-compose down
```

## 📖 Documentation Complète

- **README.md** - Documentation détaillée
- **AUDIT_REPORT.md** - Rapport d'audit technique
- **.env.example** - Toutes les variables disponibles

## 🆘 Aide

**Problème de connexion à la base de données ?**
- Vérifier que PostgreSQL est démarré
- Vérifier les credentials dans `.env`
- Vérifier que la base `oms_database` existe

**Aucune plateforme configurée ?**
- Ajouter au moins une configuration de plateforme dans `.env`
- Redémarrer le serveur après modification

**L'interface ne charge pas ?**
- Vérifier que le serveur est démarré
- Ouvrir la console du navigateur pour voir les erreurs
- Vérifier que l'URL est correcte (http://localhost:3000)

## 🎯 Prochaines Étapes

1. ✅ Configurer PostgreSQL
2. ✅ Ajouter vos credentials API
3. ✅ Tester la synchronisation
4. ✅ Créer votre première demande de retour
5. ✅ Explorer les statistiques

Bonne utilisation ! 🎉
