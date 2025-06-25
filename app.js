// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
// MODIFIÉ : Version de l'application mise à jour pour inclure les dernières corrections et fonctionnalités
const APP_VERSION = "v20.52.3";

// MODIFIÉ : Informations sur les versions des librairies pour la vérification manuelle
const LIBRARIES_INFO = [
    { name: "FullCalendar", currentVersion: "6.1.17", latestKnownVersion: "6.1.17", recommendation: "À jour", sourceUrl: "https://fullcalendar.io/" },
    { name: "Day.js", currentVersion: "1.11.10", latestKnownVersion: "1.11.11", recommendation: "Mise à jour mineure recommandée", sourceUrl: "https://day.js.org/" },
    { name: "Font Awesome", currentVersion: "5.15.4", latestKnownVersion: "6.5.2", recommendation: "Mise à jour majeure recommandée", sourceUrl: "https://fontawesome.com/" },
    { name: "jsPDF", currentVersion: "2.5.1", latestKnownVersion: "2.10.0", recommendation: "Mise à jour mineure recommandée (correction de bugs)", sourceUrl: "https://parall.ax/products/jspdf" },
    { name: "html2canvas", currentVersion: "1.4.1", latestKnownVersion: "1.4.1", recommendation: "Ajouté", sourceUrl: "https://html2canvas.hertzen.com/" }
];

