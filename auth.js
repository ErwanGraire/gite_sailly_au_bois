// Gestion des onglets
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        // Désactiver tous les tabs
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        // Activer le tab cliqué
        this.classList.add('active');
        document.getElementById(tabName + '-form').classList.add('active');

        // Effacer les messages
        document.getElementById('auth-message').className = 'auth-message';
        document.getElementById('auth-message').textContent = '';
    });
});

// Validation email
function validerEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Validation mot de passe
function validerMotDePasse(password) {
    return password.length >= 6;
}

// Afficher message d'erreur
function afficherErreur(input, message) {
    input.classList.add('error');
    const errorDiv = input.parentElement.querySelector('.form-error');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');
}

// Cacher message d'erreur
function cacherErreur(input) {
    input.classList.remove('error');
    const errorDiv = input.parentElement.querySelector('.form-error');
    errorDiv.textContent = '';
    errorDiv.classList.remove('show');
}

// Afficher message global
function afficherMessage(message, type) {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;
}

// Formulaire Connexion
document.getElementById('connexion-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('connexion-email').value.trim();
    const password = document.getElementById('connexion-password').value;

    // Validation
    if (!validerEmail(email)) {
        afficherErreur(document.getElementById('connexion-email'), 'Email invalide');
        return;
    }

    if (!password) {
        afficherErreur(document.getElementById('connexion-password'), 'Le mot de passe est requis');
        return;
    }

    cacherErreur(document.getElementById('connexion-email'));
    cacherErreur(document.getElementById('connexion-password'));

    // Récupérer les utilisateurs
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];

    // Chercher l'utilisateur
    const utilisateur = utilisateurs.find(u => u.email === email);

    if (!utilisateur) {
        afficherMessage('Cet email n\'existe pas. Créez un compte d\'abord !', 'error');
        return;
    }

    // Vérifier le mot de passe (en production, utiliser bcrypt)
    if (utilisateur.password !== btoa(password)) {
        afficherMessage('Mot de passe incorrect', 'error');
        return;
    }

    // Connexion réussie
    localStorage.setItem('utilisateurConnecte', JSON.stringify({
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email
    }));

    afficherMessage('✅ Connexion réussie ! Redirection...', 'success');

    setTimeout(() => {
        window.location.href = 'index.html#reserver';
    }, 1500);
});

// Formulaire Inscription
document.getElementById('inscription-form').addEventListener('submit', async function(e) {
    e.preventDefault();

    const nom = document.getElementById('inscription-nom').value.trim();
    const email = document.getElementById('inscription-email').value.trim();
    const password = document.getElementById('inscription-password').value;
    const passwordConfirm = document.getElementById('inscription-password-confirm').value;

    // Validation
    let hasError = false;

    if (nom.length < 2) {
        afficherErreur(document.getElementById('inscription-nom'), 'Le nom doit contenir au moins 2 caractères');
        hasError = true;
    } else {
        cacherErreur(document.getElementById('inscription-nom'));
    }

    if (!validerEmail(email)) {
        afficherErreur(document.getElementById('inscription-email'), 'Email invalide');
        hasError = true;
    } else {
        cacherErreur(document.getElementById('inscription-email'));
    }

    if (!validerMotDePasse(password)) {
        afficherErreur(document.getElementById('inscription-password'), 'Le mot de passe doit contenir au moins 6 caractères');
        hasError = true;
    } else {
        cacherErreur(document.getElementById('inscription-password'));
    }

    if (password !== passwordConfirm) {
        afficherErreur(document.getElementById('inscription-password-confirm'), 'Les mots de passe ne correspondent pas');
        hasError = true;
    } else {
        cacherErreur(document.getElementById('inscription-password-confirm'));
    }

    if (hasError) return;

    // Vérifier si l'email existe déjà
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];

    if (utilisateurs.some(u => u.email === email)) {
        afficherMessage('Cet email est déjà utilisé. Connectez-vous !', 'error');
        return;
    }

    // Créer le nouvel utilisateur
    const nouvelUtilisateur = {
        id: Date.now(),
        nom,
        email,
        password: btoa(password), // Encodage basique (à remplacer par bcrypt en production)
        dateInscription: new Date().toISOString()
    };

    utilisateurs.push(nouvelUtilisateur);
    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

    // Connecter automatiquement
    localStorage.setItem('utilisateurConnecte', JSON.stringify({
        id: nouvelUtilisateur.id,
        nom: nouvelUtilisateur.nom,
        email: nouvelUtilisateur.email
    }));

    afficherMessage('✅ Inscription réussie ! Redirection...', 'success');

    // Réinitialiser le formulaire
    document.getElementById('inscription-form').reset();

    setTimeout(() => {
        window.location.href = 'index.html#reserver';
    }, 1500);
});

// Vérifier si l'utilisateur est déjà connecté
window.addEventListener('load', function() {
    const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
    if (utilisateurConnecte) {
        window.location.href = 'index.html';
    }
});
