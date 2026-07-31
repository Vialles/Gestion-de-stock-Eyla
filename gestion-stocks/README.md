# Eyla Création — Gestion des stocks

PWA de suivi de stock (Produits / Achats / Ventes) avec synchronisation SumUp,
construite sur le même modèle que [planning-menage](https://github.com/Vialles/planning-menage) :
React + Vite + Firebase (Firestore, Auth anonyme) + Tailwind CSS.

## Démarrage

```bash
npm install
cp .env.example .env   # remplir les clés Firebase (voir ci-dessous)
npm run dev
```

## 1. Créer le projet Firebase

1. https://console.firebase.google.com → *Ajouter un projet*
2. Activer **Firestore Database** (mode production) et **Authentication → Anonyme**
3. Paramètres du projet → *Vos applications* → *Web* → copier la config dans `.env`
4. Déployer les règles de sécurité :
   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init firestore   # sélectionner le projet, garder firestore.rules
   firebase deploy --only firestore:rules
   ```

## 2. Connecter SumUp

1. Créer une application sur https://developer.sumup.com (Applications → New app)
2. Renseigner l'URL de redirection : `https://<region>-<project-id>.cloudfunctions.net/sumupAuthCallback`
3. Définir les secrets des Cloud Functions :
   ```bash
   cd functions
   firebase functions:secrets:set SUMUP_CLIENT_ID
   firebase functions:secrets:set SUMUP_CLIENT_SECRET
   firebase functions:secrets:set SUMUP_REDIRECT_URI
   ```
4. Déployer les fonctions :
   ```bash
   firebase deploy --only functions
   ```
5. Dans le dashboard SumUp, configurer le **webhook** vers l'URL de `sumupWebhook`
   (ventes synchronisées automatiquement dans l'onglet Ventes)
6. Pour connecter le compte : ouvrir l'URL de `sumupAuthUrl` une première fois
   (à mettre derrière un bouton "Connecter SumUp" dans les réglages de l'app)
7. Pour rapatrier le catalogue produits : appeler `syncSumupCatalog`
   (bouton "Synchroniser le catalogue" à ajouter dans l'onglet Produits)

## Déploiement de l'app (comme planning-menage, sur Render)

```bash
npm run build
```
Déployer le dossier `dist/` sur Render.com (Static Site), ou `firebase deploy --only hosting`
si vous préférez héberger sur Firebase Hosting.

## Structure

```
src/
  components/       ProduitsTab, AchatsTab, VentesTab, Header
  lib/useCollection.js   hook Firestore générique (lecture temps réel + ajout/suppression)
  firebase.js       config + auth anonyme
functions/
  index.js          OAuth SumUp, sync catalogue, webhook ventes
firestore.rules
```