// Fonction utilitaire pour afficher les toasts
function showToast(message, type = "info", duration = 3000) {
    const toastsContainer = document.getElementById('toastsContainer');
    if (!toastsContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastsContainer.appendChild(toast);

    // Force reflow pour l'animation
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

// Fonction pour rafraîchir l'affichage des personnes
function refreshPeopleList() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = ''; // Vide la liste actuelle

    if (people.length === 0) {
        peopleList.innerHTML = '<li class="no-person">Aucune personne ajoutée.</li>';
        return;
    }

    people.forEach(person => {
        const li = document.createElement('li');
        li.dataset.id = person.id; // Stocke l'ID pour référence

        const nameSpan = document.createElement('span');
        nameSpan.textContent = person.name;
        li.appendChild(nameSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'person-actions';

        const editBtn = document.createElement('button');
        editBtn.innerHTML = '<i class="fas fa-edit"></i>';
        editBtn.title = `Modifier ${person.name}`;
        editBtn.onclick = () => editPerson(person.id);
        actionsDiv.appendChild(editBtn);

        const deleteBtn = document.createElement('button');
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = `Supprimer ${person.name}`;
        deleteBtn.onclick = () => deletePerson(person.id);
        actionsDiv.appendChild(deleteBtn);

        li.appendChild(actionsDiv);
        peopleList.appendChild(li);
    });
}

// Fonction pour ajouter une personne
function addPerson() {
    const personName = prompt("Nom de la nouvelle personne :");
    if (personName && personName.trim() !== '') {
        const newPerson = {
            id: Date.now().toString(), // ID unique basé sur le timestamp
            name: personName.trim()
        };
        people.push(newPerson);
        saveData();
        refreshPeopleList();
        showToast(`"${newPerson.name}" a été ajouté(e).`, "success");
    } else if (personName !== null) {
        showToast("Le nom de la personne ne peut pas être vide.", "error");
    }
}

// Fonction pour modifier une personne
function editPerson(id) {
    const person = people.find(p => p.id === id);
    if (person) {
        const newName = prompt(`Modifier le nom de "${person.name}" :`, person.name);
        if (newName && newName.trim() !== '') {
            person.name = newName.trim();
            saveData();
            refreshPeopleList();
            calendar.refetchEvents(); // Rafraîchir les événements si le nom est utilisé dans les titres
            showToast(`"${person.name}" a été modifié(e).`, "success");
        } else if (newName !== null) {
            showToast("Le nom ne peut pas être vide.", "error");
        }
    }
}

// Fonction pour supprimer une personne
function deletePerson(id) {
    const personIndex = people.findIndex(p => p.id === id);
    if (personIndex > -1) {
        const personName = people[personIndex].name;
        if (confirm(`Êtes-vous sûr de vouloir supprimer "${personName}" ? Tous les événements associés à cette personne seront également supprimés.`)) {
            people.splice(personIndex, 1);
            // Supprimer tous les événements associés à cette personne
            allCalendarEvents = allCalendarEvents.filter(event => {
                // Pour les événements de permanence, vérifier l'assignee
                if (event.extendedProps && event.extendedProps.assigneeId === id) {
                    return false;
                }
                // Pour les événements personnalisés qui pourraient avoir cette personne en titre ou description
                // C'est plus complexe, ici on se base sur assigneeId pour les permanences
                return true;
            });
            calendar.refetchEvents(); // Rafraîchir le calendrier après suppression des événements
            saveData();
            refreshPeopleList();
            showToast(`"${personName}" et ses événements associés ont été supprimés.`, "info");
        }
    }
}

// Fonction pour gérer les événements (ajouter, modifier, supprimer)
function managePlanningEvent(event = null) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${event ? 'Modifier un événement' : 'Ajouter un événement'}</h2>
                <button class="close-button" id="closeEventModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="eventTitle">Titre de l'événement :</label>
                    <input type="text" id="eventTitle" class="form-control" value="${event ? event.title : ''}" placeholder="Ex: Permanence, Congé...">
                </div>
                <div class="form-group">
                    <label for="eventType">Type d'événement :</label>
                    <select id="eventType" class="form-control">
                        <option value="permanence">Permanence</option>
                        <option value="conge">Congé</option>
                        <option value="formation">Formation</option>
                        <option value="autre">Autre</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventPerson">Personne concernée :</label>
                    <select id="eventPerson" class="form-control">
                        <option value="">Sélectionner une personne</option>
                        ${people.map(p => `<option value="${p.id}" ${event && event.extendedProps && event.extendedProps.assigneeId === p.id ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label for="eventStartDate">Date de début :</label>
                    <input type="date" id="eventStartDate" class="form-control" value="${event ? dayjs(event.start).format('YYYY-MM-DD') : ''}">
                </div>
                <div class="form-group">
                    <label for="eventEndDate">Date de fin (optionnel, incluse) :</label>
                    <input type="date" id="eventEndDate" class="form-control" value="${event && event.end ? dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD') : ''}">
                </div>
                <div class="form-group checkbox-option">
                    <input type="checkbox" id="eventAllDay" ${event && event.allDay ? 'checked' : ''}>
                    <label for="eventAllDay">Toute la journée</label>
                </div>
            </div>
            <div class="modal-footer">
                <button id="saveEventBtn" class="button-primary">${event ? 'Modifier' : 'Ajouter'}</button>
                ${event ? '<button id="deleteEventBtn" class="button-secondary">Supprimer</button>' : ''}
                <button class="button-secondary" id="cancelEventBtn">Annuler</button>
            </div>
        </div>
    `;

    document.getElementById('modalsContainer').appendChild(modal);

    // Pré-remplir les champs pour la modification
    if (event) {
        document.getElementById('eventType').value = event.extendedProps.type || 'autre';
        // Si l'événement est créé via un clic de jour, il n'y a pas toujours un assigneeId, gérer ce cas
        if (event.extendedProps && event.extendedProps.assigneeId) {
            document.getElementById('eventPerson').value = event.extendedProps.assigneeId;
        }
    }

    // Écouteurs d'événements pour la modale
    document.getElementById('closeEventModal').onclick = () => modal.remove();
    document.getElementById('cancelEventBtn').onclick = () => modal.remove();

    document.getElementById('saveEventBtn').onclick = () => {
        const title = document.getElementById('eventTitle').value.trim();
        const type = document.getElementById('eventType').value;
        const personId = document.getElementById('eventPerson').value;
        const startDate = document.getElementById('eventStartDate').value;
        let endDate = document.getElementById('eventEndDate').value;
        const allDay = document.getElementById('eventAllDay').checked;

        if (!title || !startDate || !personId) {
            showToast("Veuillez remplir tous les champs obligatoires (Titre, Date de début, Personne).", "error");
            return;
        }

        // Ajuster la date de fin pour FullCalendar si c'est un événement d'une journée ou multiple jours
        // FullCalendar exclusive end: 'end' is day after last included day
        let fcEndDate = endDate ? dayjs(endDate).add(1, 'day').format('YYYY-MM-DD') : dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');

        const personName = people.find(p => p.id === personId)?.name || 'Inconnu';
        let newEventTitle = `${title} (${personName})`;

        // Définir la couleur de l'événement en fonction du type
        let eventColor;
        switch (type) {
            case 'permanence':
                eventColor = '#ff7f50'; // Corail
                break;
            case 'conge':
                eventColor = '#4682B4'; // Acier bleu
                break;
            case 'formation':
                eventColor = '#32CD32'; // Vert citron
                break;
            case 'autre':
            default:
                eventColor = '#6A5ACD'; // Ardoise bleue
                break;
        }

        const newEvent = {
            id: event ? event.id : Date.now().toString(),
            title: newEventTitle,
            start: startDate,
            end: fcEndDate,
            allDay: allDay,
            backgroundColor: eventColor,
            borderColor: eventColor,
            extendedProps: {
                assigneeId: personId,
                type: type // Stocker le type pour le filtrage
            }
        };

        if (event) {
            // Modification d'un événement existant
            const index = allCalendarEvents.findIndex(e => e.id === event.id);
            if (index !== -1) {
                allCalendarEvents[index] = newEvent;
                showToast("Événement modifié avec succès.", "success");
            }
        } else {
            // Ajout d'un nouvel événement
            allCalendarEvents.push(newEvent);
            showToast("Événement ajouté avec succès.", "success");
        }

        saveData();
        calendar.refetchEvents(); // Rafraîchir le calendrier
        modal.remove(); // Fermer la modale
    };

    if (event) {
        document.getElementById('deleteEventBtn').onclick = () => {
            if (confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${event.title}" ?`)) {
                allCalendarEvents = allCalendarEvents.filter(e => e.id !== event.id);
                saveData();
                calendar.refetchEvents();
                showToast("Événement supprimé.", "info");
                modal.remove();
            }
        };
    }
}

// Initialisation de FullCalendar
document.addEventListener('DOMContentLoaded', function() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        editable: true,
        selectable: true,
        events: function(fetchInfo, successCallback, failureCallback) {
            // FullCalendar appellera cette fonction pour obtenir les événements
            // Nous retournons tous les événements stockés localement
            successCallback(allCalendarEvents.map(event => {
                // Assurez-vous que le titre est à jour avec le nom de la personne
                const personName = people.find(p => p.id === event.extendedProps.assigneeId)?.name || 'Inconnu';
                return {
                    ...event,
                    title: `${event.title.split('(')[0].trim()} (${personName})` // Mise à jour du nom dans le titre
                };
            }));
        },
        eventClick: function(info) {
            // Ouvre la modale de gestion d'événement pour modification
            managePlanningEvent(info.event);
        },
        select: function(info) {
            // Ouvre la modale pour ajouter un événement avec les dates pré-remplies
            const newEvent = {
                start: info.startStr,
                end: info.endStr, // FullCalendar end date is exclusive
                allDay: info.allDay
            };
            // Si c'est une sélection de jour entier sur une seule journée, la date de fin devrait être la même que le début pour le formulaire
            if (info.allDay && dayjs(info.startStr).add(1, 'day').isSame(info.endStr, 'day')) {
                newEvent.end = info.startStr;
            } else if (!info.allDay) {
                // Pour les événements non "toute la journée", l'heure de fin est importante
                // La date de fin dans le formulaire doit être la veille de `info.endStr` pour les événements FullCalendar
                // C'est déjà géré dans managePlanningEvent par `dayjs(event.end).subtract(1, 'day')`
            }
            managePlanningEvent(newEvent);
        },
        eventDrop: function(info) {
            // Mise à jour de l'événement après un glisser-déposer
            const eventIndex = allCalendarEvents.findIndex(e => e.id === info.event.id);
            if (eventIndex !== -1) {
                allCalendarEvents[eventIndex].start = info.event.startStr;
                allCalendarEvents[eventIndex].end = info.event.endStr;
                allCalendarEvents[eventIndex].allDay = info.event.allDay;
                saveData();
                showToast("Événement déplacé avec succès.", "success");
            }
        },
        eventResize: function(info) {
            // Mise à jour de l'événement après un redimensionnement
            const eventIndex = allCalendarEvents.findIndex(e => e.id === info.event.id);
            if (eventIndex !== -1) {
                allCalendarEvents[eventIndex].start = info.event.startStr;
                allCalendarEvents[eventIndex].end = info.event.endStr;
                allCalendarEvents[eventIndex].allDay = info.event.allDay;
                saveData();
                showToast("Événement redimensionné avec succès.", "success");
            }
        }
    });
    calendar.render();

    // Initialisation et événements des boutons
    document.getElementById('addPersonBtn').addEventListener('click', addPerson);
    document.getElementById('addPlanningEventBtn').addEventListener('click', () => managePlanningEvent());
    document.getElementById('exportPdfBtn').addEventListener('click', () => showToast("Fonctionnalité d'exportation PDF à venir.", "info"));
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('importJsonBtn').addEventListener('click', importJson);
    document.getElementById('showStatsBtn').addEventListener('click', showStatsModal);
    document.getElementById('showLibraryVersionsBtn').addEventListener('click', showLibraryVersionsModal);
    document.getElementById('themeToggleButton').addEventListener('click', toggleTheme);

    // NOUVEAU : Écouteur pour le bouton Exporter PNG
    const exportPngBtn = document.getElementById('exportPngBtn');
    if (exportPngBtn) exportPngBtn.addEventListener('click', openExportPngModal);

    // NOUVEAU : Écouteur pour le bouton d'exportation dans la modale PNG
    const exportPngConfirmBtn = document.getElementById('exportPngConfirmBtn');
    if (exportPngConfirmBtn) exportPngConfirmBtn.addEventListener('click', exportPng);

    // Initialiser l'année dans le footer
    document.getElementById('currentYear').textContent = new Date().getFullYear();
    document.getElementById('appInfo').textContent = `${APP_NAME} ${APP_VERSION}`;

    loadData(); // Charger les données sauvegardées au démarrage
    refreshPeopleList();
});

