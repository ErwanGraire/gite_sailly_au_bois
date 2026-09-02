document.addEventListener('DOMContentLoaded', function() {
    chargerProfilEtReservations();

    // Écouteur pour la photo de profil
    const uploadInput = document.getElementById('upload-photo');
    if (uploadInput) {
        uploadInput.addEventListener('change', gererChangementPhoto);
    }
});

// Récupère l'email propre de l'utilisateur quelle que soit la manière dont il a été stocké
function recupererEmailActif() {
    const raw = localStorage.getItem('utilisateurConnecte');
    if (!raw) return null;

    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && obj.email) {
            return obj.email.trim().toLowerCase();
        }
    } catch (e) {
        // C'était une simple chaîne
    }

    return raw.replace(/['"]+/g, '').trim().toLowerCase();
}

// 1. CHARGEMENT DU PROFIL ET DES SÉJOURS
function chargerProfilEtReservations() {
    const emailConnecte = recupererEmailActif();
    if (!emailConnecte) {
        window.location.href = 'auth.html';
        return;
    }

    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const utilisateur = utilisateurs.find(u => (u.email || '').trim().toLowerCase() === emailConnecte);

    // A. Remplissage des informations du profil
    const inputNom = document.getElementById('edit-nom');
    const inputTel = document.getElementById('edit-tel');
    const textEmail = document.getElementById('user-email');
    const badgeStatut = document.getElementById('status-badge');
    const zoneVerification = document.getElementById('verification-zone');
    const avatar = document.getElementById('user-avatar');

    // Affichage obligatoire de l'adresse email
    if (textEmail) textEmail.textContent = emailConnecte;

    if (utilisateur) {
        if (inputNom) inputNom.value = utilisateur.nom || '';
        if (inputTel) {
            // Empêche d'afficher l'email dans le champ téléphone
            inputTel.value = (utilisateur.telephone && !utilisateur.telephone.includes('@')) ? utilisateur.telephone : '';
        }

        // Avatar
        if (avatar) {
            if (utilisateur.photo) {
                avatar.innerHTML = `<img src="${utilisateur.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
            } else {
                avatar.textContent = (utilisateur.nom || 'U').charAt(0).toUpperCase();
            }
        }

        // Badge de validation du compte
        if (badgeStatut) {
            if (utilisateur.actif) {
                badgeStatut.innerHTML = '<span class="badge badge-valide">Vérifié</span>';
                if (zoneVerification) zoneVerification.style.display = 'none';
            } else {
                badgeStatut.innerHTML = '<span class="badge badge-attente">Non vérifié</span>';
                if (zoneVerification) zoneVerification.style.display = 'block';
            }
        }
    }

    // B. Remplissage des demandes de séjours
    const reservationsToutes = JSON.parse(localStorage.getItem('reservations') || '[]');
    
    // Comparaison insensible aux majuscules/espaces
    const mesReservations = reservationsToutes.filter(r => 
        (r.email || '').trim().toLowerCase() === emailConnecte
    );

    const conteneurListe = document.getElementById('reservations-list');
    if (!conteneurListe) return;

    if (mesReservations.length === 0) {
        conteneurListe.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #777;">
                <p style="font-size: 1.1rem; margin-bottom: 15px;">Vous n'avez aucune demande de séjour pour le moment.</p>
                <a href="index.html#reserver" class="btn btn-hero" style="font-size: 0.9rem; padding: 10px 20px;">
                    Faire une réservation
                </a>
            </div>
        `;
        return;
    }

    conteneurListe.innerHTML = mesReservations.map(res => {
        let badgeClass = 'badge-attente';
        let statutTexte = 'En attente de validation hôte';
        let boutonAction = '';

        if (res.statut === 'confirmee') {
            badgeClass = 'badge-valide';
            statutTexte = 'Validée par l\'hôte';
            boutonAction = `<button class="btn-action btn-annuler" onclick="demanderAnnulation(${res.id})">Annuler le séjour</button>`;
        } else if (res.statut === 'annulee') {
            badgeClass = 'badge-annule';
            statutTexte = 'Séjour annulé';
            boutonAction = `<span style="color: #999; font-size: 0.8rem; font-style: italic;">Dossier clos</span>`;
        } else {
            boutonAction = `<button class="btn-action btn-annuler" onclick="demanderAnnulation(${res.id})">Annuler la demande</button>`;
        }

        let motifBloc = '';
        if (res.motifAnnulation) {
            motifBloc = `
                <div style="margin-top: 10px; background: #fff5f5; border-left: 3px solid #e53e3e; padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; color: #c53030;">
                    <strong>Motif d'annulation :</strong> ${res.motifAnnulation}
                </div>
            `;
        }

        return `
            <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.03);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 12px;">
                    <div>
                        <!-- PASTILLE DU LOGEMENT -->
                        <span style="font-weight: 700; color: var(--primary); background: #edf2e8; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; display: inline-block; margin-bottom: 8px;">
                            ${res.logement || 'Domaine complet (5 logements)'}
                        </span>
                        <h4 style="margin: 0; font-family: var(--serif); font-size: 1.15rem; color: var(--dark);">
                            Du ${res.dateArrivee} au ${res.dateDepart}
                        </h4>
                    </div>
                    <div>
                        <span class="badge ${badgeClass}">${statutTexte}</span>
                    </div>
                </div>

                ${res.message ? `<p style="font-size: 0.9rem; color: #555; margin: 10px 0; background: #f8fafc; padding: 10px; border-radius: 8px;"><em>« ${res.message} »</em></p>` : ''}
                ${motifBloc}

                <div style="margin-top: 15px; text-align: right; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    ${boutonAction}
                </div>
            </div>
        `;
    }).join('');
}

// 2. MODIFICATION DU PROFIL (Nom & Téléphone)
function enregistrerModifications() {
    const emailConnecte = recupererEmailActif();
    const inputNom = document.getElementById('edit-nom').value.trim();
    const inputTel = document.getElementById('edit-tel').value.trim();

    if (!inputNom) {
        afficherMessage('update-message', 'Le nom ne peut pas être vide.', '#c53030');
        return;
    }

    let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    utilisateurs = utilisateurs.map(u => {
        if ((u.email || '').trim().toLowerCase() === emailConnecte) {
            return { ...u, nom: inputNom, telephone: inputTel };
        }
        return u;
    });

    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));
    afficherMessage('update-message', 'Vos informations ont été enregistrées avec succès.', '#2e7d32');
    chargerProfilEtReservations();
}

// 3. CHANGEMENT DE MOT DE PASSE
function changerMotDePasse() {
    const emailConnecte = recupererEmailActif();
    const ancienPass = document.getElementById('old-password').value;
    const nouveauPass = document.getElementById('new-password').value;

    if (!ancienPass || !nouveauPass) {
        afficherMessage('password-message', 'Veuillez renseigner les deux champs.', '#c53030');
        return;
    }

    if (nouveauPass.length < 6) {
        afficherMessage('password-message', 'Le mot de passe doit comporter au moins 6 caractères.', '#c53030');
        return;
    }

    let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const user = utilisateurs.find(u => (u.email || '').trim().toLowerCase() === emailConnecte);

    if (!user || user.password !== ancienPass) {
        afficherMessage('password-message', 'L\'ancien mot de passe est incorrect.', '#c53030');
        return;
    }

    utilisateurs = utilisateurs.map(u => {
        if ((u.email || '').trim().toLowerCase() === emailConnecte) {
            return { ...u, password: nouveauPass };
        }
        return u;
    });

    localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));
    document.getElementById('old-password').value = '';
    document.getElementById('new-password').value = '';
    afficherMessage('password-message', 'Mot de passe mis à jour avec succès.', '#2e7d32');
}

