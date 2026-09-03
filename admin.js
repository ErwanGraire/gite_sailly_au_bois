const ADMIN_CREDENTIALS = {
    email: "admin@gite-sailly.fr",
    password: "Sailly2024"
};

let statutFiltreActif = 'en-attente';

document.addEventListener('DOMContentLoaded', function() {
    verifierSessionAdmin();
});

// 1. GESTION DE SESSION
function verifierSessionAdmin() {
    const isAuth = localStorage.getItem('sessionAdminActive') === 'true';
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
        localStorage.setItem('sessionAdminActive', 'true');
        document.getElementById('admin-login-overlay').style.display = 'none';
        chargerDonneesAdmin();
    } else {
        errorMsg.style.display = 'block';
    }
}

function deconnecterAdmin() {
    localStorage.removeItem('sessionAdminActive');
    window.location.href = "index.html";
}

// 2. GESTION DES ONGLETS
function changerOngletStatut(nouveauStatut) {
    statutFiltreActif = nouveauStatut;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.status === nouveauStatut);
    });
    chargerDonneesAdmin();
}

// 3. CHARGEMENT ET RENDU DU TABLEAU DE BORD
function chargerDonneesAdmin() {
    if (typeof genererCalendrier === 'function') {
        genererCalendrier();
    }

    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');

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
        listeFiltree = listeFiltree.filter(r => (r.logement || '').includes(filtreLogement));
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

                // Colonne Client / Origine
                let colonneClient = '';
                if (estManuel) {
                    colonneClient = `
                        <span style="background: #f1f5f9; color: #475569; padding: 2px 8px; border-radius: 4px; font-size: 0.72rem; font-weight: 700;">BLOQUÉ HÔTE</span><br>
                        <strong>${res.nom}</strong>
                        ${res.telephone ? `<br><small style="color:#0284c7;"><a href="tel:${res.telephone}" style="color:inherit; text-decoration:none;">📞 ${res.telephone}</a></small>` : ''}
                        ${res.email && res.email !== 'proprietaire@gite-sailly.fr' ? `<br><small style="color:#64748b;">✉️ ${res.email}</small>` : ''}
                    `;
                } else {
                    colonneClient = `
                        <strong>${res.nom}</strong><br>
                        <small style="color: #64748b;">${res.email}</small>
                        ${res.telephone ? `<br><small style="color:#0284c7;"><a href="tel:${res.telephone}" style="color:inherit; text-decoration:none;">📞 ${res.telephone}</a></small>` : ''}
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
                let actionsHtml = `
                    <button class="btn-action" style="background:#e2e8f0; color:#334155;" title="Modifier ou ajouter des informations" onclick="ouvrirModalEdition(${res.id})">✏️ Infos</button>
                `;

                if (estManuel) {
                    actionsHtml += `
                        <button class="btn-action btn-suppr" onclick="supprimerReservation(${res.id})">Débloquer</button>
                    `;
                } else if (res.statut === 'confirmee') {
                    actionsHtml += `
                        <button class="btn-action btn-refuser" onclick="demanderRefus(${res.id})">Annuler séjour</button>
                    `;
                } else if (res.statut === 'annulee') {
                    actionsHtml += `
                        <button class="btn-action btn-suppr" onclick="supprimerReservation(${res.id})">Retirer</button>
                    `;
                } else {
                    actionsHtml += `
                        <button class="btn-action btn-valider" onclick="demanderValidation(${res.id})">Valider</button>
                        <button class="btn-action btn-refuser" onclick="demanderRefus(${res.id})">Refuser</button>
                    `;
                }

                let motifBloc = '';
                if (res.motifAnnulation) {
                    motifBloc = `
                        <div style="font-size: 0.75rem; color: #dc2626; margin-top: 4px; background: #fef2f2; padding: 4px 8px; border-radius: 4px;">
                            <strong>Motif :</strong> ${res.motifAnnulation}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td>${colonneClient}</td>
                        <td>
                            <span class="logement-tag">${res.logement || 'Domaine complet'}</span>
                        </td>
                        <td>
                            Du <strong>${res.dateArrivee}</strong><br>
                            au <strong>${res.dateDepart}</strong>
                            ${motifBloc}
                        </td>
                        <td style="font-size: 0.85rem; color: #475569; max-width: 220px;">
                            ${res.message ? `<em>« ${res.message} »</em>` : '-'}
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
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const usersBody = document.getElementById('admin-users-body');
    if (usersBody) {
        if (utilisateurs.length === 0) {
            usersBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 20px; color:#94a3b8;">Aucun utilisateur inscrit</td></tr>';
        } else {
            usersBody.innerHTML = utilisateurs.map(u => `
                <tr>
                    <td><strong>${u.nom}</strong></td>
                    <td>${u.email}</td>
                    <td>
                        <span class="badge ${u.actif ? 'badge-valide' : 'badge-attente'}">
                            ${u.actif ? 'Vérifié' : 'Non vérifié'}
                        </span>
                    </td>
                    <td>${u.telephone ? `<a href="tel:${u.telephone}">${u.telephone}</a>` : '-'}</td>
                    <td>${new Date(u.dateInscription).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    }
}

// 4. BLOQUER DES DATES MANUELLEMENT (Airbnb, Téléphone, Travaux)
function bloquerDatesManuel(e) {
    e.preventDefault();

    const logement = document.getElementById('blocage-logement').value;
    const dateArrivee = document.getElementById('blocage-arrivee').value;
    const dateDepart = document.getElementById('blocage-depart').value;
    const motif = document.getElementById('blocage-motif').value;

    if (!dateArrivee || !dateDepart) {
        alert("Veuillez renseigner les deux dates.");
        return;
    }

    if (new Date(dateDepart) <= new Date(dateArrivee)) {
        alert("La date de départ doit être postérieure à la date d'arrivée.");
        return;
    }

    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');

    const conflit = reservations.some(r => {
        if (r.statut === 'annulee') return false;

        const memeLogement = (r.logement === logement) || 
                             (r.logement === 'Domaine complet') || 
                             (logement === 'Domaine complet');

        if (!memeLogement) return false;
        return (dateArrivee < r.dateDepart && dateDepart > r.dateArrivee);
    });

    if (conflit) {
        const continuer = confirm("Attention : une réservation ou un blocage actif existe déjà sur ces dates. Voulez-vous forcer le blocage ?");
        if (!continuer) return;
    }

    const nouveauBlocage = {
        id: Date.now(),
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

    reservations.push(nouveauBlocage);
    localStorage.setItem('reservations', JSON.stringify(reservations));

    document.getElementById('form-bloquer-dates').reset();
    chargerDonneesAdmin();

    alert(`Période verrouillée du ${dateArrivee} au ${dateDepart} pour ${logement}. Le calendrier est actualisé.`);
}

// 5. VALIDATION SÉCURISÉE (ANTI-MISSCLICK) & REFUS GUIDÉ
function demanderValidation(id) {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    const messageConfirmation = 
        `Confirmer la réservation de ${res.nom} ?\n\n` +
        `🏠 Logement : ${res.logement || 'Domaine complet'}\n` +
        `📅 Dates : du ${res.dateArrivee} au ${res.dateDepart}\n\n` +
        `👉 Un courriel de confirmation avec consignes sera envoyé à ${res.email}.`;

    if (confirm(messageConfirmation)) {
        executerChangementStatut(id, 'confirmee');
    }
}

function demanderRefus(id) {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    document.getElementById('refus-res-id').value = res.id;
    document.getElementById('refus-recap-text').innerHTML = 
        `Demande de <strong>${res.nom}</strong> pour <strong>${res.logement || 'Domaine complet'}</strong> (du ${res.dateArrivee} au ${res.dateDepart}).`;

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

function confirmerRefusReservation(e) {
    e.preventDefault();
    const id = Number(document.getElementById('refus-res-id').value);
    const motif = document.getElementById('refus-message-client').value.trim();

    if (!motif) {
        alert("Veuillez indiquer un motif avant de valider l'annulation.");
        return;
    }

    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    let reservationRefusee = null;

    reservations = reservations.map(r => {
        if (r.id === id) {
            reservationRefusee = {
                ...r,
                statut: 'annulee',
                motifAnnulation: motif
            };
            return reservationRefusee;
        }
        return r;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    fermerModalRefus();
    chargerDonneesAdmin();

    // Envoi de l'e-mail explicatif au client s'il s'agit d'une vraie réservation client
    if (reservationRefusee && reservationRefusee.source !== 'manuel' && reservationRefusee.email) {
        envoyerEmailRefusClient(reservationRefusee, motif);
    } else {
        alert("La réservation a bien été annulée et le motif consigné.");
    }
}

function executerChangementStatut(id, nouveauStatut) {
    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    let reservationConcernee = null;

    reservations = reservations.map(res => {
        if (res.id === id) {
            reservationConcernee = { ...res, statut: nouveauStatut };
            return reservationConcernee;
        }
        return res;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerDonneesAdmin();

    if (nouveauStatut === 'confirmee' && reservationConcernee && reservationConcernee.source !== 'manuel') {
        envoyerEmailConfirmationClient(reservationConcernee);
    }
}

// 6. MODALE D'ÉDITION DES DÉTAILS DU SÉJOUR
function ouvrirModalEdition(id) {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
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

function sauvegarderDetailsEdition(e) {
    e.preventDefault();
    const id = Number(document.getElementById('edit-res-id').value);
    const nom = document.getElementById('edit-res-nom').value.trim();
    const tel = document.getElementById('edit-res-tel').value.trim();
    const email = document.getElementById('edit-res-email').value.trim();
    const notes = document.getElementById('edit-res-notes').value.trim();

    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    reservations = reservations.map(r => {
        if (r.id === id) {
            return {
                ...r,
                nom: nom || r.nom,
                telephone: tel,
                email: email || r.email,
                message: notes
            };
        }
        return r;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    fermerModalEdition();
    chargerDonneesAdmin();
}

// 7. SUPPRESSION D'UNE ENTRÉE (Déblocage ou retrait du tableau)
function supprimerReservation(id) {
    if (!confirm("Voulez-vous retirer définitivement cette entrée ?")) return;
    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    reservations = reservations.filter(res => res.id !== id);
    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerDonneesAdmin();
}

// 8. ENVOI COURRIELS VIA EMAILJS (TEMPLATE UNIQUE ET DYNAMIQUE)

// A. Validation du séjour
function envoyerEmailConfirmationClient(res) {
    const infosArrivee = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.85rem; color: #475569;">
            📍 <strong>Adresse :</strong> Face à l'église Saint-Sulpice, 62111 Sailly-au-Bois<br>
            🕒 <strong>Horaires :</strong> Arrivée à partir de 16h00 / Départ avant 11h00<br>
            🚗 <strong>Stationnement :</strong> Parking privé gratuit disponible sur place
        </div>
    `;

    const templateParams = {
        email_destinataire: res.email,
        sujet: "Confirmation de votre séjour — Gîte de Sailly-au-Bois 🌿",
        titre_principal: "Réservation confirmée ! 🌿",
        couleur_titre: "#16a34a",
        name: res.nom || "Client",
        message_introduction: "Excellente nouvelle ! Votre demande de séjour a bien été validée par l'hôte. Voici les détails de votre arrivée :",
        logement: res.logement || "Domaine complet",
        date_arrivee: res.dateArrivee,
        date_depart: res.dateDepart,
        bloc_info_supplementaire: infosArrivee,
        lien_action: `${window.location.origin}/mon-compte.html`,
        texte_bouton: "Consulter mon espace client"
    };

    emailjs.send('service_p3hgn5k', 'template_dy98wud', templateParams)
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
    const blocMotif = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.85rem; color: #dc2626;">
            <strong>Motif communiqué par l'hôte :</strong><br>
            <em>« ${motif} »</em>
        </div>
    `;

    const templateParams = {
        email_destinataire: res.email,
        sujet: "Information concernant votre demande de séjour — Gîte de Sailly-au-Bois",
        titre_principal: "Mise à jour de votre séjour",
        couleur_titre: "#dc2626",
        name: res.nom || "Client",
        message_introduction: "Nous vous informons que votre réservation n'a pas pu être retenue ou a dû être annulée :",
        logement: res.logement || "Domaine complet",
        date_arrivee: res.dateArrivee,
        date_depart: res.dateDepart,
        bloc_info_supplementaire: blocMotif,
        lien_action: `${window.location.origin}/mon-compte.html`,
        texte_bouton: "Voir mon espace client"
    };

    emailjs.send('service_p3hgn5k', 'template_dy98wud', templateParams)
        .then(() => {
            alert(`Réservation annulée. Un courriel explicatif a été envoyé à ${res.email}.`);
        })
        .catch(err => {
            console.error("Erreur EmailJS :", err);
            alert("La réservation a été annulée dans le système, mais l'envoi du mail au client a échoué.");
        });
}