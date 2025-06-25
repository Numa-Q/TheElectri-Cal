// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.48.11"; // INCEMENTATION : Correction XSS (échappement HTML)

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

// Fonction utilitaire pour échapper les caractères HTML
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}


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
                db.createObjectStore(STORE_PDF_GENERATION, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error("Erreur d'ouverture de la base de données :", event.target.errorCode);
            reject("Erreur d'ouverture de la base de données.");
        };
    });
}

// Fonction générique pour ajouter ou mettre à jour un objet dans IndexedDB
function addOrUpdateObject(storeName, object) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(object);

        request.onsuccess = () => resolve(object);
        request.onerror = (event) => {
            console.error(`Erreur d'ajout/mise à jour dans ${storeName} :`, event.target.errorCode);
            reject(`Erreur d'ajout/mise à jour dans ${storeName}.`);
        };
    });
}

// Fonction générique pour récupérer tous les objets d'un store
function getAllObjects(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => resolve(event.target.result);
        request.onerror = (event) => {
            console.error(`Erreur de récupération dans ${storeName} :`, event.target.errorCode);
            reject(`Erreur de récupération dans ${storeName}.`);
        };
    });
}

// Fonction générique pour supprimer un objet d'un store par sa clé
function deleteObject(storeName, key) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(key);

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Erreur de suppression dans ${storeName} :`, event.target.errorCode);
            reject(`Erreur de suppression dans ${storeName}.`);
        };
    });
}

// Fonction pour effacer tous les objets d'un store
function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([storeName], 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.clear();

        request.onsuccess = () => resolve();
        request.onerror = (event) => {
            console.error(`Erreur d'effacement du store ${storeName} :`, event.target.errorCode);
            reject(`Erreur d'effacement du store ${storeName}.`);
        };
    });
}

// --- Modale Générique ---
function showModal(title, contentHtml, buttons) {
    const modalsContainer = document.getElementById('modalsContainer');
    modalsContainer.innerHTML = `
        <div class="modal-backdrop">
            <div class="modal-content glass-effect">
                <div class="modal-header">
                    <h2>${title}</h2>
                    <button class="close-button" onclick="closeModal()">&times;</button>
                </div>
                <div class="modal-body">
                    ${contentHtml}
                </div>
                <div class="modal-footer button-group">
                    ${buttons.map(button => `<button class="${button.class}" onclick="${button.onclick}">${button.text}</button>`).join('')}
                </div>
            </div>
        </div>
    `;
    modalsContainer.style.display = 'flex';
}

function closeModal() {
    const modalsContainer = document.getElementById('modalsContainer');
    modalsContainer.style.display = 'none';
    modalsContainer.innerHTML = '';
}

// --- Toasts (Notifications) ---
function showToast(message, type = 'info', isLoading = false) {
    const toastsContainer = document.getElementById('toastsContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        ${isLoading ? '<i class="fas fa-hourglass-half fa-spin toast-spinner"></i>' : ''}
        <span>${escapeHtml(message)}</span>
    `;
    toastsContainer.appendChild(toast);

    if (!isLoading) {
        setTimeout(() => {
            toast.classList.add('hide');
            toast.addEventListener('transitionend', () => toast.remove());
        }, 3000);
    }
    return toast; // Permet de manipuler le toast (ex: le supprimer) si isLoading est vrai
}

function removeToast(toastElement) {
    if (toastElement) {
        toastElement.classList.add('hide');
        toastElement.addEventListener('transitionend', () => toastElement.remove());
    }
}

// --- Fonctions utilitaires de création de champs de formulaire ---
function createInput(id, label, type = 'text', value = '', placeholder = '', required = false, min = '', max = '') {
    const requiredAttr = required ? 'required' : '';
    const minAttr = min !== '' ? `min="${min}"` : '';
    const maxAttr = max !== '' ? `max="${max}"` : '';
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' <span class="required">*</span>' : ''}</label>
            <input type="${type}" id="${id}" value="${value}" placeholder="${placeholder}" ${requiredAttr} ${minAttr} ${maxAttr}>
        </div>
    `;
}

function createTextArea(id, label, value = '', placeholder = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' <span class="required">*</span>' : ''}</label>
            <textarea id="${id}" placeholder="${placeholder}" ${requiredAttr}>${value}</textarea>
        </div>
    `;
}

function createSelectInput(id, label, options, selectedValue = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    const optionsHtml = options.map(option => `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.text}</option>`).join('');
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' <span class="required">*</span>' : ''}</label>
            <select id="${id}" ${requiredAttr}>${optionsHtml}</select>
        </div>
    `;
}

function createCheckboxGroup(name, label, options, selectedValues = []) {
    const checkboxesHtml = options.map(option => `
        <label class="checkbox-label">
            <input type="checkbox" name="${name}" value="${option.value}" ${selectedValues.includes(option.value) ? 'checked' : ''}>
            ${option.text}
        </label>
    `).join('');
    return `
        <div class="form-group">
            <label>${label}</label>
            <div class="checkbox-group">
                ${checkboxesHtml}
            </div>
        </div>
    `;
}

// --- Gestion des personnes ---
function showAddPersonModal() {
    showModal(
        'Ajouter une nouvelle personne',
        createInput('personName', 'Nom de la personne', 'text', '', 'Ex: John Doe', true) +
        createInput('personColor', 'Couleur associée (Hex ou Nom)', 'color', '#007bff', 'Optionnel'),
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Ajouter', onclick: 'addPerson()', class: 'button-primary' }
        ]
    );
}

async function addPerson() {
    const name = document.getElementById('personName').value.trim();
    const color = document.getElementById('personColor').value;

    if (!name) {
        showToast("Le nom de la personne est requis.", "error");
        return;
    }

    if (people.some(p => p.name.toLowerCase() === name.toLowerCase())) {
        showToast(`Une personne nommée "${escapeHtml(name)}" existe déjà.`, "error");
        return;
    }

    const newPerson = {
        id: crypto.randomUUID(),
        name: name,
        color: color || null,
        isVisible: true
    };

    try {
        await addOrUpdateObject(STORE_PEOPLE, newPerson);
        people.push(newPerson);
        renderPeopleList();
        closeModal();
        calendar.refetchEvents(); // Recharger les événements pour inclure les nouveaux filtres/personnes
        showToast(`Personne "${escapeHtml(name)}" ajoutée !`, 'success');
    } catch (error) {
        showToast("Erreur lors de l'ajout de la personne.", "error");
        console.error(error);
    }
}

