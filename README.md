# Gîte Sailly-au-Bois

Site de réservation pour le Une étape à Sailly-Au-Bois aux Hauts-de-France avec gestion des réservations et blocage de dates.

## 📋 Structure du projet

```
gite_sailly_au_bois/
├── index.html           # Page d'accueil avec formulaire de réservation
├── gite.html           # Page de présentation du gîte
├── decouvrir.html      # Page de découverte de la région
├── auth.html           # Page d'authentification
├── style.css           # Feuille de styles
├── script.js           # Logique de gestion des réservations
├── auth.js             # Logique d'authentification
├── auth-utils.js       # Utilitaires d'authentification
├── reservations.json   # Base de données des réservations
└── README.md           # Documentation
```

## 🚀 Installation et lancement

### Option 1 : Live Server (Recommandé - Le plus simple)

1. **Ouvrir le dossier du projet dans VS Code**
   ```
   /Users/user/IdeaProjects/gite_sailly_au_bois
   ```

2. **Installer l'extension Live Server**
   - Aller dans Extensions (Ctrl+Shift+X)
   - Chercher "Live Server"
   - Installer l'extension par Ritwick Dey

3. **Lancer le serveur**
   - Clic droit sur `index.html`
   - Sélectionner "Open with Live Server"
   - Le navigateur s'ouvre automatiquement sur `http://localhost:5500`

### Option 2 : Python (Sans installation supplémentaire)

```bash
cd /Users/user/IdeaProjects/gite_sailly_au_bois
python -m http.server 8000
```

Accédez à : `http://localhost:8000`

### Option 3 : Node.js http-server

```bash
npm install -g http-server
cd /Users/user/IdeaProjects/gite_sailly_au_bois
http-server
```

Accédez à : `http://localhost:8080`

## 📅 Gestion des réservations

### Structure de reservations.json

Chaque réservation contient :

```json
{
  "id": 1,
  "nom": "Dupont Jean",
  "email": "jean.dupont@email.com",
  "dateArrivee": "2024-06-15",
  "dateDepart": "2024-06-22",
  "statut": "confirmee",
  "dateCreation": "2024-01-15T10:30:00Z"
}
```

### Blocage automatique des dates

Le système détecte immédiatement les dates réservées lors de la saisie et affiche un message d'erreur automatique.

## ✨ Fonctionnalités

- ✅ Authentification complète (inscription/connexion)
- ✅ Réservation en ligne avec validation en temps réel
- ✅ Blocage automatique des dates réservées
- ✅ Pré-remplissage du formulaire avec les données utilisateur
- ✅ Envoi des demandes via Formspree
- ✅ Responsive Design (Desktop, Tablet, Mobile)
- ✅ Design professionnel et intuitif

## 🔒 Authentification

### Créer un compte

1. Aller à `http://localhost:5500/auth.html`
2. Cliquer sur l'onglet "Inscription"
3. Remplir les champs :
   - Nom complet (min. 2 caractères)
   - Email valide
   - Mot de passe (min. 6 caractères)
   - Confirmation du mot de passe
4. Cliquer sur "S'inscrire"
5. Vous êtes automatiquement connecté et redirigé vers le formulaire de réservation

### Se connecter

1. Aller à `http://localhost:5500/auth.html`
2. Remplir les champs de connexion
3. Cliquer sur "Se connecter"
4. Vous êtes redirigé vers le formulaire de réservation

### Déconnexion

Cliquer sur le bouton "Déconnexion" dans la navbar (visible après connexion)

## 📱 Responsive Design

Le site s'adapte automatiquement à :
- Desktop (1200px+)
- Tablet (768px - 1199px)
- Mobile (< 768px)

## 🎨 Personnalisation

### Couleurs

Les couleurs principales se trouvent dans `style.css` :

```css
:root {
    --primary: #6a7f4e;      /* Vert forêt */
    --secondary: #fdfdfb;    /* Blanc cassé */
    --accent: #c9aa89;       /* Beige chaud */
    --dark: #2c3e50;         /* Gris foncé */
    --light-gray: #f5f5f3;   /* Gris clair */
}
```

### Intégration Formspree

Le formulaire utilise Formspree pour les notifications email. Remplacez l'URL d'action dans `index.html` :

```html
<form action="https://formspree.io/f/YOUR_FORM_ID" method="POST">
```

### Ajouter des réservations

Pour ajouter une réservation, modifiez le fichier `reservations.json` :

```json
{
  "id": 4,
  "nom": "Votre Nom",
  "email": "votre-email@email.com",
  "dateArrivee": "2024-09-01",
  "dateDepart": "2024-09-08",
  "statut": "confirmee",
  "dateCreation": "2024-01-20T12:00:00Z"
}
```

## 📝 Notes importantes

- Les comptes utilisateur sont stockés dans `localStorage` (navigateur)
- Les réservations sont stockées dans `reservations.json`
- Pour une solution production, utilisez une vraie base de données
- Les dates sont au format ISO (YYYY-MM-DD)

> **Limite de sécurité :** l’authentification, les mots de passe et les sessions stockés côté navigateur ne protègent pas un compte ni l’espace administrateur. Les identifiants et le code exécuté dans le navigateur peuvent être inspectés ou modifiés. Pour un déploiement réel, déplacez l’authentification, les données et la limitation des envois EmailJS vers un serveur; limitez aussi les domaines autorisés et les quotas dans EmailJS.

## 🧪 Test rapide

1. Aller à `http://localhost:5500`
2. Cliquer sur "Connexion"
3. Cliquer sur "Inscription"
4. Créer un compte avec :
   - Nom: Jean Martin
   - Email: jean@test.com
   - Mot de passe: password123
5. Vous êtes redirigé vers le formulaire de réservation
6. Sélectionner les dates (évitez 2024-06-15 à 2024-06-22 qui sont déjà réservées)
7. Cliquer sur "Envoyer ma demande"

## 🆘 Dépannage

### "Live Server n'est pas disponible"
- Assurez-vous d'avoir installé l'extension Live Server dans VS Code

### "Les dates ne se chargent pas"
- Vérifiez que `reservations.json` est dans le même dossier que les autres fichiers

### "Impossible de se connecter"
- Vérifiez que `localStorage` est activé dans votre navigateur
- Essayez d'abord de vous inscrire avant de vous connecter

## 📧 Contact

Pour toute question ou amélioration, n'hésitez pas à modifier les fichiers !
