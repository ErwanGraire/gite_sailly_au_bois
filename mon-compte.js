let filtreActifClient = 'validees';

document.addEventListener('DOMContentLoaded', function() {
    chargerProfilEtReservations();

    const uploadInput = document.getElementById('upload-photo');
    if (uploadInput) {
        uploadInput.addEventListener('change', gererChangementPhoto);
    }
});

function recupererEmailActif() {
    const raw = localStorage.getItem('utilisateurConnecte');
    if (!raw) return null;

    try {
        const obj = JSON.parse(raw);
        if (obj && typeof obj === 'object' && obj.email) {
            return obj.email.trim().toLowerCase();
        }
    } catch (e) {}

    return raw.replace(/['"]+/g, '').trim().toLowerCase();
}

function changerFiltreClient(onglet) {
    filtreActifClient = onglet;
    document.querySelectorAll('.client-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === onglet);
    });
    chargerProfilEtReservations();
}

// 1. CHARGEMENT DU PROFIL ET DES SÉJOURS ORGANISÉS
function chargerProfilEtReservations() {
    const emailConnecte = recupererEmailActif();
    if (!emailConnecte) {
        window.location.href = 'auth.html';
        return;
    }

    const utilisateurs = JSON.parse(localStorage.getItem('utilisateurs') || '[]');
    const utilisateur = utilisateurs.find(u => (u.email || '').trim().toLowerCase() === emailConnecte);

    // Profil
    const inputNom = document.getElementById('edit-nom');
    const inputTel = document.getElementById('edit-tel');
    const textEmail = document.getElementById('user-email');
    const badgeStatut = document.getElementById('status-badge');
    const zoneVerification = document.getElementById('verification-zone');
    const avatar = document.getElementById('user-avatar');

    if (textEmail) textEmail.textContent = emailConnecte;

    if (utilisateur) {
        if (inputNom) inputNom.value = utilisateur.nom || '';
        if (inputTel) {
            inputTel.value = (utilisateur.telephone && !utilisateur.telephone.includes('@')) ? utilisateur.telephone : '';
        }
        if (avatar) {
            if (utilisateur.photo) {
                avatar.innerHTML = `<img src="${utilisateur.photo}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" alt="Avatar">`;
            } else {
                avatar.textContent = (utilisateur.nom || 'U').charAt(0).toUpperCase();
            }
        }
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

    // Réservations de l'utilisateur
    const reservationsToutes = JSON.parse(localStorage.getItem('reservations') || '[]');
    const mesReservations = reservationsToutes.filter(r => 
        (r.email || '').trim().toLowerCase() === emailConnecte
    );

    // Tri par date d'arrivée la plus proche
    mesReservations.sort((a, b) => new Date(a.dateArrivee) - new Date(b.dateArrivee));

    // Comptage des onglets
    const tabValidees = mesReservations.filter(r => r.statut === 'confirmee');
    const tabAttente = mesReservations.filter(r => r.statut === 'en-attente');
    const tabHistorique = mesReservations.filter(r => r.statut === 'annulee');

    const cVal = document.getElementById('client-count-validees');
    const cAtt = document.getElementById('client-count-attente');
    const cHist = document.getElementById('client-count-historique');
    if (cVal) cVal.textContent = tabValidees.length;
    if (cAtt) cAtt.textContent = tabAttente.length;
    if (cHist) cHist.textContent = tabHistorique.length;

    // Sélection selon onglet actif
    let listeAffichee = [];
    if (filtreActifClient === 'validees') listeAffichee = tabValidees;
    else if (filtreActifClient === 'attente') listeAffichee = tabAttente;
    else listeAffichee = tabHistorique;

    const conteneurListe = document.getElementById('reservations-list');
    if (!conteneurListe) return;

    if (listeAffichee.length === 0) {
        conteneurListe.innerHTML = `
            <div style="text-align:center; padding: 40px 20px; color: #94a3b8; background: white; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <p style="margin: 0; font-size: 0.95rem;">Aucune réservation dans cette catégorie.</p>
            </div>
        `;
        return;
    }

    conteneurListe.innerHTML = listeAffichee.map(res => {
        const estValidee = res.statut === 'confirmee';
        const estAnnulee = res.statut === 'annulee';

        let badgeHtml = '';
        let boutonAction = '';
        let boutonInfos = '';

        if (estValidee) {
            badgeHtml = `<span class="badge badge-valide">● Séjour confirmé</span>`;
            boutonInfos = `<button class="btn-action" style="background:#0f172a; color:white;" onclick="ouvrirModalSejour(${res.id})">🗝️ Consignes & Arrivée</button>`;
            boutonAction = `<button class="btn-action btn-annuler" onclick="demanderAnnulation(${res.id})">Annuler le séjour</button>`;
        } else if (estAnnulee) {
            badgeHtml = `<span class="badge badge-annule">● Annulée</span>`;
            boutonAction = `<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">Dossier clos</span>`;
        } else {
            badgeHtml = `<span class="badge badge-attente">● En attente de validation</span>`;
            boutonAction = `<button class="btn-action btn-annuler" onclick="demanderAnnulation(${res.id})">Annuler la demande</button>`;
        }

        let motifBloc = '';
        if (res.motifAnnulation) {
            motifBloc = `
                <div style="margin-top: 10px; background: #fef2f2; border-left: 3px solid #dc2626; padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; color: #b91c1c;">
                    <strong>Motif :</strong> ${res.motifAnnulation}
                </div>
            `;
        }

        return `
            <div class="card-sejour">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                    <div>
                        <span style="font-weight: 700; color: #2f855a; background: #eaf3ea; padding: 4px 10px; border-radius: 16px; font-size: 0.8rem; display: inline-block; margin-bottom: 6px;">
                            ${res.logement || 'Domaine complet'}
                        </span>
                        <h4 style="margin: 0; font-family: var(--serif); font-size: 1.1rem; color: #1e293b;">
                            Du ${res.dateArrivee} au ${res.dateDepart}
                        </h4>
                    </div>
                    <div>${badgeHtml}</div>
                </div>

                ${res.message ? `<p style="font-size: 0.85rem; color: #64748b; margin: 8px 0; background: #f8fafc; padding: 8px 12px; border-radius: 6px;"><em>« ${res.message} »</em></p>` : ''}
                ${motifBloc}

                <div style="margin-top: 14px; display: flex; justify-content: flex-end; align-items: center; gap: 8px; border-top: 1px solid #f1f5f9; padding-top: 12px;">
                    ${boutonInfos}
                    ${boutonAction}
                </div>
            </div>
        `;
    }).join('');
}

// 2. MODALE DÉTAILS, CONSIGNES & CONTACT HÔTE
function ouvrirModalSejour(id) {
    const reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    const res = reservations.find(r => r.id === id);
    if (!res) return;

    document.getElementById('modal-logement-titre').textContent = `Modalités — ${res.logement || 'Domaine complet'}`;

    const contenu = document.getElementById('modal-sejour-contenu');
    contenu.innerHTML = `
        <div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 0.9rem;">
            <p style="margin: 3px 0;"><strong>Dates réservées :</strong> Du ${res.dateArrivee} au ${res.dateDepart}</p>
            <p style="margin: 3px 0;"><strong>Hébergement :</strong> ${res.logement || 'Domaine complet'}</p>
        </div>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">📍 Adresse & Accès</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0; line-height: 1.5;">
            Gîte de Sailly-au-Bois<br>
            Face à l'église Saint-Sulpice, 62111 Sailly-au-Bois<br>
            🚗 Stationnement gratuit disponible sur place.
        </p>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">🕒 Horaires</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0;">
            • <strong>Arrivée :</strong> à partir de 16h00<br>
            • <strong>Départ :</strong> avant 11h00
        </p>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">🔑 Accès autonome / Clés</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0;">
            Une boîte à clés sécurisée est située à l'entrée de votre logement.<br>
            Le code d'accès vous est transmis par SMS ou message la veille de votre arrivée.
        </p>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 6px; margin-bottom: 18px;">
            <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: #065f46;">📞 Contacter l'hôte</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #047857; line-height: 1.6;">
                Une question sur votre séjour ou une arrivée tardive ?<br>
                Téléphone : <a href="tel:0600000000" style="color: inherit; font-weight: bold; text-decoration: underline;">06 00 00 00 00</a><br>
                Email : <a href="mailto:admin@gite-sailly.fr" style="color: inherit; font-weight: bold; text-decoration: underline;">admin@gite-sailly.fr</a>
            </p>
        </div>
    `;

    document.getElementById('modal-details-sejour').style.display = 'flex';
}

function fermerModalSejour() {
    document.getElementById('modal-details-sejour').style.display = 'none';
}

// 3. MODIFICATION DU PROFIL
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

// 4. CHANGEMENT DE MOT DE PASSE
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

// 5. ANNULATION PAR LE CLIENT AVEC ALERTE HÔTE
function demanderAnnulation(resId) {
    const motif = prompt("Indiquez la raison de votre annulation pour l'hôte :");
    if (motif === null) return;

    let reservations = JSON.parse(localStorage.getItem('reservations') || '[]');
    let resAnnulee = null;

    reservations = reservations.map(r => {
        if (r.id === resId) {
            resAnnulee = {
                ...r,
                statut: 'annulee',
                motifAnnulation: motif.trim() || 'Annulé par le client'
            };
            return resAnnulee;
        }
        return r;
    });

    localStorage.setItem('reservations', JSON.stringify(reservations));
    chargerProfilEtReservations();

    if (resAnnulee) {
        envoyerAlerteAnnulationHote(resAnnulee);
    }
}

function envoyerAlerteAnnulationHote(res) {
    const blocMotif = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.85rem; color: #ea580c;">
            <strong>Motif indiqué par le client :</strong><br>
            <em>« ${res.motifAnnulation} »</em>
        </div>
    `;

    const templateParams = {
        email_destinataire: "admin@gite-sailly.fr",
        sujet: `🔔 Annulation séjour : ${res.nom} — ${res.logement || 'Domaine complet'}`,
        titre_principal: "Un séjour a été annulé",
        couleur_titre: "#ea580c",
        name: "Propriétaire",
        message_introduction: `Le client <strong>${res.nom}</strong> (${res.email}) a annulé sa réservation. Les dates ont été automatiquement libérées sur le calendrier :`,
        logement: res.logement || "Domaine complet",
        date_arrivee: res.dateArrivee,
        date_depart: res.dateDepart,
        bloc_info_supplementaire: blocMotif,
        lien_action: `${window.location.origin}/admin.html`,
        texte_bouton: "Consulter le planning"
    };

    emailjs.send('service_p3hgn5k', 'template_dy98wud', templateParams)
        .then(() => {
            alert("Votre séjour a bien été annulé. L'hôte en a été notifié par courriel.");
        })
        .catch(err => {
            console.error("Erreur EmailJS :", err);
            alert("Votre annulation a été enregistrée sur votre espace.");
        });
}

// 6. PHOTO DE PROFIL
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

// 7. LIEN DE VALIDATION
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

// 8. UTILITAIRES
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