function renderPeopleList() {
    const peopleListUl = document.getElementById('peopleList');
    peopleListUl.innerHTML = ''; // Nettoyer la liste existante

    people.forEach(person => {
        const li = document.createElement('li');
        li.className = 'person-item';
        li.innerHTML = `
            <span class="person-name-wrapper">
                <input type="checkbox" id="person-${person.id}" class="person-visibility-toggle" data-person-id="${person.id}" ${person.isVisible ? 'checked' : ''}>
                <label for="person-${person.id}" class="person-label">
                    <span class="person-name" style="${person.color ? `border-left: 5px solid ${person.color}; padding-left: 5px;` : ''}">${escapeHtml(person.name)}</span>
                </label>
            </span>
            <div class="person-actions">
                <button class="edit-person-btn" data-id="${person.id}" title="Modifier ${escapeHtml(person.name)}"><i class="fas fa-edit"></i></button>
                <button class="delete-person-btn" data-id="${person.id}" title="Supprimer ${escapeHtml(person.name)}"><i class="fas fa-trash"></i></button>
            </div>
        `;
        peopleListUl.appendChild(li);
    });

    // Attacher les écouteurs d'événements après le rendu
    peopleListUl.querySelectorAll('.person-visibility-toggle').forEach(checkbox => {
        checkbox.removeEventListener('change', togglePersonVisibility); // Éviter les doubles écouteurs
        checkbox.addEventListener('change', togglePersonVisibility);
    });

    peopleListUl.querySelectorAll('.edit-person-btn').forEach(button => {
        button.removeEventListener('click', handleEditPerson);
        button.addEventListener('click', handleEditPerson);
    });

    peopleListUl.querySelectorAll('.delete-person-btn').forEach(button => {
        button.removeEventListener('click', handleDeletePerson);
        button.addEventListener('click', handleDeletePerson);
    });
}

function handleEditPerson(event) {
    const personId = event.currentTarget.dataset.id;
    const person = people.find(p => p.id === personId);
    if (person) {
        showEditPersonModal(person);
    }
}

function handleDeletePerson(event) {
    const personId = event.currentTarget.dataset.id;
    const person = people.find(p => p.id === personId);
    if (person) {
        showDeletePersonConfirm(person);
    }
}

function showEditPersonModal(person) {
    showModal(
        `Modifier ${escapeHtml(person.name)}`,
        createInput('editPersonId', '', 'hidden', person.id) +
        createInput('editPersonName', 'Nom de la personne', 'text', person.name, 'Ex: John Doe', true) +
        createInput('editPersonColor', 'Couleur associée (Hex ou Nom)', 'color', person.color || '#007bff', 'Optionnel'),
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Enregistrer', onclick: 'editPerson()', class: 'button-primary' }
        ]
    );
}

async function editPerson() {
    const id = document.getElementById('editPersonId').value;
    const newName = document.getElementById('editPersonName').value.trim();
    const newColor = document.getElementById('editPersonColor').value;

    if (!newName) {
        showToast("Le nom de la personne est requis.", "error");
        return;
    }

    const oldPersonIndex = people.findIndex(p => p.id === id);
    if (oldPersonIndex === -1) {
        showToast("Personne introuvable.", "error");
        return;
    }

    const oldName = people[oldPersonIndex].name;

    if (people.some(p => p.name.toLowerCase() === newName.toLowerCase() && p.id !== id)) {
        showToast(`Une autre personne nommée "${escapeHtml(newName)}" existe déjà.`, "error");
        return;
    }

    const updatedPerson = {
        ...people[oldPersonIndex],
        name: newName,
        color: newColor || null
    };

    try {
        await addOrUpdateObject(STORE_PEOPLE, updatedPerson);
        people[oldPersonIndex] = updatedPerson; // Mettre à jour dans le tableau en mémoire
        renderPeopleList();
        closeModal();
        calendar.refetchEvents(); // Recharger les événements pour refléter le changement de nom/couleur
        showToast(`Personne "${escapeHtml(oldName)}" modifiée en "${escapeHtml(newName)}" !`, 'success');
    } catch (error) {
        showToast("Erreur lors de la modification de la personne.", "error");
        console.error(error);
    }
}

function showDeletePersonConfirm(person) {
    showModal(
        `Supprimer ${escapeHtml(person.name)}`,
        `<p>Êtes-vous sûr de vouloir supprimer la personne "${escapeHtml(person.name)}" ?</p><p>Cela supprimera également tous les événements de permanence qui lui sont associés.</p>`,
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Supprimer', onclick: `deletePerson('${person.id}')`, class: 'button-danger' }
        ]
    );
}

async function deletePerson(personId) {
    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast("Personne introuvable.", "error");
        return;
    }

    try {
        await deleteObject(STORE_PEOPLE, personId);
        people = people.filter(p => p.id !== personId); // Supprimer de la mémoire

        // Supprimer tous les événements associés à cette personne
        const eventsToDelete = allCalendarEvents.filter(event => event.personId === personId);
        for (const event of eventsToDelete) {
            await deleteObject(STORE_EVENTS, event.id);
        }
        allCalendarEvents = allCalendarEvents.filter(event => event.personId !== personId); // Supprimer de la mémoire
        
        renderPeopleList();
        closeModal();
        calendar.refetchEvents(); // Recharger les événements
        showToast(`Personne "${escapeHtml(person.name)}" supprimée.`, 'info');
    } catch (error) {
        showToast("Erreur lors de la suppression de la personne et de ses événements.", "error");
        console.error(error);
    }
}

