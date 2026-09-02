let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let selectedArrival = null;
let selectedDeparture = null;

const LISTE_LOGEMENTS = [
  "La Bergerie",
  "L'Écurie",
  "L'Étable",
  "Le Pigeonnier",
  "Le Grenier"
];

function getLogementSelectionne() {
  const select = document.getElementById('booking-logement') || document.getElementById('admin-filter-logement');
  return select ? select.value : "Domaine complet (5 logements)";
}

function genererCalendrier() {
  const container = document.getElementById('calendar-container');
  if (!container) return;

  const isAdmin = !!document.querySelector('.admin-container');
  const logementActif = getLogementSelectionne();

  const dataLocal = JSON.parse(localStorage.getItem('reservations')) || [];
  const reservations = (typeof reservationsData !== 'undefined' ? reservationsData : []).concat(dataLocal);

  // Dictionnaire : { "2026-09-15": { "La Bergerie": "confirmee", "Domaine complet": "en-attente" } }
  const occupationParDate = {};

  reservations.forEach(r => {
    if (r.statut === 'annulee') return;
    const debut = new Date(r.dateArrivee);
    const fin = new Date(r.dateDepart);

    for (let d = new Date(debut); d <= fin; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().split('T')[0];
      if (!occupationParDate[iso]) occupationParDate[iso] = {};

      const log = r.logement || "Domaine complet (5 logements)";
      // Si domaine complet réservé, tous les sous-logements sont occupés
      if (log.includes("Domaine complet")) {
        LISTE_LOGEMENTS.forEach(l => {
          occupationParDate[iso][l] = r.statut;
        });
        occupationParDate[iso]["Domaine complet"] = r.statut;
      } else {
        occupationParDate[iso][log] = r.statut;
      }
    }
  });

  const moisNoms = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  let selectAdminHtml = '';
  if (isAdmin) {
    selectAdminHtml = `
      <div style="margin-bottom: 15px; text-align: center;">
        <label style="font-weight: 700; margin-right: 8px;">Filtrer le planning :</label>
        <select id="admin-filter-logement" onchange="genererCalendrier()" style="padding: 6px 12px; border-radius: 8px; border: 1px solid #ccc;">
          <option value="Vue Globale">Vue d'ensemble (Toutes réservations)</option>
          <option value="Domaine complet (5 logements)">Domaine complet</option>
          ${LISTE_LOGEMENTS.map(l => `<option value="${l}" ${logementActif === l ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
    `;
  }

  container.innerHTML = `
    <div class="calendar-wrapper">
      ${selectAdminHtml}
      <div class="calendar-nav">
        <button type="button" id="prev-month">&larr; Précédent</button>
        <h4>${moisNoms[currentMonth]} ${currentYear}</h4>
        <button type="button" id="next-month">Suivant &rarr;</button>
      </div>
      <div class="calendar-grid" id="days-grid"></div>
      <div class="calendar-legend">
        <div class="legend-item"><span class="legend-color legend-dispo"></span> Disponible</div>
        ${isAdmin ? '<div class="legend-item"><span class="legend-color legend-pending"></span> En attente validation</div>' : ''}
        <div class="legend-item"><span class="legend-color legend-booked"></span> Indisponible / Réservé</div>
        ${!isAdmin ? '<div class="legend-item"><span class="legend-color legend-selected"></span> Votre sélection</div>' : ''}
      </div>
    </div>
  `;

  document.getElementById('prev-month').onclick = () => changerMois(-1);
  document.getElementById('next-month').onclick = () => changerMois(1);

  const grid = document.getElementById('days-grid');
  const joursSemaine = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  joursSemaine.forEach(j => {
    grid.innerHTML += `<div class="calendar-day-header">${j}</div>`;
  });

  const premierDuMois = new Date(currentYear, currentMonth, 1);
  const totalJours = new Date(currentYear, currentMonth + 1, 0).getDate();

  let decalage = premierDuMois.getDay() - 1;
  if (decalage === -1) decalage = 6;

  for (let i = 0; i < decalage; i++) {
    grid.innerHTML += `<div class="calendar-day empty"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let jour = 1; jour <= totalJours; jour++) {
    const d = new Date(Date.UTC(currentYear, currentMonth, jour));
    const dateStr = d.toISOString().split('T')[0];

    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.dataset.date = dateStr;

    const occJour = occupationParDate[dateStr] || {};
    const isPast = dateStr < todayStr;

    // Analyse de disponibilité selon le choix actif
    let statutJour = 'dispo'; // 'dispo', 'pending', 'booked'

    if (logementActif.includes("Domaine complet")) {
      // Pour le domaine complet : si au moins 1 logement est pris, le domaine entier n'est plus privatisable
      const logementsOccupes = Object.keys(occJour);
      if (logementsOccupes.length > 0) {
        const aDuConfirme = Object.values(occJour).includes('confirmee');
        statutJour = aDuConfirme ? 'booked' : 'pending';
      }
    } else if (isAdmin && logementActif === "Vue Globale") {
      // Vue globale admin
      const nbOccupes = Object.keys(occJour).length;
      if (nbOccupes >= 5 || occJour["Domaine complet"]) {
        statutJour = 'booked';
      } else if (nbOccupes > 0) {
        statutJour = 'pending';
      }
    } else {
      // Pour une chambre individuelle
      if (occJour[logementActif]) {
        statutJour = occJour[logementActif] === 'confirmee' ? 'booked' : 'pending';
      }
    }

    // Affichage des numéros et micro-pastilles
    dayEl.innerHTML = `<span>${jour}</span>`;

    if (isPast) {
      dayEl.classList.add('past');
    } else if (isAdmin) {
      if (statutJour === 'booked') {
        dayEl.classList.add('booked');
        dayEl.title = `Réservé : ${Object.keys(occJour).join(', ')}`;
      } else if (statutJour === 'pending') {
        dayEl.classList.add('pending');
        dayEl.title = `Demande en attente : ${Object.keys(occJour).join(', ')}`;
      } else {
        dayEl.classList.add('dispo');
      }
    } else {
      // Côté Client : Uniquement VERT ou ROUGE
      if (statutJour === 'booked' || statutJour === 'pending') {
        dayEl.classList.add('booked');
        dayEl.title = `${logementActif} non disponible à cette date`;
      } else {
        dayEl.classList.add('dispo');
        if (selectedArrival === dateStr) dayEl.classList.add('selected-start');
        if (selectedDeparture === dateStr) dayEl.classList.add('selected-end');
        if (selectedArrival && selectedDeparture && dateStr > selectedArrival && dateStr < selectedDeparture) {
          dayEl.classList.add('selected-range');
        }
        dayEl.onclick = () => handleDateClick(dateStr, occupationParDate, logementActif);
      }
    }

    grid.appendChild(dayEl);
  }
}

function changerMois(dir) {
  currentMonth += dir;
  if (currentMonth < 0) {
    currentMonth = 11;
    currentYear--;
  } else if (currentMonth > 11) {
    currentMonth = 0;
    currentYear++;
  }
  genererCalendrier();
}

function handleDateClick(dateStr, occupationParDate, logementActif) {
  const inputArrivee = document.querySelector('input[name="arrivee"]');
  const inputDepart = document.querySelector('input[name="depart"]');

  if (!selectedArrival || (selectedArrival && selectedDeparture)) {
    selectedArrival = dateStr;
    selectedDeparture = null;
    if (inputArrivee) inputArrivee.value = dateStr;
    if (inputDepart) inputDepart.value = '';
  } else {
    if (dateStr <= selectedArrival) {
      selectedArrival = dateStr;
      if (inputArrivee) inputArrivee.value = dateStr;
    } else {
      // Vérifier si un jour de l'intervalle est indisponible pour CE logement
      let conflict = false;
      for (let cur = new Date(selectedArrival); cur <= new Date(dateStr); cur.setDate(cur.getDate() + 1)) {
        const iso = cur.toISOString().split('T')[0];
        const occ = occupationParDate[iso] || {};

        if (logementActif.includes("Domaine complet")) {
          if (Object.keys(occ).length > 0) conflict = true;
        } else {
          if (occ[logementActif]) conflict = true;
        }
        if (conflict) break;
      }

      if (conflict) {
        alert(`Certaines dates sélectionnées ne sont pas disponibles pour ${logementActif}.`);
        return;
      }

      selectedDeparture = dateStr;
      if (inputDepart) inputDepart.value = dateStr;
    }
  }
  genererCalendrier();
}