// Fonctions de persistance des données via IndexedDB
let db;
const DB_NAME = 'ElectriCalDB';
// MODIFIÉ : Mettre à jour la version de la base de données
const DB_VERSION = 2; // Changer de 1 à 2
const STORE_NAME_PEOPLE = 'people';
const STORE_NAME_EVENTS = 'events';

function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME_PEOPLE)) {
                db.createObjectStore(STORE_NAME_PEOPLE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_NAME_EVENTS)) {
                db.createObjectStore(STORE_NAME_EVENTS, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve();
        };

        // CORRIGÉ : Amélioration de la gestion des erreurs et du message d'erreur
        request.onerror = (event) => {
            console.error("Erreur d'ouverture de la base de données :", event.target.error.name, event.target.error.message, event.target.error);
            showToast("Erreur d'ouverture de la base de données locale. L'accès au stockage est peut-être bloqué.", "error");
            reject(event.target.error); // Rejeter avec l'objet d'erreur complet
        };
    });
}

async function loadData() {
    // CORRIGÉ : Ajout d'un bloc try...catch pour gérer les rejets de openDB()
    try {
        await openDB();
        const transaction = db.transaction([STORE_NAME_PEOPLE, STORE_NAME_EVENTS], 'readonly');
        const peopleStore = transaction.objectStore(STORE_NAME_PEOPLE);
        const eventsStore = transaction.objectStore(STORE_NAME_EVENTS);

        const peopleRequest = peopleStore.getAll();
        const eventsRequest = eventsStore.getAll();

        peopleRequest.onsuccess = (event) => {
            people = event.target.result || [];
            refreshPeopleList();
        };

        eventsRequest.onsuccess = (event) => {
            allCalendarEvents = event.target.result || [];
            if (calendar) {
                calendar.refetchEvents(); // Rafraîchir FullCalendar avec les événements chargés
            }
        };

        peopleRequest.onerror = eventsRequest.onerror = (event) => {
            console.error("Erreur de chargement des données depuis les stores :", event.target.error);
            showToast("Erreur de chargement des données locales.", "error");
        };
    } catch (error) {
        console.error("Erreur lors de l'initialisation du chargement des données (DB non ouverte) :", error);
        // Le showToast est déjà fait dans openDB().onerror
    }
}

