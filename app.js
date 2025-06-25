// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.60.3"; // MODIFIÉ : Version de l'application mise à jour

// MODIFIÉ : Informations sur les versions des librairies pour la vérification manuelle
const LIBRARIES_INFO = [
    { name: "FullCalendar", currentVersion: "6.1.17", latestKnownVersion: "6.1.17", recommendation: "À jour", sourceUrl: "https://fullcalendar.io/" },
    { name: "Day.js", currentVersion: "1.11.10", latestKnownVersion: "1.11.11", recommendation: "Mise à jour mineure recommandée", sourceUrl: "https://day.js.org/" },
    { name: "Font Awesome", currentVersion: "5.15.4", latestKnownVersion: "6.5.2", recommendation: "Mise à jour majeure recommandée", sourceUrl: "https://fontawesome.com/" },
    { name: "jsPDF", currentVersion: "2.5.1", latestKnownVersion: "2.10.0", recommendation: "Mise à jour mineure recommandée (correction de bugs)", sourceUrl: "https://parall.ax/products/jspdf" },
    { name: "html2canvas", currentVersion: "1.4.1", latestKnownVersion: "1.4.1", recommendation: "À jour", sourceUrl: "https://html2canvas.hertzen.com/" }
];


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
const DB_VERSION = 2; 
const STORE_PEOPLE = 'people';
const STORE_EVENTS = 'events';
const STORE_PDF_GENERATION = 'pdfData'; 
let db;

// Fonction pour ouvrir la base de données IndexedDB
function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_PEOPLE)) {
                db.createObjectStore(STORE_PEOPLE, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_EVENTS)) {
                db.createObjectStore(STORE_EVENTS, { keyPath: 'id' });
            }
            if (!db.objectStoreNames.contains(STORE_PDF_GENERATION)) {
                db.createObjectStore(STORE_PDF_GENERATION, { keyPath: 'date' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("IndexedDB error:", event.target.errorCode);
            reject("Error opening IndexedDB");
        };
    });
}

// Fonctions génériques pour IndexedDB
function operateOnDB(storeName, mode, operation) {
    return new Promise((resolve, reject) => {
        if (!db) {
            openDB().then(() => {
                const transaction = db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                const request = operation(store);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            }).catch(reject); 
            return;
        }
        const transaction = db.transaction([storeName], mode);
        const store = transaction.objectStore(storeName);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = (event) => reject(event.target.error);
    });
}


async function addItem(storeName, item) {
    return operateOnDB(storeName, 'readwrite', (store) => store.add(item));
}

async function putItem(storeName, item) {
    return operateOnDB(storeName, 'readwrite', (store) => store.put(item));
}

async function getItem(storeName, id) {
    return operateOnDB(storeName, 'readonly', (store) => store.get(id));
}

async function getAllItems(storeName) {
    return operateOnDB(storeName, 'readonly', (store) => store.getAll());
}

async function deleteItem(storeName, id) {
    return operateOnDB(storeName, 'readwrite', (store) => store.delete(id));
}

async function clearStore(storeName) {
    return operateOnDB(storeName, 'readwrite', (store) => store.clear());
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`${APP_NAME} - Version ${APP_VERSION} chargée !`);

    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME}. Version ${APP_VERSION}`;

    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday);
    dayjs.extend(dayjs_plugin_isSameOrBefore);
    dayjs.extend(dayjs_plugin_minMax);
    dayjs.extend(dayjs_plugin_isSameOrAfter);
    dayjs.locale('fr'); 

    try {
        await openDB(); 
        await loadAllData(); 
        renderPeopleList(); 

        initFullCalendar();
        updateCalendarEventsDisplay();

    } catch (error) {
        console.error("Erreur lors de l'initialisation de l'application:", error);
        showToast("Erreur lors du chargement des données. L'application pourrait ne pas fonctionner correctement.", "error", 10000);
    }

    const themeToggleButton = document.getElementById('themeToggleButton');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = 'Thème Clair';
        } else {
            themeToggleButton.textContent = 'Thème Sombre';
        }
    }

    const addPersonBtn = document.getElementById('addPersonBtn');
    if (addPersonBtn) addPersonBtn.addEventListener('click', showAddPersonModal);

    const addPlanningEventBtn = document.getElementById('addPlanningEventBtn');
    if (addPlanningEventBtn) addPlanningEventBtn.addEventListener('click', () => showAddPlanningEventModal());

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => showExportOptionsModal('pdf'));

    const exportPngBtn = document.getElementById('exportPngBtn');
    if (exportPngBtn) exportPngBtn.addEventListener('click', showExportPngOptionsModal); // MODIFIÉ: Appel de la nouvelle fonction pour la modale

    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportDataToJson);

    const importJsonBtn = document.getElementById('importJsonBtn');
    if (importJsonBtn) importJsonBtn.addEventListener('click', showImportModal);

    const showStatsBtn = document.getElementById('showStatsBtn');
    if (showStatsBtn) showStatsBtn.addEventListener('click', showStatsModal);

    const showLibraryVersionsBtn = document.getElementById('showLibraryVersionsBtn');
    if (showLibraryVersionsBtn) showLibraryVersionsBtn.addEventListener('click', showLibraryVersionsModal);
});

// Fonctions utilitaires pour le thème
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeToggleButton = document.getElementById('themeToggleButton');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        if (themeToggleButton) themeToggleButton.textContent = 'Thème Clair';
    } else {
        localStorage.setItem('theme', 'light');
        if (themeToggleButton) themeToggleButton.textContent = 'Thème Sombre';
    }
}

// Gestion des Toasts (notifications)
let currentToast = null; 

function showToast(message, type = 'info', duration = 3000, isLoading = false) {
    const toastsContainer = document.getElementById('toastsContainer');
    if (!toastsContainer) return;

    if (currentToast) {
        currentToast.remove();
        if (currentToast.timer) clearTimeout(currentToast.timer);
    }

    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `
        ${isLoading ? '<i class="fas fa-hourglass-half fa-spin toast-spinner"></i>' : ''}
        <span>${message}</span>
    `;

    toastsContainer.appendChild(toast);
    currentToast = toast;

    if (duration !== 0) { 
        currentToast.timer = setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => {
                if (toast.parentNode) { 
                    toast.remove();
                }
                if (currentToast === toast) { 
                    currentToast = null;
                }
            }, { once: true });
        }, duration);
    }
}

function hideToast() {
    if (currentToast) {
        currentToast.classList.add('fade-out');
        currentToast.addEventListener('transitionend', () => {
             if (currentToast && currentToast.parentNode) { 
                currentToast.remove();
            }
            currentToast = null;
        }, { once: true });
        if (currentToast.timer) clearTimeout(currentToast.timer); 
    }
}


// --- Fonctions de gestion des Modales ---
function showModal(title, contentHtml, buttons = []) {
    let modal = document.getElementById('dynamicModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.classList.add('modal');
        document.getElementById('modalsContainer').appendChild(modal);
    }
    const oldCloseButton = modal.querySelector('.close-button');
    if (oldCloseButton) {
        oldCloseButton.removeEventListener('click', closeModal);
    }

    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <span class="close-button">&times;</span>
            </div>
            <div class="modal-body">
                ${contentHtml}
            </div>
            <div class="modal-footer">
                ${buttons.map(btn => `<button class="${btn.class || ''}" onclick="${btn.onclick}">${btn.text}</button>`).join('')}
            </div>
        </div>
    `;
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden'; 

    modal.querySelector('.close-button').addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeModal();
        }
    });
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.classList.remove('show');
        modal.addEventListener('transitionend', () => {
            modal.style.display = 'none';
            modal.innerHTML = '';
        }, { once: true });
    }
    document.body.style.overflow = '';
}

