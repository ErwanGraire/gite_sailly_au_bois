window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    if (window.scrollY > 50) {
        navbar.style.background = '#ffffff';
        navbar.style.padding = '10px 50px';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.9)';
        navbar.style.padding = '20px 50px';
    }
});

let reservationsData = [];

// Charger les réservations (fichier + localStorage)
async function chargerReservations() {
    try {
        const response = await fetch('reservations.json');
        const data = await response.json();
        reservationsData = data.reservations || [];
        console.log('✅ Réservations chargées depuis le fichier local');
    } catch (err) {
        console.log('⚠️ Impossible de charger reservations.json:', err);
        reservationsData = [];
    }

    const reservationsLocales = JSON.parse(localStorage.getItem('reservations')) || [];
    reservationsData = [...reservationsData, ...reservationsLocales];

    console.log('📊 Total réservations:', reservationsData.length);
    mettreAJourDatesIndisponibles();
}

// Obtenir le logement sélectionné dans le formulaire
function getLogementActif() {
    const select = document.querySelector('select[name="logement"]') || document.getElementById('booking-logement');
    return select ? select.value : "Domaine complet (5 logements)";
}

// Obtenir les dates indisponibles selon le logement actif
function obtenirDatesIndisponibles(logementCible) {
    const cible = logementCible || getLogementActif();
    const datesIndisponibles = new Set();

    reservationsData.forEach(reservation => {
        if (reservation.statut === 'annulee') return;

        const resLogement = reservation.logement || "Domaine complet (5 logements)";
        let estEnConflit = false;

        if (cible.includes("Domaine complet")) {
            // Le domaine complet est bloqué si N'IMPORTE QUEL logement est pris
            estEnConflit = true;
        } else if (resLogement.includes("Domaine complet")) {
            // Une réservation du domaine complet bloque toutes les chambres
            estEnConflit = true;
        } else if (resLogement === cible) {
            // Même logement ciblé
            estEnConflit = true;
        }

        if (estEnConflit) {
            const arrivee = new Date(reservation.dateArrivee);
            const depart = new Date(reservation.dateDepart);
            for (let d = new Date(arrivee); d <= depart; d.setDate(d.getDate() + 1)) {
                datesIndisponibles.add(d.toISOString().split('T')[0]);
            }
        }
    });

    return Array.from(datesIndisponibles);
}

// Mettre à jour le calendrier et les bornes des champs input
function mettreAJourDatesIndisponibles() {
    if (typeof genererCalendrier === 'function') {
        genererCalendrier();
    }

    const inputArrivee = document.querySelector('input[name="arrivee"]');
    const inputDepart = document.querySelector('input[name="depart"]');

    if (inputArrivee && inputDepart) {
        const aujourdhui = new Date().toISOString().split('T')[0];
        inputArrivee.min = aujourdhui;

        inputArrivee.addEventListener('change', function() {
            if (this.value) {
                const dateMinDepart = new Date(this.value);
                dateMinDepart.setDate(dateMinDepart.getDate() + 1);
                inputDepart.min = dateMinDepart.toISOString().split('T')[0];

                if (inputDepart.value && inputDepart.value <= this.value) {
                    inputDepart.value = '';
                }
            }
            validerDates();
        });

        inputDepart.addEventListener('change', validerDates);
    }
}

// Validation stricte des dates par rapport au logement
function validerDates() {
    const inputArrivee = document.querySelector('input[name="arrivee"]');
    const inputDepart = document.querySelector('input[name="depart"]');
    const logement = getLogementActif();

    if (!inputArrivee || !inputDepart || !inputArrivee.value || !inputDepart.value) {
        cacherErreur();
        return;
    }

    const dateArrivee = new Date(inputArrivee.value);
    const dateDepart = new Date(inputDepart.value);

    if (dateDepart <= dateArrivee) {
        afficherErreur("La date de départ doit être strictement postérieure à la date d'arrivée.");
        inputDepart.value = '';
        return;
    }

    const datesIndisponibles = obtenirDatesIndisponibles(logement);
    let conflitTrouve = false;

    for (let d = new Date(dateArrivee); d <= dateDepart; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (datesIndisponibles.includes(dateStr)) {
            conflitTrouve = true;
            break;
        }
    }

    if (conflitTrouve) {
        afficherErreur(`Ces dates ne sont pas disponibles pour "${logement}". Veuillez sélectionner d'autres dates ou un autre logement.`);
        inputArrivee.value = '';
        inputDepart.value = '';
    } else {
        cacherErreur();
    }
}

