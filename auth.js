// --- CONFIGURATION EMAILJS ---
const EMAILJS_CONFIG = {
    publicKey: '3Y-lF_Ed3VvuB6iVh',
    serviceId: 'service_p3hgn5k',
    templateClient: 'template_8ng5jpb', // Modèle pour les voyageurs (reset mdp, confirmation, validation)
    templateAdmin: 'template_dy98wud'   // Modèle pour les alertes hôte (contact, réservations)
};

// Initialisation globale EmailJS
(function() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init({
            publicKey: EMAILJS_CONFIG.publicKey
        });
    }
})();

// --- GESTION DES ONGLETS (CONNEXION / INSCRIPTION) ---
document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        // Désactiver tous les onglets et masquer les formulaires
        document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));

        // Activer l'onglet et le formulaire sélectionnés
        this.classList.add('active');
        const formActive = document.getElementById(tabName + '-form');
        if (formActive) formActive.classList.add('active');

        // Réinitialiser les messages d'état
        const authMsg = document.getElementById('auth-message');
        if (authMsg) {
            authMsg.className = 'auth-message';
            authMsg.textContent = '';
        }
    });
});

// --- FONCTIONS DE VALIDATION ---
function validerEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validerMotDePasse(password) {
    return password.length >= 6;
}

function validerTel(tel) {
    return tel.replace(/\s/g, '').length >= 10;
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
    if (messageDiv) {
        messageDiv.textContent = message;
        messageDiv.className = `auth-message ${type}`;
    }
}

// --- FORMULAIRE DE CONNEXION ---
const formConnexion = document.getElementById('connexion-form');
if (formConnexion) {
    formConnexion.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('connexion-email').value.trim();
        const password = document.getElementById('connexion-password').value;

        if (!validerEmail(email)) {
            afficherErreur(document.getElementById('connexion-email'), 'Email invalide');
            return;
        }
        cacherErreur(document.getElementById('connexion-email'));

        const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];
        const utilisateur = utilisateurs.find(u => u.email.toLowerCase() === email.toLowerCase());

        if (!utilisateur || utilisateur.password !== btoa(password)) {
            afficherMessage('Email ou mot de passe incorrect', 'error');
            return;
        }

        // Sauvegarde de la session active
        localStorage.setItem('utilisateurConnecte', JSON.stringify({
            id: utilisateur.id,
            nom: utilisateur.nom,
            email: utilisateur.email,
            telephone: utilisateur.telephone || '',
            photo: utilisateur.photo || null,
            actif: utilisateur.actif || false
        }));

        afficherMessage('✅ Connexion réussie ! Redirection...', 'success');

        setTimeout(() => {
            window.location.href = 'index.html#reserver';
        }, 1500);
    });
}

// --- FORMULAIRE D'INSCRIPTION ---
const formInscription = document.getElementById('inscription-form');
if (formInscription) {
    formInscription.addEventListener('submit', function(e) {
        e.preventDefault();

        const nom = document.getElementById('inscription-nom').value.trim();
        const tel = document.getElementById('inscription-tel').value.trim();
        const email = document.getElementById('inscription-email').value.trim();
        const password = document.getElementById('inscription-password').value;
        const passwordConfirm = document.getElementById('inscription-password-confirm').value;

        let hasError = false;

        if (nom.length < 2) {
            afficherErreur(document.getElementById('inscription-nom'), 'Nom trop court');
            hasError = true;
        } else {
            cacherErreur(document.getElementById('inscription-nom'));
        }

        if (!validerTel(tel)) {
            afficherErreur(document.getElementById('inscription-tel'), 'Téléphone invalide');
            hasError = true;
        } else {
            cacherErreur(document.getElementById('inscription-tel'));
        }

        if (!validerEmail(email)) {
            afficherErreur(document.getElementById('inscription-email'), 'Email invalide');
            hasError = true;
        } else {
            cacherErreur(document.getElementById('inscription-email'));
        }

        if (!validerMotDePasse(password)) {
            afficherErreur(document.getElementById('inscription-password'), '6 caractères minimum');
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

        const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];
        if (utilisateurs.some(u => u.email.toLowerCase() === email.toLowerCase())) {
            afficherMessage('Cet email est déjà utilisé.', 'error');
            return;
        }

        const nouvelUtilisateur = {
            id: Date.now(),
            nom: nom,
            telephone: tel,
            email: email,
            password: btoa(password),
            photo: null,
            actif: false,
            dateInscription: new Date().toISOString()
        };

        utilisateurs.push(nouvelUtilisateur);
        localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

        localStorage.setItem('utilisateurConnecte', JSON.stringify(nouvelUtilisateur));

        afficherMessage('✅ Inscription réussie ! Bienvenue.', 'success');

        setTimeout(() => {
            window.location.href = 'mon-compte.html';
        }, 1500);
    });
}