function createAndShowModal(title, content, primaryButtonText, primaryButtonAction, cancelButtonText = 'Annuler', cancelButtonAction = 'closeModal()') {
    const buttons = [];
    if (primaryButtonText && primaryButtonAction) {
        buttons.push({ text: primaryButtonText, onclick: primaryButtonAction, class: 'button-primary' });
    }
    if (cancelButtonText && cancelButtonAction) {
        buttons.push({ text: cancelButtonText, onclick: cancelButtonAction, class: 'button-secondary' });
    }
    showModal(title, content, buttons);
}

// Fonctions pour créer des éléments de formulaire
function createInput(id, label, type = 'text', value = '', placeholder = '', required = false, dataAttrs = {}) {
    const requiredAttr = required ? 'required' : '';
    const dataAttributesString = Object.keys(dataAttrs).map(key => `data-${key}="${dataAttrs[key]}"`).join(' ');
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <input type="${type}" id="${id}" value="${value}" placeholder="${placeholder}" ${requiredAttr} ${dataAttributesString}>
        </div>
    `;
}

function createCheckbox(id, label, value = '', checked = false, name = '') {
    return `
        <div class="form-group checkbox-item">
            <input type="checkbox" id="${id}" name="${name || id}" value="${value}" ${checked ? 'checked' : ''}>
            <label for="${id}">${label}</label>
        </div>
    `;
}

function createCheckboxGroup(name, label, options, selectedValues = [], idPrefix = '') {
    let checkboxesHtml = options.map(option => `
        <label class="checkbox-label-inline">
            <input type="checkbox" id="${idPrefix}${option.value}" name="${name}" value="${option.value}" ${selectedValues.includes(option.value) ? 'checked' : ''}>
            ${option.label}
        </label>
    `).join('');
    return `
        <div class="form-group">
            <p>${label}</p>
            <div class="checkbox-group">
                ${checkboxesHtml}
            </div>
        </div>
    `;
}

function createSelectInput(id, label, options, selectedValue = '', required = false, onChange = '') {
    const requiredAttr = required ? 'required' : '';
    const onChangeAttr = onChange ? `onchange="${onChange}"` : '';
    const optionsHtml = options.map(option => `
        <option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>
    `).join('');
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <select id="${id}" ${requiredAttr} ${onChangeAttr}>
                ${optionsHtml}
            </select>
        </div>
    `;
}

function createTextArea(id, label, value = '', placeholder = '', rows = 3) {
    return `
        <div class="form-group">
            <label for="${id}">${label}</label>
            <textarea id="${id}" placeholder="${placeholder}" rows="${rows}">${value}</textarea>
        </div>
    `;
}

function createDatePicker(id, label, value = '', required = false, dataAttrs = {}) {
    const requiredAttr = required ? 'required' : '';
    const dataAttributesString = Object.keys(dataAttrs).map(key => `data-${key}="${dataAttrs[key]}"`).join(' ');
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <input type="date" id="${id}" value="${value}" ${requiredAttr} ${dataAttributesString}>
        </div>
    `;
}

function showLibraryVersionsModal() {
    let contentHtml = `
        <p>Voici les informations sur les versions des principales librairies utilisées par ${APP_NAME}.</p>
        <div class="table-container">
            <table class="library-versions-table">
                <thead>
                    <tr>
                        <th>Librairie</th>
                        <th>Version Actuelle</th>
                        <th>Dernière Version Connue</th>
                        <th>Recommandation</th>
                        <th>Source</th>
                    </tr>
                </thead>
                <tbody>
    `;

    LIBRARIES_INFO.forEach(lib => {
        contentHtml += `
            <tr>
                <td>${lib.name}</td>
                <td>${lib.currentVersion}</td>
                <td>${lib.latestKnownVersion}</td>
                <td><span class="${lib.recommendation.includes('À jour') ? 'status-ok' : 'status-update'}">${lib.recommendation}</span></td>
                <td><a href="${lib.sourceUrl}" target="_blank" rel="noopener noreferrer">${new URL(lib.sourceUrl).hostname}</a></td>
            </tr>
        `;
    });

    contentHtml += `
                </tbody>
            </table>
        </div>
        <p class="note">Note : Les "dernières versions connues" sont renseignées manuellement et peuvent ne pas refléter la toute dernière version disponible au moment de la consultation.</p>
    `;

    showModal(
        'Versions des Librairies',
        contentHtml,
        [{ text: 'Fermer', onclick: 'closeModal()', class: 'button-secondary' }]
    );
}

// --- Fonctions de gestion des personnes ---
async function savePeople() {
    try {
        await clearStore(STORE_PEOPLE);
        for (const person of people) {
            await putItem(STORE_PEOPLE, person);
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des personnes:", error);
        showToast("Erreur lors de la sauvegarde des personnes.", "error");
    }
}

async function loadPeopleFromDB() {
    try {
        const storedPeople = await getAllItems(STORE_PEOPLE);
        if (storedPeople) {
            people = storedPeople.map(p => ({
                ...p,
                isVisible: p.isVisible !== undefined ? p.isVisible : true,
                color: p.color || null
            }));
        }
    } catch (error) {
        console.error("Erreur lors du chargement des personnes:", error);
        showToast("Erreur lors du chargement des personnes.", "error");
        people = [];
    }
}

function renderPeopleList() {
    const peopleListUl = document.getElementById('peopleList');
    if (!peopleListUl) return;

    peopleListUl.innerHTML = '';
    people.forEach(person => {
        const li = document.createElement('li');
        if (!person.isVisible) {
            li.classList.add('person-hidden');
        }
        li.dataset.personId = person.id;
        li.innerHTML = `
            <span>${person.name}</span>
            <div class="person-actions">
                <button class="toggle-visibility-btn" title="${person.isVisible ? 'Cacher' : 'Afficher'} dans le calendrier">
                    <i class="fas ${person.isVisible ? 'fa-eye' : 'fa-eye-slash'}"></i>
                </button>
                <button class="edit-person-btn" title="Modifier la personne">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="delete-person-btn" title="Supprimer la personne">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        peopleListUl.appendChild(li);

        li.querySelector('.toggle-visibility-btn').addEventListener('click', async (e) => {
            togglePersonVisibility(person.id, e.currentTarget);
            await savePeople();
        });
        li.querySelector('.edit-person-btn').addEventListener('click', () => showEditPersonModal(person.id));
        li.querySelector('.delete-person-btn').addEventListener('click', () => confirmDeletePerson(person.id));
    });
}

function togglePersonVisibility(personId, buttonElement) {
    const person = people.find(p => p.id === personId);
    if (person) {
        person.isVisible = !person.isVisible;
        
        const icon = buttonElement.querySelector('i');
        if (person.isVisible) {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            buttonElement.title = 'Cacher dans le calendrier';
            buttonElement.closest('li').classList.remove('person-hidden');
        } else {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            buttonElement.title = 'Afficher dans le calendrier';
            buttonElement.closest('li').classList.add('person-hidden');
        }

        updateCalendarEventsDisplay();
        showToast(`Visibilité de ${person.name} : ${person.isVisible ? 'Affichée' : 'Masquée'}.`, 'info');
    }
}

function showAddPersonModal() {
    const content = `
        ${createInput('personName', 'Nom de la personne', 'text', '', 'Ex: Jean Dupont', true)}
    `;
    createAndShowModal(
        'Ajouter une nouvelle personne',
        content,
        'Ajouter',
        'addPerson()'
    );
}