function afficherErreur(message) {
    let messageErreur = document.getElementById('message-erreur-dates');
    if (!messageErreur) {
        messageErreur = document.createElement('div');
        messageErreur.id = 'message-erreur-dates';
        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm) bookingForm.insertBefore(messageErreur, bookingForm.firstChild);
    }
    messageErreur.textContent = message;
    messageErreur.style.display = 'block';
}

function cacherErreur() {
    const messageErreur = document.getElementById('message-erreur-dates');
    if (messageErreur) messageErreur.style.display = 'none';
}

function afficherSucces(message) {
    let messageSucces = document.getElementById('message-succes-dates');
    if (!messageSucces) {
        messageSucces = document.createElement('div');
        messageSucces.id = 'message-succes-dates';
        messageSucces.style.cssText = `
            background: #efe;
            border: 2px solid #3c3;
            color: #3c3;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;
        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm) bookingForm.insertBefore(messageSucces, bookingForm.firstChild);
    }
    messageSucces.textContent = message;
    messageSucces.style.display = 'block';
    cacherErreur();
}

// Initialisation au chargement
document.addEventListener('DOMContentLoaded', function() {
    chargerReservations();

    // Changement de logement dynamique
    const selectLogement = document.querySelector('select[name="logement"]') || document.getElementById('booking-logement');
    if (selectLogement) {
        selectLogement.addEventListener('change', function() {
            // Effacer la sélection actuelle lors d'un changement de logement
            const inputArrivee = document.querySelector('input[name="arrivee"]');
            const inputDepart = document.querySelector('input[name="depart"]');
            if (inputArrivee) inputArrivee.value = '';
            if (inputDepart) inputDepart.value = '';
            
            cacherErreur();
            mettreAJourDatesIndisponibles();
        });
    }

    // Gestion du formulaire de réservation
    const form = document.querySelector('.booking-form');
    if (form) {
        form.addEventListener('submit', function(e) {
            const inputArrivee = document.querySelector('input[name="arrivee"]');
            const inputDepart = document.querySelector('input[name="depart"]');
            const inputNom = document.querySelector('input[name="nom"]');
            const inputEmail = document.querySelector('input[name="email"]');
            const logementChoisi = getLogementActif();

            // 1. Authentification
            const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
            if (!utilisateurConnecte) {
                e.preventDefault();
                afficherErreur("Vous devez être connecté pour réserver. Veuillez vous connecter ou vous inscrire.");
                return;
            }

            // 2. Vérification des dates
            if (!inputArrivee || !inputDepart || !inputArrivee.value || !inputDepart.value) {
                e.preventDefault();
                afficherErreur("Veuillez sélectionner les dates d'arrivée et de départ.");
                return;
            }

            const dateArrivee = new Date(inputArrivee.value);
            const dateDepart = new Date(inputDepart.value);

            if (dateDepart <= dateArrivee) {
                e.preventDefault();
                afficherErreur("La date de départ doit être strictement postérieure à la date d'arrivée.");
                inputDepart.value = '';
                return;
            }

            // 3. Conflit spécifique au logement
            const datesIndisponibles = obtenirDatesIndisponibles(logementChoisi);
            let conflitTrouve = false;
            for (let d = new Date(dateArrivee); d <= dateDepart; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                if (datesIndisponibles.includes(dateStr)) {
                    conflitTrouve = true;
                    break;
                }
            }

            if (conflitTrouve) {
                e.preventDefault();
                afficherErreur(`Les dates sélectionnées sont déjà réservées pour "${logementChoisi}".`);
                return;
            }

            // 4. Sauvegarde locale
            const nouvelleReservation = {
                id: Date.now(),
                nom: inputNom ? inputNom.value : '',
                email: inputEmail ? inputEmail.value : '',
                logement: logementChoisi,
                dateArrivee: inputArrivee.value,
                dateDepart: inputDepart.value,
                statut: 'en-attente',
                message: (document.querySelector('textarea[name="message"]') || {}).value || '',
                dateCreation: new Date().toISOString()
            };

            const reservationsLocales = JSON.parse(localStorage.getItem('reservations')) || [];
            reservationsLocales.push(nouvelleReservation);
            localStorage.setItem('reservations', JSON.stringify(reservationsLocales));

            chargerReservations();
            afficherSucces(`✅ Demande pour "${logementChoisi}" enregistrée ! Redirection en cours...`);

            setTimeout(() => {
                window.location.href = 'mon-compte.html';
            }, 2000);
        });
    }

    if (typeof gererAffichageReservation === 'function') {
        gererAffichageReservation();
    }
});