async function togglePersonVisibility(event) {
    const personId = event.target.dataset.personId;
    const isVisible = event.target.checked;
    const personIndex = people.findIndex(p => p.id === personId);

    if (personIndex !== -1) {
        people[personIndex].isVisible = isVisible;
        try {
            await addOrUpdateObject(STORE_PEOPLE, people[personIndex]);
            calendar.refetchEvents(); // Recharger les événements pour appliquer le filtre de visibilité
            // showToast(`Visibilité de ${people[personIndex].name} : ${isVisible ? 'Activée' : 'Désactivée'}`, 'info');
        } catch (error) {
            showToast("Erreur lors de la mise à jour de la visibilité.", "error");
            console.error(error);
        }
    }
}


// --- Gestion des événements de planification ---
function showAddPlanningEventModal() {
    const peopleOptions = people.map(p => ({ value: p.id, text: p.name }));
    const eventTypes = [
        { value: 'permanence', text: 'Permanence' },
        { value: 'permanence_backup', text: 'Permanence Backup' },
        { value: 'telework_punctual', text: 'Télétravail (Ponctuel)' },
        { value: 'telework_recurrent', text: 'Télétravail (Récurrent)' },
        { value: 'leave', text: 'Congés' }
    ];

    const today = dayjs().format('YYYY-MM-DD');

    showModal(
        'Ajouter un événement de planification',
        createSelectInput('eventPersonId', 'Personne concernée', peopleOptions, '', true) +
        createSelectInput('eventType', 'Type d\'événement', eventTypes, '', true) +
        createInput('eventStartDate', 'Date de début', 'date', today, '', true) +
        createInput('eventEndDate', 'Date de fin', 'date', today, '', true) +
        createCheckboxGroup('recurrence', 'Récurrence', [
            { value: 'daily', text: 'Quotidienne' },
            { value: 'weekly', text: 'Hebdomadaire' },
            { value: 'monthly', text: 'Mensuelle' },
            { value: 'yearly', text: 'Annuelle' }
        ]) +
        createInput('recurrenceUntil', 'Répéter jusqu\'à (date)', 'date', '', 'Optionnel, pour les récurrences'),
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Ajouter', onclick: 'addPlanningEvent()', class: 'button-primary' }
        ]
    );
}

async function addPlanningEvent() {
    const personId = document.getElementById('eventPersonId').value;
    const eventType = document.getElementById('eventType').value;
    const startDate = dayjs(document.getElementById('eventStartDate').value);
    let endDate = dayjs(document.getElementById('eventEndDate').value); // Permettre modification si récurrence

    if (!personId || !eventType || !startDate.isValid() || !endDate.isValid()) {
        showToast("Veuillez remplir tous les champs requis pour l'événement.", "error");
        return;
    }

    if (startDate.isAfter(endDate)) {
        showToast("La date de fin ne peut pas être antérieure à la date de début.", "error");
        return;
    }

    const selectedRecurrence = Array.from(document.querySelectorAll('input[name="recurrence"]:checked')).map(cb => cb.value);
    const recurrenceUntil = document.getElementById('recurrenceUntil').value;
    const recurrenceUntilDate = recurrenceUntil ? dayjs(recurrenceUntil) : null;

    if (selectedRecurrence.length > 0 && recurrenceUntilDate && startDate.isAfter(recurrenceUntilDate)) {
        showToast("La date de fin de récurrence ne peut pas être antérieure à la date de début de l'événement.", "error");
        return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast("Personne introuvable.", "error");
        return;
    }

    const baseEvent = {
        personId: person.id,
        type: eventType,
        backgroundColor: EVENT_COLORS[eventType] || '#808080',
        borderColor: EVENT_COLORS[eventType] || '#808080',
        allDay: true,
        recurrenceGroupId: null // Sera rempli pour les événements récurrents
    };

    const eventsToAdd = [];
    const eventTypeDisplay = eventTypes.find(type => type.value === eventType)?.text;

    if (selectedRecurrence.length > 0) {
        const recurrenceGroupId = crypto.randomUUID();
        let currentDate = startDate.clone();
        let loopCount = 0;
        const maxLoop = 365 * 5; // Limite pour éviter les boucles infinies

        while (currentDate.isSameOrBefore(endDate) || (recurrenceUntilDate && currentDate.isSameOrBefore(recurrenceUntilDate))) {
            if (loopCount++ > maxLoop) {
                showToast("Trop d'événements générés par la récurrence. Vérifiez vos dates.", "error");
                break;
            }

            const eventStart = currentDate.format('YYYY-MM-DD');
            const eventEnd = currentDate.add(endDate.diff(startDate, 'day'), 'day').format('YYYY-MM-DD'); // Conserver la durée

            eventsToAdd.push({
                ...baseEvent,
                id: crypto.randomUUID(),
                title: `${escapeHtml(person.name)} (${eventTypeDisplay})`,
                start: eventStart,
                end: eventEnd,
                recurrenceGroupId: recurrenceGroupId
            });

            // Avancer la date pour la prochaine occurrence
            if (selectedRecurrence.includes('daily')) {
                currentDate = currentDate.add(1, 'day');
            } else if (selectedRecurrence.includes('weekly')) {
                currentDate = currentDate.add(1, 'week');
            } else if (selectedRecurrence.includes('monthly')) {
                currentDate = currentDate.add(1, 'month');
            } else if (selectedRecurrence.includes('yearly')) {
                currentDate = currentDate.add(1, 'year');
            } else {
                // Si aucune récurrence valide, sortir de la boucle
                break;
            }
        }
    } else {
        // Événement non récurrent
        eventsToAdd.push({
            ...baseEvent,
            id: crypto.randomUUID(),
            title: `${escapeHtml(person.name)} (${eventTypeDisplay})`,
            start: startDate.format('YYYY-MM-DD'),
            end: endDate.format('YYYY-MM-DD')
        });
    }

    if (eventsToAdd.length === 0) {
        showToast("Aucun événement à ajouter. Vérifiez les dates de récurrence.", "error");
        return;
    }

    const toast = showToast("Ajout des événements...", "info", true);
    try {
        for (const event of eventsToAdd) {
            await addOrUpdateObject(STORE_EVENTS, event);
            allCalendarEvents.push(event); // Ajouter à la liste en mémoire
        }
        closeModal();
        calendar.refetchEvents();
        removeToast(toast);
        showToast(`Événement(s) pour ${escapeHtml(person.name)} ajouté(s) !`, 'success');
    } catch (error) {
        removeToast(toast);
        showToast("Erreur lors de l'ajout des événements.", "error");
        console.error(error);
    }
}