async function saveData() {
    // CORRIGÉ : Ajout d'un bloc try...catch pour gérer les rejets de openDB()
    try {
        await openDB();
        const transaction = db.transaction([STORE_NAME_PEOPLE, STORE_NAME_EVENTS], 'readwrite');
        const peopleStore = transaction.objectStore(STORE_NAME_PEOPLE);
        const eventsStore = transaction.objectStore(STORE_NAME_EVENTS);

        peopleStore.clear(); // Vider le store avant d'ajouter les nouvelles données
        allCalendarEvents.forEach(event => {
            // Supprimer les propriétés non nécessaires pour la persistance si elles sont ajoutées par FullCalendar lui-même
            const simplifiedEvent = { ...event };
            delete simplifiedEvent._instance; // Propriété ajoutée par FullCalendar
            delete simplifiedEvent._def;     // Propriété ajoutée par FullCalendar
            eventsStore.put(simplifiedEvent);
        });

        people.forEach(person => peopleStore.put(person));

        transaction.oncomplete = () => {
            console.log("Données sauvegardées.");
        };

        transaction.onerror = (event) => {
            console.error("Erreur de sauvegarde des données dans les stores :", event.target.error);
            showToast("Erreur de sauvegarde des données locales.", "error");
        };
    } catch (error) {
        console.error("Erreur lors de l'initialisation de la sauvegarde des données (DB non ouverte) :", error);
        // Le showToast est déjà fait dans openDB().onerror
    }
}