async function addPerson() {
    const nameInput = document.getElementById('personName');
    const name = nameInput ? nameInput.value.trim() : '';

    if (!name) {
        showToast('Le nom de la personne est requis.', 'error');
        return;
    }

    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast('Une personne avec ce nom existe déjà.', 'error');
        return;
    }

    const newPerson = {
        id: crypto.randomUUID(),
        name: name,
        color: null,
        isVisible: true
    };
    people.push(newPerson);
    await savePeople();
    renderPeopleList();
    closeModal();
    showToast(`Personne "${name}" ajoutée !`, 'success');

    updateCalendarEventsDisplay();
}

function showEditPersonModal(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast("Personne introuvable.", "error");
        return;
    }

    const content = `
        ${createInput('editPersonName', 'Nom de la personne', 'text', person.name, 'Ex: Jean Dupont', true)}
    `;
    createAndShowModal(
        `Modifier ${person.name}`,
        content,
        'Sauvegarder',
        `editPerson('${person.id}')`
    );
}

async function editPerson(personId) {
    const nameInput = document.getElementById('editPersonName');
    const newName = nameInput ? nameInput.value.trim() : '';

    if (!newName) {
        showToast('Le nom de la personne est requis.', 'error');
        return;
    }

    const person = people.find(p => p.id === personId);
    if (person) {
        if (people.some(p => p.id !== personId && p.name.toLowerCase() === newName.toLowerCase())) {
            showToast('Une autre personne avec ce nom existe déjà.', 'error');
            return;
        }

        const oldName = person.name;
        person.name = newName;

        allCalendarEvents.forEach(event => {
            if (event.personId === person.id) {
                const eventTypeDisplay = getEventTypeDisplayName(event.type);
                event.title = `${person.name} (${eventTypeDisplay})`;
            }
        });

        await savePeople();
        await saveCalendarEvents();
        renderPeopleList();
        updateCalendarEventsDisplay();
        closeModal();
        showToast(`Personne "${oldName}" modifiée en "${newName}" !`, 'success');
    } else {
        showToast("Erreur: Personne introuvable.", "error");
    }
}

function confirmDeletePerson(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) return;

    createAndShowModal(
        'Confirmer la suppression',
        `<p>Êtes-vous sûr de vouloir supprimer la personne "${person.name}" ? Tous les événements associés à cette personne seront également supprimés.</p>`,
        'Supprimer',
        `deletePerson('${person.id}')`,
        'Annuler'
    );
}

async function deletePerson(personId) {
    const initialPeopleCount = people.length;
    people = people.filter(p => p.id !== personId);
    if (people.length < initialPeopleCount) {
        allCalendarEvents = allCalendarEvents.filter(event => event.personId !== personId);
        await savePeople();
        await saveCalendarEvents();
        renderPeopleList();
        updateCalendarEventsDisplay();
        closeModal();
        showToast('Personne et ses événements supprimés !', 'success');
    } else {
        showToast("Erreur: Personne introuvable pour suppression.", "error");
    }
}

// --- Gestion des événements du calendrier ---
async function saveCalendarEvents() {
    try {
        await clearStore(STORE_EVENTS);
        for (const event of allCalendarEvents) {
            await putItem(STORE_EVENTS, event);
        }
    } catch (error) {
        console.error("Erreur lors de la sauvegarde des événements:", error);
        showToast("Erreur lors de la sauvegarde des événements.", "error");
    }
}

async function loadCalendarEvents() {
    try {
        const storedEvents = await getAllItems(STORE_EVENTS);
        if (storedEvents) {
            allCalendarEvents = storedEvents.map(event => {
                const person = people.find(p => p.id === event.personId);
                const eventColor = EVENT_COLORS[event.type] || '#000000';
                const eventTypeDisplay = getEventTypeDisplayName(event.type);

                // MODIFIÉ: Structure de l'événement pour FullCalendar, stocker les props personnalisées dans extendedProps
                return {
                    id: event.id,
                    title: person ? `${person.name} (${eventTypeDisplay})` : `[Inconnu] (${eventTypeDisplay})`,
                    start: event.start,
                    end: event.end,
                    allDay: true,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    extendedProps: {
                        personId: event.personId,
                        type: event.type,
                        recurrenceGroupId: event.recurrenceGroupId
                    },
                    // Sauvegarder aussi les propriétés de base au premier niveau pour un accès facile hors FullCalendar
                    personId: event.personId,
                    type: event.type,
                    recurrenceGroupId: event.recurrenceGroupId
                };
            });
        }
    } catch (error) {
        console.error("Erreur lors du chargement des événements:", error);
        showToast("Erreur lors du chargement des événements.", "error");
        allCalendarEvents = [];
    }
}


async function loadAllData() {
    await loadPeopleFromDB();
    await loadCalendarEvents();
}

function updateCalendarEventsDisplay() {
    const visiblePeopleIds = people.filter(p => p.isVisible).map(p => p.id);
    const eventsToShow = allCalendarEvents.filter(event => visiblePeopleIds.includes(event.personId));

    if (calendar) {
        // FullCalendar attend les événements sous une forme spécifique.
        // Assurons-nous que `eventsToShow` sont bien formatés pour FullCalendar.
        const fullCalendarFormattedEvents = eventsToShow.map(event => {
            const person = people.find(p => p.id === event.personId);
            const eventColor = EVENT_COLORS[event.type] || '#000000';
            const eventTypeDisplay = getEventTypeDisplayName(event.type);
            return {
                id: event.id,
                title: person ? `${person.name} (${eventTypeDisplay})` : `[Inconnu] (${eventTypeDisplay})`,
                start: event.start,
                end: event.end,
                allDay: event.allDay !== undefined ? event.allDay : true,
                backgroundColor: event.backgroundColor || eventColor,
                borderColor: event.borderColor || eventColor,
                extendedProps: {
                    personId: event.personId,
                    type: event.type,
                    recurrenceGroupId: event.recurrenceGroupId
                }
            };
        });
        calendar.setOption('events', fullCalendarFormattedEvents);
    }
}


function initFullCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true,
        selectable: true,
        eventDidMount: function(info) { // MODIFIÉ: Ajouter data-event-type
            info.el.title = `${info.event.title}`;
            if (info.event.extendedProps && info.event.extendedProps.type) {
                info.el.setAttribute('data-event-type', info.event.extendedProps.type);
            }
        },
        eventClick: function(info) {
            const eventId = info.event.id;
            showEditPlanningEventModal(eventId);
        },
        select: function(info) {
            showAddPlanningEventModal(info.startStr, info.endStr);
        },
        events: []
    });
    calendar.render();
}

// Fonction utilitaire pour obtenir le nom d'affichage du type d'événement
function getEventTypeDisplayName(type) {
    switch (type) {
        case 'permanence': return 'Permanence';
        case 'permanence_backup': return 'Permanence / Backup';
        case 'telework_punctual': return 'Télétravail (ponctuel)';
        case 'telework_recurrent': return 'Télétravail (récurrent)';
        case 'leave': return 'Congé';
        default: return type;
    }
}

