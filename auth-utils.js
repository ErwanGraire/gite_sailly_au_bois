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

// Mettre à jour la navbar
function mettreAJourNavbar() {
    const utilisateur = obtenirUtilisateurConnecte();
    const navAuthContainer = document.getElementById('nav-auth-container');

    if (!navAuthContainer) {
        console.log('⚠️ nav-auth-container non trouvé');
        return;
    }

    if (utilisateur) {
        navAuthContainer.innerHTML = `
            <li style="margin-left: 0;">
                <span style="color: var(--dark); font-weight: 600; font-size: 0.95rem;">
                    Bienvenue, ${utilisateur.nom.split(' ')[0]} !
                </span>
            </li>
            <li style="margin-left: 1rem;">
                <a href="mon-compte.html" class="btn btn-nav" style="padding: 8px 16px; font-size: 0.85rem;">
                    Mon Compte
                </a>
            </li>
            <li style="margin-left: 0.5rem;">
                <button onclick="deconnecter()" class="btn btn-nav" style="padding: 8px 16px; font-size: 0.85rem;">
                    Déconnexion
                </button>
            </li>
        `;
        console.log('✅ Navbar mise à jour pour utilisateur connecté:', utilisateur.nom);
    } else {
        navAuthContainer.innerHTML = `
            <li style="margin-left: 0;">
                <a href="auth.html" class="btn btn-nav">Connexion</a>
            </li>
        `;
        console.log('⚠️ Navbar : pas d\'utilisateur connecté');
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