// Fonction d'exportation JSON
function exportJson() {
    const data = {
        people: people,
        events: allCalendarEvents
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_data_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Données exportées en JSON.", "success");
}

// Fonction d'importation JSON
function importJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (event) => {
        const file = event.target.files[0];
        if (file) {
            if (confirm("L'importation remplacera toutes les données actuelles. Continuer ?")) {
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        if (importedData.people && importedData.events) {
                            people = importedData.people;
                            allCalendarEvents = importedData.events;
                            await saveData(); // Sauvegarder les nouvelles données
                            calendar.refetchEvents(); // Rafraîchir le calendrier
                            refreshPeopleList(); // Rafraîchir la liste des personnes
                            showToast("Données importées avec succès.", "success");
                        } else {
                            showToast("Fichier JSON invalide : structure attendue non trouvée (people, events).", "error");
                        }
                    } catch (error) {
                        console.error("Erreur lors de la lecture ou de l'analyse du fichier JSON :", error);
                        showToast("Erreur lors de l'importation du fichier JSON.", "error");
                    }
                };
                reader.readAsText(file);
            }
        }
    };
    input.click();
}

// Fonction pour afficher la modale des statistiques
function showStatsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Statistiques des permanences</h2>
                <button class="close-button" id="closeStatsModal">&times;</button>
            </div>
            <div class="modal-body">
                <div class="form-group">
                    <label for="statsStartDate">Date de début :</label>
                    <input type="date" id="statsStartDate" class="form-control">
                </div>
                <div class="form-group">
                    <label for="statsEndDate">Date de fin :</label>
                    <input type="date" id="statsEndDate" class="form-control">
                </div>
                <button id="generateStatsBtn" class="button-primary">Générer les statistiques</button>
                <div id="statsResults" class="stats-table-container">
                    </div>
            </div>
            <div class="modal-footer">
                <button id="exportStatsCsvBtn" class="button-secondary" style="display: none;">Exporter CSV</button>
                <button class="button-secondary" onclick="modal.remove()">Fermer</button>
            </div>
        </div>
    `;
    document.getElementById('modalsContainer').appendChild(modal);

    const statsStartDateInput = document.getElementById('statsStartDate');
    const statsEndDateInput = document.getElementById('statsEndDate');
    const generateStatsBtn = document.getElementById('generateStatsBtn');
    const statsResultsDiv = document.getElementById('statsResults');
    const exportStatsCsvBtn = document.getElementById('exportStatsCsvBtn');

    // Définir les dates par défaut (mois actuel)
    const today = dayjs();
    statsStartDateInput.value = today.startOf('month').format('YYYY-MM-DD');
    statsEndDateInput.value = today.endOf('month').format('YYYY-MM-DD');

    generateStatsBtn.addEventListener('click', () => {
        const startDate = dayjs(statsStartDateInput.value);
        const endDate = dayjs(statsEndDateInput.value);

        if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
            showToast("Veuillez sélectionner une période valide.", "error");
            return;
        }

        const stats = calculatePermanenceStats(startDate, endDate);
        displayStats(stats, statsResultsDiv);
        exportStatsCsvBtn.style.display = 'block'; // Afficher le bouton d'export CSV
        // Passer les dates à la fonction d'export CSV
        exportStatsCsvBtn.onclick = () => exportStatsAsCsv(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
    });

    document.getElementById('closeStatsModal').onclick = () => modal.remove();
}

function calculatePermanenceStats(startDate, endDate) {
    const stats = {};
    people.forEach(person => {
        stats[person.id] = { name: person.name, permanenceDays: 0, congeDays: 0, totalEvents: 0 };
    });

    allCalendarEvents.forEach(event => {
        if (event.extendedProps && event.extendedProps.assigneeId) {
            const assigneeId = event.extendedProps.assigneeId;
            const eventType = event.extendedProps.type;
            const eventStart = dayjs(event.start);
            // FullCalendar end date is exclusive, subtract 1 day to get inclusive end date for duration calculation
            const eventEnd = event.end ? dayjs(event.end).subtract(1, 'day') : eventStart;

            // Vérifier si l'événement se chevauche avec la période sélectionnée
            if (eventEnd.isSameOrAfter(startDate, 'day') && eventStart.isSameOrBefore(endDate, 'day')) {
                // Calculer les jours de chevauchement
                const overlapStart = dayjs.max(eventStart, startDate);
                const overlapEnd = dayjs.min(eventEnd, endDate);

                let days = overlapEnd.diff(overlapStart, 'day') + 1; // +1 car les deux dates sont incluses

                if (stats[assigneeId]) {
                    if (eventType === 'permanence') {
                        stats[assigneeId].permanenceDays += days;
                    } else if (eventType === 'conge') {
                        stats[assigneeId].congeDays += days;
                    }
                    stats[assigneeId].totalEvents += 1;
                }
            }
        }
    });

    return stats;
}

function displayStats(stats, container) {
    let tableHtml = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Jours de Permanence</th>
                    <th>Jours de Congé</th>
                    <th>Total Événements</th>
                </tr>
            </thead>
            <tbody>
    `;

    const sortedPeopleStats = Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));

    sortedPeopleStats.forEach(personStats => {
        tableHtml += `
            <tr>
                <td>${personStats.name}</td>
                <td>${personStats.permanenceDays}</td>
                <td>${personStats.congeDays}</td>
                <td>${personStats.totalEvents}</td>
            </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
    `;
    container.innerHTML = tableHtml;
}

// MODIFIÉ : Accepte les paramètres startDateStr et endDateStr
function exportStatsAsCsv(startDateStr, endDateStr) {
    const statsResultsDiv = document.getElementById('statsResults');
    const table = statsResultsDiv ? statsResultsDiv.querySelector('table') : null;

    if (!table) {
        showToast("Aucune statistique à exporter.", "info");
        return;
    }

    let csv = [];
    // NOUVEAU : Ajout de la période sélectionnée au début du fichier CSV
    csv.push(`"Période sélectionnée : du ${dayjs(startDateStr).format('DD/MM/YYYY')} au ${dayjs(endDateStr).format('DD/MM/YYYY')}"`);

    // Headers
    const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.innerText);
    csv.push(headers.join(';')); // Use semicolon for CSV (common in France)

    // Rows
    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => td.innerText);
        csv.push(rowData.join(';'));
    });

    const csvString = csv.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_permanence_stats_${dayjs().format('YYYY-MM-DD_HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Statistiques exportées en CSV.", "success");
}

// Fonction pour afficher la modale des versions des librairies
function showLibraryVersionsModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    let tableHtml = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>Versions des Librairies</h2>
                <button class="close-button" onclick="this.closest('.modal-overlay').remove()">&times;</button>
            </div>
            <div class="modal-body stats-table-container"> <table class="stats-table">
                    <thead>
                        <tr>
                            <th>Librairie</th>
                            <th>Version Actuelle</th>
                            <th>Dernière Version Connue</th>
                            <th>Recommandation</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    LIBRARIES_INFO.forEach(lib => {
        tableHtml += `
            <tr>
                <td><a href="${lib.sourceUrl}" target="_blank">${lib.name}</a></td>
                <td>${lib.currentVersion}</td>
                <td>${lib.latestKnownVersion}</td>
                <td>${lib.recommendation}</td>
            </tr>
        `;
    });

    tableHtml += `
                    </tbody>
                </table>
            </div>
            <div class="modal-footer">
                <button class="button-secondary" onclick="this.closest('.modal-overlay').remove()">Fermer</button>
            </div>
        </div>
    `;
    modal.innerHTML = tableHtml;
    document.getElementById('modalsContainer').appendChild(modal);
}

