// Vérifier l'état de l'authentification
function verifierAuthentification() {
    const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
    return utilisateurConnecte ? JSON.parse(utilisateurConnecte) : null;
}

// Obtenir l'utilisateur connecté
function obtenirUtilisateurConnecte() {
    return verifierAuthentification();
}

// Est connecté ?
function estConnecte() {
    return !!localStorage.getItem('utilisateurConnecte');
}

// Déconnexion
function deconnecter() {
    localStorage.removeItem('utilisateurConnecte');
    // Note: Les réservations restent dans localStorage pour tous les utilisateurs
    // Cela garantit que les dates restent bloquées même après déconnexion
    window.location.href = 'auth.html';
}

function mettreAJourNavbar() {
    const utilisateur = obtenirUtilisateurConnecte();
    const navAuthContainer = document.getElementById('nav-auth-container');

    if (!navAuthContainer) return;

    if (utilisateur) {
            // On injecte les éléments directement sans div de surplus
            navAuthContainer.innerHTML = `
                <span class="nav-welcome">Bienvenue, ${utilisateur.nom.split(' ')[0]} !</span>
                <a href="mon-compte.html" class="btn btn-nav-small">Mon Compte</a>
                <button onclick="deconnecter()" class="btn btn-nav-small btn-logout-nav">Déconnexion</button>
            `;
        } else {
        navAuthContainer.innerHTML = `<a href="auth.html" class="btn btn-nav">Connexion</a>`;
    }
}

// Afficher/cacher la section de réservation
function gererAffichageReservation() {
    const authMessage = document.getElementById('auth-required-message');
    const bookingSection = document.getElementById('booking-section');

    if (!authMessage || !bookingSection) {
        console.log('⚠️ Les éléments ne sont pas sur cette page (c\'est normal pour gite.html et decouvrir.html)');
        return;
    }

    console.log('📍 Vérification authentification pour affichage réservation');

    if (estConnecte()) {
        console.log('✅ Utilisateur connecté - Affichage du formulaire');
        authMessage.style.display = 'none';
        bookingSection.style.display = 'block';

        // Pré-remplir le formulaire
        const utilisateur = obtenirUtilisateurConnecte();

        // Attendre que le formulaire soit chargé
        setTimeout(function() {
            const nomInput = document.querySelector('.booking-form input[name="nom"]');
            const emailInput = document.querySelector('.booking-form input[name="email"]');

            if (nomInput) {
                nomInput.value = utilisateur.nom;
                nomInput.disabled = true;
                console.log('✅ Champ nom pré-rempli et désactivé');
            }
            if (emailInput) {
                emailInput.value = utilisateur.email;
                emailInput.disabled = true;
                console.log('✅ Champ email pré-rempli et désactivé');
            }
        }, 100);

    } else {
        console.log('❌ Utilisateur NON connecté - Affichage du message d\'authentification');
        authMessage.style.display = 'block';
        bookingSection.style.display = 'none';
    }
}

// Initialiser au chargement complet de la page
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 DOMContentLoaded déclenché');
    console.log('📊 Réservations localStorage:', JSON.parse(localStorage.getItem('reservations') || '[]').length);
    mettreAJourNavbar();
    gererAffichageReservation();
});

// Écouter les changements de stockage (pour la déconnexion dans d'autres onglets)
window.addEventListener('storage', function(e) {
    if (e.key === 'utilisateurConnecte') {
        console.log('📍 Changement d\'authentification détecté - Rechargement');
        location.reload();
    }
});
