# 🔐 COMITÉ D'ÉTHIQUE — SYSTÈME INTRANET SÉCURISÉ

Système intranet professionnel avec interface terminal immersive, backend Node.js sécurisé et base de données SQLite. Déployable en 5 minutes sur Render.com ou Railway.app.

---

## 📁 Structure du projet

```
comite-ethique/
├── server.js          ← Serveur Express.js (API + sécurité)
├── package.json       ← Dépendances & scripts
├── render.yaml        ← Config déploiement Render.com
├── railway.json       ← Config déploiement Railway.app
├── .gitignore         ← Fichiers à exclure de Git
├── README.md          ← Ce fichier
└── public/
    └── index.html     ← Interface utilisateur complète
```

> **Note :** `comite.db` et `sessions.db` sont créés automatiquement au premier démarrage. Ils ne sont **pas** dans Git (voir `.gitignore`).

---

## 🚀 Lancer en LOCAL (test sur votre machine)

### Prérequis
- **Node.js 18+** → https://nodejs.org (télécharger la version LTS)
- Vérifier l'installation : `node --version` et `npm --version`

### Étapes

```bash
# 1. Aller dans le dossier du projet
cd comite-ethique

# 2. Installer les dépendances
npm install

# 3. Lancer le serveur
node server.js

# 4. Ouvrir dans votre navigateur
# → http://localhost:3000
```

Le serveur affiche dans la console :
```
╔═══════════════════════════════════════════════════╗
║   COMITÉ D'ÉTHIQUE — SERVEUR DÉVELOPPEMENT        ║
╠═══════════════════════════════════════════════════╣
║   URL     : http://localhost:3000
║   PORT    : 3000
║   MODE    : development
╚═══════════════════════════════════════════════════╝

[INIT] Compte admin créé : admin / comite2026
```

### Identifiants par défaut
| Rôle | Identifiant | Mot de passe |
|------|-------------|--------------|
| Admin | `admin` | `comite2026` |

> ⚠️ Changez ce mot de passe dès le premier accès : **Admin Panel → Comptes Admin → Créer un compte** puis supprimez l'ancien.

---

## 🌐 Déployer sur RENDER.COM (recommandé, gratuit)

Render héberge votre site H24/7 avec HTTPS automatique et URL publique.

### Étape 1 — Préparer GitHub

```bash
# Dans le dossier du projet :
git init
git add .
git commit -m "Initial commit — Comité d'Éthique"
```

Créer un dépôt sur https://github.com/new (nom : `comite-ethique`, **privé** recommandé), puis :

```bash
git remote add origin https://github.com/VOTRE_PSEUDO/comite-ethique.git
git branch -M main
git push -u origin main
```

### Étape 2 — Créer le service sur Render

1. Aller sur **https://render.com** → créer un compte gratuit
2. Cliquer **"New +"** → **"Web Service"**
3. Connecter votre compte GitHub → sélectionner le dépôt `comite-ethique`
4. Remplir les champs :

| Champ | Valeur |
|-------|--------|
| Name | `comite-ethique` |
| Region | Frankfurt (EU) |
| Branch | `main` |
| Runtime | `Node` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Instance Type | `Free` |

5. **Variables d'environnement** (section "Environment") — cliquer "Add Environment Variable" :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *(cliquer "Generate" pour une valeur aléatoire sécurisée)* |
| `DB_PATH` | `/data/comite.db` |

6. **Disk (stockage persistant)** — section "Disks" → "Add Disk" :

| Champ | Valeur |
|-------|--------|
| Name | `comite-data` |
| Mount Path | `/data` |
| Size | `1 GB` |

> ⚠️ **Le disk est indispensable** sur Render ! Sans lui, la base SQLite est effacée à chaque redémarrage. Le plan gratuit inclut 1 Go.

7. Cliquer **"Create Web Service"**

### Étape 3 — Accéder au site

Render compile et démarre votre serveur (2-3 minutes). L'URL publique s'affiche en haut :
```
https://comite-ethique-xxxx.onrender.com
```

---

## 🚂 Déployer sur RAILWAY.APP (alternative)

### Étape 1 — Préparer GitHub (même que Render, voir ci-dessus)

### Étape 2 — Déployer sur Railway

1. Aller sur **https://railway.app** → créer un compte (GitHub recommandé)
2. Cliquer **"New Project"** → **"Deploy from GitHub repo"**
3. Sélectionner votre dépôt `comite-ethique`
4. Railway détecte Node.js automatiquement et lance le déploiement

### Étape 3 — Variables d'environnement

Dans votre projet Railway → onglet **"Variables"** → ajouter :

