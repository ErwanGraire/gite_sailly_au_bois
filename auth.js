import { auth, db } from './firebase-config.js';
import {
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signOut
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import {
    doc,
    setDoc,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const DELAI_RESET_MS = 60000;
let dernierEnvoiReset = 0;
let actionAuthentificationEnCours = false;
let etatInitialAuthVerifie = false;

function estEmailValide(email) {
    return typeof email === 'string' &&
        email.length <= 254 &&
        /^[^\s<>@]+@[^\s<>@]+\.[A-Za-z]{2,63}$/.test(email);
}

function estNomValide(nom) {
    return typeof nom === 'string' &&
        nom.length >= 2 &&
        nom.length <= 100 &&
        /^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(nom);
}

function estTelephoneValide(telephone) {
    if (typeof telephone !== 'string' || !/^\+?[0-9][0-9\s().-]{5,22}$/.test(telephone)) {
        return false;
    }

    const chiffres = telephone.replace(/\D/g, '');
    return chiffres.length >= 7 && chiffres.length <= 15;
}

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

function afficherAlerteReset(message, type = 'error') {
    const alerteBox = document.getElementById('reset-alerte-message');
    if (!alerteBox) return;

    alerteBox.style.display = 'block';
    if (type === 'success') {
        alerteBox.style.background = '#ecfdf5';
        alerteBox.style.color = '#065f46';
        alerteBox.style.border = '1px solid #34d399';
    } else {
        alerteBox.style.background = '#fee2e2';
        alerteBox.style.color = '#991b1b';
        alerteBox.style.border = '1px solid #f87171';
    }
    alerteBox.textContent = message;
}

function messageErreurFirebase(error) {
    switch (error.code) {
        case 'auth/email-already-in-use':
            return 'Cet email est déjà utilisé.';
        case 'auth/invalid-email':
            return 'Adresse e-mail invalide.';
        case 'auth/weak-password':
            return 'Le mot de passe doit comporter au moins 6 caractères.';
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Email ou mot de passe incorrect.';
        case 'auth/too-many-requests':
            return 'Trop de tentatives. Veuillez réessayer plus tard.';
        case 'auth/network-request-failed':
            return 'Connexion impossible. Vérifiez votre accès à Internet.';
        case 'auth/operation-not-allowed':
            return 'La connexion par e-mail et mot de passe n’est pas activée dans Firebase.';
        default:
            console.error('Erreur Firebase Authentication:', error);
            return 'Une erreur est survenue. Veuillez réessayer.';
    }
}

document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', function() {
        const tabName = this.getAttribute('data-tab');

        document.querySelectorAll('.auth-tab').forEach(item => item.classList.remove('active'));
        document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));

        this.classList.add('active');
        const formActive = document.getElementById(`${tabName}-form`);
        if (formActive) formActive.classList.add('active');

        const authMessage = document.getElementById('auth-message');
        if (authMessage) {
            authMessage.className = 'auth-message';
            authMessage.textContent = '';
        }
    });
});

const formConnexion = document.getElementById('connexion-form');
if (formConnexion) {
    formConnexion.addEventListener('submit', async function(event) {
        event.preventDefault();

        const emailInput = document.getElementById('connexion-email');
        const passwordInput = document.getElementById('connexion-password');
        const email = emailInput.value.trim();
        const password = passwordInput.value;

        if (!estEmailValide(email)) {
            afficherErreur(emailInput, 'Email invalide');
            return;
        }
        cacherErreur(emailInput);

        if (!password || password.length > 128) {
            afficherErreur(passwordInput, 'Mot de passe invalide');
            return;
        }
        cacherErreur(passwordInput);

        const submitButton = formConnexion.querySelector('[type="submit"]');
        submitButton.disabled = true;
        actionAuthentificationEnCours = true;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            afficherMessage('✅ Connexion réussie ! Redirection...', 'success');
            setTimeout(() => {
                window.location.href = 'index.html#reserver';
            }, 1000);
        } catch (error) {
            afficherMessage(messageErreurFirebase(error), 'error');
        } finally {
            actionAuthentificationEnCours = false;
            submitButton.disabled = false;
        }
    });
}