async function fetchEvents() {
    try {
        allCalendarEvents = await getAllObjects(STORE_EVENTS);
        calendar.refetchEvents(); // Demander à FullCalendar de recharger les événements
    } catch (error) {
        showToast("Erreur lors du chargement des événements.", "error");
        console.error(error);
    }
}

// FullCalendar exige une fonction qui retourne les événements
// C'est ici que nous appliquons le filtrage par visibilité
function getFilteredEvents(fetchInfo, successCallback, failureCallback) {
    const visiblePeopleIds = new Set(people.filter(p => p.isVisible).map(p => p.id));
    const events = allCalendarEvents.filter(event => visiblePeopleIds.has(event.personId));
    successCallback(events);
}

function showEditPlanningEventModal(info) {
    const event = allCalendarEvents.find(e => e.id === info.event.id);
    if (!event) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const personOptions = people.map(p => ({ value: p.id, text: p.name }));
    const eventTypes = [
        { value: 'permanence', text: 'Permanence' },
        { value: 'permanence_backup', text: 'Permanence Backup' },
        { value: 'telework_punctual', text: 'Télétravail (Ponctuel)' },
        { value: 'telework_recurrent', text: 'Télétravail (Récurrent)' },
        { value: 'leave', text: 'Congés' }
    ];

    showModal(
        `Modifier l'événement`,
        createInput('editEventId', '', 'hidden', event.id) +
        createSelectInput('editEventPersonId', 'Personne concernée', personOptions, event.personId, true) +
        createSelectInput('editEventType', 'Type d\'événement', eventTypes, event.type, true) +
        createInput('editEventStartDate', 'Date de début', 'date', dayjs(event.start).format('YYYY-MM-DD'), '', true) +
        createInput('editEventEndDate', 'Date de fin', 'date', dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD'), '', true) + // FullCalendar end date is exclusive
        createTextArea('editEventNotes', 'Notes (Optionnel)', event.notes || '', 'Ajouter des notes ici...'), // Ajout d'un champ notes
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Enregistrer', onclick: 'editPlanningEvent()', class: 'button-primary' },
            { text: 'Supprimer', onclick: `deletePlanningEvent('${event.id}')`, class: 'button-danger' }
        ]
    );
}

async function editPlanningEvent() {
    const id = document.getElementById('editEventId').value;
    const personId = document.getElementById('editEventPersonId').value;
    const eventType = document.getElementById('editEventType').value;
    const startDate = dayjs(document.getElementById('editEventStartDate').value);
    const endDate = dayjs(document.getElementById('editEventEndDate').value);
    const notes = document.getElementById('editEventNotes').value.trim();

    if (!personId || !eventType || !startDate.isValid() || !endDate.isValid()) {
        showToast("Veuillez remplir tous les champs requis.", "error");
        return;
    }

    if (startDate.isAfter(endDate)) {
        showToast("La date de fin ne peut pas être antérieure à la date de début.", "error");
        return;
    }

    const eventIndex = allCalendarEvents.findIndex(e => e.id === id);
    if (eventIndex === -1) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast("Personne introuvable.", "error");
        return;
    }

    const eventTypeDisplay = eventTypes.find(type => type.value === eventType)?.text;

    const updatedEvent = {
        ...allCalendarEvents[eventIndex],
        personId: person.id,
        type: eventType,
        title: `${escapeHtml(person.name)} (${eventTypeDisplay})`,
        start: startDate.format('YYYY-MM-DD'),
        end: endDate.add(1, 'day').format('YYYY-MM-DD'), // FullCalendar end date is exclusive
        backgroundColor: EVENT_COLORS[eventType] || '#808080',
        borderColor: EVENT_COLORS[eventType] || '#808080',
        notes: notes || null // Mettre à jour les notes
    };

    try {
        await addOrUpdateObject(STORE_EVENTS, updatedEvent);
        allCalendarEvents[eventIndex] = updatedEvent; // Mettre à jour en mémoire
        closeModal();
        calendar.refetchEvents();
        showToast(`Événement modifié pour ${escapeHtml(person.name)} !`, 'success');
    } catch (error) {
        showToast("Erreur lors de la modification de l'événement.", "error");
        console.error(error);
    }
}

async function deletePlanningEvent(eventId) {
    const event = allCalendarEvents.find(e => e.id === eventId);
    if (!event) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const eventPerson = people.find(p => p.id === event.personId);

    showModal(
        `Supprimer l'événement`,
        `<p>Êtes-vous sûr de vouloir supprimer cet événement pour "${escapeHtml(eventPerson ? eventPerson.name : 'Inconnu')}" ?</p>
        ${event.recurrenceGroupId ? '<p>Cet événement fait partie d\'une série récurrente. Voulez-vous supprimer uniquement cet événement, ou toute la série ?</p>' : ''}`,
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Supprimer cet événement', onclick: `confirmDeleteEvent('${event.id}', false)`, class: 'button-danger' },
            ...(event.recurrenceGroupId ? [{ text: 'Supprimer toute la série', onclick: `confirmDeleteEvent('${event.id}', true)`, class: 'button-danger' }] : [])
        ]
    );
}