function showAddPlanningEventModal(startStr = '', endStr = '') {
    if (people.length === 0) {
        showToast("Veuillez ajouter au moins une personne d'abord.", "error");
        return;
    }

    const personOptions = people.map(p => ({ value: p.id, label: p.name }));
    const eventTypeOptions = [
        { value: 'permanence', label: 'Permanence' },
        { value: 'permanence_backup', label: 'Permanence / Backup' },
        { value: 'telework_punctual', label: 'Télétravail (ponctuel)' },
        { value: 'telework_recurrent', label: 'Télétravail (récurrent)' },
        { value: 'leave', label: 'Congé' }
    ];

    const currentYear = dayjs().year();
    const endOfYear = dayjs().endOf('year').format('YYYY-MM-DD');

    const defaultEndDate = endStr ? dayjs(endStr).subtract(1, 'day').format('YYYY-MM-DD') : startStr;


    const content = `
        ${createSelectInput('personSelect', 'Personne', personOptions, people[0].id, true)}
        ${createSelectInput('eventTypeSelect', 'Type d\'événement', eventTypeOptions, 'permanence', true, 'handleEventTypeChange(this.value)')}
        ${createDatePicker('eventStartDate', 'Date de début', startStr, true)}
        ${createDatePicker('eventEndDate', 'Date de fin (optionnel)', defaultEndDate)}
        
        <div id="recurrenceOptions" class="recurring-options" style="display: none;">
            <h4>Récurrence (pour Télétravail récurrent)</h4>
            ${createCheckboxGroup('recurrenceDays', 'Jours de récurrence', [
                { label: 'Lundi', value: '1' },
                { label: 'Mardi', value: '2' },
                { label: 'Mercredi', value: '3', },
                { label: 'Jeudi', value: '4' },
                { label: 'Vendredi', 'value': '5' }
            ], [], 'addRecurrenceDay_')}
            ${createDatePicker('recurrenceEndDate', 'Fin de récurrence', endOfYear, true)}
        </div>
    `;

    createAndShowModal('Ajouter un événement', content, 'Ajouter', 'addPlanningEvent()');

    setTimeout(() => {
        const eventTypeSelect = document.getElementById('eventTypeSelect');
        if (eventTypeSelect) {
            handleEventTypeChange(eventTypeSelect.value);
        }
    }, 50);
}

function handleEventTypeChange(selectedType) {
    const recurrenceOptionsDiv = document.getElementById('recurrenceOptions');
    const recurrenceEndDateInput = document.getElementById('recurrenceEndDate');

    if (selectedType === 'telework_recurrent') {
        recurrenceOptionsDiv.style.display = 'block';
        if (recurrenceEndDateInput && !recurrenceEndDateInput.value) {
            recurrenceEndDateInput.value = dayjs().endOf('year').format('YYYY-MM-DD');
        }
    } else {
        recurrenceOptionsDiv.style.display = 'none';
        if (recurrenceEndDateInput) recurrenceEndDateInput.value = '';
        document.querySelectorAll('input[name="recurrenceDays"]').forEach(cb => cb.checked = false);
    }
}

async function addPlanningEvent() {
    const personId = document.getElementById('personSelect').value;
    const eventType = document.getElementById('eventTypeSelect').value;
    const startDate = document.getElementById('eventStartDate').value;
    const endDate = document.getElementById('eventEndDate').value;

    if (!personId || !eventType || !startDate) {
        showToast('Veuillez remplir tous les champs requis.', 'error');
        return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast('Personne sélectionnée introuvable.', 'error');
        return;
    }

    const eventColor = EVENT_COLORS[eventType] || '#000000';

    const generateEventObject = (start, end, currentEventType, currentRecurrenceGroupId = null) => {
        const finalEnd = end ? dayjs(end).add(1, 'day').format('YYYY-MM-DD') : dayjs(start).add(1, 'day').format('YYYY-MM-DD');
        const eventTypeDisplay = getEventTypeDisplayName(currentEventType);

        // Cet objet est celui qui sera stocké dans allCalendarEvents et IndexedDB
        return {
            id: crypto.randomUUID(),
            title: `${person.name} (${eventTypeDisplay})`, // Ce titre sera reconstruit au chargement/affichage
            start: start,
            end: finalEnd, // Fin exclusive pour FullCalendar
            personId: person.id,
            type: currentEventType,
            recurrenceGroupId: currentRecurrenceGroupId,
            // Propriétés pour FullCalendar (seront mises dans extendedProps ou directement)
            backgroundColor: eventColor,
            borderColor: eventColor,
            allDay: true
        };
    };

    let eventsToAdd = [];
    if (eventType === 'telework_recurrent') {
        const recurrenceDays = Array.from(document.querySelectorAll('input[name="recurrenceDays"]:checked')).map(cb => parseInt(cb.value));
        const recurrenceEndDateInput = document.getElementById('recurrenceEndDate');
        const recurrenceEndDate = recurrenceEndDateInput ? recurrenceEndDateInput.value : '';

        const endRecurrenceDayjs = dayjs(recurrenceEndDate);
        if (recurrenceDays.length === 0 || !recurrenceEndDate || !endRecurrenceDayjs.isValid()) {
            showToast('Pour le télétravail récurrent, veuillez sélectionner les jours et fournir une date de fin de récurrence valide.', 'error');
            return;
        }

        const recurrenceGroupId = crypto.randomUUID();
        let currentDay = dayjs(startDate);
        
        while (currentDay.isSameOrBefore(endRecurrenceDayjs, 'day')) {
            if (recurrenceDays.includes(currentDay.day())) { 
                eventsToAdd.push(generateEventObject(currentDay.format('YYYY-MM-DD'), currentDay.format('YYYY-MM-DD'), eventType, recurrenceGroupId));
            }
            currentDay = currentDay.add(1, 'day');
        }
    } else {
        eventsToAdd.push(generateEventObject(startDate, endDate, eventType));
    }

    for (const event of eventsToAdd) {
        allCalendarEvents.push(event);
    }
    await saveCalendarEvents();
    updateCalendarEventsDisplay(); // S'assure que les nouveaux événements sont formatés correctement pour FC
    closeModal();
    showToast(`Événement(s) pour ${person.name} ajouté(s) !`, 'success');
}


function showEditPlanningEventModal(eventId) {
    const event = allCalendarEvents.find(e => e.id === eventId);
    if (!event) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const personOptions = people.map(p => ({ value: p.id, label: p.name }));
    const eventTypeOptions = [
        { value: 'permanence', label: 'Permanence' },
        { value: 'permanence_backup', label: 'Permanence / Backup' },
        { value: 'telework_punctual', label: 'Télétravail (ponctuel)' },
        { value: 'telework_recurrent', label: 'Télétravail (récurrent)' },
        { value: 'leave', label: 'Congé' }
    ];

    const startDate = event.start ? dayjs(event.start).format('YYYY-MM-DD') : '';
    let endDate = '';
    if (event.end) {
        const endDayjs = dayjs(event.end);
        endDate = endDayjs.subtract(1, 'day').format('YYYY-MM-DD');
    }

    let deleteButtonsHtml = `<button class="button-danger" onclick="confirmDeleteEvent('${event.id}')">Supprimer cet événement</button>`;
    if (event.recurrenceGroupId) {
        deleteButtonsHtml += `<button class="button-danger ml-2" onclick="confirmDeleteRecurrenceSeries('${event.recurrenceGroupId}')">Supprimer la série récurrente</button>`;
    }


    const content = `
        ${createSelectInput('editPersonSelect', 'Personne', personOptions, event.personId, true)}
        ${createSelectInput('editEventTypeSelect', 'Type d\'événement', eventTypeOptions, event.type, true)}
        ${createDatePicker('editEventStartDate', 'Date de début', startDate, true)}
        ${createDatePicker('editEventEndDate', 'Date de fin (optionnel)', endDate)}
        
        <div class="form-group button-group">
            ${deleteButtonsHtml}
        </div>
    `;

    createAndShowModal('Modifier un événement', content, 'Sauvegarder', `editPlanningEvent('${event.id}')`);
}