// Fonction pour basculer entre le thème clair et sombre
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    // Mettre à jour le texte du bouton
    document.getElementById('themeToggleButton').textContent = isDarkMode ? 'Thème Clair' : 'Thème Sombre';
    // Sauvegarder la préférence de l'utilisateur
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}

// Appliquer le thème sauvegardé au chargement
(function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggleButton').textContent = 'Thème Clair';
    } else {
        document.getElementById('themeToggleButton').textContent = 'Thème Sombre';
    }
})();

// NOUVELLES FONCTIONS POUR L'EXPORTATION PNG

/**
 * Ouvre la modale d'exportation PNG, initialise les champs et peuple les types d'événements.
 */
function openExportPngModal() {
    const exportPngModal = document.getElementById('exportPngModal');
    const startDateInput = document.getElementById('startDatePng');
    const endDateInput = document.getElementById('endDatePng');
    const eventTypeCheckboxesContainer = document.getElementById('eventTypeCheckboxesContainer');

    // Définir les dates par défaut (vue actuelle du calendrier)
    const calendarView = calendar.view;
    const today = dayjs();
    let defaultStartDate, defaultEndDate;

    // Ajuster les dates par défaut en fonction de la vue actuelle du calendrier
    if (calendarView.type === 'dayGridMonth' || calendarView.type === 'dayGridWeek' || calendarView.type === 'dayGridDay') {
        defaultStartDate = dayjs(calendar.view.activeStart).format('YYYY-MM-DD');
        defaultEndDate = dayjs(calendar.view.activeEnd).subtract(1, 'day').format('YYYY-MM-DD'); // FullCalendar end is exclusive
    } else { // Fallback pour les vues de liste ou autres
        defaultStartDate = today.startOf('month').format('YYYY-MM-DD');
        defaultEndDate = today.endOf('month').format('YYYY-MM-DD');
    }
    
    startDateInput.value = defaultStartDate;
    endDateInput.value = defaultEndDate;

    // Peupler les types d'événements dynamiquement
    populateEventTypeCheckboxes(eventTypeCheckboxesContainer);

    exportPngModal.style.display = 'flex'; // Afficher la modale
}