async function confirmDeleteEvent(eventId, deleteAllInRecurrence) {
    const event = allCalendarEvents.find(e => e.id === eventId);
    if (!event) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const person = people.find(p => p.id === event.personId);

    const toast = showToast("Suppression des événements...", "info", true);
    try {
        let eventsRemovedCount = 0;
        if (deleteAllInRecurrence && event.recurrenceGroupId) {
            const eventsInRecurrence = allCalendarEvents.filter(e => e.recurrenceGroupId === event.recurrenceGroupId);
            for (const ev of eventsInRecurrence) {
                await deleteObject(STORE_EVENTS, ev.id);
                eventsRemovedCount++;
            }
            allCalendarEvents = allCalendarEvents.filter(e => e.recurrenceGroupId !== event.recurrenceGroupId);
        } else {
            await deleteObject(STORE_EVENTS, event.id);
            allCalendarEvents = allCalendarEvents.filter(e => e.id !== event.id);
            eventsRemovedCount = 1;
        }

        closeModal();
        calendar.refetchEvents();
        removeToast(toast);
        showToast(`${eventsRemovedCount} événement(s) supprimé(s) pour ${escapeHtml(person ? person.name : 'Inconnu')} !`, 'info');
    } catch (error) {
        removeToast(toast);
        showToast("Erreur lors de la suppression de l'événement.", "error");
        console.error(error);
    }
}