async function editPlanningEvent(eventId) {
    const personId = document.getElementById('editPersonSelect').value;
    const eventType = document.getElementById('editEventTypeSelect').value;
    const startDate = document.getElementById('editEventStartDate').value;
    const endDate = document.getElementById('editEventEndDate').value;

    if (!personId || !eventType || !startDate) {
        showToast('Veuillez remplir tous les champs requis.', 'error');
        return;
    }

    const eventIndex = allCalendarEvents.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
        showToast("Événement introuvable pour modification.", "error");
        return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast('Personne sélectionnée introuvable.', 'error');
        return;
    }
    
    if (allCalendarEvents[eventIndex].type === 'telework_recurrent' && eventType !== 'telework_recurrent') {
        showToast("La modification du type d'un événement récurrent vers un type non récurrent n'est pas encore pleinement supportée. Supprimez la série et recréez l'événement.", "info", 6000);
    }


    const eventColor = EVENT_COLORS[eventType] || '#000000';
    const eventTypeDisplay = getEventTypeDisplayName(eventType);
    const finalEnd = endDate ? dayjs(endDate).add(1, 'day').format('YYYY-MM-DD') : dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');

    const updatedEventData = { // Ceci est l'objet qui sera stocké dans allCalendarEvents
        ...allCalendarEvents[eventIndex],
        title: `${person.name} (${eventTypeDisplay})`, // Titre de base, sera formaté pour FC
        start: startDate,
        end: finalEnd, 
        personId: person.id,
        type: eventType,
        backgroundColor: eventColor, // Garder pour consistance, même si FC peut le recalculer
        borderColor: eventColor,
        allDay: true 
    };
    
    if (allCalendarEvents[eventIndex].type === 'telework_recurrent' && eventType !== 'telework_recurrent') {
        updatedEventData.recurrenceGroupId = null;
    }


    allCalendarEvents[eventIndex] = updatedEventData;
    await saveCalendarEvents();
    updateCalendarEventsDisplay(); // Reformate et met à jour FC
    closeModal();
    showToast('Événement modifié avec succès !', 'success');
}

function confirmDeleteEvent(eventId) {
    createAndShowModal(
        'Confirmer la suppression',
        `<p>Êtes-vous sûr de vouloir supprimer cet événement ?</p>`,
        'Supprimer',
        `deleteEvent('${eventId}')`,
        'Annuler'
    );
}

async function deleteEvent(eventId) {
    const initialEventCount = allCalendarEvents.length;
    allCalendarEvents = allCalendarEvents.filter(e => e.id !== eventId);
    if (allCalendarEvents.length < initialEventCount) {
        await saveCalendarEvents();
        updateCalendarEventsDisplay();
        closeModal();
        showToast('Événement supprimé !', 'success');
    } else {
        showToast("Erreur: Événement introuvable pour suppression.", "error");
    }
}

function confirmDeleteRecurrenceSeries(recurrenceGroupId) {
    createAndShowModal(
        'Confirmer la suppression de la série',
        `<p>Êtes-vous sûr de vouloir supprimer toute la série d'événements récurrents ?</p>`,
        'Supprimer la série',
        `deleteRecurrenceSeries('${recurrenceGroupId}')`,
        'Annuler'
    );
}

async function deleteRecurrenceSeries(recurrenceGroupId) {
    const initialEventCount = allCalendarEvents.length;
    allCalendarEvents = allCalendarEvents.filter(e => e.recurrenceGroupId !== recurrenceGroupId);
    
    if (allCalendarEvents.length < initialEventCount) {
        await saveCalendarEvents();
        updateCalendarEventsDisplay();
        closeModal();
        showToast('Série d\'événements récurrents supprimée !', 'success');
    } else {
        showToast("Aucun événement trouvé pour cette série récurrente.", "info");
    }
}