// --- GESTION DU MOT DE PASSE OUBLIÉ ---
const lienMdpOublie = document.getElementById('lien-mdp-oublie');
const modalReset = document.getElementById('modal-reset-mdp');
const btnFermerReset = document.getElementById('fermer-modal-reset');
const formDemandeReset = document.getElementById('form-demande-reset');

if (lienMdpOublie && modalReset) {
    lienMdpOublie.addEventListener('click', function(e) {
        e.preventDefault();
        modalReset.style.display = 'flex';
    });

    if (btnFermerReset) {
        btnFermerReset.addEventListener('click', function() {
            modalReset.style.display = 'none';
        });
    }

    modalReset.addEventListener('click', function(e) {
        if (e.target === modalReset) {
            modalReset.style.display = 'none';
        }
    });
}

if (formDemandeReset) {
    formDemandeReset.addEventListener('submit', async function(e) {
        e.preventDefault();
        const inputEmail = document.getElementById('reset-email');
        const email = inputEmail.value.trim().toLowerCase();
        const alerteBox = document.getElementById('reset-alerte-message');
        const btnSubmit = document.getElementById('btn-envoyer-reset');

        const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs')) || [];
        const userIndex = utilisateurs.findIndex(u => u.email.toLowerCase() === email);

        if (userIndex === -1) {
            alerteBox.style.display = 'block';
            alerteBox.style.background = '#fee2e2';
            alerteBox.style.color = '#991b1b';
            alerteBox.style.border = '1px solid #f87171';
            alerteBox.textContent = "Aucun compte n'est enregistré avec cet e-mail.";
            return;
        }

        // Création du jeton unique (validité 1 heure)
        const token = Array.from(crypto.getRandomValues(new Uint8Array(20)))
            .map(b => b.toString(16).padStart(2, '0')).join('');
        const expiration = Date.now() + 3600000;

        utilisateurs[userIndex].resetToken = token;
        utilisateurs[userIndex].resetTokenExpires = expiration;
        localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

        // URL dynamique vers reset-password.html
        const baseUrl = window.location.href.substring(0, window.location.href.lastIndexOf('/') + 1);
        const resetLien = `${baseUrl}reset-password.html?token=${token}`;

        btnSubmit.disabled = true;
        btnSubmit.textContent = 'Envoi en cours...';

        try {
            if (typeof emailjs !== 'undefined') {
                await emailjs.send(EMAILJS_CONFIG.serviceId, EMAILJS_CONFIG.templateClient, {
                    email_destinataire: email,
                    to_name: utilisateurs[userIndex].nom,
                    sujet: 'Réinitialisation de votre mot de passe - Gîte de Sailly-au-Bois',
                    message_intro: 'Vous avez demandé la réinitialisation de votre mot de passe pour accéder à votre espace personnel.',
                    action_button_text: 'Définir un nouveau mot de passe',
                    action_link: resetLien,
                    message_outro: 'Ce lien sécurisé reste actif pendant 1 heure. Si vous n\'êtes pas à l\'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.'
                });
            } else {
                console.log('🔗 [DEV - EmailJS non chargé] Lien généré :', resetLien);
            }

            alerteBox.style.display = 'block';
            alerteBox.style.background = '#ecfdf5';
            alerteBox.style.color = '#065f46';
            alerteBox.style.border = '1px solid #34d399';
            alerteBox.textContent = "Un e-mail de réinitialisation vient de vous être envoyé. Vérifiez votre boîte de réception.";
            formDemandeReset.reset();

        } catch (err) {
            console.error('Erreur EmailJS:', err);
            alerteBox.style.display = 'block';
            alerteBox.style.background = '#fee2e2';
            alerteBox.style.color = '#991b1b';
            alerteBox.style.border = '1px solid #f87171';
            alerteBox.textContent = "Erreur lors de l'envoi du mail. Veuillez réessayer dans un instant.";
        } finally {
            btnSubmit.disabled = false;
            btnSubmit.textContent = 'Envoyer le lien de réinitialisation';
        }
    });
}

// --- SÉCURITÉ : REDIRECTION SI DÉJÀ CONNECTÉ ---
window.addEventListener('load', function() {
    const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
    if (utilisateurConnecte) {
        window.location.href = 'index.html';
    }
});