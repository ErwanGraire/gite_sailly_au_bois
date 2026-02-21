// CONFIGURATION DE TES ACCÈS
const ADMIN_CREDENTIALS = {
    email: "admin@gite-sailly.fr",
    password: "Sailly2024"
};

document.addEventListener('DOMContentLoaded', function() {
    verifierSessionAdmin();
});

// 1. GESTION DE LA CONNEXION
function verifierSessionAdmin() {
    const isAuth = localStorage.getItem('sessionAdminActive') === 'true';
    const overlay = document.getElementById('admin-login-overlay');

    if (isAuth) {
        if (overlay) overlay.style.display = 'none';
        chargerDonneesAdmin();
    }
}

function tentativeConnexionAdmin() {
    const emailSaisi = document.getElementById('admin-email').value;
    const passSaisi = document.getElementById('admin-password').value;
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

// 2. GESTION DU TABLEAU DE BORD
// --- Dans admin.js ---
function chargerDonneesAdmin() {
    // 1. Chargement et affichage des UTILISATEURS
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const usersBody = document.getElementById('admin-users-body');

    if (usersBody) {
        usersBody.innerHTML = utilisateurs.map(u => `
            <tr>
                <td>${u.nom}</td>
                <td>${u.email}</td>
                <td>
                    <span class="badge ${u.actif ? 'badge-valide' : 'badge-annule'}">
                        ${u.actif ? 'Actif' : 'Non vérifié'}
                    </span>
                </td>
                <td><a href="tel:${u.telephone || ''}">${u.telephone || '-'}</a></td>
                <td>${new Date(u.dateInscription).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    // 2. Chargement et affichage des RÉSERVATIONS
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const resBody = document.getElementById('admin-res-body');

    if (!resBody) return;

    // Si aucune réservation n'existe
    if (reservations.length === 0) {
        resBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Aucune demande pour le moment</td></tr>';
        return;
    }

    // Génération des lignes du tableau
    resBody.innerHTML = reservations.map(res => {
        let badgeClass = 'badge-attente';
        let statutTexte = 'En attente';
        let ligneMotif = '';

        // Gestion des badges selon le statut
        if (res.statut === 'confirmee') {
            badgeClass = 'badge-valide';
            statutTexte = 'Validée';
        } else if (res.statut === 'annulee') {
            badgeClass = 'badge-annule';
            statutTexte = 'Annulée';
        }

        // AJOUT : Affichage du motif si le client a annulé
        if (res.motifAnnulation) {
            ligneMotif = `
                <div style="margin-top: 8px; color: #c62828; font-size: 0.8rem; background: #ffebee; padding: 8px; border-radius: 6px; border-left: 3px solid #c62828;">
                    <strong>Motif d'annulation :</strong><br>
                    "${res.motifAnnulation}"
                </div>
            `;
        }

        return `
            <tr>
                <td><strong>${res.nom}</strong><br><small>${res.email}</small></td>
                <td>
                    Du ${res.dateArrivee} au ${res.dateDepart}
                    ${ligneMotif}
                </td>
                <td style="font-size: 0.85rem; color: #666;">${res.message || '-'}</td>
                <td><span class="badge ${badgeClass}">${statutTexte}</span></td>
                <td>
                    <button class="btn-action btn-valider" onclick="modifierStatut(${res.id}, 'confirmee')">Valider</button>
                    <button class="btn-action btn-annuler" onclick="modifierStatut(${res.id}, 'annulee')">Refuser/Annuler</button>
                </td>
            </tr>
        `;
    }).join('');
}

// Changer le statut d'une réservation
function modifierStatut(id, nouveauStatut) {
    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');

    reservations = reservations.map(res => {
        if (res.id === id) {
            return { ...res, statut: nouveauStatut };
        }
        return res;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerDonneesAdmin();
    alert('Statut mis à jour ! Le client le verra sur son compte.');
}