// --- Exportation de données ---
async function exportDataToJson() {
    try {
        const exportedPeople = await getAllItems(STORE_PEOPLE);
        const exportedEvents = await getAllItems(STORE_EVENTS);

        const data = {
            people: exportedPeople,
            events: exportedEvents // Ces événements sont bruts, comme stockés
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
        URL.revokeObjectURL(url);
        showToast('Données exportées en JSON !', 'success');
    } catch (error) {
        console.error("Erreur lors de l'exportation des données JSON:", error);
        showToast("Erreur lors de l'exportation des données JSON.", "error");
    }
}

// NOUVELLE FONCTION: Afficher la modale d'options pour l'export PNG
function showExportPngOptionsModal() {
    if (typeof html2canvas === 'undefined') {
        showToast("La bibliothèque html2canvas n'est pas chargée. L'export PNG est impossible.", "error", 7000);
        console.error("html2canvas est undefined. Vérifiez l'inclusion du script.");
        return;
    }
    
    const uniqueEventTypes = [...new Set(allCalendarEvents.map(event => event.type))].sort();
    
    let eventTypesCheckboxesHtml = '<h4>Types d\'événements à inclure :</h4>';
    if (uniqueEventTypes.length > 0) {
        uniqueEventTypes.forEach(type => {
            // MODIFIÉ: Décocher 'leave' par défaut
            const isChecked = type !== 'leave'; 
            eventTypesCheckboxesHtml += createCheckbox(`pngExportEventType_${type}`, getEventTypeDisplayName(type), type, isChecked, 'pngExportEventTypes');
        });
    } else {
        eventTypesCheckboxesHtml += '<p>Aucun type d\'événement à afficher.</p>';
    }

    const content = `
        ${eventTypesCheckboxesHtml}
        <hr style="margin: 20px 0;">
        <h4>Options supplémentaires :</h4>
        ${createCheckbox('pngExportAddWhiteBackground', 'Ajouter un fond blanc (opaque)', 'whiteBg', true)} 
    `; // MODIFIÉ: Cocher 'fond blanc' par défaut

    createAndShowModal(
        'Options d\'exportation PNG',
        content,
        'Générer PNG',
        'generatePngWithOptions()',
        'Annuler'
    );
}

// NOUVELLE FONCTION: Exporter le calendrier en PNG avec les options de la modale
async function generatePngWithOptions() {
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl) {
        showToast("L'élément calendrier est introuvable.", "error");
        return;
    }
    closeModal(); // Ferme la modale d'options
    showToast("Génération du PNG en cours... Veuillez patienter. 🖼️", "info", 0, true);

    const selectedEventTypes = Array.from(document.querySelectorAll('input[name="pngExportEventTypes"]:checked')).map(cb => cb.value);
    const addWhiteBackground = document.getElementById('pngExportAddWhiteBackground').checked;

    const originalStyles = new Map(); // Pour stocker les styles originaux des éléments modifiés

    // Masquer les événements non sélectionnés
    const allEventElements = calendarEl.querySelectorAll('.fc-event');
    allEventElements.forEach(el => {
        const eventType = el.getAttribute('data-event-type');
        originalStyles.set(el, { display: el.style.display }); // Sauvegarde du style display
        if (!selectedEventTypes.includes(eventType)) {
            el.style.display = 'none';
        } else {
            el.style.display = ''; // Assurer que les éléments sélectionnés sont visibles
        }
    });

    // Appliquer le fond blanc si sélectionné
    const originalCalendarBg = calendarEl.style.backgroundColor;
    if (addWhiteBackground) {
        calendarEl.style.backgroundColor = 'white';
    }

    try {
        const canvas = await html2canvas(calendarEl, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: addWhiteBackground ? 'white' : null, // html2canvas gère aussi un fond
            onclone: (documentClone) => {
                // S'assurer que les styles dynamiques sont bien appliqués dans le clone
                const clonedCalendarEl = documentClone.getElementById('calendar');
                if (addWhiteBackground && clonedCalendarEl) {
                    clonedCalendarEl.style.backgroundColor = 'white';
                }
                const clonedEventElements = clonedCalendarEl ? clonedCalendarEl.querySelectorAll('.fc-event') : [];
                clonedEventElements.forEach(clonedEl => {
                    const originalEventType = clonedEl.getAttribute('data-event-type'); // data-event-type doit être sur le DOM cloné
                    if (!selectedEventTypes.includes(originalEventType)) {
                        clonedEl.style.display = 'none';
                    } else {
                        clonedEl.style.display = '';
                    }
                });
                if (calendar) { // Mettre à jour la taille dans le clone peut aider
                    // Il n'y a pas d'instance de 'calendar' dans le document cloné,
                    // mais forcer un reflow peut être utile
                    clonedCalendarEl.style.width = clonedCalendarEl.offsetWidth + 'px'; 
                }
            }
        });
        
        hideToast(); 

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `electri-cal_calendar_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast('Calendrier exporté en PNG !', 'success');

    } catch (error) {
        hideToast();
        console.error("Erreur lors de la génération du PNG:", error);
        showToast("Erreur lors de la génération du PNG. Consultez la console pour plus de détails.", "error", 7000);
    } finally {
        // Restaurer les styles originaux
        allEventElements.forEach(el => {
            if (originalStyles.has(el)) {
                el.style.display = originalStyles.get(el).display;
            }
        });
        calendarEl.style.backgroundColor = originalCalendarBg;
    }
}


function showImportModal() {
    const content = `
        ${createTextArea('importJsonData', 'Collez vos données JSON ici', '', 'Collez le contenu de votre fichier JSON ici...', 10)}
        <p>Attention: L'importation écrasera les données existantes.</p>
    `;
    createAndShowModal(
        'Importer des données JSON',
        content,
        'Importer',
        'importDataFromJson()',
        'Annuler'
    );
}

async function importDataFromJson() {
    const jsonData = document.getElementById('importJsonData').value;
    if (!jsonData) {
        showToast('Veuillez coller les données JSON.', 'error');
        return;
    }
    try {
        const parsedData = JSON.parse(jsonData);
        
        await clearStore(STORE_PEOPLE);
        await clearStore(STORE_EVENTS);
        
        if (parsedData.people && Array.isArray(parsedData.people)) {
            people = parsedData.people.map(p => ({
                ...p,
                isVisible: p.isVisible !== undefined ? p.isVisible : true 
            }));
            for (const person of people) {
                await addItem(STORE_PEOPLE, person);
            }
            renderPeopleList(); 
            showToast('Personnes importées avec succès !', 'success');
        } else {
            people = []; 
        }

        if (parsedData.events && Array.isArray(parsedData.events)) {
            // Les événements importés sont bruts, nous devons les reconstruire pour allCalendarEvents
            // et s'assurer qu'ils ont toutes les propriétés nécessaires.
            allCalendarEvents = parsedData.events.map(event => {
                 // Les propriétés comme title, backgroundColor, borderColor, allDay, extendedProps
                 // seront reconstruites lors de `loadCalendarEvents` ou `updateCalendarEventsDisplay`.
                 // Ici, nous nous assurons juste que les données essentielles sont là.
                return {
                    id: event.id || crypto.randomUUID(),
                    start: event.start,
                    end: event.end,
                    personId: event.personId,
                    type: event.type,
                    recurrenceGroupId: event.recurrenceGroupId || null,
                    // On peut ajouter title ici, mais il sera écrasé.
                    // Pareil pour backgroundColor, etc. Le plus simple est de laisser load/update gérer ça.
                };
            });
            for (const event of allCalendarEvents) { // Stocker les événements bruts
                await addItem(STORE_EVENTS, {
                    id: event.id,
                    start: event.start,
                    end: event.end,
                    personId: event.personId,
                    type: event.type,
                    recurrenceGroupId: event.recurrenceGroupId
                });
            }
             // Recharger et reformater tous les événements pour s'assurer de la cohérence
            await loadCalendarEvents(); // Ceci va reformater pour allCalendarEvents
            updateCalendarEventsDisplay(); // Ceci va mettre à jour FullCalendar
            showToast('Événements importés avec succès !', 'success');
        } else {
            allCalendarEvents = []; 
            updateCalendarEventsDisplay(); // Efface le calendrier si pas d'événements
        }
        
        if (!parsedData.people && !parsedData.events) {
            showToast('Le fichier JSON ne contient pas de données valides (personnes ou événements).', 'error');
        }
        closeModal();
    } catch (e) {
        console.error('Erreur lors de l\'importation JSON:', e);
        showToast('Erreur lors de l\'importation JSON. Format invalide.', 'error');
    }
}

function showExportOptionsModal(exportType) {
    if (people.length === 0) {
        showToast("Veuillez ajouter au moins une personne d'abord.", "error");
        return;
    }
    if (allCalendarEvents.length === 0) {
        showToast("Aucun événement à exporter. Veuillez ajouter des événements au calendrier.", "info");
        return;
    }

    const defaultStartDate = dayjs().startOf('month').format('YYYY-MM-DD');
    const defaultEndDate = dayjs().endOf('month').format('YYYY-MM-DD');


    const content = `
        <p>Génère un PDF listant les permanences par semaine sous forme de tableau (du Lundi au Vendredi).</p>
        ${createDatePicker('pdfExportStartDate', 'Date de début de la période', defaultStartDate, true)}
        ${createDatePicker('pdfExportEndDate', 'Date de fin de la période', defaultEndDate, true)}
    `;

    const buttons = [];
    buttons.push({ text: 'Générer le PDF', onclick: `preparePdfDataAndGeneratePdf()`, class: 'button-primary' });
    buttons.push({ text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' });

    showModal('Exporter le planning des permanences (PDF)', content, buttons); 
}

async function preparePdfDataAndGeneratePdf() {
    closeModal(); 

    const startDateStr = document.getElementById('pdfExportStartDate').value;
    const endDateStr = document.getElementById('pdfExportEndDate').value;

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période de dates valide pour l'export PDF.", "error");
        return;
    }

    showToast("Préparation du PDF en cours... Veuillez patienter. ⏳", "info", 0, true); 

    try {
        await clearStore(STORE_PDF_GENERATION); 

        const dailyPermanences = {}; 
        let tempDate = dayjs(startDate);
        while (tempDate.isSameOrBefore(endDate, 'day')) {
            dailyPermanences[tempDate.format('YYYY-MM-DD')] = { permanence: new Set(), permanence_backup: new Set() };
            tempDate = tempDate.add(1, 'day');
        }

        allCalendarEvents.forEach(event => {
            if (event.type !== 'permanence' && event.type !== 'permanence_backup') {
                return;
            }

            const person = people.find(p => p.id === event.personId);
            if (!person) return; 

            const eventStartDate = dayjs(event.start);
            const eventEndDate = dayjs(event.end).subtract(1, 'day'); 

            let day = dayjs.max(eventStartDate, startDate); 
            let loopEndDate = dayjs.min(eventEndDate, endDate); 

            while (day.isSameOrBefore(loopEndDate, 'day')) {
                const dateKey = day.format('YYYY-MM-DD');
                if (dailyPermanences[dateKey]) { 
                    if (event.type === 'permanence') {
                        dailyPermanences[dateKey].permanence.add(person.name);
                    } else if (event.type === 'permanence_backup') {
                        dailyPermanences[dateKey].permanence_backup.add(person.name);
                    }
                }
                day = day.add(1, 'day');
            }
        });

        const orderedDates = Object.keys(dailyPermanences).sort();
        for (const dateKey of orderedDates) {
            const dayData = dailyPermanences[dateKey];
            const dayjsObj = dayjs(dateKey);
            
            const formattedDayOfWeek = dayjsObj.locale('fr').format('ddd DD/MM'); 
            const isWeekend = (dayjsObj.day() === 0 || dayjsObj.day() === 6); 

            await putItem(STORE_PDF_GENERATION, {
                date: dateKey, 
                dayOfWeekFr: formattedDayOfWeek,
                permanenceNames: Array.from(dayData.permanence).join(', '),
                backupNames: Array.from(dayData.permanence_backup).join(', '),
                isWeekend: isWeekend
            });
        }
        
        await generatePermanencePdfTable(startDate, endDate);

    } catch (error) {
        console.error("Erreur lors de la préparation des données PDF:", error);
        showToast("Erreur lors de la préparation du PDF.", "error", 5000);
    } finally {
        hideToast(); 
    }
}

async function generatePermanencePdfTable(startDate, endDate) {
    const jsPDFLib = window.jsPDF || window.jspdf;

    if (typeof jsPDFLib === 'undefined') {
        showToast("La bibliothèque jsPDF n'est pas chargée. L'export PDF est impossible. Assurez-vous que le script jsPDF est correctement inclus.", "error", 7000);
        console.error("jsPDFLib (window.jsPDF ou window.jspdf) est undefined. Vérifiez l'inclusion du script et son chargement.");
        return;
    }

    const doc = new jsPDFLib.jsPDF('l', 'mm', 'a4'); 
    doc.setFont('helvetica'); 

    const margin = 10; 
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const numberOfColumns = 7; 
    const colWidth = (pageWidth - 2 * margin) / numberOfColumns; 
    
    const lineHeight = 7; 
    const weekBlockHeight = 3 * lineHeight; 
    const weekSpacing = 5; 
    const footerHeight = 10; 

    const PDF_HEADER_BG_COLOR = '#F0F0F0'; 
    const PDF_WEEKEND_BG_COLOR = '#E5E5E5'; 
    const PDF_PERMANENCE_TEXT_COLOR = EVENT_COLORS.permanence;
    const PDF_BACKUP_TEXT_COLOR = EVENT_COLORS.permanence_backup;
    const PDF_DEFAULT_TEXT_COLOR = '#333333';
    const PDF_WEEKEND_TEXT_COLOR = '#888888'; 

    let currentY = margin;
    let pageNum = 1;

    const addPageHeaderAndFooter = (doc, pageNum, totalPages) => {
        doc.setFontSize(16);
        doc.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        doc.text(`Planning des Permanences : du ${startDate.format('DD/MM/YYYY')} au ${endDate.format('DD/MM/YYYY')}`, pageWidth / 2, margin + 5, { align: 'center' });

        doc.setFontSize(8);
        doc.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        doc.text(`Généré par ${APP_NAME} ${APP_VERSION} le ${dayjs().format('DD/MM/YYYY HH:mm')}`, margin, pageHeight - footerHeight + 5);
        doc.text(`Page ${pageNum} / ${totalPages}`, pageWidth - margin, pageHeight - footerHeight + 5, { align: 'right' });
    };

    let tempDoc = new jsPDFLib.jsPDF('l', 'mm', 'a4'); 
    let tempCurrentY = margin + 15; 

    const pdfData = await getAllItems(STORE_PDF_GENERATION); 
    if (!pdfData || pdfData.length === 0) {
        showToast("Aucune donnée de permanence à afficher dans le PDF pour la période sélectionnée.", "info");
        return;
    }
    
    let totalPages = 1;
    let currentWeekEventsCount = 0; 

    pdfData.forEach((dayData, index) => {
        const dayjsObj = dayjs(dayData.date);
        
        if ((dayjsObj.weekday() === 1 || index === 0) && currentWeekEventsCount > 0 && index !== 0) {
            tempCurrentY += weekBlockHeight + weekSpacing;
            currentWeekEventsCount = 0; 
        }
        currentWeekEventsCount++;

        if (currentWeekEventsCount === 7 || index === pdfData.length - 1) {
            if (tempCurrentY + weekBlockHeight + footerHeight > pageHeight) {
                totalPages++;
                tempCurrentY = margin + 15; 
            }
        }
    });

    currentY = margin + 15; 
    pageNum = 1;
    addPageHeaderAndFooter(doc, pageNum, totalPages);

    let weekDataBuffer = []; 

    let firstDayOfPeriod = dayjs(pdfData[0].date);
    let startDayOfWeek = firstDayOfPeriod.weekday(); 
                                               
    for (let i = 1; i < (startDayOfWeek === 0 ? 7 : startDayOfWeek); i++) { 
        const dummyDate = firstDayOfPeriod.subtract((startDayOfWeek === 0 ? 7 : startDayOfWeek) - i, 'day');
         weekDataBuffer.push({
            date: dummyDate.format('YYYY-MM-DD'),
            dayOfWeekFr: dummyDate.locale('fr').format('ddd DD/MM'),
            permanenceNames: '',
            backupNames: '',
            isWeekend: (dummyDate.day() === 0 || dummyDate.day() === 6)
        });
    }


    for (let i = 0; i < pdfData.length; i++) {
        const dayData = pdfData[i];
        weekDataBuffer.push(dayData);

        if (weekDataBuffer.length === 7 || i === pdfData.length - 1) {
            if (i === pdfData.length - 1 && weekDataBuffer.length < 7) {
                let lastDayInBuff = dayjs(weekDataBuffer[weekDataBuffer.length - 1].date);
                while (weekDataBuffer.length < 7) {
                    lastDayInBuff = lastDayInBuff.add(1, 'day');
                    weekDataBuffer.push({
                        date: lastDayInBuff.format('YYYY-MM-DD'),
                        dayOfWeekFr: lastDayInBuff.locale('fr').format('ddd DD/MM'),
                        permanenceNames: '',
                        backupNames: '',
                        isWeekend: (lastDayInBuff.day() === 0 || lastDayInBuff.day() === 6)
                    });
                }
            }

            if (currentY + weekBlockHeight + footerHeight > pageHeight) {
                doc.addPage();
                pageNum++;
                currentY = margin + 15; 
                addPageHeaderAndFooter(doc, pageNum, totalPages);
            }

            doc.setFontSize(10);
            weekDataBuffer.forEach((day, colIndex) => {
                const x = margin + colIndex * colWidth;
                const y = currentY;
                
                doc.setFillColor(day.isWeekend ? PDF_WEEKEND_BG_COLOR : PDF_HEADER_BG_COLOR);
                doc.rect(x, y, colWidth, lineHeight, 'F'); 
                
                doc.setTextColor(day.isWeekend ? PDF_WEEKEND_TEXT_COLOR : PDF_DEFAULT_TEXT_COLOR);
                doc.text(day.dayOfWeekFr, x + colWidth / 2, y + lineHeight / 2 + 1.5, { align: 'center' });
            });

            doc.setFontSize(9);
            doc.setTextColor(PDF_PERMANENCE_TEXT_COLOR);
            weekDataBuffer.forEach((day, colIndex) => {
                const x = margin + colIndex * colWidth;
                const y = currentY + lineHeight;
                doc.text(day.permanenceNames || '-', x + colWidth / 2, y + lineHeight / 2 + 1.5, { align: 'center' });
            });

            doc.setFontSize(8);
            doc.setTextColor(PDF_BACKUP_TEXT_COLOR);
            weekDataBuffer.forEach((day, colIndex) => {
                const x = margin + colIndex * colWidth;
                const y = currentY + 2 * lineHeight;
                doc.text(day.backupNames || '-', x + colWidth / 2, y + lineHeight / 2 + 1.5, { align: 'center' });
            });

            for(let colIndex = 0; colIndex < numberOfColumns; colIndex++) {
                const x = margin + colIndex * colWidth;
                doc.setDrawColor(PDF_DEFAULT_TEXT_COLOR); 
                doc.rect(x, currentY, colWidth, weekBlockHeight); 
            }
            
            currentY += weekBlockHeight + weekSpacing; 
            weekDataBuffer = []; 
        }
    }
    // MODIFIÉ: Ajout de l'heure et des millisecondes au nom du fichier PDF
    doc.save(`planning_permanence_${startDate.format('YYYYMMDD')}-${endDate.format('YYYYMMDD')}_${dayjs().format('HHmmssS')}.pdf`);
    showToast("Le PDF a été généré avec succès !", "success", 5000);
}


// --- Fonctions de Statistiques ---

function showStatsModal() {
    const defaultStartDate = dayjs().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    const defaultEndDate = dayjs().subtract(1, 'month').endOf('month').format('YYYY-MM-DD');

    const content = `
        <p>Sélectionnez une période pour afficher les statistiques de permanence.</p>
        ${createDatePicker('statsStartDate', 'Date de début', defaultStartDate, true)}
        ${createDatePicker('statsEndDate', 'Date de fin', defaultEndDate, true)}
        <div id="statsResults" class="table-container" style="margin-top: 20px;">
            <!-- Les résultats des statistiques seront affichés ici -->
        </div>
    `;

    const buttons = [
        { text: 'Afficher les Statistiques', onclick: 'displayStats()', class: 'button-primary' },
        { text: 'Exporter CSV', onclick: 'exportStatsAsCsvWrapper()', class: 'button-secondary' }, 
        { text: 'Fermer', onclick: 'closeModal()', class: 'button-secondary' }
    ];

    showModal('Statistiques de Permanence', content, buttons);
}

function exportStatsAsCsvWrapper() {
    const startDateStr = document.getElementById('statsStartDate').value;
    const endDateStr = document.getElementById('statsEndDate').value;
    exportStatsAsCsv(startDateStr, endDateStr);
}

function displayStats() {
    const startDateStr = document.getElementById('statsStartDate').value;
    const endDateStr = document.getElementById('statsEndDate').value;

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période de dates valide pour les statistiques.", "error");
        return;
    }

    const stats = calculatePermanenceStats(startDate, endDate);
    const statsResultsDiv = document.getElementById('statsResults');
    
    if (Object.keys(stats).length === 0 && people.length === 0) {
         statsResultsDiv.innerHTML = '<p>Aucune personne et aucune donnée de permanence trouvée pour la période sélectionnée.</p>';
        return;
    }
    if (Object.keys(stats).length === 0 && people.length > 0) {
        statsResultsDiv.innerHTML = '<p>Aucune donnée de permanence trouvée pour les personnes existantes dans la période sélectionnée.</p>';
    }


    let tableHtml = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Jours de Permanence</th>
                    <th>Jours de Backup</th>
                    <th>Total Jours (Permanence + Backup)</th>
                </tr>
            </thead>
            <tbody>
    `;

    const allPeopleSorted = [...people].sort((a, b) => a.name.localeCompare(b.name));

    allPeopleSorted.forEach(person => {
        const personStats = stats[person.id] || { permanence: 0, backup: 0 }; 
        const permanenceDays = personStats.permanence;
        const backupDays = personStats.backup;
        const totalDays = permanenceDays + backupDays;

        tableHtml += `
            <tr>
                <td>${person.name}</td>
                <td>${permanenceDays}</td>
                <td>${backupDays}</td>
                <td>${totalDays}</td>
            </tr>
        `;
    });
    
    if (people.length === 0 && Object.keys(stats).length > 0) {
        Object.keys(stats).forEach(personId => {
            const permanenceDays = stats[personId].permanence || 0;
            const backupDays = stats[personId].backup || 0;
            const totalDays = permanenceDays + backupDays;
            tableHtml += `
                <tr>
                    <td>Inconnu (ID: ${personId})</td>
                    <td>${permanenceDays}</td>
                    <td>${backupDays}</td>
                    <td>${totalDays}</td>
                </tr>
            `;
        });
    }


    tableHtml += `
            </tbody>
        </table>
    `;

    statsResultsDiv.innerHTML = tableHtml;
    showToast("Statistiques mises à jour.", "success");
}

