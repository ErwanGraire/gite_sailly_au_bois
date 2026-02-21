document.addEventListener('DOMContentLoaded', function() {
    const utilisateur = obtenirUtilisateurConnecte(); // Récupéré depuis auth-utils.js

    if (!utilisateur) {
        window.location.href = 'auth.html';
        return;
    }

    // 1. DÉTECTION DU LIEN DE VALIDATION (TOKEN)
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    if (token) {
        validerCompteViaLien(token);
    }

    // 2. REMPLISSAGE DES INFOS DU PROFIL
    document.getElementById('edit-nom').value = utilisateur.nom;
    document.getElementById('edit-tel').value = utilisateur.telephone || '';
    document.getElementById('user-email').textContent = utilisateur.email;

    // Charger le visuel de l'avatar (Photo ou Initiale)
    mettreAJourVisuelAvatar(utilisateur);

    // Afficher le statut de vérification (Badge)
    rafraichirAffichageStatut();

    // 3. CHARGEMENT DES RÉSERVATIONS
    afficherReservations(utilisateur.email);

    // 4. ÉCOUTEUR POUR LE CHANGEMENT DE PHOTO
    const photoInput = document.getElementById('upload-photo');
    if (photoInput) {
        photoInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            if (file.size > 500000) {
                alert("L'image est trop lourde (max 500 Ko).");
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                sauvegarderPhoto(event.target.result);
            };
            reader.readAsDataURL(file);
        });
    }
});

// --- GESTION DU STATUT DE VÉRIFICATION (LIEN) ---
function rafraichirAffichageStatut() {
    const user = obtenirUtilisateurConnecte();
    const badge = document.getElementById('status-badge');
    const zone = document.getElementById('verification-zone');
    if (!badge || !zone) return;

    if (user.actif) {
        badge.innerHTML = `<small style="background: #e8f5e9; color: #2e7d32;">Vérifié ✅</small>`;
        zone.style.display = 'none';
    } else {
        badge.innerHTML = `<small style="background: #ffebee; color: #c62828;">Non vérifié ⏳</small>`;
        zone.style.display = 'block';
    }
}

// --- Dans mon-compte.js, remplacez la fonction envoyerLienValidation ---

async function envoyerLienValidation() {
    const user = obtenirUtilisateurConnecte();
    const btn = document.querySelector("#verification-zone button");

    if (!user) return;

    // 1. Génération du lien de validation
    const token = btoa(user.email);
    const lien = window.location.origin + window.location.pathname + "?token=" + token;

    btn.textContent = "⏳ Envoi en cours...";
    btn.disabled = true;

    // 2. Paramètres envoyés à EmailJS
    // Assurez-vous que ces noms correspondent à vos {{ }} sur EmailJS
    const templateParams = {
        name: user.nom,
        time: new Date().toLocaleString('fr-FR'),
        lien_validation: lien, // <--- C'est cette variable qu'il faut utiliser
        message: "Merci de valider votre inscription pour profiter pleinement de notre Gîte."
    };

    // 3. Envoi via EmailJS
    emailjs.send('service_p3hgn5k', 'template_8ng5jpb', templateParams)
        .then(function() {
            alert("✅ Email envoyé avec le lien de validation !");
            btn.textContent = "Email envoyé";
        }, function(error) {
            console.error("Erreur EmailJS:", error);
            alert("❌ Échec de l'envoi.");
            btn.disabled = false;
        });
}

function validerCompteViaLien(token) {
    try {
        const emailAValider = atob(token);
        let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
        const session = obtenirUtilisateurConnecte();

        utilisateurs = utilisateurs.map(u => {
            if (u.email === emailAValider) return { ...u, actif: true };
            return u;
        });
        localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

        if (session && session.email === emailAValider) {
            session.actif = true;
            localStorage.setItem('utilisateurConnecte', JSON.stringify(session));
            alert("✅ Votre compte a été validé avec succès !");
            window.history.replaceState({}, document.title, window.location.pathname);
            rafraichirAffichageStatut();
        }
    } catch(e) { console.error("Token invalide"); }
}

// --- GESTION DE LA PHOTO DE PROFIL ---
function mettreAJourVisuelAvatar(user) {
    const avatarDiv = document.getElementById('user-avatar');
    if (!avatarDiv) return;

    if (user.photo) {
        avatarDiv.style.backgroundImage = `url(${user.photo})`;
        avatarDiv.textContent = '';
    } else {
        avatarDiv.style.backgroundImage = 'none';
        avatarDiv.textContent = user.nom.charAt(0).toUpperCase();
    }
}

