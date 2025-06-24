// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.51"; // INCEMENTATION : Correction blocage PDF, nommage PDF, position toast, outil vérif librairies

// Définition des couleurs des événements par type
const EVENT_COLORS = {
    'permanence': '#28a745', // Vert
    'permanence_backup': '#007bff', // Bleu (pour permanence backup)
    'telework_punctual': '#007bff', // Bleu (pour télétravail ponctuel)
    'telework_recurrent': '#007bff', // Bleu (pour télétravail récurrent)
    'leave': '#808080' // Gris
};

// Versions attendues des librairies (pour l'outil de vérification)
const EXPECTED_LIB_VERSIONS = {
    'FullCalendar': '6.1.11', // Version actuelle au 24 juin 2025
    'Day.js': '1.11.11', // Version actuelle au 24 juin 2025
    'jsPDF': '2.8.0' // Version actuelle au 24 juin 2025 (ou celle testée et stable)
    // Note: Les plugins Day.js n'ont généralement pas de versions indépendantes faciles à vérifier.
};


// --- IndexedDB Configuration ---
const DB_NAME = 'ElectriCalDB';
const DB_VERSION = 2; // Version 2 pour inclure STORE_PDF_GENERATION et s'assurer de la compatibilité
const STORE_PEOPLE = 'people';
const STORE_EVENTS = 'events';
const STORE_PDF_GENERATION = 'pdfData'; // Nouveau store pour les données PDF temporaires
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
            // Créer le nouveau store pour les données PDF
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
            // Tente de rouvrir la DB si elle n'est pas déjà ouverte
            openDB().then(() => {
                const transaction = db.transaction([storeName], mode);
                const store = transaction.objectStore(storeName);
                const request = operation(store);

                request.onsuccess = () => resolve(request.result);
                request.onerror = (event) => reject(event.target.error);
            }).catch(reject); // Si openDB échoue
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

    // Mise à jour de l'année du copyright et du nom/version de l'application
    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME}. Version ${APP_VERSION}`;

    // Initialisation de Day.js plugins
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday);
    dayjs.extend(dayjs_plugin_isSameOrBefore);
    dayjs.extend(dayjs_plugin_minMax);
    dayjs.extend(dayjs_plugin_isSameOrAfter);
    dayjs.locale('fr'); // GLOBALEMENT : Définir la locale française pour Day.js

    try {
        await openDB(); // Ouvre la base de données au démarrage
        await loadAllData(); // Charge toutes les données depuis IndexedDB
        renderPeopleList(); // Afficher la liste des personnes chargées

        // Initialisation de FullCalendar
        initFullCalendar();
        updateCalendarEventsDisplay(); // Affiche les événements des personnes visibles au démarrage

    } catch (error) {
        console.error("Erreur lors de l'initialisation de l'application:", error);
        showToast("Erreur lors du chargement des données. L'application pourrait ne pas fonctionner correctement.", "error", 10000);
    }

    // Gestion du thème sombre/clair
    const themeToggleButton = document.getElementById('themeToggleButton');
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', toggleTheme);
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Thème Clair';
        } else {
            themeToggleButton.innerHTML = '<i class="fas fa-moon"></i> Thème Sombre';
        }
    }

    // Gestionnaires d'événements pour les boutons (certains sont maintenant dans l'HTML avec onclick)
    const addPersonBtn = document.getElementById('addPersonBtn');
    if (addPersonBtn) addPersonBtn.addEventListener('click', showAddPersonModal);

    const addPlanningEventBtn = document.getElementById('addPlanningEventBtn');
    if (addPlanningEventBtn) addPlanningEventBtn.addEventListener('click', () => showAddPlanningEventModal());

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', () => showExportOptionsModal('pdf'));

    const exportPngBtn = document.getElementById('exportPngBtn');
    if (exportPngBtn) exportPngBtn.addEventListener('click', () => showToast("Fonctionnalité d'export PNG à venir.", "info"));

    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportDataToJson);

    const importJsonBtn = document.getElementById('importJsonBtn');
    if (importJsonBtn) importJsonBtn.addEventListener('click', showImportModal);

    const showStatsBtn = document.getElementById('showStatsBtn');
    if (showStatsBtn) showStatsBtn.addEventListener('click', showStatsModal);

    // Bouton pour la vérification des librairies
    const checkLibsBtn = document.getElementById('checkLibsBtn');
    if (checkLibsBtn) checkLibsBtn.addEventListener('click', checkLibraryVersions);
});

// Fonctions utilitaires pour le thème
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const themeToggleButton = document.getElementById('themeToggleButton');
    if (document.body.classList.contains('dark-mode')) {
        localStorage.setItem('theme', 'dark');
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-sun"></i> Thème Clair';
    } else {
        localStorage.setItem('theme', 'light');
        if (themeToggleButton) themeToggleButton.innerHTML = '<i class="fas fa-moon"></i> Thème Sombre';
    }
}

// Gestion des Toasts (notifications)
let currentToast = null; // Pour gérer un seul toast "long" (isLoading = true)

function showToast(message, type = 'info', duration = 3000, isLoading = false) {
    const toastsContainer = document.getElementById('toastsContainer');
    // Créer le conteneur s'il n'existe pas
    if (!toastsContainer) {
        const newContainer = document.createElement('div');
        newContainer.id = 'toastsContainer';
        document.body.appendChild(newContainer);
    }

    // Si c'est un toast de chargement, on gère son unicité
    if (isLoading) {
        if (currentToast) {
            clearTimeout(currentToast.timer); // Annule la suppression automatique du précédent
            currentToast.remove(); // Supprime l'ancien toast de chargement
        }
    } else {
        // Pour les toasts non-loading, on ne supprime pas forcément l'ancien, ils peuvent s'empiler
        // Sauf si on décide d'avoir un seul toast à la fois pour tout type
        // Ici, je garde l'empilement pour les toasts "normaux"
    }
    
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.innerHTML = `
        ${isLoading ? '<i class="fas fa-hourglass-half fa-spin toast-spinner"></i>' : ''}
        <span>${message}</span>
    `;

    // Ajoute la classe 'show' pour déclencher l'animation d'apparition
    toastsContainer.appendChild(toast);
    // Force le reflow pour que la transition se déclenche
    void toast.offsetWidth;
    toast.classList.add('show'); 

    if (isLoading) {
        currentToast = toast; // Garde une référence au toast de chargement
    }

    if (duration !== 0) { // Si duration est 0, le toast reste indéfiniment (utile pour loading)
        toast.timer = setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => {
                toast.remove();
                if (currentToast === toast) { // Si c'était le toast de chargement, le réinitialiser
                    currentToast = null;
                }
            }, { once: true }); // Supprime l'écouteur après une fois
        }, duration);
    }
}

function hideToast() {
    if (currentToast) {
        currentToast.classList.add('fade-out');
        currentToast.addEventListener('transitionend', () => {
            currentToast.remove();
            currentToast = null;
        }, { once: true });
        clearTimeout(currentToast.timer); // Assurez-vous de clear le timer
    }
}


// --- Fonctions de gestion des Modales ---
function showModal(title, contentHtml, buttons = []) {
    let modal = document.getElementById('dynamicModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.classList.add('modal');
        // S'assurer que le conteneur des modales existe (à ajouter dans l'HTML si ce n'est pas le cas)
        let modalsContainer = document.getElementById('modalsContainer');
        if (!modalsContainer) {
            modalsContainer = document.createElement('div');
            modalsContainer.id = 'modalsContainer';
            document.body.appendChild(modalsContainer);
        }
        modalsContainer.appendChild(modal);
    }
    
    // Supprimer l'ancien écouteur pour éviter les doublons
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
    // Force le reflow pour que la transition se déclenche
    void modal.offsetWidth;
    modal.classList.add('show');
    document.body.style.overflow = 'hidden'; // Empêche le défilement du body

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
            if (!modal.classList.contains('show')) { // S'assurer que la transition est bien la fermeture
                modal.style.display = 'none';
                modal.innerHTML = ''; // Nettoyer le contenu
            }
        }, { once: true });
    }
    document.body.style.overflow = ''; // Rétablit le défilement du body
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

function createCheckboxGroup(name, label, options, selectedValues = [], idPrefix = '') {
    let checkboxesHtml = options.map(option => `
        <label>
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


