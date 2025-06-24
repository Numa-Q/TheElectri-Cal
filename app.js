// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.48.2"; // INCEMENTATION : Correction de la double pagination du PDF avec gestion d'erreur

// Définition des couleurs des événements par type
const EVENT_COLORS = {
    'permanence': '#28a745', // Vert
    'permanence_backup': '#007bff', // Bleu (pour permanence backup)
    'telework_punctual': '#007bff', // Bleu (pour télétravail ponctuel)
    'telework_recurrent': '#007bff', // Bleu (pour télétravail récurrent)
    'leave': '#808080' // Gris
};

// --- IndexedDB Configuration ---
const DB_NAME = 'ElectriCalDB';
const DB_VERSION = 2; // INCEMENTATION : Nouvelle version pour ajouter le STORE_PDF_GENERATION
const STORE_PEOPLE = 'people';
const STORE_EVENTS = 'events';
const STORE_PDF_GENERATION = 'pdfData'; // Nouveau store pour les données PDF temporaires
let db;

// Fonction pour ouvrir la base de données IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = function(event) {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_PEOPLE)) {
                db.createObjectStore(STORE_PEOPLE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_EVENTS)) {
                db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_PDF_GENERATION)) {
                db.createObjectStore(STORE_PDF_GENERATION, { keyPath: 'id', autoIncrement: true });
            }
            console.log('IndexedDB upgraded/created successfully.');
        };

        request.onsuccess = function(event) {
            db = event.target.result;
            console.log('IndexedDB opened successfully.');
            resolve(db);
        };

        request.onerror = function(event) {
            console.error('Error opening IndexedDB:', event.target.errorCode);
            reject(event.target.errorCode);
        };
    });
}

// Fonction générique pour ajouter des données
function addData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Fonction générique pour récupérer toutes les données
function getAllData(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Fonction générique pour mettre à jour des données
function updateData(storeName, data) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// Fonction générique pour supprimer des données
function deleteData(storeName, id) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// Nettoyer un store
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

// --- Initialisation de l'application ---
document.addEventListener('DOMContentLoaded', async () => {
    // Extend Day.js with necessary plugins
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday);
    dayjs.extend(dayjs_plugin_isSameOrBefore);

    await openDB(); // Ouvre la base de données au chargement

    loadPeople();
    loadEvents();
    renderCalendar();
    updateAppInfo();
    setupEventListeners();
    updateCurrentYear();
    initializeTheme(); // Initialise le thème sombre si préféré
    setupAppCache(); // Active le service worker pour le cache
});

function updateAppInfo() {
    document.getElementById('appInfo').textContent = `${APP_NAME} ${APP_VERSION}`;
}

function updateCurrentYear() {
    document.getElementById('currentYear').textContent = new Date().getFullYear();
}

function setupAppCache() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then(reg => {
                console.log('Service Worker Registered!', reg);
                showToast("Application prête pour le mode hors ligne !", "info");
            })
            .catch(err => {
                console.error('Service Worker registration failed: ', err);
                showToast("Erreur lors de l'activation du mode hors ligne.", "error");
            });
    }
}

// --- Gestion des Personnes ---
function loadPeople() {
    getAllData(STORE_PEOPLE).then(data => {
        people = data;
        updatePeopleList();
        renderCalendar(); // Re-render calendar after loading people
    }).catch(error => {
        console.error("Erreur lors du chargement des personnes:", error);
        showToast("Erreur lors du chargement des personnes.", "error");
    });
}

function addPerson() {
    showModal(`
        <h2>Ajouter une nouvelle personne</h2>
        <div class="form-group">
            <label for="personName">Nom de la personne :</label>
            <input type="text" id="personName" placeholder="Ex: Jean Dupont" required>
        </div>
        <div class="form-group">
            <label for="personEmail">Email (optionnel) :</label>
            <input type="email" id="personEmail" placeholder="Ex: jean.dupont@exemple.com">
        </div>
        <div class="form-group">
            <label for="personPhone">Téléphone (optionnel) :</label>
            <input type="tel" id="personPhone" placeholder="Ex: 0612345678">
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="savePerson()">Ajouter</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);
}

async function savePerson() {
    const nameInput = document.getElementById('personName');
    const emailInput = document.getElementById('personEmail');
    const phoneInput = document.getElementById('personPhone');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (name) {
        const newPerson = { name, email, phone };
        try {
            const id = await addData(STORE_PEOPLE, newPerson);
            newPerson.id = id; // Set the ID returned by IndexedDB
            people.push(newPerson);
            updatePeopleList();
            renderCalendar(); // Re-render calendar after adding person
            closeModal();
            showToast(`"${name}" a été ajoutée.`, "success");
        } catch (error) {
            console.error("Erreur lors de l'enregistrement de la personne:", error);
            showToast("Erreur lors de l'enregistrement de la personne.", "error");
        }
    } else {
        showToast("Le nom de la personne est requis.", "error");
    }
}

function updatePeopleList() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = '';
    people.forEach(person => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${person.name}</span>
            <div class="person-actions">
                <button class="button-icon" onclick="editPerson(${person.id})"><i class="fas fa-edit"></i></button>
                <button class="button-icon" onclick="confirmDeletePerson(${person.id})"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
        peopleList.appendChild(li);
    });
}

function editPerson(id) {
    const personToEdit = people.find(p => p.id === id);
    if (!personToEdit) return;

    showModal(`
        <h2>Modifier une personne</h2>
        <div class="form-group">
            <label for="editPersonName">Nom :</label>
            <input type="text" id="editPersonName" value="${personToEdit.name}" required>
        </div>
        <div class="form-group">
            <label for="editPersonEmail">Email (optionnel) :</label>
            <input type="email" id="editPersonEmail" value="${personToEdit.email || ''}">
        </div>
        <div class="form-group">
            <label for="editPersonPhone">Téléphone (optionnel) :</label>
            <input type="tel" id="editPersonPhone" value="${personToEdit.phone || ''}">
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="saveEditedPerson(${id})">Sauvegarder</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);
}

