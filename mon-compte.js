let filtreActifClient = 'validees';
let dernierEmailCompte = 0;
const DELAI_EMAIL_COMPTE_MS = 10000;

document.addEventListener('DOMContentLoaded', function() {
    window.firebaseAuthReady.then(() => {
        chargerProfilEtReservations();
        const uploadInput = document.getElementById('upload-photo');
        if (uploadInput) uploadInput.addEventListener('change', gererChangementPhoto);
    }).catch(error => {
        console.error('Impossible de charger la session du compte:', error);
        alert('Impossible de vérifier votre session. Veuillez réessayer.');
    });
});

function recupererEmailActif() {
    const utilisateur = obtenirUtilisateurConnecte();
    const email = utilisateur && utilisateur.email;
    return typeof email === 'string' && estEmailValide(email) ? email.trim().toLowerCase() : null;
}

function changerFiltreClient(onglet) {
    filtreActifClient = onglet;
    document.querySelectorAll('.client-tab').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === onglet);
    });
    chargerProfilEtReservations();
}

// 1. CHARGEMENT DU PROFIL ET DES SÉJOURS ORGANISÉS
async function chargerProfilEtReservations() {
    try {
        await window.firebaseAuthReady;
    } catch (error) {
        console.error('Impossible de vérifier la session Firebase:', error);
        alert('Impossible de charger votre compte. Veuillez réessayer.');
        return;
    }

    const utilisateurFirebase = window.firebaseAuth.currentUser;
    const emailConnecte = recupererEmailActif();
    if (!emailConnecte || !utilisateurFirebase) {
        window.location.href = 'auth.html';
        return;
    }

    let profil = {};
    let mesReservations = [];
    try {
        const [{ db }, firestoreSdk] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
        const [profilSnapshot, reservationsSnapshot] = await Promise.all([
            firestoreSdk.getDoc(firestoreSdk.doc(db, 'users', utilisateurFirebase.uid)),
            firestoreSdk.getDocs(firestoreSdk.query(
                firestoreSdk.collection(db, 'reservations'),
                firestoreSdk.where('email', '==', emailConnecte)
            ))
        ]);
        if (profilSnapshot.exists()) profil = profilSnapshot.data();
        mesReservations = reservationsSnapshot.docs.map(reservationDoc => ({
            ...reservationDoc.data(),
            id: reservationDoc.id
        }));
    } catch (error) {
        console.error('Impossible de charger le profil ou les réservations Firestore:', error);
        alert('Impossible de charger vos informations ou réservations. Veuillez réessayer.');
        return;
    }
    const utilisateur = {
        ...profil,
        nom: profil.nomComplet || [profil.prenom, profil.nom].filter(Boolean).join(' '),
        email: utilisateurFirebase.email,
        emailVerified: utilisateurFirebase.emailVerified
    };
    window.actualiserProfilFirebase(utilisateur);

    // Profil
    const inputNom = document.getElementById('edit-nom');
    const inputTel = document.getElementById('edit-tel');
    const textEmail = document.getElementById('user-email');
    const badgeStatut = document.getElementById('status-badge');
    const zoneVerification = document.getElementById('verification-zone');
    const avatar = document.getElementById('user-avatar');

    if (textEmail) textEmail.textContent = emailConnecte;

    if (utilisateur) {
        if (inputNom)         inputNom.value = typeof utilisateur.nom === 'string' ? utilisateur.nom : '';
        if (inputTel) {
            inputTel.value = (typeof utilisateur.telephone === 'string' && !utilisateur.telephone.includes('@')) ? utilisateur.telephone : '';
        }
        if (avatar) {
            if (typeof utilisateur.photo === 'string' &&
                utilisateur.photo.length <= 1400000 &&
                /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(utilisateur.photo)) {
                const image = document.createElement('img');
                image.src = utilisateur.photo;
                image.style.cssText = 'width:100%; height:100%; border-radius:50%; object-fit:cover;';
                image.alt = 'Avatar';
                avatar.replaceChildren(image);
            } else {
                avatar.textContent = (typeof utilisateur.nom === 'string' && utilisateur.nom ? utilisateur.nom : 'U').charAt(0).toUpperCase();
            }
        }
        if (badgeStatut) {
            if (utilisateur.emailVerified) {
                badgeStatut.innerHTML = '<span class="badge badge-valide">Vérifié</span>';
                if (zoneVerification) zoneVerification.style.display = 'none';
            } else {
                badgeStatut.innerHTML = '<span class="badge badge-attente">Non vérifié</span>';
                if (zoneVerification) zoneVerification.style.display = 'block';
            }
        }
    }

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
        const reservationId = typeof res.id === 'string' ? res.id : '';
        const reservationIdPourClic = echapperHTML(
            reservationId.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
        );
        const idValide = reservationId.length > 0;
        const logement = echapperHTML(res.logement || 'Domaine complet');
        const dateArrivee = echapperHTML(res.dateArrivee || '');
        const dateDepart = echapperHTML(res.dateDepart || '');
        const message = echapperHTML(res.message || '');
        const estValidee = res.statut === 'confirmee';
        const estAnnulee = res.statut === 'annulee';

        let badgeHtml = '';
        let boutonAction = '';
        let boutonInfos = '';

        if (estValidee) {
            badgeHtml = `<span class="badge badge-valide">● Séjour confirmé</span>`;
            boutonInfos = idValide ? `<button class="btn-action" style="background:#0f172a; color:white;" onclick="ouvrirModalSejour('${reservationIdPourClic}')">🗝️ Consignes & Arrivée</button>` : '';
            boutonAction = idValide ? `<button class="btn-action btn-annuler" onclick="demanderAnnulation('${reservationIdPourClic}')">Annuler le séjour</button>` : '';
        } else if (estAnnulee) {
            badgeHtml = `<span class="badge badge-annule">● Annulée</span>`;
            boutonAction = `<span style="color: #94a3b8; font-size: 0.8rem; font-style: italic;">Dossier clos</span>`;
        } else {
            badgeHtml = `<span class="badge badge-attente">● En attente de validation</span>`;
            boutonAction = idValide ? `<button class="btn-action btn-annuler" onclick="demanderAnnulation('${reservationIdPourClic}')">Annuler la demande</button>` : '';
        }

        let motifBloc = '';
        if (res.motifAnnulation) {
            motifBloc = `
                <div style="margin-top: 10px; background: #fef2f2; border-left: 3px solid #dc2626; padding: 8px 12px; border-radius: 4px; font-size: 0.85rem; color: #b91c1c;">
                    <strong>Motif :</strong> ${echapperHTML(res.motifAnnulation)}
                </div>
            `;
        }

        return `
            <div class="card-sejour">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-bottom: 10px;">
                    <div>
                        <span style="font-weight: 700; color: #2f855a; background: #eaf3ea; padding: 4px 10px; border-radius: 16px; font-size: 0.8rem; display: inline-block; margin-bottom: 6px;">
                            ${logement}
                        </span>
                        <h4 style="margin: 0; font-family: var(--serif); font-size: 1.1rem; color: #1e293b;">
                            Du ${dateArrivee} au ${dateDepart}
                        </h4>
                    </div>
                    <div>${badgeHtml}</div>
                </div>

                ${message ? `<p style="font-size: 0.85rem; color: #64748b; margin: 8px 0; background: #f8fafc; padding: 8px 12px; border-radius: 6px;"><em>« ${message} »</em></p>` : ''}
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
async function ouvrirModalSejour(id) {
    let res;
    try {
        const [{ db }, firestoreSdk] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
        const reservationSnapshot = await firestoreSdk.getDoc(
            firestoreSdk.doc(db, 'reservations', id)
        );
        if (!reservationSnapshot.exists()) {
            alert('Cette réservation est introuvable.');
            return;
        }
        res = reservationSnapshot.data();
    } catch (error) {
        console.error('Impossible de charger les détails de la réservation:', error);
        alert('Impossible de charger les détails du séjour. Veuillez réessayer.');
        return;
    }

    document.getElementById('modal-logement-titre').textContent =
        `Modalités — ${res.logement || 'Domaine complet'}`;

    const contenu = document.getElementById('modal-sejour-contenu');
    contenu.innerHTML = `
        <div style="background: #f8fafc; border-radius: 10px; padding: 14px; margin-bottom: 18px; font-size: 0.9rem;">
            <p style="margin: 3px 0;"><strong>Dates réservées :</strong> Du ${echapperHTML(res.dateArrivee || '')} au ${echapperHTML(res.dateDepart || '')}</p>
            <p style="margin: 3px 0;"><strong>Hébergement :</strong> ${echapperHTML(res.logement || 'Domaine complet')}</p>
        </div>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">📍 Adresse & Accès</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0; line-height: 1.5;">
            Une étape à Sailly-Au-Bois<br>
            Face à l'église Saint-Sulpice, 62111 Sailly-au-Bois<br>
            🚗 Stationnement gratuit disponible sur place.
        </p>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">🕒 Horaires</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0;">
            • <strong>Arrivée :</strong> à partir de 17h00<br>
            • <strong>Départ :</strong> avant 10h00
        </p>

        <h4 style="margin: 0 0 10px 0; font-size: 0.95rem; color: #0f172a;">🔑 Remise des clés</h4>
        <p style="font-size: 0.88rem; color: #475569; margin: 0 0 14px 0;">
            Les clés sont à récupérer directement auprès du propriétaire à votre arrivée.
        </p>

        <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; border-radius: 6px; margin-bottom: 18px;">
            <h4 style="margin: 0 0 6px 0; font-size: 0.9rem; color: #065f46;">📞 Contacter l'hôte</h4>
            <p style="margin: 0; font-size: 0.85rem; color: #047857; line-height: 1.6;">
                Une question sur votre séjour ou une arrivée tardive ?<br>
                Téléphone : <a href="tel:0681738043" style="color: inherit; font-weight: bold; text-decoration: underline;">06 81 73 80 43</a><br>
                Email : <a href="mailto:gitesailly@gmail.com" style="color: inherit; font-weight: bold; text-decoration: underline;">gitesailly@gmail.com</a>
            </p>
        </div>
    `;

    document.getElementById('modal-details-sejour').style.display = 'flex';
}

function fermerModalSejour() {
    document.getElementById('modal-details-sejour').style.display = 'none';
}

// 3. MODIFICATION DU PROFIL
async function enregistrerModifications() {
    const inputNom = document.getElementById('edit-nom').value.trim();
    const inputTel = document.getElementById('edit-tel').value.trim();

    if (inputNom.length < 2 || inputNom.length > 100 ||
        !/^[\p{L}\p{M}][\p{L}\p{M} .'-]*$/u.test(inputNom) ||
        (inputTel && (!estTelephoneValide(inputTel) || inputTel.length > 25))) {
        afficherMessage('update-message', 'Nom ou téléphone invalide.', '#c53030');
        return;
    }

    try {
        const [{ db }, firestoreSdk] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
        await firestoreSdk.setDoc(
            firestoreSdk.doc(db, 'users', window.firebaseAuth.currentUser.uid),
            { nomComplet: inputNom, telephone: inputTel },
            { merge: true }
        );
        afficherMessage('update-message', 'Vos informations ont été enregistrées avec succès.', '#2e7d32');
        await chargerProfilEtReservations();
    } catch (error) {
        console.error('Erreur lors de la mise à jour du profil Firestore:', error);
        afficherMessage('update-message', 'Impossible d’enregistrer vos informations. Veuillez réessayer.', '#c53030');
    }
}

// 4. CHANGEMENT DE MOT DE PASSE
async function changerMotDePasse() {
    const ancienPass = document.getElementById('old-password').value;
    const nouveauPass = document.getElementById('new-password').value;

    if (!ancienPass || !nouveauPass) {
        afficherMessage('password-message', 'Veuillez renseigner les deux champs.', '#c53030');
        return;
    }

    if (nouveauPass.length < 6 || nouveauPass.length > 128) {
        afficherMessage('password-message', 'Le mot de passe doit comporter entre 6 et 128 caractères.', '#c53030');
        return;
    }

    try {
        const authSdk = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        const utilisateur = window.firebaseAuth.currentUser;
        const identifiants = authSdk.EmailAuthProvider.credential(utilisateur.email, ancienPass);
        await authSdk.reauthenticateWithCredential(utilisateur, identifiants);
        await authSdk.updatePassword(utilisateur, nouveauPass);
        document.getElementById('old-password').value = '';
        document.getElementById('new-password').value = '';
        afficherMessage('password-message', 'Mot de passe mis à jour avec succès.', '#2e7d32');
    } catch (error) {
        console.error('Erreur lors du changement de mot de passe Firebase:', error);
        const message = error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password'
            ? 'L’ancien mot de passe est incorrect.'
            : 'Impossible de modifier le mot de passe. Veuillez vérifier vos informations et réessayer.';
        afficherMessage('password-message', message, '#c53030');
    }
}

// 5. ANNULATION PAR LE CLIENT AVEC ALERTE HÔTE
async function demanderAnnulation(resId) {
    const motif = prompt("Indiquez la raison de votre annulation pour l'hôte :");
    if (motif === null) return;

    const motifSaisi = motif.trim();
    if (motifSaisi.length > 500 || contientContenuDangereux(motifSaisi)) {
        alert('Le motif doit faire au maximum 500 caractères et ne pas contenir de balisage HTML.');
        return;
    }

    let reservationAnnulee;
    try {
        const [{ db }, firestoreSdk] = await Promise.all([
            import('./firebase-config.js'),
            import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
        ]);
        const reservationRef = firestoreSdk.doc(db, 'reservations', resId);
        const reservationSnapshot = await firestoreSdk.getDoc(reservationRef);
        if (!reservationSnapshot.exists()) {
            alert('Cette réservation est introuvable.');
            return;
        }
        reservationAnnulee = {
            ...reservationSnapshot.data(),
            id: resId,
            statut: 'annulee',
            motifAnnulation: motifSaisi || 'Annulé par le client'
        };
        await firestoreSdk.updateDoc(
            reservationRef,
            {
                statut: reservationAnnulee.statut,
                motifAnnulation: reservationAnnulee.motifAnnulation
            }
        );
        await chargerProfilEtReservations();
    } catch (error) {
        console.error('Impossible d’annuler la réservation dans Firestore:', error);
        alert('Impossible d’enregistrer l’annulation. Veuillez réessayer.');
        return;
    }

    envoyerAlerteAnnulationHote(reservationAnnulee);
}

function envoyerAlerteAnnulationHote(res) {
    const nom = echapperHTML(res.nom || 'Client');
    const email = echapperHTML(res.email || '');
    const logement = echapperHTML(res.logement || 'Domaine complet');
    const dateArrivee = echapperHTML(res.dateArrivee || '');
    const dateDepart = echapperHTML(res.dateDepart || '');
    const blocMotif = `
        <div style="margin-top: 10px; padding-top: 10px; border-top: 1px dashed #cbd5e1; font-size: 0.85rem; color: #ea580c;">
            <strong>Motif indiqué par le client :</strong><br>
            <em>« ${echapperHTML(res.motifAnnulation || '')} »</em>
        </div>
    `;

    const templateParams = {
        email_destinataire: "gitesailly@gmail.com",
        sujet: `🔔 Annulation séjour : ${nom} — ${logement}`,
        titre_principal: "Un séjour a été annulé",
        couleur_titre: "#ea580c",
        name: "Propriétaire",
        message_introduction: `Le client <strong>${nom}</strong> (${email}) a annulé sa réservation. Les dates ont été automatiquement libérées sur le calendrier :`,
        logement: logement,
        date_arrivee: dateArrivee,
        date_depart: dateDepart,
        bloc_info_supplementaire: blocMotif,
        lien_action: `${window.location.origin}/admin.html`,
        texte_bouton: "Consulter le planning"
    };

    envoyerEmailCompte(templateParams, 'template_dy98wud')
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
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 500 * 1024) {
        alert('Choisissez une image PNG, JPEG ou WebP de 500 Ko maximum.');
        e.target.value = '';
        return;
    }

    const reader = new FileReader();
    reader.onload = async function(evt) {
        const base64Photo = evt.target.result;
        if (typeof base64Photo !== 'string' ||
            !/^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(base64Photo)) {
            alert('Le fichier image sélectionné est invalide.');
            return;
        }
        try {
            const [{ db }, firestoreSdk] = await Promise.all([
                import('./firebase-config.js'),
                import('https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js')
            ]);
            await firestoreSdk.setDoc(
                firestoreSdk.doc(db, 'users', window.firebaseAuth.currentUser.uid),
                { photo: base64Photo },
                { merge: true }
            );
            await chargerProfilEtReservations();
        } catch (error) {
            console.error('Erreur lors de l’enregistrement de la photo Firestore:', error);
            alert('Impossible d’enregistrer la photo. Vérifiez votre connexion et réessayez.');
        }
    };
    reader.onerror = function() {
        alert('Impossible de lire le fichier image sélectionné.');
    };
    reader.readAsDataURL(file);
}

// 7. LIEN DE VALIDATION
async function envoyerLienValidation() {
    try {
        const authSdk = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js');
        await authSdk.sendEmailVerification(window.firebaseAuth.currentUser);
        alert('Un lien de vérification vient d’être envoyé à ' + recupererEmailActif() + '.');
    } catch (error) {
        console.error('Erreur lors de l’envoi de l’e-mail de vérification Firebase:', error);
        alert('Impossible d’envoyer l’e-mail de vérification. Veuillez réessayer.');
    }
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

function envoyerEmailCompte(templateParams, templateId) {
    if (!window.emailjs || typeof window.emailjs.send !== 'function') {
        return Promise.reject(new Error('Le SDK EmailJS est indisponible.'));
    }
    if (Date.now() - dernierEmailCompte < DELAI_EMAIL_COMPTE_MS) {
        return Promise.reject(new Error('Délai minimal entre les envois non respecté.'));
    }
    if (!templateParams || Object.values(templateParams).some(valeur =>
        typeof valeur !== 'string' || valeur.length > 2000
    )) {
        return Promise.reject(new Error('Paramètres EmailJS invalides.'));
    }

    dernierEmailCompte = Date.now();
    return window.emailjs.send('service_p3hgn5k', templateId, templateParams);
}
