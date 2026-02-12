window.addEventListener('scroll', function() {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.background = '#ffffff';
        navbar.style.padding = '10px 50px';
    } else {
        navbar.style.background = 'rgba(255, 255, 255, 0.9)';
        navbar.style.padding = '20px 50px';
    }
});

// Gestion des réservations et dates indisponibles
let reservationsData = [];

// Charger les réservations depuis le fichier local ET localStorage
async function chargerReservations() {
    try {
        const response = await fetch('reservations.json');
        const data = await response.json();
        reservationsData = data.reservations;
        console.log('✅ Réservations chargées depuis le fichier local');
    } catch (err) {
        console.log('⚠️ Impossible de charger reservations.json:', err);
        reservationsData = [];
    }

    // Ajouter les réservations du localStorage (nouvelles réservations)
    const reservationsLocales = JSON.parse(localStorage.getItem('reservations')) || [];
    reservationsData = [...reservationsData, ...reservationsLocales];

    console.log('📊 Total réservations:', reservationsData.length);
    mettreAJourDatesIndisponibles();
}

// Mettre à jour les dates indisponibles dans les champs de date
function mettreAJourDatesIndisponibles() {
    const datesIndisponibles = obtenirDatesIndisponibles();

    // Générer le calendrier
    genererCalendrier(datesIndisponibles);

    const inputArrivee = document.querySelector('input[name="arrivee"]');
    const inputDepart = document.querySelector('input[name="depart"]');

    if (inputArrivee && inputDepart) {
        // Ajouter un événement de changement pour valider les dates
        inputArrivee.addEventListener('change', validerDates);
        inputDepart.addEventListener('change', validerDates);

        // Empêcher les dates réservées
        inputArrivee.addEventListener('input', function() {
            restricterDatesIndisponibles(this, inputDepart);
        });
        inputDepart.addEventListener('input', function() {
            restricterDatesIndisponibles(this, inputArrivee);
        });
    }
}

// Vérifier si une date est disponible
function estDateDisponible(dateStr) {
    return !reservationsData.some(reservation => {
        const arrivee = new Date(reservation.dateArrivee);
        const depart = new Date(reservation.dateDepart);
        const dateCheck = new Date(dateStr);

        return dateCheck >= arrivee && dateCheck <= depart;
    });
}

// Obtenir les dates indisponibles
function obtenirDatesIndisponibles() {
    const datesIndisponibles = [];

    reservationsData.forEach(reservation => {
        const arrivee = new Date(reservation.dateArrivee);
        const depart = new Date(reservation.dateDepart);

        // Inclure les dates d'arrivée et de départ
        for (let d = new Date(arrivee); d <= depart; d.setDate(d.getDate() + 1)) {
            datesIndisponibles.push(d.toISOString().split('T')[0]);
        }
    });

    console.log('📅 Dates indisponibles:', datesIndisponibles.length);
    return datesIndisponibles;
}

// Valider que les dates sélectionnées ne chevauchent pas
function validerDates() {
    const inputArrivee = document.querySelector('input[name="arrivee"]');
    const inputDepart = document.querySelector('input[name="depart"]');

    if (!inputArrivee || !inputDepart || !inputArrivee.value || !inputDepart.value) return;

    const dateArrivee = new Date(inputArrivee.value);
    const dateDepart = new Date(inputDepart.value);

    // Vérifier que départ > arrivée
    if (dateDepart <= dateArrivee) {
        afficherErreur('La date de départ doit être après la date d\'arrivée');
        return;
    }

    // Vérifier si les dates chevauchent une réservation existante
    const datesIndisponibles = obtenirDatesIndisponibles();
    let conflitTrouve = false;

    for (let d = new Date(dateArrivee); d <= dateDepart; d.setDate(d.getDate() + 1)) {
        const dateStr = d.toISOString().split('T')[0];
        if (datesIndisponibles.includes(dateStr)) {
            conflitTrouve = true;
            console.log('⚠️ Conflit trouvé pour la date:', dateStr);
            break;
        }
    }

    if (conflitTrouve) {
        afficherErreur('Ces dates ne sont pas disponibles. Veuillez choisir d\'autres dates.');
        inputArrivee.value = '';
        inputDepart.value = '';
    } else {
        cacherErreur();
    }
}

