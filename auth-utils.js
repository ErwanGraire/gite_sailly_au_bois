// Fonction universelle d'échappement anti-XSS
function echapperHTML(chaine) {
    if (!chaine) return '';
    return chaine
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Vérifier l'état de l'authentification
function verifierAuthentification() {
    const brut = localStorage.getItem('utilisateurConnecte');
    if (!brut) return null;
    try {
        return JSON.parse(brut);
    } catch (err) {
        console.error('Erreur lecture session:', err);
        return null;
    }
}

// Obtenir l'utilisateur connecté
function obtenirUtilisateurConnecte() {
    return verifierAuthentification();
}

// Est connecté ?
function estConnecte() {
    return !!verifierAuthentification();
}

// Déconnexion
function deconnecter() {
    localStorage.removeItem('utilisateurConnecte');
    window.location.href = 'auth.html';
}

// Mise à jour de la barre de navigation
function mettreAJourNavbar() {
    const utilisateur = obtenirUtilisateurConnecte();
    const navAuthContainer = document.getElementById('nav-auth-container');

    if (!navAuthContainer) return;

    if (utilisateur && utilisateur.nom) {
        const prenom = echapperHTML(utilisateur.nom.split(' ')[0]);
        navAuthContainer.innerHTML = `
            <span class="nav-welcome">Bienvenue, ${prenom} !</span>
            <a href="mon-compte.html" class="btn btn-nav-small">Mon Compte</a>
            <button onclick="deconnecter()" class="btn btn-nav-small btn-logout-nav">Déconnexion</button>
        `;
    } else {
        navAuthContainer.innerHTML = `<a href="auth.html" class="btn btn-nav">Connexion</a>`;
    }
}

// Afficher / cacher et pré-remplir la section de réservation
function gererAffichageReservation() {
    const authMessage = document.getElementById('auth-required-message');
    const bookingSection = document.getElementById('booking-section');

    if (!authMessage || !bookingSection) {
        return;
    }

    const utilisateur = obtenirUtilisateurConnecte();

    if (utilisateur) {
        authMessage.style.display = 'none';
        bookingSection.style.display = 'block';

        // Pré-remplir les champs avec readOnly plutôt que disabled
        setTimeout(function() {
            const nomInput = document.querySelector('.booking-form input[name="nom"]');
            const emailInput = document.querySelector('.booking-form input[name="email"]');

            if (nomInput && utilisateur.nom) {
                nomInput.value = utilisateur.nom;
                nomInput.readOnly = true;
                nomInput.style.backgroundColor = '#f8fafc';
                nomInput.style.cursor = 'not-allowed';
            }
            if (emailInput && utilisateur.email) {
                emailInput.value = utilisateur.email;
                emailInput.readOnly = true;
                emailInput.style.backgroundColor = '#f8fafc';
                emailInput.style.cursor = 'not-allowed';
            }
        }, 50);

    } else {
        authMessage.style.display = 'block';
        bookingSection.style.display = 'none';
    }
}

// Initialisation au chargement de la page
document.addEventListener('DOMContentLoaded', function() {
    mettreAJourNavbar();
    gererAffichageReservation();
});

// Synchronisation multi-onglets (déconnexion ou changement de compte)
window.addEventListener('storage', function(e) {
    if (e.key === 'utilisateurConnecte') {
        location.reload();
    }
});