/**
 * Ferme la modale d'exportation PNG.
 */
function closeExportPngModal() {
    const exportPngModal = document.getElementById('exportPngModal');
    exportPngModal.style.display = 'none';
}

/**
 * Peuple le conteneur avec des checkboxes pour chaque type d'événement unique.
 * Tous les types sont cochés par défaut.
 * @param {HTMLElement} container L'élément DOM où les checkboxes seront ajoutées.
 */
function populateEventTypeCheckboxes(container) {
    container.innerHTML = ''; // Nettoyer les checkboxes existantes

    const uniqueEventTypes = new Set();
    allCalendarEvents.forEach(event => {
        if (event.extendedProps && event.extendedProps.type) {
            uniqueEventTypes.add(event.extendedProps.type);
        }
    });

    // Ajouter des types par défaut si aucun événement n'existe encore
    if (uniqueEventTypes.size === 0) {
        uniqueEventTypes.add('permanence');
        uniqueEventTypes.add('conge');
        uniqueEventTypes.add('formation');
        uniqueEventTypes.add('autre');
    }

    uniqueEventTypes.forEach(type => {
        const checkboxId = `eventType_${type}`;
        const label = document.createElement('label');
        label.htmlFor = checkboxId;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = checkboxId;
        checkbox.name = 'eventType';
        checkbox.value = type;
        checkbox.checked = true; // Cochée par défaut

        const typeName = type.charAt(0).toUpperCase() + type.slice(1); // Capitalize
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(typeName));
        container.appendChild(label);
    });
}

/**
 * Exporte le contenu visible du calendrier en image PNG,
 * en appliquant les filtres de date et de type d'événement,
 * et l'option de fond blanc.
 */
