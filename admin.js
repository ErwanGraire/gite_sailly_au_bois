import { db } from './firebase-config.js';
import {
    collection,
    deleteDoc,
    doc,
    getDocs,
    setDoc,
    updateDoc
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const ADMIN_CREDENTIALS = {
    email: "admin@gite-sailly.fr",
    password: "Sailly2024"
};

let statutFiltreActif = 'en-attente';
let dernierEnvoiEmailAdmin = 0;
const DELAI_ENTRE_EMAILS_ADMIN = 5000;
let reservationsAdmin = [];

async function chargerReservationsFirestore() {
    const snapshot = await getDocs(collection(db, 'reservations'));
    reservationsAdmin = snapshot.docs.map(reservationDoc => ({
        ...reservationDoc.data(),
        id: reservationDoc.id
    }));
    window.reservationsData = reservationsAdmin;
    return reservationsAdmin;
}

async function enregistrerReservationFirestore(reservation) {
    const { id, ...donnees } = reservation;
    await setDoc(doc(db, 'reservations', id), donnees);
}

function afficherErreurChargementReservations(error) {
    console.error('Impossible de charger les réservations Firestore:', error);
    const resBody = document.getElementById('admin-res-body');
    const calendar = document.getElementById('calendar-container');
    const message = 'Impossible de charger les réservations depuis Firebase. Vérifiez la connexion et les règles Firestore.';
    if (resBody) resBody.textContent = message;
    if (calendar) calendar.textContent = message;
}

document.addEventListener('DOMContentLoaded', function() {
    const resBody = document.getElementById('admin-res-body');
    if (resBody) {
        resBody.addEventListener('click', function(event) {
            const button = event.target.closest('button[data-action][data-id]');
            if (!button) return;

            const id = button.dataset.id;
            if (!id) return;

            switch (button.dataset.action) {
                case 'edit':
                    ouvrirModalEdition(id);
                    break;
                case 'delete':
                    supprimerReservation(id);
                    break;
                case 'refuse':
                    demanderRefus(id);
                    break;
                case 'validate':
                    demanderValidation(id);
                    break;
            }
        });
    }
    verifierSessionAdmin();
});

function lireReservationsAdmin() {
    return reservationsAdmin;
}

// 1. GESTION DE SESSION
function verifierSessionAdmin() {
    const resultatSession = lireStockageSecurise('sessionAdminActive');
    const isAuth = resultatSession.ok && resultatSession.valeur === 'true';
    const overlay = document.getElementById('admin-login-overlay');

    if (isAuth) {
        if (overlay) overlay.style.display = 'none';
        chargerDonneesAdmin();
    }
}

function tentativeConnexionAdmin() {
    const emailSaisi = document.getElementById('admin-email').value.trim();
    const passSaisi = document.getElementById('admin-password').value.trim();
    const errorMsg = document.getElementById('admin-error');

    if (emailSaisi === ADMIN_CREDENTIALS.email && passSaisi === ADMIN_CREDENTIALS.password) {
        if (!ecrireStockageSecurise('sessionAdminActive', 'true')) {
            errorMsg.textContent = 'Le stockage local est indisponible dans ce navigateur.';
            errorMsg.style.display = 'block';
            return;
        }
        document.getElementById('admin-login-overlay').style.display = 'none';
        chargerDonneesAdmin();
    } else {
        errorMsg.style.display = 'block';
    }
}

function deconnecterAdmin() {
    if (!supprimerStockageSecurise('sessionAdminActive')) {
        alert('Impossible de fermer la session : le stockage local est bloqué.');
        return;
    }
    window.location.href = "index.html";
}

// 2. GESTION DES ONGLETS
function changerOngletStatut(nouveauStatut) {
    if (!['en-attente', 'confirmee', 'annulee', 'tous'].includes(nouveauStatut)) return;
    statutFiltreActif = nouveauStatut;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === nouveauStatut);
    });
    chargerDonneesAdmin();
}

// 3. CHARGEMENT ET RENDU DU TABLEAU DE BORD
function chargerDonneesAdmin() {
    return chargerReservationsFirestore().then(reservations => {
        if (typeof genererCalendrier === 'function') {
            genererCalendrier();
        }
        afficherDonneesAdmin(reservations);
        return true;
    }).catch(error => {
        afficherErreurChargementReservations(error);
        return false;
    });
}