// --- Initialisation du calendrier FullCalendar ---
document.addEventListener('DOMContentLoaded', async () => {
    // Initialiser IndexedDB
    const dbToast = showToast("Initialisation de la base de données...", "info", true);
    try {
        await openDB();
        removeToast(dbToast);
        // showToast("Base de données initialisée.", "success");
    } catch (error) {
        removeToast(dbToast);
        showToast("Échec de l'initialisation de la base de données.", "error");
        console.error(error);
    }

    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr',
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        },
        buttonText: {
            today: 'Aujourd\'hui',
            month: 'Mois',
            week: 'Semaine',
            day: 'Jour',
            list: 'Liste'
        },
        events: getFilteredEvents, // Utilise la fonction de filtre
        eventClick: function(info) {
            showEditPlanningEventModal(info);
        },
        eventDidMount: function(info) {
            // Optionnel: Personnaliser le rendu de l'événement si nécessaire
            // info.el.style.borderColor = info.event.backgroundColor; // Exemple
        },
        datesSet: function(dateInfo) {
            // Garder la date actuelle en mémoire ou URL si nécessaire
            // console.log("Vue changée à :", dateInfo.view.title);
        }
    });
    calendar.render();

    // Charger les données initiales (personnes et événements)
    loadInitialData();

    // Attacher les écouteurs d'événements aux boutons de la sidebar
    document.getElementById('addPersonBtn').addEventListener('click', showAddPersonModal);
    document.getElementById('addPlanningEventBtn').addEventListener('click', showAddPlanningEventModal);
    document.getElementById('exportPdfBtn').addEventListener('click', exportPlanningToPdf);
    document.getElementById('exportPngBtn').addEventListener('click', exportPlanningToPng);
    document.getElementById('exportJsonBtn').addEventListener('click', exportDataToJson);
    document.getElementById('importJsonBtn').addEventListener('click', showImportJsonModal);
    document.getElementById('showStatsBtn').addEventListener('click', showStatsModal);
    document.getElementById('themeToggleButton').addEventListener('click', toggleTheme);

    // Initialiser le texte du footer
    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME} ${APP_VERSION}`;

    // Initialiser le thème au chargement
    applySavedTheme();

    // MODIFIÉ : Bouton pour afficher les versions des librairies
    const showLibraryVersionsBtn = document.getElementById('showLibraryVersionsBtn');
    if (showLibraryVersionsBtn) showLibraryVersionsBtn.addEventListener('click', showLibraryVersionsModal);

    // Initialiser la vérification des librairies (pour v20.49)
    // initLibraryVersionCheck();
});

// --- Gestion du chargement/sauvegarde des données ---
async function loadInitialData() {
    try {
        people = await getAllObjects(STORE_PEOPLE);
        allCalendarEvents = await getAllObjects(STORE_EVENTS);
        renderPeopleList(); // Afficher les personnes chargées
        calendar.refetchEvents(); // Recharger les événements FullCalendar avec les données chargées
        if (people.length === 0 && allCalendarEvents.length === 0) {
            showToast("Aucune donnée locale trouvée. Initialisation des données par défaut.", "info");
            // Optionnel: charger des données par défaut si la base est vide
            // loadDefaultData();
        } else {
            showToast("Données chargées depuis IndexedDB.", "success");
        }
    } catch (error) {
        showToast("Erreur lors du chargement initial des données.", "error");
        console.error(error);
    }
}

// Fonction pour effacer toute la base de données
function clearDatabase() {
    showModal(
        'Effacer toutes les données',
        '<p>Êtes-vous sûr de vouloir effacer toutes les données de l\'application (personnes, événements) ? Cette action est irréversible.</p>',
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Effacer tout', onclick: 'confirmClearDatabase()', class: 'button-danger' }
        ]
    );
}

async function confirmClearDatabase() {
    const toast = showToast("Effacement des données...", "info", true);
    try {
        await clearStore(STORE_PEOPLE);
        await clearStore(STORE_EVENTS);
        await clearStore(STORE_PDF_GENERATION); // Effacer aussi le store PDF
        people = [];
        allCalendarEvents = [];
        renderPeopleList();
        calendar.refetchEvents();
        closeModal();
        removeToast(toast);
        showToast("Base de données effacée !", "success");
    } catch (error) {
        removeToast(toast);
        showToast("Erreur lors de l'effacement de la base de données.", "error");
        console.error(error);
    }
}


// --- Export/Import JSON ---
function exportDataToJson() {
    const data = {
        people: people,
        events: allCalendarEvents
    };
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_data_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast("Données exportées en JSON !", "success");
}

function showImportJsonModal() {
    showModal(
        'Importer des données JSON',
        `<p>Sélectionnez un fichier JSON pour importer des données. Cela remplacera toutes les données existantes.</p>
        ${createInput('jsonFileImport', 'Fichier JSON', 'file', '', '', true)}`,
        [
            { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
            { text: 'Importer', onclick: 'importDataFromJson()', class: 'button-primary' }
        ]
    );
}

async function importDataFromJson() {
    const fileInput = document.getElementById('jsonFileImport');
    const file = fileInput.files[0];

    if (!file) {
        showToast("Veuillez sélectionner un fichier JSON.", "error");
        return;
    }

    if (file.type !== "application/json") {
        showToast("Le fichier sélectionné n'est pas un fichier JSON valide.", "error");
        return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const importedData = JSON.parse(event.target.result);

            if (!importedData.people || !Array.isArray(importedData.people) ||
                !importedData.events || !Array.isArray(importedData.events)) {
                showToast("Le format du fichier JSON est invalide. Attendu : { people: [], events: [] }", "error");
                return;
            }

            const toast = showToast("Importation des données...", "info", true);

            // Effacer les données existantes avant d'importer
            await clearStore(STORE_PEOPLE);
            await clearStore(STORE_EVENTS);

            // Importer les nouvelles données
            for (const person of importedData.people) {
                await addOrUpdateObject(STORE_PEOPLE, person);
            }
            for (const event of importedData.events) {
                await addOrUpdateObject(STORE_EVENTS, event);
            }

            // Recharger tout après l'importation
            await loadInitialData();
            closeModal();
            removeToast(toast);
            showToast("Données importées avec succès !", "success");

        } catch (e) {
            console.error("Erreur d'importation du JSON :", e);
            showToast("Erreur lors de la lecture ou de l'importation du fichier JSON.", "error");
        }
    };
    reader.readAsText(file);
}


// --- Thème Clair/Sombre ---
function toggleTheme() {
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
    document.getElementById('themeToggleButton').textContent = isDarkMode ? 'Thème Clair' : 'Thème Sombre';
    showToast(`Thème ${isDarkMode ? 'sombre' : 'clair'} activé !`, 'info');
}

function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        document.getElementById('themeToggleButton').textContent = 'Thème Clair';
    } else {
        document.body.classList.remove('dark-mode');
        document.getElementById('themeToggleButton').textContent = 'Thème Sombre';
    }
}

// --- Export PDF ---
// Nécessite la librairie jsPDF et html2canvas
// <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
// <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>

async function exportPlanningToPdf() {
    if (typeof window.jsPDF === 'undefined' || typeof html2canvas === 'undefined') {
        showToast("Les librairies jsPDF et html2canvas ne sont pas chargées. Impossible d'exporter en PDF.", "error");
        console.error("Veuillez inclure jsPDF et html2canvas dans votre index.html");
        return;
    }

    const { jsPDF } = window.jspdf;
    const toast = showToast("Génération du PDF...", "info", true);

    try {
        // Sauvegarder l'état actuel pour restaurer après la capture
        const originalParent = calendar.el.parentNode;
        const originalNextSibling = calendar.el.nextSibling;
        const calendarContainer = document.createElement('div');
        calendarContainer.style.width = '297mm'; // A4 width for capture
        calendarContainer.style.height = '210mm'; // A4 height for capture
        calendarContainer.style.overflow = 'hidden'; // Hide scrollbars during capture
        calendarContainer.style.position = 'absolute';
        calendarContainer.style.left = '-9999px'; // Move off-screen
        document.body.appendChild(calendarContainer);
        calendarContainer.appendChild(calendar.el); // Move calendar to temp container

        // Temporairement ajuster la vue du calendrier pour l'export
        const originalView = calendar.view.type;
        const originalDate = calendar.getDate(); // Sauvegarder la date actuelle

        calendar.changeView('dayGridMonth'); // Vue mois pour l'export
        calendar.setOption('contentHeight', 'auto'); // Ajuster la hauteur pour ne pas avoir de scroll
        calendar.setOption('aspectRatio', 297 / 210); // Format A4 paysage


        // Récupérer la plage de dates du PDF
        let startExportDate = dayjs(originalDate).startOf('month');
        let endExportDate = dayjs(originalDate).endOf('month');

        showModal(
            'Exporter le Planning en PDF',
            `
            <p>Sélectionnez la période à exporter.</p>
            ${createInput('pdfStartDate', 'Date de début', 'date', startExportDate.format('YYYY-MM-DD'), '', true)}
            ${createInput('pdfEndDate', 'Date de fin', 'date', endExportDate.format('YYYY-MM-DD'), '', true)}
            <p class="note">Le PDF sera généré mois par mois pour la période sélectionnée.</p>
            `,
            [
                { text: 'Annuler', onclick: 'closeModal()', class: 'button-secondary' },
                { text: 'Générer PDF', onclick: 'generatePdfWithDateRange()', class: 'button-primary' }
            ]
        );
        removeToast(toast);

        // Stocker les infos de restauration dans IndexedDB au cas où
        await addOrUpdateObject(STORE_PDF_GENERATION, {
            id: 'restoreState',
            originalParentId: originalParent.id, // Id du parent, non l'objet lui-même
            originalNextSiblingId: originalNextSibling ? originalNextSibling.id : null,
            originalView: originalView,
            originalDate: originalDate.toISOString(),
            calendarHtml: calendar.el.outerHTML // Sauvegarder le HTML du calendrier
        });

    } catch (error) {
        removeToast(toast);
        showToast("Erreur de préparation de l'export PDF.", "error");
        console.error("Erreur de préparation PDF:", error);
        // Tenter de restaurer si une erreur survient tôt
        restoreCalendarState();
    }
}

async function generatePdfWithDateRange() {
    const { jsPDF } = window.jspdf;
    const pdfStartDate = dayjs(document.getElementById('pdfStartDate').value);
    const pdfEndDate = dayjs(document.getElementById('pdfEndDate').value);

    if (!pdfStartDate.isValid() || !pdfEndDate.isValid() || pdfStartDate.isAfter(pdfEndDate)) {
        showToast("Veuillez sélectionner des dates valides.", "error");
        return;
    }

    closeModal();
    const generationToast = showToast("Génération du PDF...", "info", true);

    try {
        const restoreState = await getAllObjects(STORE_PDF_GENERATION); // Récupérer l'état sauvegardé
        const calendarState = restoreState.find(s => s.id === 'restoreState');

        if (!calendarState) {
            throw new Error("État du calendrier non trouvé pour la restauration.");
        }

        // Réutiliser le calendrier déplacé précédemment
        const calendarContainer = document.querySelector('body > div[style*="position: absolute"]');
        if (!calendarContainer || !calendarContainer.contains(calendar.el)) {
             // Si le calendrier n'est plus dans le conteneur temporaire, recréez et déplacez-le
            console.warn("Calendrier non trouvé dans le conteneur temporaire, le déplaçant à nouveau.");
            const tempContainer = document.createElement('div');
            tempContainer.style.width = '297mm'; // A4 width for capture
            tempContainer.style.height = '210mm'; // A4 height for capture
            tempContainer.style.overflow = 'hidden'; // Hide scrollbars during capture
            tempContainer.style.position = 'absolute';
            tempContainer.style.left = '-9999px'; // Move off-screen
            document.body.appendChild(tempContainer);
            tempContainer.appendChild(calendar.el); // Move calendar to temp container
        }


        const doc = new jsPDF('l', 'mm', 'a4'); // 'l' for landscape, 'mm' for millimeters, 'a4' size
        let currentPage = 0;

        let currentMonth = pdfStartDate.startOf('month');
        const endMonth = pdfEndDate.endOf('month');

        while (currentMonth.isSameOrBefore(endMonth, 'month')) {
            if (currentPage > 0) {
                doc.addPage();
            }
            currentPage++;

            calendar.gotoDate(currentMonth.toDate()); // Aller au mois actuel
            calendar.render(); // Re-render pour s'assurer que la vue est à jour
            await new Promise(resolve => setTimeout(resolve, 100)); // Laisser le temps au rendu

            const canvas = await html2canvas(calendar.el, {
                scale: 2, // Augmenter l'échelle pour une meilleure résolution
                useCORS: true, // Gérer les images cross-origin si nécessaire
                logging: false, // Désactiver le logging de html2canvas
                allowTaint: true,
                removeContainer: false // Ne pas supprimer le conteneur après capture
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 297; // A4 landscape width in mm
            const pageHeight = 210; // A4 landscape height in mm
            const imgHeight = canvas.height * imgWidth / canvas.width;

            doc.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

            currentMonth = currentMonth.add(1, 'month');
        }

        doc.save(`planning_permanences_${pdfStartDate.format('YYYY-MM-DD')}_${pdfEndDate.format('YYYY-MM-DD')}.pdf`);
        showToast("PDF généré avec succès !", "success");

    } catch (error) {
        showToast("Erreur lors de la génération du PDF.", "error");
        console.error("Erreur génération PDF:", error);
    } finally {
        removeToast(generationToast);
        restoreCalendarState(); // Toujours restaurer l'état
        await clearStore(STORE_PDF_GENERATION); // Nettoyer les données temporaires
    }
}

async function restoreCalendarState() {
    try {
        const storedStates = await getAllObjects(STORE_PDF_GENERATION);
        const calendarState = storedStates.find(s => s.id === 'restoreState');

        if (calendarState) {
            const originalParent = document.getElementById(calendarState.originalParentId || 'main-content');
            const originalNextSibling = calendarState.originalNextSiblingId ? document.getElementById(calendarState.originalNextSiblingId) : null;

            // Assurez-vous que le calendrier est dans le DOM avant de le manipuler
            if (!document.body.contains(calendar.el)) {
                // Si le calendrier n'est pas dans le body (il est dans le conteneur temporaire), le récupérer
                const tempContainer = document.querySelector('body > div[style*="position: absolute"]');
                if (tempContainer && tempContainer.contains(calendar.el)) {
                    // Le calendrier est dans le conteneur temporaire, le rattacher
                    if (originalNextSibling) {
                        originalParent.insertBefore(calendar.el, originalNextSibling);
                    } else {
                        originalParent.appendChild(calendar.el);
                    }
                    tempContainer.remove(); // Supprimer le conteneur temporaire
                } else {
                    console.error("Erreur: Le calendrier n'est ni dans le document, ni dans le conteneur temporaire.");
                    // Fallback: recréer le calendrier si perdu
                    // initCalendar(); // Ou une fonction similaire pour réinitialiser
                    return;
                }
            } else {
                 // Si le calendrier est déjà dans le body, assurez-vous qu'il est au bon endroit
                if (originalNextSibling) {
                    if (calendar.el.nextSibling !== originalNextSibling) {
                        originalParent.insertBefore(calendar.el, originalNextSibling);
                    }
                } else {
                    if (calendar.el.parentNode !== originalParent || calendar.el.nextSibling) {
                        originalParent.appendChild(calendar.el);
                    }
                }
                 // Supprimer le conteneur temporaire s'il existe
                const tempContainer = document.querySelector('body > div[style*="position: absolute"]');
                if(tempContainer) tempContainer.remove();
            }

            calendar.setOption('contentHeight', 'auto'); // Assurer que la hauteur est automatique
            calendar.setOption('aspectRatio', 1.35); // Revenir au ratio par défaut ou souhaité

            // Restaurer la vue et la date d'origine
            calendar.changeView(calendarState.originalView);
            calendar.gotoDate(new Date(calendarState.originalDate));
            calendar.render(); // Re-render pour s'assurer de la restauration complète
        }
    } catch (error) {
        console.error("Erreur lors de la restauration de l'état du calendrier:", error);
        showToast("Erreur critique lors de la restauration du calendrier. Rechargez la page.", "error");
    } finally {
        await clearStore(STORE_PDF_GENERATION); // S'assurer que les données temporaires sont nettoyées
    }
}


// --- Export PNG ---
// Nécessite html2canvas
async function exportPlanningToPng() {
    if (typeof html2canvas === 'undefined') {
        showToast("La librairie html2canvas n'est pas chargée. Impossible d'exporter en PNG.", "error");
        console.error("Veuillez inclure html2canvas dans votre index.html");
        return;
    }

    const toast = showToast("Génération du PNG...", "info", true);

    try {
        // Temporairement ajuster la vue du calendrier pour l'export si nécessaire
        const originalView = calendar.view.type;
        const originalDate = calendar.getDate(); // Sauvegarder la date actuelle

        calendar.changeView('dayGridMonth'); // Vue mois pour l'export
        calendar.setOption('contentHeight', 'auto'); // Ajuster la hauteur pour ne pas avoir de scroll
        await new Promise(resolve => setTimeout(resolve, 100)); // Laisser le temps au rendu

        const canvas = await html2canvas(calendar.el, {
            scale: 2, // Augmenter l'échelle pour une meilleure résolution
            useCORS: true, // Gérer les images cross-origin si nécessaire
            logging: false, // Désactiver le logging de html2canvas
            allowTaint: true
        });

        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `planning_permanences_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        showToast("PNG généré avec succès !", "success");

        // Restaurer la vue et la date d'origine
        calendar.changeView(originalView);
        calendar.gotoDate(originalDate);
        calendar.render(); // Re-render pour s'assurer de la restauration

    } catch (error) {
        showToast("Erreur lors de la génération du PNG.", "error");
        console.error("Erreur génération PNG:", error);
    } finally {
        removeToast(toast);
    }
}


