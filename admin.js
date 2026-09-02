const ADMIN_CREDENTIALS = {
    email: "admin@gite-sailly.fr",
    password: "Sailly2024"
};

let statutFiltreActif = 'en-attente'; // Onglet actif par défaut pour traiter l'urgent

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

// 3. CHARGEMENT ET TRI DES DONNÉES
function chargerDonneesAdmin() {
    // Calendrier
    if (typeof genererCalendrier === 'function') {
        genererCalendrier();
    }

    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');

    // A. Mise à jour des compteurs d'onglets
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

    // Filtre statut onglet
    if (statutFiltreActif !== 'tous') {
        listeFiltree = listeFiltree.filter(r => r.statut === statutFiltreActif);
    }

    // Filtre type de logement
    if (filtreLogement !== 'tous') {
        listeFiltree = listeFiltree.filter(r => (r.logement || '').includes(filtreLogement));
    }

    // C. Tri chronologique par date d'arrivée
    listeFiltree.sort((a, b) => new Date(a.dateArrivee) - new Date(b.dateArrivee));

    // D. Rendu du tableau
    const resBody = document.getElementById('admin-res-body');
    if (resBody) {
        if (listeFiltree.length === 0) {
            resBody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align:center; padding: 40px; color: #94a3b8;">
                        Aucune réservation dans cette vue.
                    </td>
                </tr>
            `;
        } else {
            resBody.innerHTML = listeFiltree.map(res => {
                let badgeHtml = '';
                let actionsHtml = '';

                // Statut et actions adaptées
                if (res.statut === 'confirmee') {
                    badgeHtml = `<span class="badge badge-valide">● Validée</span>`;
                    actionsHtml = `
                        <button class="btn-action btn-refuser" onclick="modifierStatut(${res.id}, 'annulee')">Annuler</button>
                    `;
                } else if (res.statut === 'annulee') {
                    badgeHtml = `<span class="badge badge-annule">● Annulée</span>`;
                    actionsHtml = `
                        <button class="btn-action btn-suppr" title="Supprimer définitivement" onclick="supprimerReservation(${res.id})">✕ Retirer</button>
                    `;
                } else {
                    badgeHtml = `<span class="badge badge-attente">● À traiter</span>`;
                    actionsHtml = `
                        <button class="btn-action btn-valider" onclick="modifierStatut(${res.id}, 'confirmee')">Valider</button>
                        <button class="btn-action btn-refuser" onclick="modifierStatut(${res.id}, 'annulee')">Refuser</button>
                    `;
                }

                let motifBloc = '';
                if (res.motifAnnulation) {
                    motifBloc = `
                        <div style="font-size: 0.75rem; color: #dc2626; margin-top: 4px;">
                            <strong>Motif :</strong> ${res.motifAnnulation}
                        </div>
                    `;
                }

                return `
                    <tr>
                        <td>
                            <strong>${res.nom}</strong><br>
                            <small style="color: #64748b;">${res.email}</small>
                        </td>
                        <td>
                            <span class="logement-tag">${res.logement || 'Domaine complet'}</span>
                        </td>
                        <td>
                            Du <strong>${res.dateArrivee}</strong><br>
                            au <strong>${res.dateDepart}</strong>
                            ${motifBloc}
                        </td>
                        <td style="font-size: 0.85rem; color: #475569; max-width: 200px;">
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

    // E. Utilisateurs inscrits
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

// 4. ACTIONS SUR LES RÉSERVATIONS
function modifierStatut(id, nouveauStatut) {
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

    if (nouveauStatut === 'confirmee' && reservationConcernee) {
        envoyerEmailConfirmationClient(reservationConcernee);
    }
}

function supprimerReservation(id) {
    if (!confirm("Voulez-vous supprimer définitivement cette réservation de la liste ?")) return;
    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    reservations = reservations.filter(res => res.id !== id);
    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerDonneesAdmin();
}

// 5. ENVOI EMAIL DE CONFIRMATION
function envoyerEmailConfirmationClient(res) {
    const templateParams = {
        name: res.nom || 'Client',
        email: res.email,
        logement: res.logement || 'Domaine complet (5 logements)',
        date_arrivee: res.dateArrivee,
        date_depart: res.dateDepart,
        lien_compte: `${window.location.origin}/mon-compte.html`
    };

    emailjs.send('service_p3hgn5k', 'template_dy98wud', templateParams)
        .then(() => {
            alert(`✅ Réservation validée et e-mail envoyé à ${res.email}.`);
        })
        .catch(err => {
            console.error("Erreur EmailJS:", err);
            alert("Réservation validée, mais erreur lors de l'envoi de l'email.");
        });
}