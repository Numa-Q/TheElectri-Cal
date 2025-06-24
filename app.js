// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.41"; // INCEMENTATION : Fix PDF (Lun-Ven, pagination), Fix CSS sidebar buttons/list
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
const DB_VERSION = 1;
const STORE_PEOPLE = 'people';
const STORE_EVENTS = 'events';
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
            themeToggleButton.textContent = 'Thème Clair';
        } else {
            themeToggleButton.textContent = 'Thème Sombre';
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
    if (exportPngBtn) exportPngBtn.addEventListener('click', () => showToast("Fonctionnalité à venir.", "info"));

    const exportJsonBtn = document.getElementById('exportJsonBtn');
    if (exportJsonBtn) exportJsonBtn.addEventListener('click', exportDataToJson);

    const importJsonBtn = document.getElementById('importJsonBtn');
    if (importJsonBtn) importJsonBtn.addEventListener('click', showImportModal);

    const showStatsBtn = document.getElementById('showStatsBtn');
    if (showStatsBtn) showStatsBtn.addEventListener('click', showStatsModal);
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
let currentToast = null; // Pour gérer un seul toast à la fois

function showToast(message, type = 'info', duration = 3000) {
    const toastsContainer = document.getElementById('toastsContainer');
    if (!toastsContainer) return;

    // Supprime le toast précédent s'il existe
    if (currentToast) {
        currentToast.remove();
        clearTimeout(currentToast.timer);
    }

    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;

    toastsContainer.appendChild(toast);
    currentToast = toast;

    if (duration !== 0) { // Si duration est 0, le toast reste indéfiniment
        currentToast.timer = setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => {
                toast.remove();
                if (currentToast === toast) { // Évite de supprimer un nouveau toast
                    currentToast = null;
                }
            });
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
        `editPerson('${personId}')`
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
        `deletePerson('${personId}')`,
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
        const finalEnd = end ? dayjs(end).add(1, 'day').format('YYYY-MM-DD') : dayjs(start).add(1, 'day').format('YYYY-MM-DD');
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

    const eventColor = EVENT_COLORS[eventType] || '#000000';
    const eventTypeDisplay = getEventTypeDisplayName(eventType);

    const finalEnd = endDate ? dayjs(endDate).add(1, 'day').format('YYYY-MM-DD') : dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');

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

// MODIFIÉ : Fonction pour afficher la modale des options d'export (spécifique au nouveau PDF)
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
        <p>Génère un PDF listant les permanences par semaine sous forme de tableau (du Lundi au Vendredi).</p>
        ${createDatePicker('pdfExportStartDate', 'Date de début de la période', defaultStartDate, true)}
        ${createDatePicker('pdfExportEndDate', 'Date de fin de la période', defaultEndDate, true)}
    `;

    const buttons = [];
    buttons.push({ text: 'Générer le PDF', onclick: `generatePermanencePdfTable()`, class: 'button-primary' });
    buttons.push({ text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' });

    showModal('Exporter le planning des permanences (PDF)', content, buttons); 
}

// MODIFIÉ : Fonction pour générer le PDF du planning des permanences en tableau
function generatePermanencePdfTable() {
    closeModal(); // Ferme la modale

    const startDateStr = document.getElementById('pdfExportStartDate').value;
    const endDateStr = document.getElementById('pdfExportEndDate').value;

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
        showToast("Veuillez sélectionner une période de dates valide pour l'export PDF.", "error");
        return;
    }

    if (typeof jspdf === 'undefined') {
        showToast("La bibliothèque jsPDF n'est pas chargée. L'export PDF est impossible.", "error", 5000);
        console.error("jsPDF is not loaded. Make sure the script is included.");
        return;
    }

    const doc = new jspdf.jsPDF('p', 'mm', 'a4');
    doc.setFont('helvetica'); // Use a standard font

    const margin = 10; // mm
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const colWidth = (pageWidth - 2 * margin) / 5; // Toujours 5 colonnes pour Lun-Ven
    const lineHeight = 7; // mm par ligne de texte (dates, permanences, backups)
    const weekBlockHeight = 3 * lineHeight; // 3 lignes par semaine
    const weekSpacing = 5; // mm d'espace entre les blocs de semaines
    const footerHeight = 10; // Espace pour la pagination et le timestamp

    // Couleurs spécifiques pour le PDF
    const PDF_HEADER_BG_COLOR = '#F0F0F0'; // Gris clair
    const PDF_PERMANENCE_TEXT_COLOR = EVENT_COLORS.permanence;
    const PDF_BACKUP_TEXT_COLOR = EVENT_COLORS.permanence_backup;
    const PDF_DEFAULT_TEXT_COLOR = '#333333';

    let currentY = margin;

    // Fonction pour ajouter le titre de la page et les footers
    // `totalPages` sera mis à jour lors du deuxième passage
    const addPageLayout = (docInstance, pageNum, totalPages) => {
        // En-tête
        docInstance.setFontSize(14);
        docInstance.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        docInstance.text(`Planning des Permanences : ${startDate.format('DD/MM/YYYY')} - ${endDate.format('DD/MM/YYYY')}`, pageWidth / 2, margin + 5, { align: 'center' });
        
        // Pied de page (position ajustée)
        docInstance.setFontSize(8);
        docInstance.setTextColor(PDF_DEFAULT_TEXT_COLOR);
        const generatedTime = dayjs().format('DD/MM/YYYY HH:mm');
        docInstance.text(`Généré le: ${generatedTime}`, margin, pageHeight - margin + 3, { align: 'left' });
        docInstance.text(`Page ${pageNum}/${totalPages || 0}`, pageWidth - margin, pageHeight - margin + 3, { align: 'right' });
        
        return margin + 15; // Retourne la position Y après l'en-tête
    };

    // Agrégation des données par jour (Lun-Ven uniquement, dans la période d'export)
    const dailyPermanences = {}; // { 'YYYY-MM-DD': { permanence: new Set(), permanence_backup: new Set() } }
    let tempDate = dayjs(startDate);
    while (tempDate.isSameOrBefore(endDate, 'day')) {
        // Collecter les données uniquement pour les jours de semaine (Lundi=1 à Vendredi=5)
        if (tempDate.weekday() >= 1 && tempDate.weekday() <= 5) {
            dailyPermanences[tempDate.format('YYYY-MM-DD')] = { permanence: new Set(), permanence_backup: new Set() };
        }
        tempDate = tempDate.add(1, 'day');
    }

    allCalendarEvents.forEach(event => {
        if (event.type !== 'permanence' && event.type !== 'permanence_backup') {
            return;
        }

        const person = people.find(p => p.id === event.personId);
        if (!person) return; // Personne introuvable

        const eventStartDate = dayjs(event.start);
        const eventEndDate = dayjs(event.end).subtract(1, 'day'); // FullCalendar end date is exclusive

        let day = dayjs.max(eventStartDate, startDate);
        let loopEndDate = dayjs.min(eventEndDate, endDate);

        while (day.isSameOrBefore(loopEndDate, 'day')) {
            // Ajouter les événements uniquement pour les jours de semaine (Lundi=1 à Vendredi=5)
            if (day.weekday() >= 1 && day.weekday() <= 5) {
                const dateKey = day.format('YYYY-MM-DD');
                if (dailyPermanences[dateKey]) { // S'assurer que le jour est dans la période d'export collectée
                    if (event.type === 'permanence') {
                        dailyPermanences[dateKey].permanence.add(person.name);
                    } else if (event.type === 'permanence_backup') {
                        dailyPermanences[dateKey].permanence_backup.add(person.name);
                    }
                }
            }
            day = day.add(1, 'day');
        }
    });

    // --- Rendu du contenu dans le PDF (Premier passage pour calculer les pages) ---
    pageNum = 1;
    currentY = addPageLayout(doc, pageNum, 0); // Dessine l'en-tête de la première page

    let iterWeek = dayjs(startDate).startOf('week', { weekStart: 1 }); // Commence au Lundi de la semaine de startDate
    const endOfRange = dayjs(endDate); // La fin de la période d'export

    // Itère semaine par semaine jusqu'à ce que le Lundi de la semaine dépasse la fin de la période
    while (iterWeek.isSameOrBefore(endOfRange.endOf('week'), 'day')) {
        
        // Gérer les sauts de page avant de dessiner la semaine actuelle
        if (currentY + weekBlockHeight + weekSpacing > pageHeight - margin - footerHeight) {
            doc.addPage();
            pageNum++;
            currentY = addPageLayout(doc, pageNum, 0); // Dessine l'en-tête de la nouvelle page
        }
        
        let tempX; // Position X pour le dessin des cellules

        // Préparer les données pour les 5 jours de la semaine à rendre
        const renderedWeekDays = [];
        const renderedPermanence = [];
        const renderedBackup = [];
        let weekContainsDataForPeriod = false; // Indicateur pour savoir si la semaine a des données dans la plage de l'utilisateur

        for (let i = 0; i < 5; i++) { // Toujours 5 jours : Lundi à Vendredi
            const currentDay = iterWeek.add(i, 'day');
            const dateKey = currentDay.format('YYYY-MM-DD');

            // En-tête des jours : toujours affiché pour Lun-Ven de la semaine en cours
            renderedWeekDays.push(currentDay.locale('fr').format('ddd DD/MM'));

            // Récupérer les données de permanence si le jour est dans la période sélectionnée
            if (currentDay.isBetween(startDate, endDate, 'day', '[]')) {
                if (dailyPermanences[dateKey]) { // Si des données ont été collectées pour ce jour de semaine
                    const perms = Array.from(dailyPermanences[dateKey].permanence).join(', ');
                    const backups = Array.from(dailyPermanences[dateKey].permanence_backup).join(', ');
                    renderedPermanence.push(perms);
                    renderedBackup.push(backups);
                    if (perms || backups) weekContainsDataForPeriod = true; // Marque la semaine si elle contient des données réelles
                } else {
                    // Ce cas ne devrait pas arriver pour Lun-Ven si dailyPermanences est correctement pré-rempli
                    renderedPermanence.push('');
                    renderedBackup.push('');
                }
            } else {
                // Jour hors de la période d'export sélectionnée par l'utilisateur, pas de données
                renderedPermanence.push('');
                renderedBackup.push('');
            }
        }
        
        // Dessiner la semaine seulement si elle contient des données pour la période sélectionnée,
        // ou si c'est la semaine de début/fin de la période.
        const isStartWeekOfPeriod = iterWeek.isSame(startDate, 'week');
        const isEndWeekOfPeriod = iterWeek.isSame(endDate, 'week');

        if (weekContainsDataForPeriod || isStartWeekOfPeriod || isEndWeekOfPeriod) {
            // --- Ligne des Dates (avec fond coloré) ---
            tempX = margin;
            doc.setFillColor(PDF_HEADER_BG_COLOR);
            doc.rect(margin, currentY, pageWidth - 2 * margin, lineHeight, 'F'); // Dessine le fond
            doc.setFontSize(9);
            doc.setTextColor(PDF_DEFAULT_TEXT_COLOR); // Texte des dates
            renderedWeekDays.forEach(dateText => {
                doc.text(dateText, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
                tempX += colWidth;
            });
            currentY += lineHeight;

            // --- Ligne des Permanences ---
            tempX = margin;
            doc.setFontSize(10);
            doc.setTextColor(PDF_PERMANENCE_TEXT_COLOR); // Texte des permanences
            renderedPermanence.forEach(permanenceText => {
                doc.text(permanenceText, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
                tempX += colWidth;
            });
            currentY += lineHeight;

            // --- Ligne des Permanences Backup ---
            tempX = margin;
            doc.setTextColor(PDF_BACKUP_TEXT_COLOR); // Texte des backups
            renderedBackup.forEach(backupText => {
                doc.text(backupText, tempX + colWidth / 2, currentY + lineHeight / 2 + 1, { align: 'center', maxWidth: colWidth - 2 });
                tempX += colWidth;
            });
            currentY += lineHeight;

            currentY += weekSpacing; // Espacement après la semaine
        }
        
        iterWeek = iterWeek.add(1, 'week'); // Passer à la semaine suivante
    }

    // --- Deuxième passage pour ajouter la pagination et l'horodatage corrects ---
    const totalPages = doc.internal.pages.length;
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        addPageLayout(doc, i, totalPages); // Redessine le pied de page avec le nombre total de pages correct
    }

    doc.save(`planning_permanences_${startDate.format('YYYY-MM-DD')}_${endDate.format('YYYY-MM-DD')}.pdf`);
    showToast('Le PDF du planning des permanences a été généré !', 'success');
}


// --- Nouvelles fonctions pour les statistiques (v20.19) ---
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

    // Pas de boutons dans le footer de la modale principale pour laisser place aux boutons internes
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
    URL.revokeObjectURL(url);
    showToast('Statistiques de permanence exportées en CSV !', 'success');
}
