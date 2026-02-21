// --- GESTION DES ONGLETS (CONNEXION / INSCRIPTION) ---
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        // Désactiver tous les onglets et formulaires
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        // Activer l'onglet cliqué
        this.classList.add('active');
        document.getElementById(tabName + '-form').classList.add('active');

        // Réinitialiser les messages d'erreur
        document.getElementById('auth-message').className = 'auth-message';
        document.getElementById('auth-message').textContent = '';
    });
});

// --- FONCTIONS DE VALIDATION ---
function validerEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validerMotDePasse(password) {
    return password.length >= 6; // Minimum 6 caractères
}

function validerTel(tel) {
    return tel.replace(/\s/g, '').length >= 10; // Minimum 10 chiffres
}

// --- GESTION DE L'AFFICHAGE DES ERREURS ---
function afficherErreur(input, message) {
    input.classList.add('error');
    const errorDiv = input.parentElement.querySelector('.form-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.classList.add('show');
    }
}

function cacherErreur(input) {
    input.classList.remove('error');
    const errorDiv = input.parentElement.querySelector('.form-error');
    if (errorDiv) {
        errorDiv.textContent = '';
        errorDiv.classList.remove('show');
    }
}

function afficherMessage(message, type) {
    const messageDiv = document.getElementById('auth-message');
    messageDiv.textContent = message;
    messageDiv.className = `auth-message ${type}`;
}

// --- FORMULAIRE DE CONNEXION ---
document.getElementById('connexion-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const email = document.getElementById('connexion-email').value.trim();
    const password = document.getElementById('connexion-password').value;

    // Validations de base
    if (!validerEmail(email)) {
        afficherErreur(document.getElementById('connexion-email'), 'Email invalide');
        return;
    }
    cacherErreur(document.getElementById('connexion-email'));

    // Récupération de la liste des utilisateurs
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];
    const utilisateur = utilisateurs.find(u => u.email === email);

    // Vérification de l'existence et du mot de passe
    if (!utilisateur || utilisateur.password !== btoa(password)) {
        afficherMessage('Email ou mot de passe incorrect', 'error');
        return;
    }

    // ✅ SAUVEGARDE COMPLÈTE DE LA SESSION (Fix Photo & Tel)
    localStorage.setItem('utilisateurConnecte', JSON.stringify({
        id: utilisateur.id,
        nom: utilisateur.nom,
        email: utilisateur.email,
        telephone: utilisateur.telephone || '',
        photo: utilisateur.photo || null,
        actif: utilisateur.actif || false // On récupère le statut de vérification
    }));

    afficherMessage('✅ Connexion réussie ! Redirection...', 'success');

    setTimeout(() => {
        window.location.href = 'index.html#reserver';
    }, 1500);
});

// --- FORMULAIRE D'INSCRIPTION ---
document.getElementById('inscription-form').addEventListener('submit', function(e) {
    e.preventDefault();

    const nom = document.getElementById('inscription-nom').value.trim();
    const tel = document.getElementById('inscription-tel').value.trim();
    const email = document.getElementById('inscription-email').value.trim();
    const password = document.getElementById('inscription-password').value;
    const passwordConfirm = document.getElementById('inscription-password-confirm').value;

    let hasError = false;

    // Validation du Nom
    if (nom.length < 2) {
        afficherErreur(document.getElementById('inscription-nom'), 'Nom trop court');
        hasError = true;
    } else { cacherErreur(document.getElementById('inscription-nom')); }

    // Validation du Téléphone
    if (!validerTel(tel)) {
        afficherErreur(document.getElementById('inscription-tel'), 'Téléphone invalide');
        hasError = true;
    } else { cacherErreur(document.getElementById('inscription-tel')); }

    // Validation Email
    if (!validerEmail(email)) {
        afficherErreur(document.getElementById('inscription-email'), 'Email invalide');
        hasError = true;
    } else { cacherErreur(document.getElementById('inscription-email')); }

    // Validation Mot de passe
    if (!validerMotDePasse(password)) {
        afficherErreur(document.getElementById('inscription-password'), '6 caractères minimum');
        hasError = true;
    } else { cacherErreur(document.getElementById('inscription-password')); }

    if (password !== passwordConfirm) {
        afficherErreur(document.getElementById('inscription-password-confirm'), 'Les mots de passe ne correspondent pas');
        hasError = true;
    } else { cacherErreur(document.getElementById('inscription-password-confirm')); }

    if (hasError) return;

    // Vérifier si l'email existe déjà
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];
    if (utilisateurs.some(u => u.email === email)) {
        afficherMessage('Cet email est déjà utilisé.', 'error');
        return;
    }

    // CRÉATION DU NOUVEL UTILISATEUR
    const nouvelUtilisateur = {
        id: Date.now(),
        nom: nom,
        telephone: tel,
        email: email,
        password: btoa(password),
        photo: null,
        actif: false, // 🔴 Inactif par défaut pour la vérification par lien
        dateInscription: new Date().toISOString()
    };

    utilisateurs.push(nouvelUtilisateur);
    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

    // CONNEXION AUTOMATIQUE APRÈS INSCRIPTION
    localStorage.setItem('utilisateurConnecte', JSON.stringify(nouvelUtilisateur));

    afficherMessage('✅ Inscription réussie ! Bienvenue.', 'success');

    setTimeout(() => {
        window.location.href = 'mon-compte.html'; // On envoie l'utilisateur vers son compte pour la validation
    }, 1500);
});

// --- SÉCURITÉ : REDIRECTION SI DÉJÀ CONNECTÉ ---
window.addEventListener('load', function() {
    const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
    if (utilisateurConnecte) {
        window.location.href = 'index.html';
    }
});