async function saveEditedPerson(id) {
    const nameInput = document.getElementById('editPersonName');
    const emailInput = document.getElementById('editPersonEmail');
    const phoneInput = document.getElementById('editPersonPhone');

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const phone = phoneInput.value.trim();

    if (name) {
        const personIndex = people.findIndex(p => p.id === id);
        if (personIndex > -1) {
            people[personIndex].name = name;
            people[personIndex].email = email;
            people[personIndex].phone = phone;

            try {
                await updateData(STORE_PEOPLE, people[personIndex]);
                updatePeopleList();
                renderCalendar(); // Re-render calendar after updating person
                closeModal();
                showToast(`"${name}" a été mise à jour.`, "success");
            } catch (error) {
                console.error("Erreur lors de la mise à jour de la personne:", error);
                showToast("Erreur lors de la mise à jour de la personne.", "error");
            }
        }
    } else {
        showToast("Le nom de la personne est requis.", "error");
    }
}


function confirmDeletePerson(id) {
    const personToDelete = people.find(p => p.id === id);
    if (!personToDelete) return;

    showModal(`
        <h2>Confirmer la suppression</h2>
        <p>Êtes-vous sûr de vouloir supprimer "${personToDelete.name}" ?</p>
        <div class="modal-actions">
            <button class="button-danger" onclick="deletePerson(${id})">Supprimer</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);
}

async function deletePerson(id) {
    try {
        await deleteData(STORE_PEOPLE, id);
        people = people.filter(p => p.id !== id);
        // Also delete events associated with this person
        allCalendarEvents = allCalendarEvents.filter(event => event.personId !== id);
        await clearStore(STORE_EVENTS); // Clear existing events
        for (const event of allCalendarEvents) { // Add remaining events back
            await addData(STORE_EVENTS, event);
        }
        updatePeopleList();
        renderCalendar(); // Re-render calendar after deleting person
        closeModal();
        showToast("Personne et événements associés supprimés.", "success");
    } catch (error) {
        console.error("Erreur lors de la suppression de la personne:", error);
        showToast("Erreur lors de la suppression de la personne.", "error");
    }
}

// --- Gestion des Événements du Calendrier ---
function loadEvents() {
    getAllData(STORE_EVENTS).then(data => {
        allCalendarEvents = data;
        renderCalendar(); // Re-render calendar after loading events
    }).catch(error => {
        console.error("Erreur lors du chargement des événements:", error);
        showToast("Erreur lors du chargement des événements.", "error");
    });
}

function renderCalendar() {
    const calendarEl = document.getElementById('calendar');
    if (calendar) {
        calendar.destroy(); // Destroy existing calendar to re-render
    }
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        events: allCalendarEvents.map(event => ({
            id: event.id,
            title: `${people.find(p => p.id === event.personId)?.name || 'Inconnu'} (${event.type})`,
            start: event.startDate,
            end: event.endDate ? dayjs(event.endDate).add(1, 'day').format('YYYY-MM-DD') : event.startDate, // FullCalendar end date is exclusive
            allDay: true,
            backgroundColor: EVENT_COLORS[event.type] || '#3788d8', // Default blue
            borderColor: EVENT_COLORS[event.type] || '#3788d8',
            extendedProps: {
                personId: event.personId,
                type: event.type,
                recurrent: event.recurrent,
                recurrencePattern: event.recurrencePattern
            }
        })),
        eventClick: function(info) {
            // Check if the event is a recurrent event's instance
            if (info.event.extendedProps.recurrent) {
                // If it's a recurrent instance, show original recurrent event details
                const originalEventId = info.event.extendedProps.originalRecurrentEventId || info.event.id;
                const originalEvent = allCalendarEvents.find(e => e.id === originalEventId);
                if (originalEvent) {
                    showEventDetails(originalEvent);
                } else {
                    showToast("Détails de l'événement récurrent introuvables.", "error");
                }
            } else {
                // For regular events or original recurrent events
                const eventInDB = allCalendarEvents.find(e => e.id === info.event.id);
                if (eventInDB) {
                    showEventDetails(eventInDB);
                } else {
                    showToast("Détails de l'événement introuvables.", "error");
                }
            }
        },
        datesSet: function(dateInfo) {
            // This callback fires when the calendar's dates change (prev/next month, view change)
            checkPermanenceAvailability();
        }
    });
    calendar.render();
    checkPermanenceAvailability(); // Initial check on render
}


function showEventDetails(event) {
    const person = people.find(p => p.id === event.personId);
    if (!person) {
        showToast("Personne associée à l'événement introuvable.", "error");
        return;
    }

    let recurrenceInfo = '';
    if (event.recurrent) {
        recurrenceInfo = `<p><strong>Récurrence :</strong> ${event.recurrencePattern.interval} ${event.recurrencePattern.unit}(s)</p>`;
        if (event.recurrencePattern.daysOfWeek && event.recurrencePattern.daysOfWeek.length > 0) {
            recurrenceInfo += `<p><strong>Jours de la semaine :</strong> ${event.recurrencePattern.daysOfWeek.map(d => ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'][d]).join(', ')}</p>`;
        }
        if (event.recurrencePattern.until) {
            recurrenceInfo += `<p><strong>Jusqu'à :</strong> ${dayjs(event.recurrencePattern.until).format('DD/MM/YYYY')}</p>`;
        }
    }

    showModal(`
        <h2>Détails de l'événement</h2>
        <p><strong>Personne :</strong> ${person.name}</p>
        <p><strong>Type :</strong> ${event.type}</p>
        <p><strong>Du :</strong> ${dayjs(event.startDate).format('DD/MM/YYYY')}</p>
        <p><strong>Au :</strong> ${dayjs(event.endDate).format('DD/MM/YYYY')}</p>
        ${recurrenceInfo}
        <div class="modal-actions">
            <button class="button-primary" onclick="editPlanningEvent(${event.id})">Modifier</button>
            <button class="button-danger" onclick="confirmDeleteEvent(${event.id})">Supprimer</button>
            <button class="button-secondary" onclick="closeModal()">Fermer</button>
        </div>
    `);
}


function addPlanningEvent() {
    if (people.length === 0) {
        showToast("Veuillez ajouter au moins une personne avant de gérer les événements.", "info");
        return;
    }

    const peopleOptions = people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    showModal(`
        <h2>Ajouter/Gérer un événement de planning</h2>
        <div class="form-group">
            <label for="eventPerson">Personne :</label>
            <select id="eventPerson">${peopleOptions}</select>
        </div>
        <div class="form-group">
            <label for="eventType">Type d'événement :</label>
            <select id="eventType">
                <option value="permanence">Permanence (présence sur site)</option>
                <option value="permanence_backup">Permanence Backup</option>
                <option value="telework_punctual">Télétravail ponctuel</option>
                <option value="telework_recurrent">Télétravail récurrent</option>
                <option value="leave">Congé / Absence</option>
            </select>
        </div>
        <div class="form-group">
            <label for="eventStartDate">Date de début :</label>
            <input type="date" id="eventStartDate" required>
        </div>
        <div class="form-group">
            <label for="eventEndDate">Date de fin :</label>
            <input type="date" id="eventEndDate">
        </div>
        <div class="form-group">
            <input type="checkbox" id="isRecurrent">
            <label for="isRecurrent">Événement récurrent</label>
        </div>
        <div id="recurrenceOptions" style="display:none;">
            <div class="form-group">
                <label for="recurrenceInterval">Fréquence :</label>
                <input type="number" id="recurrenceInterval" value="1" min="1">
                <select id="recurrenceUnit">
                    <option value="day">jour(s)</option>
                    <option value="week">semaine(s)</option>
                    <option value="month">mois</option>
                </select>
            </div>
            <div class="form-group">
                <label>Jours de la semaine (pour récurrence hebdomadaire) :</label>
                <div class="checkbox-group">
                    <input type="checkbox" id="recDay0" value="0"><label for="recDay0">Dim</label>
                    <input type="checkbox" id="recDay1" value="1"><label for="recDay1">Lun</label>
                    <input type="checkbox" id="recDay2" value="2"><label for="recDay2">Mar</label>
                    <input type="checkbox" id="recDay3" value="3"><label for="recDay3">Mer</label>
                    <input type="checkbox" id="recDay4" value="4"><label for="recDay4">Jeu</label>
                    <input type="checkbox" id="recDay5" value="5"><label for="recDay5">Ven</label>
                    <input type="checkbox" id="recDay6" value="6"><label for="recDay6">Sam</label>
                </div>
            </div>
            <div class="form-group">
                <label for="recurrenceUntil">Répéter jusqu'à (date de fin optionnelle) :</label>
                <input type="date" id="recurrenceUntil">
            </div>
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="savePlanningEvent()">Ajouter l'événement</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);

    document.getElementById('isRecurrent').addEventListener('change', function() {
        document.getElementById('recurrenceOptions').style.display = this.checked ? 'block' : 'none';
    });

    const today = dayjs().format('YYYY-MM-DD');
    document.getElementById('eventStartDate').value = today;
    document.getElementById('eventEndDate').value = today;
}


async function savePlanningEvent() {
    const personId = parseInt(document.getElementById('eventPerson').value);
    const type = document.getElementById('eventType').value;
    const startDate = document.getElementById('eventStartDate').value;
    let endDate = document.getElementById('eventEndDate').value;
    const isRecurrent = document.getElementById('isRecurrent').checked;

    if (!startDate) {
        showToast("La date de début est requise.", "error");
        return;
    }
    if (!endDate) {
        endDate = startDate; // If end date is not provided, it's a single-day event
    }

    if (dayjs(startDate).isAfter(dayjs(endDate))) {
        showToast("La date de début ne peut pas être après la date de fin.", "error");
        return;
    }

    let recurrencePattern = null;
    if (isRecurrent) {
        const interval = parseInt(document.getElementById('recurrenceInterval').value);
        const unit = document.getElementById('recurrenceUnit').value;
        const daysOfWeek = Array.from(document.querySelectorAll('#recurrenceOptions input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));
        const until = document.getElementById('recurrenceUntil').value;

        if (unit === 'week' && daysOfWeek.length === 0) {
            showToast("Veuillez sélectionner au moins un jour de la semaine pour la récurrence hebdomadaire.", "error");
            return;
        }

        recurrencePattern = { interval, unit, daysOfWeek, until };
    }

    const newEvent = { personId, type, startDate, endDate, recurrent: isRecurrent, recurrencePattern };

    try {
        const id = await addData(STORE_EVENTS, newEvent);
        newEvent.id = id;
        allCalendarEvents.push(newEvent);

        // If it's a recurrent event, generate instances for the calendar
        if (isRecurrent) {
            generateRecurrentEventInstances(newEvent);
        }

        renderCalendar();
        closeModal();
        showToast("Événement ajouté avec succès.", "success");
    } catch (error) {
        console.error("Erreur lors de l'enregistrement de l'événement:", error);
        showToast("Erreur lors de l'enregistrement de l'événement.", "error");
    }
}

function generateRecurrentEventInstances(originalEvent) {
    // This function generates future instances for display purposes
    // FullCalendar's rrule plugin would handle this automatically if used,
    // but for manual display, we need to add them.
    // However, for simplicity and performance, we let FullCalendar handle recurrence.
    // The 'events' array passed to FullCalendar will contain the original recurrent event.
    // FullCalendar itself will render the occurrences if 'rrule' field is present.
    // Since we're not using rrule plugin directly, we just store the base event.
    // The eventClick logic needs to handle the original event for details.
}

function editPlanningEvent(id) {
    const eventToEdit = allCalendarEvents.find(e => e.id === id);
    if (!eventToEdit) return;

    const peopleOptions = people.map(p => `<option value="${p.id}" ${p.id === eventToEdit.personId ? 'selected' : ''}>${p.name}</option>`).join('');
    const eventTypeOptions = Object.keys(EVENT_COLORS).map(type => `<option value="${type}" ${type === eventToEdit.type ? 'selected' : ''}>${type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>`).join('');

    const isRecurrentChecked = eventToEdit.recurrent ? 'checked' : '';
    const recurrenceOptionsStyle = eventToEdit.recurrent ? 'display:block;' : 'display:none;';

    let recurrenceInterval = eventToEdit.recurrencePattern?.interval || 1;
    let recurrenceUnit = eventToEdit.recurrencePattern?.unit || 'day';
    let recurrenceUntil = eventToEdit.recurrencePattern?.until || '';
    let daysOfWeekCheckboxes = '';
    for (let i = 0; i < 7; i++) {
        const isChecked = eventToEdit.recurrencePattern?.daysOfWeek?.includes(i) ? 'checked' : '';
        const dayNames = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];
        daysOfWeekCheckboxes += `<input type="checkbox" id="editRecDay${i}" value="${i}" ${isChecked}><label for="editRecDay${i}">${dayNames[i]}</label>`;
    }


    showModal(`
        <h2>Modifier l'événement</h2>
        <div class="form-group">
            <label for="editEventPerson">Personne :</label>
            <select id="editEventPerson">${peopleOptions}</select>
        </div>
        <div class="form-group">
            <label for="editEventType">Type d'événement :</label>
            <select id="editEventType">${eventTypeOptions}</select>
        </div>
        <div class="form-group">
            <label for="editEventStartDate">Date de début :</label>
            <input type="date" id="editEventStartDate" value="${eventToEdit.startDate}" required>
        </div>
        <div class="form-group">
            <label for="editEventEndDate">Date de fin :</label>
            <input type="date" id="editEventEndDate" value="${eventToEdit.endDate || ''}">
        </div>
        <div class="form-group">
            <input type="checkbox" id="editIsRecurrent" ${isRecurrentChecked}>
            <label for="editIsRecurrent">Événement récurrent</label>
        </div>
        <div id="editRecurrenceOptions" style="${recurrenceOptionsStyle}">
            <div class="form-group">
                <label for="editRecurrenceInterval">Fréquence :</label>
                <input type="number" id="editRecurrenceInterval" value="${recurrenceInterval}" min="1">
                <select id="editRecurrenceUnit">
                    <option value="day" ${recurrenceUnit === 'day' ? 'selected' : ''}>jour(s)</option>
                    <option value="week" ${recurrenceUnit === 'week' ? 'selected' : ''}>semaine(s)</option>
                    <option value="month" ${recurrenceUnit === 'month' ? 'selected' : ''}>mois</option>
                </select>
            </div>
            <div class="form-group">
                <label>Jours de la semaine (pour récurrence hebdomadaire) :</label>
                <div class="checkbox-group">
                    ${daysOfWeekCheckboxes}
                </div>
            </div>
            <div class="form-group">
                <label for="editRecurrenceUntil">Répéter jusqu'à (date de fin optionnelle) :</label>
                <input type="date" id="editRecurrenceUntil" value="${recurrenceUntil}">
            </div>
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="saveEditedPlanningEvent(${id})">Sauvegarder</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);

    document.getElementById('editIsRecurrent').addEventListener('change', function() {
        document.getElementById('editRecurrenceOptions').style.display = this.checked ? 'block' : 'none';
    });
}

async function saveEditedPlanningEvent(id) {
    const personId = parseInt(document.getElementById('editEventPerson').value);
    const type = document.getElementById('editEventType').value;
    const startDate = document.getElementById('editEventStartDate').value;
    let endDate = document.getElementById('editEventEndDate').value;
    const isRecurrent = document.getElementById('editIsRecurrent').checked;

    if (!startDate) {
        showToast("La date de début est requise.", "error");
        return;
    }
    if (!endDate) {
        endDate = startDate;
    }
    if (dayjs(startDate).isAfter(dayjs(endDate))) {
        showToast("La date de début ne peut pas être après la date de fin.", "error");
        return;
    }

    let recurrencePattern = null;
    if (isRecurrent) {
        const interval = parseInt(document.getElementById('editRecurrenceInterval').value);
        const unit = document.getElementById('editRecurrenceUnit').value;
        const daysOfWeek = Array.from(document.querySelectorAll('#editRecurrenceOptions input[type="checkbox"]:checked'))
            .map(cb => parseInt(cb.value));
        const until = document.getElementById('editRecurrenceUntil').value;

        if (unit === 'week' && daysOfWeek.length === 0) {
            showToast("Veuillez sélectionner au moins un jour de la semaine pour la récurrence hebdomadaire.", "error");
            return;
        }
        recurrencePattern = { interval, unit, daysOfWeek, until };
    }

    const eventIndex = allCalendarEvents.findIndex(e => e.id === id);
    if (eventIndex > -1) {
        allCalendarEvents[eventIndex] = {
            id,
            personId,
            type,
            startDate,
            endDate,
            recurrent: isRecurrent,
            recurrencePattern
        };

        try {
            await updateData(STORE_EVENTS, allCalendarEvents[eventIndex]);
            renderCalendar();
            closeModal();
            showToast("Événement mis à jour avec succès.", "success");
        } catch (error) {
            console.error("Erreur lors de la mise à jour de l'événement:", error);
            showToast("Erreur lors de la mise à jour de l'événement.", "error");
        }
    }
}

function confirmDeleteEvent(id) {
    showModal(`
        <h2>Confirmer la suppression</h2>
        <p>Êtes-vous sûr de vouloir supprimer cet événement ?</p>
        <div class="modal-actions">
            <button class="button-danger" onclick="deleteEvent(${id})">Supprimer</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);
}

async function deleteEvent(id) {
    try {
        await deleteData(STORE_EVENTS, id);
        allCalendarEvents = allCalendarEvents.filter(e => e.id !== id);
        renderCalendar();
        closeModal();
        showToast("Événement supprimé avec succès.", "success");
    } catch (error) {
        console.error("Erreur lors de la suppression de l'événement:", error);
        showToast("Erreur lors de la suppression de l'événement.", "error");
    }
}

// --- Vérification des Permanences ---
function checkPermanenceAvailability() {
    const view = calendar.view;
    const startDate = dayjs(view.currentStart);
    const endDate = dayjs(view.currentEnd);

    const weekDays = [1, 2, 3, 4, 5]; // Lundi=1 à Vendredi=5
    let missingPermanences = [];
    let multiplePermanences = [];
    let backupNeeded = [];

    // Reset warnings
    const calendarEl = document.getElementById('calendar');
    calendarEl.classList.remove('warning-missing-permanence', 'warning-multiple-permanence', 'warning-backup-needed');

    for (let d = startDate; d.isSameOrBefore(endDate, 'day'); d = d.add(1, 'day')) {
        if (!weekDays.includes(d.weekday())) { // Skip weekends
            continue;
        }

        const formattedDate = d.format('YYYY-MM-DD');
        let permanencesOnDay = 0;
        let backupsOnDay = 0;

        allCalendarEvents.forEach(event => {
            const eventStart = dayjs(event.startDate);
            const eventEnd = dayjs(event.endDate);

            if (event.recurrent) {
                // Handle recurrent events
                const recurrencePattern = event.recurrencePattern;
                let currentRecurrenceDate = dayjs(event.startDate);
                while (currentRecurrenceDate.isSameOrBefore(eventEnd) &&
                       (!recurrencePattern.until || currentRecurrenceDate.isSameOrBefore(dayjs(recurrencePattern.until)))) {

                    if (recurrencePattern.unit === 'week' && recurrencePattern.daysOfWeek.includes(currentRecurrenceDate.weekday())) {
                        if (currentRecurrenceDate.isSame(d, 'day')) {
                            if (event.type === 'permanence') permanencesOnDay++;
                            if (event.type === 'permanence_backup') backupsOnDay++;
                        }
                    } else if (currentRecurrenceDate.isSame(d, 'day')) { // for day/month recurrence
                        if (event.type === 'permanence') permanencesOnDay++;
                        if (event.type === 'permanence_backup') backupsOnDay++;
                    }

                    if (currentRecurrenceDate.isSameOrBefore(d, 'day') && d.isSameOrBefore(eventEnd, 'day')) {
                        // For non-weekly recurrent events, also check if the main event span covers the day
                        if (recurrencePattern.unit === 'day' || recurrencePattern.unit === 'month') {
                            if (event.type === 'permanence') permanencesOnDay++;
                            if (event.type === 'permanence_backup') backupsOnDay++;
                        }
                    }
                    currentRecurrenceDate = currentRecurrenceDate.add(recurrencePattern.interval, recurrencePattern.unit);
                }
            } else {
                // Handle non-recurrent events
                if (d.isBetween(eventStart, eventEnd, 'day', '[]')) { // [] means inclusive
                    if (event.type === 'permanence') permanencesOnDay++;
                    if (event.type === 'permanence_backup') backupsOnDay++;
                }
            }

            // For non-permanence events (leave, telework), ensure person is not counted for permanence
            if (d.isBetween(eventStart, eventEnd, 'day', '[]') &&
                (event.type === 'leave' || event.type.startsWith('telework'))) {
                // If a person is on leave or teleworking, they cannot be counted for permanence
                // We need to ensure that if a permanence is scheduled for them, it's flagged as invalid
                // This logic is tricky with the current simple counting.
                // A more robust check would be to identify who is *available* for permanence.
            }
        });

        // Refined logic for presence (simplified for example, might need more specific event conflict checks)
        const availablePeopleForPermanence = people.filter(person => {
            // Check if this person has any leave or telework event on this specific day
            const hasConflictingEvent = allCalendarEvents.some(event => {
                if (event.personId !== person.id) return false;

                const eventStart = dayjs(event.startDate);
                const eventEnd = dayjs(event.endDate);

                if (event.recurrent) {
                    let currentRecurrenceDate = dayjs(event.startDate);
                    while (currentRecurrenceDate.isSameOrBefore(eventEnd) &&
                           (!event.recurrencePattern.until || currentRecurrenceDate.isSameOrBefore(dayjs(event.recurrencePattern.until)))) {

                        if (event.recurrencePattern.unit === 'week' && event.recurrencePattern.daysOfWeek.includes(currentRecurrenceDate.weekday())) {
                            if (currentRecurrenceDate.isSame(d, 'day')) {
                                return event.type === 'leave' || event.type.startsWith('telework');
                            }
                        } else if (currentRecurrenceDate.isSame(d, 'day')) {
                             return event.type === 'leave' || event.type.startsWith('telework');
                        }
                        currentRecurrenceDate = currentRecurrenceDate.add(event.recurrencePattern.interval, event.recurrencePattern.unit);
                    }
                    return false;
                } else {
                    return d.isBetween(eventStart, eventEnd, 'day', '[]') && (event.type === 'leave' || event.type.startsWith('telework'));
                }
            });
            return !hasConflictingEvent; // Person is available if no conflicting events
        });

        const actualPermanences = allCalendarEvents.filter(event => {
            const eventStart = dayjs(event.startDate);
            const eventEnd = dayjs(event.endDate);

            // Check if the event is active on this day (recurrent or not)
            let isActive = false;
            if (event.recurrent) {
                let currentRecurrenceDate = dayjs(event.startDate);
                while (currentRecurrenceDate.isSameOrBefore(eventEnd) &&
                       (!event.recurrencePattern.until || currentRecurrenceDate.isSameOrBefore(dayjs(event.recurrencePattern.until)))) {
                    if (currentRecurrenceDate.isSame(d, 'day') &&
                        (event.recurrencePattern.unit !== 'week' || event.recurrencePattern.daysOfWeek.includes(currentRecurrenceDate.weekday()))) {
                        isActive = true;
                        break;
                    }
                    currentRecurrenceDate = currentRecurrenceDate.add(event.recurrencePattern.interval, event.recurrencePattern.unit);
                }
            } else {
                isActive = d.isBetween(eventStart, eventEnd, 'day', '[]');
            }

            // If the event is active and it's a permanence, and the person is available
            return isActive && event.type === 'permanence' && availablePeopleForPermanence.some(p => p.id === event.personId);
        }).length;

        const actualBackups = allCalendarEvents.filter(event => {
            const eventStart = dayjs(event.startDate);
            const eventEnd = dayjs(event.endDate);

            let isActive = false;
            if (event.recurrent) {
                let currentRecurrenceDate = dayjs(event.startDate);
                while (currentRecurrenceDate.isSameOrBefore(eventEnd) &&
                       (!event.recurrencePattern.until || currentRecurrenceDate.isSameOrBefore(dayjs(event.recurrencePattern.until)))) {
                    if (currentRecurrenceDate.isSame(d, 'day') &&
                        (event.recurrencePattern.unit !== 'week' || event.recurrencePattern.daysOfWeek.includes(currentRecurrenceDate.weekday()))) {
                        isActive = true;
                        break;
                    }
                    currentRecurrenceDate = currentRecurrenceDate.add(event.recurrencePattern.interval, event.recurrencePattern.unit);
                }
            } else {
                isActive = d.isBetween(eventStart, eventEnd, 'day', '[]');
            }

            return isActive && event.type === 'permanence_backup' && availablePeopleForPermanence.some(p => p.id === event.personId);
        }).length;


        if (actualPermanences === 0) {
            missingPermanences.push(formattedDate);
        } else if (actualPermanences > 1) {
            multiplePermanences.push(formattedDate);
        }

        if (actualPermanences === 1 && actualBackups === 0) {
            backupNeeded.push(formattedDate);
        }
    }

    displayPermanenceWarnings(missingPermanences, multiplePermanences, backupNeeded);
}


function displayPermanenceWarnings(missing, multiple, backup) {
    const warningContainer = document.getElementById('permanenceWarnings');
    warningContainer.innerHTML = '';
    let hasWarnings = false;

    const calendarEl = document.getElementById('calendar');
    calendarEl.classList.remove('warning-missing-permanence', 'warning-multiple-permanence', 'warning-backup-needed');

    if (missing.length > 0) {
        warningContainer.innerHTML += `<p class="warning-message error-message"><i class="fas fa-exclamation-triangle"></i> Permanence manquante le(s) : ${missing.join(', ')}</p>`;
        calendarEl.classList.add('warning-missing-permanence');
        hasWarnings = true;
    }
    if (multiple.length > 0) {
        warningContainer.innerHTML += `<p class="warning-message info-message"><i class="fas fa-info-circle"></i> Plusieurs permanences le(s) : ${multiple.join(', ')}</p>`;
        calendarEl.classList.add('warning-multiple-permanence');
        hasWarnings = true;
    }
    if (backup.length > 0) {
        warningContainer.innerHTML += `<p class="warning-message info-message"><i class="fas fa-info-circle"></i> Backup de permanence nécessaire le(s) : ${backup.join(', ')}</p>`;
        calendarEl.classList.add('warning-backup-needed');
        hasWarnings = true;
    }

    warningContainer.style.display = hasWarnings ? 'block' : 'none';
}


// --- Exportation PDF ---
async function exportPdf() {
    showToast("Préparation de l'exportation PDF...", "info");

    const start = calendar.view.currentStart;
    const end = calendar.view.currentEnd;

    let pdfContentContainer; // Déclare la variable ici pour qu'elle soit accessible dans le bloc finally

    try {
        pdfContentContainer = createPdfContent(start, end);

        // Ajout d'un délai pour s'assurer que le DOM est prêt et rendu avant la capture
        await new Promise(resolve => setTimeout(resolve, 500));

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4'); // Portrait, mm, A4
        const imgWidth = 210; // Largeur A4 en mm
        // let pageHeight = 297; // Hauteur A4 en mm (non directement utilisée pour l'addImage)

        const elementsToPrint = document.querySelectorAll('.pdf-page');
        const totalPages = elementsToPrint.length; // Devrait être 1 si le nettoyage est efficace

        let currentPage = 0;

        // Fonction pour ajouter l'en-tête et le pied de page
        const addHeaderFooter = (doc, pageNumber, totalPages) => {
            doc.setFontSize(10);
            doc.setTextColor(100); // Couleur grise pour l'en-tête/pied de page

            // En-tête
            doc.text(`Planning des Permanences: ${dayjs(start).format('DD/MM/YYYY')} - ${dayjs(end).format('DD/MM/YYYY')}`, doc.internal.pageSize.getWidth() / 2, 10, { align: 'center' });

            // Pied de page
            const pageCountText = `Page ${pageNumber} / ${totalPages}`;
            doc.text(pageCountText, doc.internal.pageSize.getWidth() - 20, doc.internal.pageSize.getHeight() - 10, { align: 'right' });

            // Informations de l'application
            doc.text(`${APP_NAME} ${APP_VERSION}`, 20, doc.internal.pageSize.getHeight() - 10);
        };

        for (let i = 0; i < elementsToPrint.length; i++) {
            const element = elementsToPrint[i];
            currentPage++;

            // Ajoute une nouvelle page si ce n'est pas le premier élément
            if (i > 0) {
                doc.addPage();
            }

            // Ajoute l'en-tête et le pied de page pour la page actuelle
            addHeaderFooter(doc, currentPage, totalPages);

            await html2canvas(element, {
                scale: 2, // Échelle plus élevée pour une meilleure qualité
                useCORS: true, // Important pour les images, si présentes
                windowWidth: element.scrollWidth, // Capture la largeur complète du contenu
                windowHeight: element.scrollHeight, // Capture la hauteur complète du contenu
                allowTaint: true,
            }).then(canvas => {
                const imgData = canvas.toDataURL('image/png');
                // Calcule la hauteur de l'image basée sur le ratio d'aspect
                const imgHeight = canvas.height * imgWidth / canvas.width;

                doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight); // Ajoute l'image au PDF
            });
        }

        // Sauvegarde le PDF
        const pdfName = `planning_permanences_${dayjs(start).format('YYYY-MM-DD')}_${dayjs(end).format('YYYY-MM-DD')}.pdf`;
        doc.save(pdfName);

        showToast("Le planning a été exporté en PDF avec succès !", "success");

    } catch (error) {
        console.error("Erreur lors de l'exportation PDF:", error);
        showToast("Une erreur est survenue lors de l'exportation PDF. Veuillez vérifier la console pour plus de détails.", "error");
    } finally {
        // Garantir que le conteneur temporaire est toujours supprimé, même en cas d'erreur
        if (pdfContentContainer && document.body.contains(pdfContentContainer)) {
            document.body.removeChild(pdfContentContainer);
        }
    }
}

// Fonction pour créer le contenu HTML destiné au PDF
function createPdfContent(startDate, endDate) {
    const container = document.createElement('div');
    container.className = 'pdf-container';
    container.style.width = '210mm'; // Largeur A4
    container.style.minHeight = '297mm'; // Hauteur A4, assure au moins une page
    container.style.padding = '10mm'; // Marge pour l'impression
    container.style.boxSizing = 'border-box';
    container.style.backgroundColor = 'white';
    container.style.color = 'black';
    container.style.fontSize = '10pt';
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Cache l'élément hors de l'écran
    container.style.top = '-9999px'; // Cache l'élément hors de l'écran
    container.style.zIndex = '-1';
    container.classList.add('pdf-page'); // Ajoute la classe pour la détection des pages

    // Ajout de l'en-tête (sera remplacé par jsPDF header/footer)
    // const headerHtml = `
    //     <h1 style="font-size: 14pt; text-align: center; margin-bottom: 20px;">Planning des Permanences: ${dayjs(startDate).format('DD/MM/YYYY')} - ${dayjs(endDate).format('DD/MM/YYYY')}</h1>
    // `;
    // container.innerHTML += headerHtml;

    const currentCalendarContent = document.getElementById('calendar').outerHTML;
    container.innerHTML += currentCalendarContent;

    document.body.appendChild(container);
    return container;
}


// --- Exportation PNG ---
async function exportPng() {
    showToast("Préparation de l'exportation PNG...", "info");

    const element = document.getElementById('calendar'); // Capture le calendrier

    try {
        const canvas = await html2canvas(element, {
            scale: 2, // Échelle plus élevée pour une meilleure qualité
            useCORS: true,
            windowWidth: element.scrollWidth,
            windowHeight: element.scrollHeight,
            allowTaint: true,
        });

        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `planning_permanences_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast("Le planning a été exporté en PNG avec succès !", "success");

    } catch (error) {
        console.error("Erreur lors de l'exportation PNG:", error);
        showToast("Une erreur est survenue lors de l'exportation PNG.", "error");
    }
}


// --- Import/Export JSON ---
function exportJson() {
    const data = {
        people: people,
        events: allCalendarEvents
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_data_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    showToast("Données exportées en JSON.", "success");
}

function importJson() {
    showModal(`
        <h2>Importer des données JSON</h2>
        <p>Attention : L'importation écrasera les données actuelles.</p>
        <div class="form-group">
            <input type="file" id="jsonFile" accept=".json">
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="loadJsonFile()">Importer</button>
            <button class="button-secondary" onclick="closeModal()">Annuler</button>
        </div>
    `);
}

async function loadJsonFile() {
    const fileInput = document.getElementById('jsonFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast("Veuillez sélectionner un fichier JSON.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data = JSON.parse(event.target.result);
            if (data.people && data.events) {
                // Clear existing data
                await clearStore(STORE_PEOPLE);
                await clearStore(STORE_EVENTS);

                // Add new data
                for (const person of data.people) {
                    await addData(STORE_PEOPLE, person);
                }
                for (const event of data.events) {
                    await addData(STORE_EVENTS, event);
                }

                showToast("Données importées avec succès.", "success");
                closeModal();
                loadPeople(); // Reload and re-render calendar
                loadEvents();
            } else {
                showToast("Fichier JSON invalide.", "error");
            }
        } catch (e) {
            console.error("Erreur lors de la lecture ou du parsing du fichier JSON:", e);
            showToast("Erreur lors de l'importation du fichier JSON.", "error");
        }
    };
    reader.readAsText(file);
}

// --- Statistiques ---
function showStats() {
    showModal(`
        <h2>Statistiques de Permanence et Télétravail</h2>
        <div class="form-group">
            <label for="statsStartDate">Date de début :</label>
            <input type="date" id="statsStartDate" required>
        </div>
        <div class="form-group">
            <label for="statsEndDate">Date de fin :</label>
            <input type="date" id="statsEndDate" required>
        </div>
        <div class="modal-actions">
            <button class="button-primary" onclick="generateStats()">Générer les statistiques</button>
            <button class="button-secondary" onclick="closeModal()">Fermer</button>
        </div>
        <div id="statsResults" class="mt-3">
            </div>
    `);

    // Set default dates for stats
    document.getElementById('statsStartDate').value = dayjs().startOf('month').format('YYYY-MM-DD');
    document.getElementById('statsEndDate').value = dayjs().endOf('month').format('YYYY-MM-DD');
}

function generateStats() {
    const statsStartDate = dayjs(document.getElementById('statsStartDate').value);
    const statsEndDate = dayjs(document.getElementById('statsEndDate').value);

    if (statsStartDate.isAfter(statsEndDate)) {
        showToast("La date de début ne peut pas être après la date de fin.", "error");
        return;
    }

    const stats = {}; // { personId: { permanence: N, telework_punctual: N, telework_recurrent: N, leave: N } }
    people.forEach(person => {
        stats[person.id] = {
            permanence: 0,
            permanence_backup: 0,
            telework_punctual: 0,
            telework_recurrent: 0,
            leave: 0
        };
    });

    for (let d = statsStartDate; d.isSameOrBefore(statsEndDate, 'day'); d = d.add(1, 'day')) {
        const currentDay = d.format('YYYY-MM-DD');
        allCalendarEvents.forEach(event => {
            const eventStart = dayjs(event.startDate);
            const eventEnd = dayjs(event.endDate);

            let isEventActiveOnDay = false;

            if (event.recurrent) {
                let currentRecurrenceDate = dayjs(event.startDate);
                while (currentRecurrenceDate.isSameOrBefore(eventEnd) &&
                       (!event.recurrencePattern.until || currentRecurrenceDate.isSameOrBefore(dayjs(event.recurrencePattern.until)))) {

                    if (currentRecurrenceDate.isSame(d, 'day') &&
                        (event.recurrencePattern.unit !== 'week' || event.recurrencePattern.daysOfWeek.includes(currentRecurrenceDate.weekday()))) {
                        isEventActiveOnDay = true;
                        break;
                    }
                    currentRecurrenceDate = currentRecurrenceDate.add(event.recurrencePattern.interval, event.recurrencePattern.unit);
                }
            } else {
                isEventActiveOnDay = d.isBetween(eventStart, eventEnd, 'day', '[]');
            }

            if (isEventActiveOnDay && stats[event.personId]) {
                stats[event.personId][event.type]++;
            }
        });
    }

    const statsResultsDiv = document.getElementById('statsResults');
    let tableHtml = `
        <h3>Statistiques du ${statsStartDate.format('DD/MM/YYYY')} au ${statsEndDate.format('DD/MM/YYYY')}</h3>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Permanence</th>
                    <th>Backup Permanence</th>
                    <th>Télétravail Ponctuel</th>
                    <th>Télétravail Récurrent</th>
                    <th>Congé / Absence</th>
                    <th>Total Jours (Calendrier)</th>
                </tr>
            </thead>
            <tbody>
    `;

    people.forEach(person => {
        const personStats = stats[person.id];
        const totalDays = Object.values(personStats).reduce((sum, count) => sum + count, 0); // Sum all event types for total days
        tableHtml += `
        <tr>
            <td>${person.name}</td>
            <td>${personStats.permanence}</td>
            <td>${personStats.permanence_backup}</td>
            <td>${personStats.telework_punctual}</td>
            <td>${personStats.telework_recurrent}</td>
            <td>${personStats.leave}</td>
            <td>${totalDays}</td>
        </tr>
        `;
    });

    tableHtml += `
            </tbody>
        </table>
        <div class="form-group button-group mt-3">
            <button class="button-secondary" onclick="exportStatsAsCsv()">Exporter en CSV</button>
        </div>
    `;
    statsResultsDiv.innerHTML = tableHtml;
}

function exportStatsAsCsv() {
    const statsResultsDiv = document.getElementById('statsResults');
    const table = statsResultsDiv ? statsResultsDiv.querySelector('table') : null;

    if (!table) {
        showToast("Aucune statistique à exporter.", "info");
        return;
    }

    let csv = [];
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
    showToast("Statistiques exportées en CSV.", "success");
}

// --- Gestion des Modales et Toasts ---
function showModal(content) {
    const modalsContainer = document.getElementById('modalsContainer');
    modalsContainer.innerHTML = `
        <div class="modal-backdrop" onclick="closeModal()"></div>
        <div class="modal-content glass-effect">
            ${content}
        </div>
    `;
    modalsContainer.style.display = 'flex';
    // Focus the first input if available
    const firstInput = modalsContainer.querySelector('input, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }
}

function closeModal() {
    const modalsContainer = document.getElementById('modalsContainer');
    modalsContainer.innerHTML = '';
    modalsContainer.style.display = 'none';
}

function showToast(message, type = 'info') {
    const toastsContainer = document.getElementById('toastsContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastsContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove());
    }, 3000); // Masquer après 3 secondes
}

// --- Gestion du Thème ---
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        showToast("Thème sombre activé", "info");
    } else {
        localStorage.setItem('theme', 'light');
        showToast("Thème clair activé", "info");
    }
}

// --- Gestionnaires d'événements ---
function setupEventListeners() {
    document.getElementById('addPersonBtn').addEventListener('click', addPerson);
    document.getElementById('addPlanningEventBtn').addEventListener('click', addPlanningEvent);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPdf);
    document.getElementById('exportPngBtn').addEventListener('click', exportPng);
    document.getElementById('exportJsonBtn').addEventListener('click', exportJson);
    document.getElementById('importJsonBtn').addEventListener('click', importJson);
    document.getElementById('showStatsBtn').addEventListener('click', showStats);
    document.getElementById('themeToggleButton').addEventListener('click', toggleTheme);

    // Initialisation des tooltips ou autres interactions JS si nécessaire
}