// 4. ANNULATION PAR LE CLIENT
function demanderAnnulation(resId) {
    const motif = prompt("Indiquez la raison de votre annulation pour l'hôte :");
    if (motif === null) return;

    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    reservations = reservations.map(r => {
        if (r.id === resId) {
            return {
                ...r,
                statut: 'annulee',
                motifAnnulation: motif.trim() || 'Annulé par le client'
            };
        }
        return r;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerProfilEtReservations();
    alert("Votre demande d'annulation a été enregistrée.");
}

// 5. UPLOAD DE LA PHOTO DE PROFIL
function gererChangementPhoto(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        const base64Photo = evt.target.result;
        const emailConnecte = recupererEmailActif();
        let utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');

        utilisateurs = utilisateurs.map(u => {
            if ((u.email || '').trim().toLowerCase() === emailConnecte) {
                return { ...u, photo: base64Photo };
            }
            return u;
        });

        localStorage.setItem('utilisateurs', JSON.stringify(utilisateurs));
        chargerProfilEtReservations();
    };
    reader.readAsDataURL(file);
}

// 6. ENVOI DU LIEN DE VALIDATION EMAILJS
function envoyerLienValidation() {
    const emailConnecte = recupererEmailActif();
    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const user = utilisateurs.find(u => (u.email || '').trim().toLowerCase() === emailConnecte);

    if (!user) return;

    const lienValidation = `${window.location.origin}/auth.html?action=valider&token=${user.tokenValidation || 'valid'}`;
    const templateParams = {
        name: user.nom,
        email: user.email,
        lien_validation: lienValidation
    };

    emailjs.send('service_p3hgn5k', 'template_8ng5jpb', templateParams)
        .then(() => {
            alert("Lien de validation envoyé avec succès à " + user.email);
        })
        .catch(err => {
            console.error("Erreur EmailJS:", err);
            alert("Impossible d'envoyer l'e-mail. Vérifiez la configuration EmailJS.");
        });
}

// 7. UTILITAIRES
function afficherMessage(elementId, texte, couleur) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.textContent = texte;
    el.style.color = couleur;
    el.style.display = 'block';
    setTimeout(() => { el.style.display = 'none'; }, 4000);
}

function deconnecter() {
    localStorage.removeItem('utilisateurConnecte');
    window.location.href = 'index.html';
}