// Afficher un message d'erreur
function afficherErreur(message) {
    let messageErreur = document.getElementById('message-erreur-dates');

    if (!messageErreur) {
        messageErreur = document.createElement('div');
        messageErreur.id = 'message-erreur-dates';
        messageErreur.style.cssText = `
            background: #fee;
            border: 2px solid #c33;
            color: #c33;
            padding: 15px;
            border-radius: 10px;
            margin-bottom: 20px;
            font-weight: 600;
            text-align: center;
            animation: slideIn 0.3s ease;
        `;

        const bookingForm = document.querySelector('.booking-form');
        if (bookingForm) {
            bookingForm.insertBefore(messageErreur, bookingForm.firstChild);
        }
    }

    messageErreur.textContent = message;
    messageErreur.style.display = 'block';
}

// Cacher le message d'erreur
function cacherErreur() {
    const messageErreur = document.getElementById('message-erreur-dates');
    if (messageErreur) {
        messageErreur.style.display = 'none';
    }
}

// Afficher un message de succès
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
        if (bookingForm) {
            bookingForm.insertBefore(messageSucces, bookingForm.firstChild);
        }
    }

    messageSucces.textContent = message;
    messageSucces.style.display = 'block';
    cacherErreur();
}

// Restreindre les dates indisponibles
function restricterDatesIndisponibles(input, autreInput) {
    const datesIndisponibles = obtenirDatesIndisponibles();
    input.setAttribute('data-dates-indisponibles', JSON.stringify(datesIndisponibles));
}

// Empêcher la soumission du formulaire avec des dates invalides
document.addEventListener('DOMContentLoaded', function() {
    console.log('📍 DOMContentLoaded dans script.js');

    chargerReservations();

    const form = document.querySelector('.booking-form');
    if (form) {
        console.log('✅ Formulaire de réservation trouvé');

        form.addEventListener('submit', function(e) {
            const inputArrivee = document.querySelector('input[name="arrivee"]');
            const inputDepart = document.querySelector('input[name="depart"]');
            const inputNom = document.querySelector('input[name="nom"]');
            const inputEmail = document.querySelector('input[name="email"]');

            // Vérifier l'authentification
            const utilisateurConnecte = localStorage.getItem('utilisateurConnecte');
            if (!utilisateurConnecte) {
                e.preventDefault();
                afficherErreur('Vous devez être connecté pour réserver. Veuillez vous inscrire d\'abord.');
                console.log('❌ Tentative de réservation sans authentification');
                return;
            }

            console.log('✅ Utilisateur authentifié');

            if (!inputArrivee || !inputDepart || !inputArrivee.value || !inputDepart.value) {
                e.preventDefault();
                afficherErreur('Veuillez sélectionner les dates d\'arrivée et de départ');
                return;
            }

            const dateArrivee = new Date(inputArrivee.value);
            const dateDepart = new Date(inputDepart.value);
            const datesIndisponibles = obtenirDatesIndisponibles();

            // Vérification des conflits - STRICTE (inclut les limites)
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
                afficherErreur('Les dates sélectionnées sont déjà réservées. Veuillez choisir d\'autres dates.');
                console.log('❌ Conflit de dates détecté');
                return;
            }

            // Les dates sont valides - sauvegarder la réservation AVANT Formspree
            const utilisateur = JSON.parse(utilisateurConnecte);
            const nouvelleReservation = {
                id: Date.now(),
                nom: inputNom.value,
                email: inputEmail.value,
                dateArrivee: inputArrivee.value,
                dateDepart: inputDepart.value,
                statut: 'confirmee',
                message: document.querySelector('textarea[name="message"]').value || '',
                dateCreation: new Date().toISOString()
            };

            // Sauvegarder dans localStorage
            const reservationsLocales = JSON.parse(localStorage.getItem('reservations')) || [];
            reservationsLocales.push(nouvelleReservation);
            localStorage.setItem('reservations', JSON.stringify(reservationsLocales));

            console.log('✅ Réservation sauvegardée localement:', nouvelleReservation);
            console.log('📊 Total réservations:', reservationsLocales.length);

            // Recharger les réservations pour mettre à jour l'affichage
            chargerReservations();

            // Laisser Formspree gérer l'envoi email
            afficherSucces('✅ Réservation confirmée ! Redirection vers votre compte...');

            setTimeout(() => {
                window.location.href = 'mon-compte.html';
            }, 2000);
        });
    } else {
        console.log('⚠️ Formulaire de réservation non trouvé (page sans formulaire)');
    }

    gererAffichageReservation();
});

// Animation pour le message d'erreur
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);