// --- Statistiques ---
function showStatsModal() {
    showModal(
        'Statistiques des Permanences',
        `<div id="statsResults" class="table-responsive">Chargement des statistiques...</div>`,
        [{ text: 'Fermer', onclick: 'closeModal()', class: 'button-secondary' }]
    );
    generateStats();
}

function generateStats() {
    const statsResultsDiv = document.getElementById('statsResults');
    if (!statsResultsDiv) return; // La modale pourrait être fermée

    if (people.length === 0) {
        statsResultsDiv.innerHTML = "<p>Aucune personne enregistrée pour générer des statistiques.</p>";
        return;
    }

    // Définir la période d'analyse (ex: année en cours)
    const currentYear = dayjs().year();
    const startDate = dayjs(`${currentYear}-01-01`).startOf('year');
    const endDate = dayjs(`${currentYear}-12-31`).endOf('year');

    // Initialiser les compteurs
    const stats = {};
    people.forEach(p => {
        stats[p.id] = {
            name: p.name,
            permanenceDays: 0,
            teleworkDays: 0,
            leaveDays: 0,
            backupDays: 0,
            totalDays: 0
        };
    });

    // Parcourir tous les événements et compter les jours
    allCalendarEvents.forEach(event => {
        const eventStartDate = dayjs(event.start);
        const eventEndDate = dayjs(event.end).subtract(1, 'day'); // FullCalendar end date is exclusive

        // S'assurer que l'événement est dans la période d'analyse
        if (eventStartDate.isAfter(endDate, 'day') || eventEndDate.isBefore(startDate, 'day')) {
            return;
        }

        let currentDay = eventStartDate.clone();
        while (currentDay.isSameOrBefore(eventEndDate, 'day')) {
            // S'assurer que le jour actuel est dans la période d'analyse
            if (currentDay.isBetween(startDate, endDate, 'day', '[]')) {
                const personStat = stats[event.personId];
                if (personStat) { // S'assurer que la personne existe toujours
                    switch (event.type) {
                        case 'permanence':
                            personStat.permanenceDays++;
                            break;
                        case 'permanence_backup':
                            personStat.backupDays++;
                            break;
                        case 'telework_punctual':
                        case 'telework_recurrent':
                            personStat.teleworkDays++;
                            break;
                        case 'leave':
                            personStat.leaveDays++;
                            break;
                    }
                    personStat.totalDays++;
                }
            }
            currentDay = currentDay.add(1, 'day');
        }
    });

    // Générer le tableau HTML
    let tableHtml = `
        <h3>Statistiques ${currentYear}</h3>
        <p>Analyse des jours d'activités pour l'année ${currentYear}.</p>
        <table class="stats-table">
            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Jours Permanence</th>
                    <th>Jours Backup</th>
                    <th>Jours Télétravail</th>
                    <th>Jours Congés</th>
                    <th>Total Jours</th>
                </tr>
            </thead>
            <tbody>
    `;

    Object.values(stats).sort((a, b) => a.name.localeCompare(b.name)).forEach(stat => {
        tableHtml += `
            <tr>
                <td>${escapeHtml(stat.name)}</td>
                <td>${stat.permanenceDays}</td>
                <td>${stat.backupDays}</td>
                <td>${stat.teleworkDays}</td>
                <td>${stat.leaveDays}</td>
                <td>${stat.totalDays}</td>
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
    showToast("Statistiques exportées en CSV !", "success");
}


// MODIFIÉ : Informations sur les versions des librairies pour la vérification manuelle
const LIBRARIES_INFO = [
    { name: "FullCalendar", currentVersion: "6.1.17", latestKnownVersion: "6.1.17", recommendation: "À jour", sourceUrl: "https://fullcalendar.io/" },
    { name: "Day.js", currentVersion: "1.11.10", latestKnownVersion: "1.11.11", recommendation: "Mise à jour mineure recommandée", sourceUrl: "https://day.js.org/" },
    { name: "Font Awesome", currentVersion: "5.15.4", latestKnownVersion: "6.5.2", recommendation: "Mise à jour majeure recommandée", sourceUrl: "https://fontawesome.com/" },
    { name: "jsPDF", currentVersion: "2.5.1", latestKnownVersion: "2.10.0", recommendation: "Mise à jour mineure recommandée (correction de bugs)", sourceUrl: "https://parall.ax/products/jspdf" }
];

// MODIFIÉ : Fonction pour afficher la modale des versions des librairies
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
                <td>${escapeHtml(lib.name)}</td>
                <td>${escapeHtml(lib.currentVersion)}</td>
                <td>${escapeHtml(lib.latestKnownVersion)}</td>
                <td><span class="${lib.recommendation.includes('À jour') ? 'status-ok' : 'status-update'}">${escapeHtml(lib.recommendation)}</span></td>
                <td><a href="${escapeHtml(lib.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(new URL(lib.sourceUrl).hostname)}</a></td>
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

// Les fonctions liées à la vérification dynamique des versions de librairies (pour v20.49)
// seront ajoutées ici ultérieurement après accord et définition de la stratégie.
// Elles nécessiteront probablement une API ou une approche différente pour contourner les limitations CORS.