function afficherDonneesAdmin(reservations) {
    if (!Array.isArray(reservations)) {
        const resBody = document.getElementById('admin-res-body');
        if (resBody) resBody.textContent = 'Les données des réservations Firebase sont invalides.';
        return;
    }

    // A. Compteurs d'onglets
    const nbAttente = reservations.filter(r => r.statut === 'en-attente').length;
    const nbValidees = reservations.filter(r => r.statut === 'confirmee').length;
    const nbAnnulees = reservations.filter(r => r.statut === 'annulee').length;

    const elAtt = document.getElementById('count-attente');
    const elVal = document.getElementById('count-validees');
    const elAnn = document.getElementById('count-annulees');
    const elAll = document.getElementById('count-toutes');

    if (elAtt) elAtt.textContent = nbAttente;
    if (elVal) elVal.textContent = nbValidees;
    if (elAnn) elAnn.textContent = nbAnnulees;
    if (elAll) elAll.textContent = reservations.length;

    // B. Filtrage
    const filtreLogement = (document.getElementById('filtre-table-logement') || {}).value || 'tous';
    let listeFiltree = [...reservations];

    if (statutFiltreActif !== 'tous') {
        listeFiltree = listeFiltree.filter(r => r.statut === statutFiltreActif);
    }

    if (filtreLogement !== 'tous') {
        listeFiltree = listeFiltree.filter(r =>
            typeof r.logement === 'string' && r.logement.includes(filtreLogement)
        );
    }

    // C. Tri par date d'arrivée
    listeFiltree.sort((a, b) => new Date(a.dateArrivee) - new Date(b.dateArrivee));

    // D. Affichage tableau
    const resBody = document.getElementById('admin-res-body');
    if (resBody) {
        if (listeFiltree.length === 0) {
            resBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">
                        Aucun élément dans cette vue.
                    </td>
                </tr>
            `;
        } else {
            resBody.innerHTML = listeFiltree.map(res => {
                const estManuel = res.source === 'manuel';
                const reservationId = typeof res.id === 'string' ? echapperHTML(res.id) : '';
                const actionsPermises = reservationId.length > 0;
                const nom = echapperHTML(res.nom || '');
                const email = echapperHTML(res.email || '');
                const telephoneBrut = typeof res.telephone === 'string' ? res.telephone : '';
                const telephone = echapperHTML(telephoneBrut);
                const logement = echapperHTML(res.logement || 'Domaine complet');
                const dateArrivee = echapperHTML(res.dateArrivee || '');
                const dateDepart = echapperHTML(res.dateDepart || '');
                const message = echapperHTML(res.message || '');

                // Colonne Client / Origine
                let colonneClient = '';
                if (estManuel) {
                    colonneClient = `
                        <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">BLOQUÉ HÔTE</span><br>
                        <strong>${nom}</strong>
                        ${estTelephoneValide(telephoneBrut) ? `<br><small style="color:#0284c7;"><a href="tel:${telephone}" style="color:inherit; text-decoration:none;">📞 ${telephone}</a></small>` : ''}
                        ${res.email && res.email !== 'proprietaire@gite-sailly.fr' ? `<br><small style="color:#64748b;">✉️ ${email}</small>` : ''}
                    `;
                } else {
                    colonneClient = `
                        <strong>${nom}</strong><br>
                        <small style="color: #64748b;">${email}</small>
                        ${estTelephoneValide(telephoneBrut) ? `<br><small style="color:#0284c7;"><a href="tel:${telephone}" style="color:inherit; text-decoration:none;">📞 ${telephone}</a></small>` : ''}
                    `;
                }

                // Badge Statut
                let badgeHtml = '';
                if (res.statut === 'confirmee') {
                    badgeHtml = `<span class="badge badge-valide">${estManuel ? '● Bloqué' : '● Validée'}</span>`;
                } else if (res.statut === 'annulee') {
                    badgeHtml = `<span class="badge badge-annule">● Annulée</span>`;
                } else {
                    badgeHtml = `<span class="badge badge-attente">● À traiter</span>`;
                }

                // Boutons d'actions sécurisés avec anti-missclick
                let actionsHtml = '';

                if (actionsPermises) {
                    actionsHtml = `
                    <button class="btn-action" data-action="edit" data-id="${reservationId}" style="background:#e2e8f0; color:#334155;" title="Modifier ou ajouter des informations">✏️ Infos</button>
                `;
                }

                if (actionsPermises && estManuel) {
                    actionsHtml += `
                        <button class="btn-action btn-suppr" data-action="delete" data-id="${reservationId}">Débloquer</button>
                    `;
                } else if (actionsPermises && res.statut === 'confirmee') {
                    actionsHtml += `
                        <button class="btn-action btn-refuser" data-action="refuse" data-id="${reservationId}">Annuler séjour</button>
                    `;
                } else if (actionsPermises && res.statut === 'annulee') {
                    actionsHtml += `
                        <button class="btn-action btn-suppr" data-action="delete" data-id="${reservationId}">Retirer</button>
                    `;
                } else if (actionsPermises) {
                    actionsHtml += `
                        <button class="btn-action btn-valider" data-action="validate" data-id="${reservationId}">Valider</button>
                        <button class="btn-action btn-refuser" data-action="refuse" data-id="${reservationId}">Refuser</button>
                    `;
                }

                let motifBloc = '';
                if (res.motifAnnulation) {
                    motifBloc = `
                        <div style="font-size: 0.75rem; color: #dc2626; margin-top: 4px; background: #fef2f2; padding: 4px 8px; border-radius: 4px;">
                            <strong>Motif :</strong> ${echapperHTML(res.motifAnnulation)}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td>${colonneClient}</td>
                        <td>
                            <span class="logement-tag">${logement}</span>
                        </td>
                        <td>
                            Du <strong>${dateArrivee}</strong><br>
                            au <strong>${dateDepart}</strong>
                            ${motifBloc}
                        </td>
                        <td style="font-size: 0.85rem; color: #475569; max-width: 220px;">
                            ${message ? `<em>« ${message} »</em>` : '-'}
                        </td>
                        <td>${badgeHtml}</td>
                        <td>
                            <div class="action-group">
                                ${actionsHtml}
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    }

    // E. Utilisateurs enregistrés
    const resultatUtilisateurs = lireJSONSecurise('utilisateurs', []);
    const utilisateurs = resultatUtilisateurs.valeur;
    const usersBody = document.getElementById('admin-users-body');
    if (usersBody) {
        if (!resultatUtilisateurs.ok || !Array.isArray(utilisateurs) ||
            utilisateurs.some(utilisateur => !utilisateur || typeof utilisateur !== 'object' || Array.isArray(utilisateur))) {
            usersBody.textContent = 'Impossible de lire les utilisateurs : stockage local indisponible ou données invalides.';
            return;
        }
        if (utilisateurs.length === 0) {
            usersBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#94a3b8;">Aucun utilisateur inscrit</td></tr>';
        } else {
            usersBody.innerHTML = utilisateurs.map(u => `
                <tr>
                    <td><strong>${echapperHTML(u.nom || '')}</strong></td>
                    <td>${echapperHTML(u.email || '')}</td>
                    <td>
                        <span class="badge ${u.actif ? 'badge-valide' : 'badge-attente'}">
                            ${u.actif ? 'Vérifié' : 'Non vérifié'}
                        </span>
                    </td>
                    <td>${estTelephoneValide(u.telephone || '') ? `<a href="tel:${echapperHTML(u.telephone)}">${echapperHTML(u.telephone)}</a>` : '-'}</td>
                    <td>${echapperHTML(u.dateInscription ? new Date(u.dateInscription).toLocaleDateString() : '')}</td>
                </tr>
            `).join('');
        }
    }
}

// 4. BLOQUER DES DATES MANUELLEMENT (Airbnb, Téléphone, Travaux)
async function bloquerDatesManuel(e) {
    e.preventDefault();

    const logement = document.getElementById('blocage-logement').value;
    const dateArrivee = document.getElementById('blocage-arrivee').value;
    const dateDepart = document.getElementById('blocage-depart').value;
    const motif = document.getElementById('blocage-motif').value;
    const logementsAutorises = ["Domaine complet", "La Bergerie", "L'Écurie", "L'Étable", "Le Pigeonnier", "Le Grenier"];
    const motifsAutorises = Array.from(document.getElementById('blocage-motif').options, option => option.value);

    if (!logementsAutorises.includes(logement) || !motifsAutorises.includes(motif)) {
        alert('Le logement ou le motif sélectionné est invalide.');
        return;
    }

    if (!estDateISOValide(dateArrivee) || !estDateISOValide(dateDepart)) {
        alert("Veuillez renseigner deux dates valides.");
        return;
    }

    if (new Date(dateDepart) <= new Date(dateArrivee)) {
        alert("La date de départ doit être postérieure à la date d'arrivée.");
        return;
    }

    let reservations = lireReservationsAdmin();
    if (!reservations) return;

    const conflit = reservations.some(r => {
        if (r.statut === 'annulee') return false;

        const logementReservation = typeof r.logement === 'string' ? r.logement : '';
        const memeLogement = (logementReservation === logement) ||
                             (logementReservation === 'Domaine complet') ||
                             (logement === 'Domaine complet');

        if (!memeLogement) return false;
        return typeof r.dateArrivee === 'string' && typeof r.dateDepart === 'string' &&
            (dateArrivee < r.dateDepart && dateDepart > r.dateArrivee);
    });

    if (conflit) {
        const continuer = confirm("Attention : une réservation ou un blocage actif existe déjà sur ces dates. Voulez-vous forcer le blocage ?");
        if (!continuer) return;
    }

    try {
        const referenceBlocage = doc(collection(db, 'reservations'));
        const nouveauBlocage = {
            nom: `Bloqué (${motif})`,
            email: "proprietaire@gite-sailly.fr",
            telephone: "",
            logement: logement,
            dateArrivee: dateArrivee,
            dateDepart: dateDepart,
            message: `Créneau verrouillé manuellement : ${motif}`,
            statut: "confirmee",
            source: "manuel",
            dateCreation: new Date().toISOString()
        };

        await setDoc(referenceBlocage, nouveauBlocage);
        reservationsAdmin.push({ ...nouveauBlocage, id: referenceBlocage.id });
    } catch (error) {
        console.error('Erreur lors de l’enregistrement du blocage Firestore:', error);
        alert('Impossible d’enregistrer ce blocage dans Firebase. Vérifiez votre connexion et les règles Firestore.');
        return;
    }

    document.getElementById('form-bloquer-dates').reset();
    if (!await chargerDonneesAdmin()) {
        alert('Le blocage a été enregistré dans Firebase, mais le calendrier n’a pas pu être actualisé. Rechargez la page.');
        return;
    }

    alert(`Période verrouillée du ${dateArrivee} au ${dateDepart} pour ${logement}. Le calendrier est actualisé.`);
}

// 5. VALIDATION SÉCURISÉE (ANTI-MISSCLICK) & REFUS GUIDÉ
async function demanderValidation(id) {
    const reservations = lireReservationsAdmin();
    if (!reservations) return;
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    const messageConfirmation = 
        `Confirmer la réservation de ${res.nom} ?\n\n` +
        `🏠 Logement : ${res.logement || 'Domaine complet'}\n` +
        `📅 Dates : du ${res.dateArrivee} au ${res.dateDepart}\n\n` +
        `👉 Un courriel de confirmation avec consignes sera envoyé à ${res.email}.`;

    if (confirm(messageConfirmation)) {
        await executerChangementStatut(id, 'confirmee');
    }
}

async function demanderRefus(id) {
    const reservations = lireReservationsAdmin();
    if (!reservations) return;
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    document.getElementById('refus-res-id').value = res.id;
    document.getElementById('refus-recap-text').textContent =
        `Demande de ${res.nom || ''} pour ${res.logement || 'Domaine complet'} (du ${res.dateArrivee || ''} au ${res.dateDepart || ''}).`;

    const select = document.getElementById('refus-select-motif');
    select.selectedIndex = 0;
    document.getElementById('refus-message-client').value = select.value;

    document.getElementById('modal-refus-reservation').style.display = 'flex';
}

function changerMotifPredefini(valeur) {
    const textarea = document.getElementById('refus-message-client');
    if (valeur === 'autre') {
        textarea.value = '';
        textarea.focus();
    } else {
        textarea.value = valeur;
    }
}

function fermerModalRefus() {
    document.getElementById('modal-refus-reservation').style.display = 'none';
}

async function confirmerRefusReservation(e) {
    e.preventDefault();
    const id = document.getElementById('refus-res-id').value;
    const motif = document.getElementById('refus-message-client').value.trim();

    if (!motif || motif.length > 500 || contientContenuDangereux(motif)) {
        alert("Veuillez saisir un motif valide (500 caractères maximum, sans balisage HTML).");
        return;
    }

    const reservation = lireReservationsAdmin().find(r => r.id === id);
    if (!reservation) return;
    try {
        await updateDoc(doc(db, 'reservations', id), {
            statut: 'annulee',
            motifAnnulation: motif
        });
    } catch (error) {
        console.error('Erreur lors de l’annulation Firestore:', error);
        alert('Impossible d’enregistrer l’annulation dans Firebase. Veuillez réessayer.');
        return;
    }
    fermerModalRefus();
    const reservationRefusee = {
        ...reservation,
        statut: 'annulee',
        motifAnnulation: motif
    };
    await chargerDonneesAdmin();

    // Envoi de l'e-mail explicatif au client s'il s'agit d'une vraie réservation client
    if (reservationRefusee && reservationRefusee.source !== 'manuel' && reservationRefusee.email) {
        envoyerEmailRefusClient(reservationRefusee, motif);
    } else {
        alert("La réservation a bien été annulée et le motif consigné.");
    }
}

async function executerChangementStatut(id, nouveauStatut) {
    const reservation = lireReservationsAdmin().find(res => res.id === id);
    if (!reservation) return;
    try {
        await updateDoc(doc(db, 'reservations', id), { statut: nouveauStatut });
    } catch (error) {
        console.error('Erreur lors de la mise à jour du statut Firestore:', error);
        alert('Impossible d’enregistrer ce changement dans Firebase. Veuillez réessayer.');
        return;
    }
    await chargerDonneesAdmin();

    const reservationConcernee = { ...reservation, statut: nouveauStatut };
    if (nouveauStatut === 'confirmee' && reservationConcernee && reservationConcernee.source !== 'manuel') {
        envoyerEmailConfirmationClient(reservationConcernee);
    }
}

// 6. MODALE D'ÉDITION DES DÉTAILS DU SÉJOUR
function ouvrirModalEdition(id) {
    const reservations = lireReservationsAdmin();
    if (!reservations) return;
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    document.getElementById('edit-res-id').value = res.id;
    document.getElementById('edit-res-nom').value = res.nom || '';
    document.getElementById('edit-res-tel').value = res.telephone || '';
    document.getElementById('edit-res-email').value = (res.email && res.email !== 'proprietaire@gite-sailly.fr') ? res.email : '';
    document.getElementById('edit-res-notes').value = res.message || '';

    document.getElementById('modal-edit-reservation').style.display = 'flex';
}

function fermerModalEdition() {
    document.getElementById('modal-edit-reservation').style.display = 'none';
}

async function sauvegarderDetailsEdition(e) {
    e.preventDefault();
    const id = document.getElementById('edit-res-id').value;
    const nom = document.getElementById('edit-res-nom').value.trim();
    const tel = document.getElementById('edit-res-tel').value.trim();
    const email = document.getElementById('edit-res-email').value.trim();
    const notes = document.getElementById('edit-res-notes').value.trim();

    if (nom.length > 100 || contientContenuDangereux(nom) ||
        (tel && (!estTelephoneValide(tel) || tel.length > 25)) ||
        (email && !estEmailValide(email)) ||
        notes.length > 1000 || contientContenuDangereux(notes)) {
        alert('Vérifiez les informations : nom (100), téléphone valide, e-mail valide et notes (1 000 caractères maximum, sans balisage HTML).');
        return;
    }

    const reservation = lireReservationsAdmin().find(r => r.id === id);
    if (!reservation) return;
    const reservationModifiee = {
        ...reservation,
        nom: nom || reservation.nom,
        telephone: tel,
        email: email || reservation.email,
        message: notes
    };

    try {
        await enregistrerReservationFirestore(reservationModifiee);
    } catch (error) {
        console.error('Erreur lors de la modification de la réservation Firestore:', error);
        alert('Impossible d’enregistrer les modifications dans Firebase. Veuillez réessayer.');
        return;
    }
    fermerModalEdition();
    await chargerDonneesAdmin();
}

// 7. SUPPRESSION D'UNE ENTRÉE (Déblocage ou retrait du tableau)
async function supprimerReservation(id) {
    if (!confirm("Voulez-vous retirer définitivement cette entrée ?")) return;
    try {
        await deleteDoc(doc(db, 'reservations', id));
        reservationsAdmin = reservationsAdmin.filter(reservation => reservation.id !== id);
        await chargerDonneesAdmin();
    } catch (error) {
        console.error('Erreur lors de la suppression Firestore:', error);
        alert('Impossible de supprimer cette entrée dans Firebase. Veuillez réessayer.');
    }
}

// 8. ENVOI COURRIELS VIA EMAILJS (UTILISATION DU TEMPLATE CLIENT template_8ng5jpb)

function envoyerEmailJSAdmin(templateParams) {
    if (!window.emailjs || typeof window.emailjs.send !== 'function') {
        return Promise.reject(new Error('Le SDK EmailJS est indisponible.'));
    }
    if (!templateParams || !estEmailValide(templateParams.email_destinataire)) {
        return Promise.reject(new Error('Adresse e-mail destinataire invalide.'));
    }
    const valeurs = Object.values(templateParams);
    if (valeurs.some(valeur =>
        typeof valeur !== 'string' ||
        valeur.length > 2000 ||
        contientContenuDangereux(valeur)
    )) {
        return Promise.reject(new Error('Les données destinées au modèle EmailJS sont invalides.'));
    }
    if (Date.now() - dernierEnvoiEmailAdmin < DELAI_ENTRE_EMAILS_ADMIN) {
        return Promise.reject(new Error('Veuillez patienter avant le prochain envoi.'));
    }

    dernierEnvoiEmailAdmin = Date.now();
    return window.emailjs.send('service_p3hgn5k', 'template_8ng5jpb', templateParams);
}

// A. Validation du séjour
function envoyerEmailConfirmationClient(res) {
    if (!res || !estEmailValide(res.email) ||
        typeof res.nom !== 'string' || res.nom.length > 100 || contientContenuDangereux(res.nom) ||
        typeof res.logement !== 'string' || res.logement.length > 100 || contientContenuDangereux(res.logement) ||
        !estDateISOValide(res.dateArrivee) || !estDateISOValide(res.dateDepart)) {
        alert('Impossible d’envoyer la confirmation : les données de réservation sont invalides.');
        return;
    }

    const detailsArrivee = `Votre demande pour le logement "${res.logement || 'Domaine complet'}" du ${res.dateArrivee} au ${res.dateDepart} est validée ! Arrivée à partir de 16h00 au 2 rue Saint-Jean, 62111 Sailly-au-Bois. Stationnement gratuit dans la cour.`;

    const templateParams = {
        email_destinataire: res.email,
        sujet: "Confirmation de votre séjour — Une étape à Sailly-Au-Bois 🌿",
        to_name: res.nom || "Client",
        message_intro: detailsArrivee,
        action_button_text: "Consulter mon espace client",
        action_link: `${window.location.origin}/mon-compte.html`,
        message_outro: "Pour toute question ou demande particulière avant votre arrivée, n'hésitez pas à nous contacter."
    };

    envoyerEmailJSAdmin(templateParams)
        .then(() => {
            alert(`✅ Réservation validée et e-mail envoyé à ${res.email}.`);
        })
        .catch(err => {
            console.error("Erreur EmailJS :", err);
            alert("Réservation validée, mais échec lors de l'envoi de l'e-mail.");
        });
}

// B. Refus ou annulation du séjour par l'hôte
function envoyerEmailRefusClient(res, motif) {
    if (!res || !estEmailValide(res.email) ||
        typeof res.nom !== 'string' || res.nom.length > 100 || contientContenuDangereux(res.nom) ||
        typeof motif !== 'string' || !motif || motif.length > 500 || contientContenuDangereux(motif) ||
        typeof res.logement !== 'string' || res.logement.length > 100 || contientContenuDangereux(res.logement) ||
        !estDateISOValide(res.dateArrivee) || !estDateISOValide(res.dateDepart)) {
        alert('Impossible d’envoyer le message : les données de réservation ou le motif sont invalides.');
        return;
    }

    const messageRefus = `Nous ne pouvons malheureusement pas donner une suite favorable à votre demande de réservation pour "${res.logement || 'Domaine complet'}" aux dates du ${res.dateArrivee} au ${res.dateDepart}.\n\nMotif communiqué par l'hôte : « ${motif} »`;

    const templateParams = {
        email_destinataire: res.email,
        sujet: "Information concernant votre réservation — Une étape à Sailly-Au-Bois",
        to_name: res.nom || "Client",
        message_intro: messageRefus,
        action_button_text: "Choisir d'autres dates",
        action_link: `${window.location.origin}/index.html#reserver`,
        message_outro: "Nous restons à votre entière disposition pour tout autre séjour ou renseignement."
    };

    envoyerEmailJSAdmin(templateParams)
        .then(() => {
            alert(`Réservation annulée. Un courriel explicatif a été envoyé à ${res.email}.`);
        })
        .catch(err => {
            console.error("Erreur EmailJS :", err);
            alert("La réservation a été annulée dans le système, mais l'envoi du mail au client a échoué.");
        });
}

Object.assign(window, {
    tentativeConnexionAdmin,
    deconnecterAdmin,
    bloquerDatesManuel,
    changerOngletStatut,
    chargerDonneesAdmin,
    fermerModalEdition,
    sauvegarderDetailsEdition,
    fermerModalRefus,
    confirmerRefusReservation,
    changerMotifPredefini
});