// --- Fonctions de gestion des personnes (maintenant avec IndexedDB) ---
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

// --- Gestion des événements du calendrier (maintenant avec IndexedDB) ---
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

                return {
                    ...event,
                    title: person ? `${person.name} (${eventTypeDisplay})` : `[Inconnu] (${eventTypeDisplay})`,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    allDay: true
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
        calendar.setOption('events', eventsToShow);
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
        eventDidMount: function(info) {
            info.el.title = `${info.event.title}`;
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
        case 'permanence_backup': return 'Permanence (Backup)';
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
        { value: 'permanence_backup', label: 'Permanence (Backup)' },
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
                { label: 'Mercredi', value: '3' },
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

    const generateEvent = (start, end, recurrenceGroupId = null) => {
        // FullCalendar end is exclusive, so add 1 day to make it inclusive for single day events
        const finalEnd = end && dayjs(end).isValid() && dayjs(end).isSameOrAfter(dayjs(start)) ? dayjs(end).add(1, 'day').format('YYYY-MM-DD') : dayjs(start).add(1, 'day').format('YYYY-MM-DD');
        const eventTypeDisplay = getEventTypeDisplayName(eventType);

        return {
            id: crypto.randomUUID(),
            title: `${person.name} (${eventTypeDisplay})`,
            start: start,
            end: finalEnd,
            personId: person.id,
            type: eventType,
            backgroundColor: eventColor,
            borderColor: eventColor,
            allDay: true,
            recurrenceGroupId: recurrenceGroupId
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
            // day() returns 0 for Sunday, 1 for Monday...
            if (recurrenceDays.includes(currentDay.day())) {
                eventsToAdd.push(generateEvent(currentDay.format('YYYY-MM-DD'), currentDay.format('YYYY-MM-DD'), recurrenceGroupId));
            }
            currentDay = currentDay.add(1, 'day');
        }
    } else {
        eventsToAdd.push(generateEvent(startDate, endDate));
    }

    for (const event of eventsToAdd) {
        allCalendarEvents.push(event);
    }
    await saveCalendarEvents();
    updateCalendarEventsDisplay();
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
        { value: 'permanence_backup', label: 'Permanence (Backup)' },
        { value: 'telework_punctual', label: 'Télétravail (ponctuel)' },
        { value: 'telework_recurrent', label: 'Télétravail (récurrent)' },
        { value: 'leave', label: 'Congé' }
    ];

    const startDate = event.start ? dayjs(event.start).format('YYYY-MM-DD') : '';
    let endDate = '';
    // FullCalendar end date is exclusive, so subtract 1 day for display
    if (event.end && dayjs(event.end).isValid()) {
        const endDayjs = dayjs(event.end).subtract(1, 'day');
        // Only set if it's a multi-day event or if start and end are different after subtracting
        if (endDayjs.isSameOrAfter(dayjs(event.start))) {
            endDate = endDayjs.format('YYYY-MM-DD');
        }
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

    const eventColor = EVENT_COLORS[eventType] || '#000000';
    const eventTypeDisplay = getEventTypeDisplayName(eventType);

    // FullCalendar end is exclusive, so add 1 day to make it inclusive for single day events
    const finalEnd = endDate && dayjs(endDate).isValid() && dayjs(endDate).isSameOrAfter(dayjs(startDate)) ? dayjs(endDate).add(1, 'day').format('YYYY-MM-DD') : dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');

    const updatedEvent = {
        ...allCalendarEvents[eventIndex],
        title: `${person.name} (${eventTypeDisplay})`,
        start: startDate,
        end: finalEnd,
        personId: person.id,
        type: eventType,
        backgroundColor: eventColor,
        borderColor: eventColor,
        allDay: true
    };

    allCalendarEvents[eventIndex] = updatedEvent;
    await saveCalendarEvents();
    updateCalendarEventsDisplay();
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


// --- Exportation de données (adapté pour IndexedDB) ---
async function exportDataToJson() {
    try {
        const exportedPeople = await getAllItems(STORE_PEOPLE);
        const exportedEvents = await getAllItems(STORE_EVENTS);

        const data = {
            people: exportedPeople,
            events: exportedEvents
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

function showImportModal() {
    const content = `
        <p>Collez ici le contenu JSON exporté précédemment. Cela écrasera toutes les personnes et tous les événements existants.</p>
        ${createTextArea('importJsonData', 'Données JSON', '', 'Collez le contenu de votre fichier JSON ici...', 10)}
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
            allCalendarEvents = parsedData.events.map(event => {
                const person = people.find(p => p.id === event.personId);
                const eventColor = EVENT_COLORS[event.type] || '#000000';
                const eventTypeDisplay = getEventTypeDisplayName(event.type);
                return {
                    ...event,
                    title: person ? `${person.name} (${eventTypeDisplay})` : `[Inconnu] (${eventTypeDisplay})`,
                    backgroundColor: eventColor,
                    borderColor: eventColor,
                    allDay: true
                };
            });
            for (const event of allCalendarEvents) {
                await addItem(STORE_EVENTS, event);
            }
            updateCalendarEventsDisplay();
            showToast('Événements importés avec succès !', 'success');
        } else {
            allCalendarEvents = [];
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

// Fonction pour afficher la modale des options d'export PDF
function showExportOptionsModal(exportType) {
    if (people.length === 0) {
        showToast("Veuillez ajouter au moins une personne d'abord.", "error");
        return;
    }
    if (allCalendarEvents.length === 0) {
        showToast("Aucun événement à exporter. Veuillez ajouter des événements au calendrier.", "info");
        return;
    }

    // Valeurs par défaut pour les dates (mois courant)
    const defaultStartDate = dayjs().startOf('month').format('YYYY-MM-DD');
    const defaultEndDate = dayjs().endOf('month').format('YYYY-MM-DD');


    const content = `
        <p>Génère un PDF listant les permanences par semaine sous forme de tableau (du Lundi au Dimanche).</p>
        ${createDatePicker('pdfExportStartDate', 'Date de début de la période', defaultStartDate, true)}
        ${createDatePicker('pdfExportEndDate', 'Date de fin de la période', defaultEndDate, true)}
    `;

    const buttons = [];
    buttons.push({ text: 'Générer le PDF', onclick: `preparePdfDataAndGeneratePdf()`, class: 'button-primary' });
    buttons.push({ text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' });

    showModal('Exporter le planning des permanences (PDF)', content, buttons); 
}

// Prépare les données pour le PDF dans IndexedDB avant de générer le PDF
async function preparePdfDataAndGeneratePdf() {
    closeModal(); // Ferme la modale

    const startDateStr = document.getElementById('pdfExportStartDate').value;
    const endDateStr = document.getElementById('pdfExportEndDate').value;

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période de dates valide pour l'export PDF.", "error");
        return;
    }

    showToast("Préparation du PDF en cours... Veuillez patienter. ⏳", "info", 0, true); // Toast non-dissipable avec spinner

    try {
        await clearStore(STORE_PDF_GENERATION); // Nettoie le store temporaire

        // Agrégation des données par jour (incluant tous les jours de la semaine)
        const dailyPermanences = {}; // { 'YYYY-MM-DD': { permanence: new Set(), permanence_backup: new Set() } }
        
        // Déterminer la première date à traiter (Lundi de la semaine de startDate)
        let currentCollectionDate = dayjs(startDate).startOf('week');
        if (currentCollectionDate.day() === 0) { // Si le début de semaine est Dimanche (0), on va au lundi suivant
            currentCollectionDate = currentCollectionDate.add(1, 'day');
        }

        // Déterminer la dernière date à traiter (Dimanche de la semaine de endDate)
        const endCollectionDate = dayjs(endDate).endOf('week');

        while (currentCollectionDate.isSameOrBefore(endCollectionDate, 'day')) {
            // Initialiser tous les jours de la période de collecte, même ceux sans événement
            // pour garantir une structure de tableau complète semaine par semaine.
            dailyPermanences[currentCollectionDate.format('YYYY-MM-DD')] = { permanence: new Set(), permanence_backup: new Set() };
            currentCollectionDate = currentCollectionDate.add(1, 'day');
        }

        allCalendarEvents.forEach(event => {
            if (event.type !== 'permanence' && event.type !== 'permanence_backup') {
                return;
            }

            const person = people.find(p => p.id === event.personId);
            if (!person) return; // Personne introuvable

            const eventStartDate = dayjs(event.start);
            // FullCalendar end date is exclusive, subtract 1 day for inclusive comparison
            const eventEndDate = dayjs(event.end).subtract(1, 'day'); 

            let currentEventDay = eventStartDate;
            while (currentEventDay.isSameOrBefore(eventEndDate, 'day')) {
                const dateKey = currentEventDay.format('YYYY-MM-DD');
                // Seulement si le jour est dans la période *collectée* (pas uniquement la période d'export)
                if (dailyPermanences[dateKey]) { 
                    if (event.type === 'permanence') {
                        dailyPermanences[dateKey].permanence.add(person.name);
                    } else if (event.type === 'permanence_backup') {
                        dailyPermanences[dateKey].permanence_backup.add(person.name);
                    }
                }
                currentEventDay = currentEventDay.add(1, 'day');
            }
        });

        // Stocker les données formatées dans le store temporaire
        const orderedDates = Object.keys(dailyPermanences).sort();
        for (const dateKey of orderedDates) {
            const dayData = dailyPermanences[dateKey];
            const dayjsObj = dayjs(dateKey);
            
            const formattedDayOfWeek = dayjsObj.locale('fr').format('ddd DD/MM'); // Ex: "Lun 24/06"
            const isWeekend = (dayjsObj.day() === 0 || dayjsObj.day() === 6); // Dimanche=0, Samedi=6

            await putItem(STORE_PDF_GENERATION, {
                date: dateKey, // KeyPath
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
        hideToast(); // Masque le toast de chargement
    }
}

// Fonction pour générer le PDF du planning des permanences en tableau
async function generatePermanencePdfTable(startDate, endDate) {
    if (typeof jspdf === 'undefined' || typeof jspdf.jsPDF === 'undefined') {
        showToast("La bibliothèque jsPDF n'est pas chargée. L'export PDF est impossible.", "error", 5000);
        console.error("jsPDF is not loaded. Make sure the script is included.");
        return;
    }

    const doc = new jspdf.jsPDF('l', 'mm', 'a4'); // 'l' pour paysage
    
    const margin = 10; // mm
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const numberOfColumns = 7; // Lundi à Dimanche
    const colWidth = (pageWidth - 2 * margin) / numberOfColumns; 
    
    const lineHeight = 7; // mm par ligne de texte (dates, permanences, backups)
    const weekBlockHeight = 3 * lineHeight; // 3 lignes par semaine (Date, Perm, Backup)
    const weekSpacing = 5; // mm d'espace entre les blocs de semaines
    const headerTitleHeight = 15; // Hauteur pour le titre de la page
    const footerTextHeight = 10; // Espace pour la pagination et le timestamp

    // Couleurs spécifiques pour le PDF
    const PDF_HEADER_BG_COLOR = '#F0F0F0'; // Gris clair
    const PDF_WEEKEND_BG_COLOR = '#E5E5E5'; // Gris légèrement plus foncé pour le week-end
    const PDF_PERMANENCE_TEXT_COLOR = EVENT_COLORS.permanence;
    const PDF_BACKUP_TEXT_COLOR = EVENT_COLORS.permanence_backup;
    const PDF_DEFAULT_TEXT_COLOR = '#333333';
    const PDF_WEEKEND_TEXT_COLOR = '#808080'; // Texte gris plus clair pour le week-end

    // Fonction pour ajouter le titre de la page et les footers
    // `totalPages` est passé pour le calcul final de la pagination
    const addPageLayout = (docInstance, currentPageNum, totalPages) => {
        // En-tête
        docInstance.setFontSize(14);
        docInstance.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        docInstance.text(`Planning des Permanences : ${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`, pageWidth / 2, margin + 5, { align: 'center' });
        
        // Footer
        docInstance.setFontSize(8);
        docInstance.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        const generatedTime = dayjs().format('DD/MM/YYYY HH:mm:ss');
        docInstance.text(`Généré le: ${generatedTime} par ${APP_NAME} ${APP_VERSION}`, margin, pageHeight - margin + 3, { align: 'left' });
        docInstance.text(`Page ${currentPageNum}/${totalPages}`, pageWidth - margin, pageHeight - margin + 3, { align: 'right' });
        
        return margin + headerTitleHeight; // Retourne la position Y après l'en-tête
    };

    const pdfData = await getAllItems(STORE_PDF_GENERATION);

    // Groupement des données par semaine (7 jours par semaine)
    const weeksData = [];
    
    // Pour s'assurer que chaque semaine commence par un Lundi
    let currentWeekStart = dayjs(startDate).startOf('week'); 
    if (currentWeekStart.day() === 0) { // Si le début de semaine est Dimanche (0), on avance au Lundi
        currentWeekStart = currentWeekStart.add(1, 'day');
    }
    
    // S'assurer de capturer toutes les semaines complètes qui chevauchent la période d'export
    const endOfPeriodForWeeks = dayjs(endDate).endOf('week');

    while (currentWeekStart.isSameOrBefore(endOfPeriodForWeeks, 'day')) {
        const week = [];
        for (let i = 0; i < 7; i++) { // Pour chaque jour de la semaine (Lundi=1 à Dimanche=0)
            const currentDay = currentWeekStart.add(i, 'day');
            const dateKey = currentDay.format('YYYY-MM-DD');
            
            let dayPdfData = {
                date: dateKey,
                dayOfWeekFr: currentDay.locale('fr').format('ddd DD/MM'),
                permanenceNames: '',
                backupNames: '',
                isWeekend: (currentDay.day() === 0 || currentDay.day() === 6)
            };

            const foundData = pdfData.find(d => d.date === dateKey);

            if (foundData) {
                dayPdfData.permanenceNames = foundData.permanenceNames;
                dayPdfData.backupNames = foundData.backupNames;
            }
            
            week.push(dayPdfData);
        }
        weeksData.push(week);
        currentWeekStart = currentWeekStart.add(7, 'day'); // Passer au Lundi de la semaine suivante
    }
    
    // Filtrer les semaines qui ne contiennent aucune donnée pertinente pour la période d'export,
    // ou qui sont entièrement en dehors de la plage d'export choisie.
    const relevantWeeksData = weeksData.filter(week => {
        return week.some(dayData => {
            const dayDate = dayjs(dayData.date);
            // Le jour doit être à l'intérieur de la période d'export [startDate, endDate]
            return dayDate.isSameOrAfter(startDate, 'day') && dayDate.isSameOrBefore(endDate, 'day');
        });
    });

    if (relevantWeeksData.length === 0) {
        showToast("Aucune donnée de permanence à exporter pour la période sélectionnée.", "info", 5000);
        return;
    }

    // Calcul du nombre total de pages
    let totalPages = 0;
    let simulatedY = margin + headerTitleHeight; // Position Y de départ simulée
    for (const week of relevantWeeksData) {
        // Vérifier si cette semaine tiendra sur la page actuelle
        if (simulatedY + weekBlockHeight + weekSpacing > pageHeight - margin - footerTextHeight) {
            // Nouvelle page nécessaire
            totalPages++;
            simulatedY = margin + headerTitleHeight; // Réinitialiser Y pour la nouvelle page
        }
        simulatedY += weekBlockHeight + weekSpacing; // Avancer Y pour la semaine simulée
    }
    if (totalPages === 0) totalPages = 1; // Au moins une page même si le contenu tient entièrement

    // Supprimer la première page ajoutée par défaut et en ajouter une nouvelle pour le rendu réel
    doc.deletePage(1);
    doc.addPage();
    let currentY = addPageLayout(doc, 1, totalPages); // Dessine l'en-tête de la première page, avec le bon total de pages


    for (let i = 0; i < relevantWeeksData.length; i++) {
        const week = relevantWeeksData[i];

        // Gérer les sauts de page avant de dessiner la semaine actuelle
        if (currentY + weekBlockHeight + weekSpacing > pageHeight - margin - footerTextHeight) {
            doc.addPage();
            currentY = addPageLayout(doc, doc.internal.pages.length, totalPages); // Dessine l'en-tête de la nouvelle page
        }
        
        let tempX; // Position X pour le dessin des cellules

        // --- Ligne des Dates (avec fond coloré et texte) ---
        tempX = margin;
        doc.setFontSize(9);
        week.forEach(dayData => {
            const bgColor = dayData.isWeekend ? PDF_WEEKEND_BG_COLOR : PDF_HEADER_BG_COLOR;
            const textColor = dayData.isWeekend ? PDF_WEEKEND_TEXT_COLOR : PDF_DEFAULT_TEXT_COLOR;
            
            doc.setFillColor(bgColor);
            doc.rect(tempX, currentY, colWidth, lineHeight, 'F'); // Dessine le fond
            doc.setTextColor(textColor);
            doc.text(dayData.dayOfWeekFr, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
            tempX += colWidth;
        });
        currentY += lineHeight;

        // --- Ligne des Permanences ---
        tempX = margin;
        doc.setFontSize(10);
        week.forEach(dayData => {
            const textColor = dayData.isWeekend ? PDF_WEEKEND_TEXT_COLOR : PDF_PERMANENCE_TEXT_COLOR;
            doc.setTextColor(textColor);
            doc.text(dayData.permanenceNames, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
            tempX += colWidth;
        });
        currentY += lineHeight;

        // --- Ligne des Permanences Backup ---
        tempX = margin;
        week.forEach(dayData => {
            const textColor = dayData.isWeekend ? PDF_WEEKEND_TEXT_COLOR : PDF_BACKUP_TEXT_COLOR;
            doc.setTextColor(textColor);
            doc.text(dayData.backupNames, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
            tempX += colWidth;
        });
        currentY += lineHeight;

        currentY += weekSpacing; // Espacement après la semaine
    }

    doc.save(`planning_permanences_${startDate.format('YYYY-MM-DD')}_${endDate.format('YYYY-MM-DD')}_${dayjs().format('YYYYMMDD_HHmmss')}.pdf`);
    showToast('Le PDF du planning des permanences a été généré !', 'success');
}


// --- Fonctions pour les statistiques (v20.19) ---
function showStatsModal() {
    const currentYear = dayjs().year();
    const defaultStartDate = dayjs().startOf('year').format('YYYY-MM-DD');
    const defaultEndDate = dayjs().endOf('year').format('YYYY-MM-DD');

    const content = `
        <p>Calcule le nombre de jours de permanence par personne sur la période sélectionnée. Inclut les permanences et permanences (backup).</p>
        ${createDatePicker('statsStartDate', 'Date de début', defaultStartDate, true)}
        ${createDatePicker('statsEndDate', 'Date de fin', defaultEndDate, true)}
        <div class="form-group button-group">
            <button class="button-primary" onclick="generateAndDisplayStats()">Générer les statistiques</button>
        </div>
        <div id="statsResults" class="stats-table-container">
            </div>
    `;

    showModal('Statistiques des Permanences', content, []);
    
    // Générer les stats automatiquement à l'ouverture avec la période par défaut
    setTimeout(() => generateAndDisplayStats(), 100);
}

function generateAndDisplayStats() {
    const startDateStr = document.getElementById('statsStartDate').value;
    const endDateStr = document.getElementById('statsEndDate').value;

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période de dates valide.", "error");
        return;
    }

    // Initialiser les stats pour TOUTES les personnes
    const stats = {};
    people.forEach(person => {
        stats[person.id] = {
            name: person.name,
            permanenceDays: 0
        };
    });

    allCalendarEvents.forEach(event => {
        // Inclure 'permanence_backup' dans le calcul
        if (event.type !== 'permanence' && event.type !== 'permanence_backup') {
            return;
        }

        const eventStartDate = dayjs(event.start);
        // FullCalendar end date is exclusive, subtract 1 day for inclusive comparison
        const eventEndDate = dayjs(event.end).subtract(1, 'day');

        // Check if event overlaps with the selected stats period
        if (eventStartDate.isSameOrBefore(endDate, 'day') && eventEndDate.isSameOrAfter(startDate, 'day')) {
            const overlapStart = dayjs.max(eventStartDate, startDate);
            const overlapEnd = dayjs.min(eventEndDate, endDate);

            let currentDay = overlapStart;
            while (currentDay.isSameOrBefore(overlapEnd, 'day')) {
                const personStat = stats[event.personId];
                if (personStat) {
                    personStat.permanenceDays++;
                }
                currentDay = currentDay.add(1, 'day');
            }
        }
    });

    displayStatsTable(stats);
}

function displayStatsTable(stats) {
    const statsResultsDiv = document.getElementById('statsResults');
    if (!statsResultsDiv) return;

    let tableHtml = `
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Jours de Permanence</th>
                </tr>
            </thead>
            <tbody>
    `;

    // Afficher toutes les personnes, même si permanenceDays est à 0
    // Trier les personnes par nom avant d'afficher
    const sortedPeopleStats = Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));

    sortedPeopleStats.forEach(stat => {
        tableHtml += `
            <tr>
                <td>${stat.name}</td>
                <td>${stat.permanenceDays}</td>
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

    // Récupérer les dates de début et de fin de la période de stats
    const startDate = document.getElementById('statsStartDate').value;
    const endDate = document.getElementById('statsEndDate').value;

    let csv = [];
    // Ajouter l'en-tête spécifique
    csv.push(`Export permanence électrique du ${dayjs(startDate).format('DD/MM/YYYY')} au ${dayjs(endDate).format('DD/MM/YYYY')}`);
    csv.push(''); // Ligne vide pour la séparation

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
    showToast('Statistiques de permanence exportées en CSV !', 'success');
}


// --- Outil de Vérification des Librairies (NOUVEAU) ---

function compareVersions(current, expected) {
    if (!current || !expected) return 'unknown'; // Si une version est manquante

    const currentParts = current.split('.').map(Number);
    const expectedParts = expected.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, expectedParts.length); i++) {
        const p1 = currentParts[i] || 0;
        const p2 = expectedParts[i] || 0;

        if (p1 > p2) return 'newer';
        if (p1 < p2) return 'older';
    }
    return 'ok'; // Les versions sont identiques
}

function checkLibraryVersions() {
    const results = [];

    // FullCalendar
    let fcVersion = 'Non détectée';
    if (typeof FullCalendar !== 'undefined' && FullCalendar.version) {
        fcVersion = FullCalendar.version;
    }
    results.push({
        name: 'FullCalendar',
        current: fcVersion,
        expected: EXPECTED_LIB_VERSIONS.FullCalendar,
        status: compareVersions(fcVersion, EXPECTED_LIB_VERSIONS.FullCalendar)
    });

    // Day.js
    let dayjsVersion = 'Non détectée';
    if (typeof dayjs !== 'undefined' && dayjs.version) {
        dayjsVersion = dayjs.version;
    }
    results.push({
        name: 'Day.js',
        current: dayjsVersion,
        expected: EXPECTED_LIB_VERSIONS.Day.js,
        status: compareVersions(dayjsVersion, EXPECTED_LIB_VERSIONS.Day.js)
    });

    // jsPDF
    let jspdfVersion = 'Non détectée';
    if (typeof jspdf !== 'undefined' && jspdf.jsPDF && jspdf.jsPDF.version) {
        jspdfVersion = jspdf.jsPDF.version;
    } else if (typeof jspdf !== 'undefined' && jspdf.version) { // Parfois la version est directement sur l'objet jspdf
        jspdfVersion = jspdf.version;
    }
    results.push({
        name: 'jsPDF',
        current: jspdfVersion,
        expected: EXPECTED_LIB_VERSIONS.jsPDF,
        status: compareVersions(jspdfVersion, EXPECTED_LIB_VERSIONS.jsPDF)
    });

    displayLibraryCheckResults(results);
}

function displayLibraryCheckResults(results) {
    let content = `<p>Voici l'état des versions des librairies utilisées par l'application :</p>`;
    let allOk = true;

    content += `
        <table class="library-check-table">
            <thead>
                <tr>
                    <th>Librairie</th>
                    <th>Version Actuelle</th>
                    <th>Version Attendue</th>
                    <th>Statut</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach(lib => {
        let statusText = '';
        let statusClass = '';
        switch (lib.status) {
            case 'ok':
                statusText = 'À jour';
                statusClass = 'status-ok';
                break;
            case 'newer':
                statusText = 'Plus récent';
                statusClass = 'status-ok'; // Généralement OK, mais à noter
                break;
            case 'older':
                statusText = 'Obsolète';
                statusClass = 'status-warn';
                allOk = false;
                break;
            case 'unknown':
            default:
                statusText = 'Non détectée / Erreur';
                statusClass = 'status-error';
                allOk = false;
                break;
        }

        content += `
            <tr>
                <td>${lib.name}</td>
                <td>${lib.current}</td>
                <td>${lib.expected}</td>
                <td class="${statusClass}">${statusText}</td>
            </tr>
        `;
    });

    content += `
            </tbody>
        </table>
    `;

    if (!allOk) {
        content += `<p style="margin-top: 15px; color: ${allOk ? 'inherit' : 'var(--toast-error-bg)'};">
            Il est recommandé de mettre à jour les librairies obsolètes pour des raisons de sécurité, de performance et de compatibilité.
        </p>`;
    } else {
        content += `<p style="margin-top: 15px; color: var(--toast-success-bg);">Toutes les librairies sont à jour !</p>`;
    }

    createAndShowModal(
        'Vérification des Librairies',
        content,
        null, null, // Pas de bouton principal
        'Fermer', 'closeModal()'
    );
}