| Clé | Valeur |
|-----|--------|
| `NODE_ENV` | `production` |
| `SESSION_SECRET` | *(chaîne aléatoire longue, ex: générez sur https://1password.com/password-generator/)* |
| `DB_PATH` | `/app/comite.db` |

> ⚠️ Sur Railway, la persistance des fichiers n'est pas garantie sur le plan gratuit. Préférez Render avec Disk, ou migrez vers PostgreSQL (voir section ci-dessous).

### Étape 4 — Obtenir l'URL

Dans Railway → onglet **"Settings"** → **"Domains"** → **"Generate Domain"**.
Votre URL : `https://comite-ethique-xxx.up.railway.app`

---

## 🔒 Sécurité en production

### Ce qui est implémenté
| Protection | Mécanisme |
|-----------|-----------|
| Mots de passe | bcrypt (coût 12) — irréversible |
| Sessions | Serveur SQLite, cookie HttpOnly + Secure |
| Anti brute-force | 10 tentatives max / 15 min / IP |
| Timing attacks | Délai constant si utilisateur inconnu |
| XSS / Headers | Helmet.js + Content-Security-Policy |
| CSRF | SameSite=None + Secure en production |

### Variables d'environnement obligatoires en production

```bash
NODE_ENV=production
SESSION_SECRET=une_chaine_tres_longue_et_aleatoire_minimum_32_caracteres
DB_PATH=/data/comite.db   # Render avec disk persistant
```

---

## 🛢️ Base de données — SQLite vs PostgreSQL

| | SQLite (actuel) | PostgreSQL (migration future) |
|---|---|---|
| Configuration | ✅ Aucune | ⚙️ Service séparé |
| Performances | ✅ Parfait jusqu'à ~10k users/jour | 🚀 Illimité |
| Persistance Render | ✅ Avec disk persistant | ✅ Natif |
| Persistance Railway | ⚠️ Plan payant requis | ✅ Plugin intégré |
| Coût | ✅ Gratuit | 💰 ~$5-7/mois |

**Pour un usage de jeu de rôle ou groupe fermé → SQLite + Render disk = parfait.**

Pour migrer vers PostgreSQL plus tard, il suffit de remplacer `better-sqlite3` par `pg` dans `server.js` et d'adapter les requêtes.

---

## 🔄 Mettre à jour le site (après modifications)

```bash
# Modifier vos fichiers localement, puis :
git add .
git commit -m "Description de la modification"
git push origin main
```

Render et Railway redéploient automatiquement à chaque `git push`.

---

## 🛠️ Dépannage

### "Cannot find module 'better-sqlite3'"
```bash
npm install
```

### Le site ne démarre pas sur Render
→ Vérifier les logs dans Render → votre service → onglet "Logs"
→ Vérifier que `SESSION_SECRET` est bien défini

### Les données sont perdues après redémarrage (Render)
→ Vérifier que le Disk est bien configuré avec Mount Path `/data`
→ Vérifier que `DB_PATH=/data/comite.db` est dans les variables d'environnement

### Erreur CSP dans la console navigateur
→ Le `server.js` inclus gère déjà les `onclick` inline. Si l'erreur persiste, vider le cache navigateur.

### Page blanche après déploiement
→ Vérifier que `public/index.html` est bien présent dans le dépôt GitHub
→ `git status` pour voir les fichiers trackés

---

## 📡 API — Référence rapide

| Méthode | Route | Accès | Description |
|---------|-------|-------|-------------|
| `GET` | `/api/stats` | Public | Compteurs globaux |
| `GET` | `/api/protocols` | Public | Liste protocoles (`?q=` `?cat=`) |
| `GET` | `/api/content` | Public | Textes du site |
| `POST` | `/api/plaintes` | Public | Soumettre une plainte |
| `POST` | `/api/messages` | Public | Envoyer un message |
| `POST` | `/api/suggestions` | Public | Envoyer une suggestion |
| `POST` | `/api/login` | Public | Connexion admin |
| `POST` | `/api/logout` | Admin | Déconnexion |
| `GET` | `/api/me` | Public | Vérifier session |
| `GET` | `/api/admin/plaintes` | Admin | Toutes les plaintes |
| `PATCH` | `/api/admin/plaintes/:id` | Admin | Changer statut |
| `GET` | `/api/admin/messages` | Admin | Tous les messages |
| `GET` | `/api/admin/suggestions` | Admin | Toutes les suggestions |
| `POST` | `/api/admin/protocols` | Admin | Ajouter protocole |
| `DELETE` | `/api/admin/protocols/:id` | Admin | Supprimer protocole |
| `PUT` | `/api/admin/content` | Admin | Modifier textes |
| `GET` | `/api/admin/accounts` | Admin | Liste des admins |
| `POST` | `/api/admin/accounts` | Admin | Créer admin |
| `DELETE` | `/api/admin/accounts/:id` | Admin | Supprimer admin |