function exportPng() {
    const startDateInput = document.getElementById('startDatePng');
    const endDateInput = document.getElementById('endDatePng');
    const whiteBackgroundCheckbox = document.getElementById('whiteBackgroundPng');
    const eventTypeCheckboxes = document.querySelectorAll('#eventTypeCheckboxesContainer input[type="checkbox"]');
    const calendarEl = document.getElementById('calendar');

    const startDate = dayjs(startDateInput.value);
    const endDate = dayjs(endDateInput.value); // DayJS dates are inclusive

    const selectedEventTypes = Array.from(eventTypeCheckboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    const whiteBackground = whiteBackgroundCheckbox.checked;

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période valide pour l'exportation PNG.", "error");
        return;
    }
    if (selectedEventTypes.length === 0) {
        showToast("Veuillez sélectionner au moins un type d'événement à exporter.", "error");
        return;
    }

    showToast("Génération du PNG en cours...", "info", 5000);

    let originalDisplayStates = new Map(); // Pour stocker les états d'affichage originaux
    const allEventElements = calendarEl.querySelectorAll('.fc-event'); // Tous les éléments d'événement FullCalendar

    // Étape 1: Filtrer et cacher les événements non désirés dans le DOM
    allEventElements.forEach(eventEl => {
        const eventId = eventEl.getAttribute('data-event-id'); // Récupère l'ID de l'événement FullCalendar
        const fcEvent = calendar.getEventById(eventId); // Trouve l'objet événement FullCalendar correspondant

        if (fcEvent) {
            const eventStart = dayjs(fcEvent.start);
            // Pour les événements sur plusieurs jours, FullCalendar stocke la fin comme le jour après le dernier jour inclus.
            // Pour le filtrage, nous devons considérer le dernier jour inclus.
            const eventEnd = fcEvent.end ? dayjs(fcEvent.end).subtract(1, 'day') : eventStart;

            const isWithinDateRange = (
                (eventStart.isBetween(startDate, endDate, null, '[]')) || // L'événement commence dans la plage
                (eventEnd.isBetween(startDate, endDate, null, '[]')) ||   // L'événement se termine dans la plage
                (startDate.isBetween(eventStart, eventEnd, null, '[]')) || // La plage sélectionnée est à l'intérieur de l'événement
                (endDate.isBetween(eventStart, eventEnd, null, '[]'))      // La plage sélectionnée est à l'intérieur de l'événement
            );
            
            const eventType = fcEvent.extendedProps.type;
            const isSelectedType = selectedEventTypes.includes(eventType);

            if (!isWithinDateRange || !isSelectedType) {
                originalDisplayStates.set(eventEl, eventEl.style.display); // Sauvegarde l'état actuel
                eventEl.style.display = 'none'; // Cache l'élément
            }
        }
    });

    // Étape 2: Appliquer le fond blanc si l'option est cochée
    if (whiteBackground) {
        calendarEl.classList.add('white-bg-for-export');
    }

    // Étape 3: Capturer le calendrier avec html2canvas
    html2canvas(calendarEl, {
        useCORS: true, // Important si des images sont chargées depuis des origines différentes
        backgroundColor: whiteBackground ? "#FFFFFF" : null, // Assure un fond blanc pour la capture si l'option est activée
        scale: 2 // Augmente la résolution pour une meilleure qualité
    }).then(canvas => {
        // Étape 4: Restaurer l'affichage original du calendrier
        originalDisplayStates.forEach((display, el) => {
            el.style.display = display; // Restaure l'état d'affichage original
        });
        if (whiteBackground) {
            calendarEl.classList.remove('white-bg-for-export'); // Supprime la classe de fond blanc
        }

        // Étape 5: Télécharger l'image générée
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `electri-cal_planning_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast("Exportation PNG réussie !", "success");
        closeExportPngModal();
    }).catch(error => {
        console.error("Erreur lors de l'exportation PNG :", error);
        // Assurer que le calendrier est restauré même en cas d'erreur
        originalDisplayStates.forEach((display, el) => {
            el.style.display = display;
        });
        if (whiteBackground) {
            calendarEl.classList.remove('white-bg-for-export');
        }
        showToast("Erreur lors de l'exportation PNG.", "error");
        closeExportPngModal();
    });
}