function calculatePermanenceStats(startDate, endDate) {
    const stats = {}; 

    allCalendarEvents.forEach(event => {
        if (event.type !== 'permanence' && event.type !== 'permanence_backup') {
            return; 
        }

        const eventStartDate = dayjs(event.start);
        const eventEndDate = dayjs(event.end).subtract(1, 'day'); 

        if (eventStartDate.isAfter(endDate, 'day') || eventEndDate.isBefore(startDate, 'day')) {
            return;
        }

        const overlapStart = dayjs.max(eventStartDate, startDate);
        const overlapEnd = dayjs.min(eventEndDate, endDate);

        let currentDay = dayjs(overlapStart);
        let daysCount = 0;

        while (currentDay.isSameOrBefore(overlapEnd, 'day')) {
            if (currentDay.day() >= 1 && currentDay.day() <= 5) { 
                daysCount++;
            }
            currentDay = currentDay.add(1, 'day');
        }

        if (daysCount > 0) {
            if (!stats[event.personId]) {
                stats[event.personId] = { permanence: 0, backup: 0 };
            }
            if (event.type === 'permanence') {
                stats[event.personId].permanence += daysCount;
            } else if (event.type === 'permanence_backup') {
                stats[event.personId].backup += daysCount;
            }
        }
    });

    return stats;
}