const formInscription = document.getElementById('inscription-form');
if (formInscription) {
    formInscription.addEventListener('submit', async function(event) {
        event.preventDefault();

        const prenomInput = document.getElementById('inscription-prenom');
        const nomInput = document.getElementById('inscription-nom');
        const telephoneInput = document.getElementById('inscription-tel');
        const emailInput = document.getElementById('inscription-email');
        const passwordInput = document.getElementById('inscription-password');
        const passwordConfirmInput = document.getElementById('inscription-password-confirm');
        const prenom = prenomInput.value.trim();
        const nom = nomInput.value.trim();
        const telephone = telephoneInput.value.trim();
        const email = emailInput.value.trim().toLowerCase();
        const password = passwordInput.value;
        const passwordConfirm = passwordConfirmInput.value;
        let hasError = false;

        if (!estNomValide(prenom)) {
            afficherErreur(prenomInput, 'Prénom invalide (2 à 100 caractères)');
            hasError = true;
        } else {
            cacherErreur(prenomInput);
        }

        if (!estNomValide(nom)) {
            afficherErreur(nomInput, 'Nom invalide (2 à 100 caractères)');
            hasError = true;
        } else {
            cacherErreur(nomInput);
        }

        if (!estTelephoneValide(telephone) || telephone.length > 25) {
            afficherErreur(telephoneInput, 'Téléphone invalide');
            hasError = true;
        } else {
            cacherErreur(telephoneInput);
        }

        if (!estEmailValide(email)) {
            afficherErreur(emailInput, 'Email invalide');
            hasError = true;
        } else {
            cacherErreur(emailInput);
        }

        if (password.length < 6 || password.length > 128) {
            afficherErreur(passwordInput, 'Entre 6 et 128 caractères');
            hasError = true;
        } else {
            cacherErreur(passwordInput);
        }

        if (password !== passwordConfirm) {
            afficherErreur(passwordConfirmInput, 'Les mots de passe ne correspondent pas');
            hasError = true;
        } else {
            cacherErreur(passwordConfirmInput);
        }

        if (hasError) return;

        const submitButton = formInscription.querySelector('[type="submit"]');
        submitButton.disabled = true;
        actionAuthentificationEnCours = true;

        let compteCree = false;
        try {
            const credential = await createUserWithEmailAndPassword(auth, email, password);
            compteCree = true;
            await setDoc(doc(db, 'users', credential.user.uid), {
                nom,
                prenom,
                email: credential.user.email || email,
                telephone,
                createdAt: serverTimestamp()
            });
            if (typeof window.actualiserProfilFirebase === 'function') {
                window.actualiserProfilFirebase({
                    uid: credential.user.uid,
                    nom,
                    prenom,
                    email: credential.user.email || email,
                    telephone,
                    emailVerified: credential.user.emailVerified
                });
            }

            afficherMessage('✅ Inscription réussie ! Bienvenue.', 'success');
            setTimeout(() => {
                window.location.href = 'mon-compte.html';
            }, 1000);
        } catch (error) {
            if (compteCree) {
                console.error('Erreur lors de la création du profil Firestore:', error);
                try {
                    await signOut(auth);
                } catch (signOutError) {
                    console.error('Impossible de fermer la session après échec Firestore:', signOutError);
                }
                afficherMessage('Le compte a été créé, mais son profil n’a pas pu être enregistré. Veuillez réessayer ou contacter le support.', 'error');
            } else {
                afficherMessage(messageErreurFirebase(error), 'error');
            }
        } finally {
            actionAuthentificationEnCours = false;
            submitButton.disabled = false;
        }
    });
}

const lienMdpOublie = document.getElementById('lien-mdp-oublie');
const modalReset = document.getElementById('modal-reset-mdp');
const btnFermerReset = document.getElementById('fermer-modal-reset');
const formDemandeReset = document.getElementById('form-demande-reset');

if (lienMdpOublie && modalReset) {
    lienMdpOublie.addEventListener('click', function(event) {
        event.preventDefault();
        modalReset.style.display = 'flex';
    });

    if (btnFermerReset) {
        btnFermerReset.addEventListener('click', function() {
            modalReset.style.display = 'none';
        });
    }

    modalReset.addEventListener('click', function(event) {
        if (event.target === modalReset) modalReset.style.display = 'none';
    });
}

if (formDemandeReset) {
    formDemandeReset.addEventListener('submit', async function(event) {
        event.preventDefault();

        const email = document.getElementById('reset-email').value.trim().toLowerCase();
        const submitButton = document.getElementById('btn-envoyer-reset');
        if (!estEmailValide(email)) {
            afficherAlerteReset('Veuillez saisir une adresse e-mail valide.');
            return;
        }

        if (Date.now() - dernierEnvoiReset < DELAI_RESET_MS) {
            afficherAlerteReset('Veuillez patienter une minute avant de demander un nouveau lien.');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Envoi en cours...';

        try {
            await sendPasswordResetEmail(auth, email);
            dernierEnvoiReset = Date.now();
            afficherAlerteReset(
                'Si un compte est associé à cette adresse, un e-mail de réinitialisation vient de lui être envoyé.',
                'success'
            );
            formDemandeReset.reset();
        } catch (error) {
            afficherAlerteReset(messageErreurFirebase(error));
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Envoyer le lien de réinitialisation';
        }
    });
}

window.deconnecterFirebase = async function() {
    try {
        await signOut(auth);
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Erreur lors de la déconnexion Firebase:', error);
        afficherMessage('Impossible de vous déconnecter. Veuillez réessayer.', 'error');
    }
};
window.deconnecter = window.deconnecterFirebase;

onAuthStateChanged(auth, user => {
    if (etatInitialAuthVerifie) return;
    etatInitialAuthVerifie = true;
    if (user && !actionAuthentificationEnCours) {
        window.location.href = 'index.html';
    }
});
