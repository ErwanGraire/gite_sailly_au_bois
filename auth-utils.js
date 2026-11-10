// Fonction universelle d'échappement anti-XSS
function echapperHTML(chaine) {
    if (chaine === null || chaine === undefined) return '';
    return String(chaine)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function lireStockageSecurise(cle) {
    try {
        return { ok: true, valeur: window.localStorage.getItem(cle) };
    } catch (err) {
        console.error(`Erreur de lecture du stockage local (${cle}):`, err);
        return { ok: false, valeur: null };
    }
}

function lireJSONSecurise(cle, valeurParDefaut) {
    const resultat = lireStockageSecurise(cle);
    if (!resultat.ok) return { ok: false, valeur: valeurParDefaut };
    if (resultat.valeur === null) return { ok: true, valeur: valeurParDefaut };

    try {
        return { ok: true, valeur: JSON.parse(resultat.valeur) };
    } catch (err) {
        console.error(`Données JSON invalides dans le stockage local (${cle}):`, err);
        return { ok: false, valeur: valeurParDefaut };
    }
}

function ecrireStockageSecurise(cle, valeur) {
    try {
        window.localStorage.setItem(cle, valeur);
        return true;
    } catch (err) {
        console.error(`Erreur d'écriture du stockage local (${cle}):`, err);
        return false;
    }
}

function ecrireJSONSecurise(cle, valeur) {
    try {
        return ecrireStockageSecurise(cle, JSON.stringify(valeur));
    } catch (err) {
        console.error(`Erreur de sérialisation des données (${cle}):`, err);
        return false;
    }
}

function supprimerStockageSecurise(cle) {
    try {
        window.localStorage.removeItem(cle);
        return true;
    } catch (err) {
        console.error(`Erreur de suppression du stockage local (${cle}):`, err);
        return false;
    }
}

function estEmailValide(email) {
    if (typeof email !== 'string' || email.length > 254 || /[\s<>]/.test(email)) return false;
    const morceaux = email.split('@');
    if (morceaux.length !== 2 || morceaux[0].length > 64 || morceaux[0].startsWith('.') ||
        morceaux[0].endsWith('.') || morceaux[0].includes('..')) return false;
    return /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,63}$/i.test(email);
}

function estTelephoneValide(telephone) {
    if (typeof telephone !== 'string' || !/^\+?[0-9][0-9\s().-]{5,22}$/.test(telephone)) return false;
    const chiffres = telephone.replace(/\D/g, '');
    return chiffres.length >= 7 && chiffres.length <= 15;
}

function estDateISOValide(date) {
    if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
    const valeurDate = new Date(`${date}T00:00:00Z`);
    return !Number.isNaN(valeurDate.getTime()) && valeurDate.toISOString().slice(0, 10) === date;
}

function contientContenuDangereux(texte) {
    return typeof texte !== 'string' ||
        /[<>]|javascript\s*:|data\s*:\s*text\/html|on[a-z]+\s*=/i.test(texte) ||
        /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(texte);
}

let utilisateurFirebaseCourant = null;
let authFirebase;
let dbFirebase;

async function initialiserAuthentificationFirebase() {
    try {
        const [{ auth, db }, authSdk, firestoreSdk] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
        authFirebase = auth;
        dbFirebase = db;
        window.firebaseAuth = authFirebase;

        await new Promise((resolve, reject) => {
            let premierEtat = true;
            authSdk.onAuthStateChanged(authFirebase, async user => {
                try {
                    let profil = {};
                    if (user) {
                        const profilSnapshot = await firestoreSdk.getDoc(
                            firestoreSdk.doc(dbFirebase, 'users', user.uid)
                        );
                        profil = profilSnapshot.exists() ? profilSnapshot.data() : {};
                    }

                    const nomComplet = profil.nomComplet ||
                        [profil.prenom, profil.nom].filter(Boolean).join(' ') ||
                        user?.displayName ||
                        '';
                    utilisateurFirebaseCourant = user ? {
                        ...profil,
                        uid: user.uid,
                        email: user.email,
                        nom: nomComplet,
                        nomComplet,
                        telephone: profil.telephone || '',
                        emailVerified: user.emailVerified
                    } : null;
                    window.utilisateurFirebase = utilisateurFirebaseCourant;

                    if (premierEtat) {
                        premierEtat = false;
                        resolve();
                    }
                    mettreAJourNavbar();
                    gererAffichageReservation();
                } catch (error) {
                    console.error('Impossible de charger le profil Firebase:', error);
                    if (premierEtat) {
                        premierEtat = false;
                        reject(error);
                    }
                }
            }, error => {
                console.error('Impossible de vérifier la session Firebase:', error);
                if (premierEtat) {
                    premierEtat = false;
                    reject(error);
                }
            });
        });
    } catch (error) {
        console.error('Impossible d’initialiser Firebase Authentication:', error);
        throw error;
    }
}

window.firebaseAuthReady = initialiserAuthentificationFirebase();
window.actualiserProfilFirebase = function(profil) {
    utilisateurFirebaseCourant = profil;
    window.utilisateurFirebase = profil;
    mettreAJourNavbar();
    gererAffichageReservation();
};

// Vérifier l'état de l'authentification
function verifierAuthentification() {
    return utilisateurFirebaseCourant;
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
async function deconnecter() {
    try {
        await window.firebaseAuthReady;
        const authSdk = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await authSdk.signOut(authFirebase);
        window.location.href = 'auth.html';
    } catch (error) {
        console.error('Impossible de fermer la session Firebase:', error);
        alert('Impossible de vous déconnecter. Veuillez réessayer.');
    }
}

// Mise à jour de la barre de navigation
function mettreAJourNavbar() {
    const utilisateur = obtenirUtilisateurConnecte();
    const navAuthContainer = document.getElementById('nav-auth-container');

    if (!navAuthContainer) return;

    if (utilisateur && typeof utilisateur.email === 'string') {
        const nomAffiche = utilisateur.nom || utilisateur.email;
        const prenom = echapperHTML(nomAffiche.split(' ')[0]);
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
    window.firebaseAuthReady.then(() => {
        mettreAJourNavbar();
        gererAffichageReservation();
    }).catch(() => {
        const navAuthContainer = document.getElementById('nav-auth-container');
        if (navAuthContainer) {
            navAuthContainer.textContent = 'Connexion indisponible';
        }
    });
});