function sauvegarderPhoto(imageString) {
    const session = obtenirUtilisateurConnecte();
    const utilisateurMaj = { ...session, photo: imageString };

    localStorage.setItem('utilisateurConnecte', JSON.stringify(utilisateurMaj));

    let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    utilisateurs = utilisateurs.map(u => {
        if (u.email === session.email) return { ...u, photo: imageString };
        return u;
    });
    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

    mettreAJourVisuelAvatar(utilisateurMaj);
}

// --- GESTION DES RÉSERVATIONS ---
function afficherReservations(emailUser) {
    const list = document.getElementById('reservations-list');
    const data = JSON.parse(localStorage.getItem('reservations') || '[]');
    const mesRes = data.filter(r => r.email === emailUser);

    if (mesRes.length === 0) {
        list.innerHTML = `<p class="no-res">Vous n'avez pas encore de séjour réservé.</p>`;
        return;
    }

    list.innerHTML = '';
    mesRes.forEach(res => {
        let statutTexte = 'En attente';
        let statutClasse = 'status-pending';
        let boutonAnnulation = '';

        if (res.statut === 'confirmee') {
            statutTexte = 'Validée';
            statutClasse = 'status-confirmed';
        } else if (res.statut === 'annulee') {
            statutTexte = 'Annulée';
            statutClasse = 'status-rejected';
        }

        if (res.statut !== 'annulee') {
            boutonAnnulation = `
                <div style="margin-top: 15px; border-top: 1px dashed #eee; padding-top: 10px;">
                    <button onclick="document.getElementById('area-${res.id}').style.display='block'" class="btn-small-link">Annuler ce séjour</button>
                    <div id="area-${res.id}" style="display:none; margin-top:10px;">
                        <textarea id="motif-${res.id}" placeholder="Motif de l'annulation..." style="width:100%; border:1px solid #ddd; border-radius:5px; padding:8px; font-family:inherit; font-size:0.8rem;"></textarea>
                        <button onclick="annulerSejour(${res.id})" class="btn-logout" style="padding: 5px 12px; font-size: 0.8rem; width: auto; margin-top: 5px; border-color: #c33;">Confirmer l'annulation</button>
                    </div>
                </div>`;
        }

        list.innerHTML += `
            <div class="res-item" style="flex-direction: column; align-items: flex-start; padding: 20px; border-bottom: 1px solid #eee;">
                <div style="display: flex; justify-content: space-between; width: 100%; align-items: center;">
                    <div>
                        <strong style="display: block; font-size: 1.1rem;">Séjour Gîte Sailly</strong>
                        <span style="color: #666;">Du ${res.dateArrivee} au ${res.dateDepart}</span>
                    </div>
                    <span class="res-status ${statutClasse}">${statutTexte}</span>
                </div>
                ${boutonAnnulation}
            </div>`;
    });
}

function annulerSejour(id) {
    const motif = document.getElementById(`motif-${id}`).value;
    if (motif.length < 5) return alert("Merci de préciser un motif (5 caractères min).");

    if (confirm("Voulez-vous vraiment annuler ce séjour ?")) {
        let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
        reservations = reservations.map(res => {
            if (res.id === id) return { ...res, statut: 'annulee', motifAnnulation: motif };
            return res;
        });
        localStorage.setItem('reservations', JSON.stringify(reservations));
        location.reload();
    }
}

// --- MODIFICATIONS DU PROFIL ---
function enregistrerModifications() {
    const nouveauNom = document.getElementById('edit-nom').value.trim();
    const nouveauTel = document.getElementById('edit-tel').value.trim();
    const session = obtenirUtilisateurConnecte();

    if (nouveauNom.length < 2) return alert("Le nom est trop court.");

    let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    utilisateurs = utilisateurs.map(u => {
        if (u.email === session.email) return { ...u, nom: nouveauNom, telephone: nouveauTel };
        return u;
    });
    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

    const utilisateurMaj = { ...session, nom: nouveauNom, telephone: nouveauTel };
    localStorage.setItem('utilisateurConnecte', JSON.stringify(utilisateurMaj));

    mettreAJourVisuelAvatar(utilisateurMaj);
    if (typeof mettreAJourNavbar === 'function') mettreAJourNavbar();
    alert("✅ Vos informations ont été mises à jour !");
}

// --- CHANGEMENT DE MOT DE PASSE ---
function changerMotDePasse() {
    const oldPass = document.getElementById('old-password').value;
    const newPass = document.getElementById('new-password').value;
    const session = obtenirUtilisateurConnecte();

    let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const userIndex = utilisateurs.findIndex(u => u.email === session.email);

    if (btoa(oldPass) !== utilisateurs[userIndex].password) return alert("L'ancien mot de passe est incorrect.");
    if (newPass.length < 6) return alert("Le nouveau mot de passe doit faire au moins 6 caractères.");

    utilisateurs[userIndex].password = btoa(newPass);
    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));

    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    alert("✅ Votre mot de passe a été modifié avec succès !");
}