function exportStatsAsCsv(startDateStr, endDateStr) {
    const statsResultsDiv = document.getElementById('statsResults');
    const table = statsResultsDiv ? statsResultsDiv.querySelector('table') : null;

    if (!table) {
        showToast("Aucune statistique à exporter. Veuillez d'abord afficher les statistiques.", "info");
        return;
    }
     if (!startDateStr || !endDateStr) {
        showToast("Période non définie pour l'export CSV des statistiques.", "error");
        return;
    }


    let csv = [];
    csv.push(`"Période sélectionnée : du ${dayjs(startDateStr).format('DD/MM/YYYY')} au ${dayjs(endDateStr).format('DD/MM/YYYY')}"`);
    csv.push(""); 

    const headers = Array.from(table.querySelectorAll('thead th')).map(th => `"${th.innerText.replace(/"/g, '""')}"`); 
    csv.push(headers.join(';')); 

    table.querySelectorAll('tbody tr').forEach(row => {
        const rowData = Array.from(row.querySelectorAll('td')).map(td => `"${td.innerText.replace(/"/g, '""')}"`);
        csv.push(rowData.join(';'));
    });

    const csvString = csv.join('\n');
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]); 
    const blob = new Blob([bom, csvString], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_permanence_stats_${dayjs(startDateStr).format('YYYYMMDD')}-${dayjs(endDateStr).format('YYYYMMDD')}_${dayjs().format('HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Statistiques exportées en CSV !", "success");
}
