// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // **NOUVEAU :** Stocke tous les événements pour filtrage
const STORAGE_KEY_PEOPLE = 'electricalPermanencePeople';
const STORAGE_KEY_EVENTS = 'electricalPermanenceEvents'; // Pour les futurs événements du calendrier

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.8"; // **NOUVEAU :** Incrémentation de la version

document.addEventListener('DOMContentLoaded', () => {
    console.log(`${APP_NAME} - Version ${APP_VERSION} chargée !`);

    // Mise à jour de l'année du copyright et du nom/version de l'application
    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME}. Version ${APP_VERSION}`;

    // Initialisation de Day.js plugins
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday); // Ajouté pour day().day()

    // Charger les données initiales
    loadPeopleFromLocalStorage();
    loadCalendarEvents(); // Charger tous les événements avant d'initialiser le calendrier
    renderPeopleList(); // Afficher la liste des personnes chargées

    // Initialisation de FullCalendar
    initFullCalendar();
    updateCalendarEventsDisplay(); // **NOUVEAU :** Affiche les événements des personnes visibles au démarrage

    // Gestion du thème sombre/clair
    const themeToggleButton = document.getElementById('themeToggleButton');
    if (themeToggleButton) { // S'assurer que le bouton existe
        themeToggleButton.addEventListener('click', toggleTheme);
        // Initialiser le thème au chargement
        if (localStorage.getItem('theme') === 'dark') {
            document.body.classList.add('dark-mode');
            themeToggleButton.textContent = 'Thème Clair';
        } else {
            themeToggleButton.textContent = 'Thème Sombre';
        }
    }

    // Gestionnaires d'événements pour les boutons
    const addPersonBtn = document.getElementById('addPersonBtn');
    if (addPersonBtn) addPersonBtn.addEventListener('click', showAddPersonModal);

    const addPlanningEventBtn = document.getElementById('addPlanningEventBtn');
    if (addPlanningEventBtn) addPlanningEventBtn.addEventListener('click', showAddPlanningEventModal);

    const exportPlanningBtn = document.getElementById('exportPlanningBtn');
    if (exportPlanningBtn) exportPlanningBtn.addEventListener('click', () => {
        showExportModal();
    });

    const exportPdfBtn = document.getElementById('exportPdfBtn');
    if (exportPdfBtn) exportPdfBtn.addEventListener('click', exportPlanningToPdfMultiMonth);

    const exportPngBtn = document.getElementById('exportPngBtn');
    if (exportPngBtn) exportPngBtn.addEventListener('click', exportPlanningToPngMultiMonth);

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
function showToast(message, type = 'info', duration = 3000) {
    const toastsContainer = document.getElementById('toastsContainer');
    if (!toastsContainer) return;

    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;

    toastsContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('fade-out');
        toast.addEventListener('transitionend', () => toast.remove());
    }, duration);
}

// --- Fonctions de gestion des Modales (reprises de TA version stable) ---
function showModal(contentHtml, title, buttons = []) {
    let modal = document.getElementById('dynamicModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'dynamicModal';
        modal.classList.add('modal'); // Garder la classe 'modal' pour le CSS
        document.getElementById('modalsContainer').appendChild(modal);
    }
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>${title}</h2>
                <span class="close-button" onclick="closeModal()">&times;</span>
            </div>
            <div class="modal-body">
                ${contentHtml}
            </div>
            <div class="modal-footer">
                ${buttons.map(btn => `<button class="${btn.class || ''}" onclick="${btn.onclick}">${btn.text}</button>`).join('')}
            </div>
        </div>
    `;
    modal.style.display = 'block';
    setTimeout(() => modal.classList.add('show'), 10);
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('dynamicModal');
    if (modal) {
        modal.classList.remove('show');
        modal.addEventListener('transitionend', () => {
            modal.style.display = 'none';
            modal.innerHTML = ''; // Nettoyer le contenu
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
    showModal(content, title, buttons);
}

// Fonctions pour créer des éléments de formulaire (reprises de TA version stable)
function createInput(id, label, type = 'text', value = '', placeholder = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <input type="${type}" id="${id}" value="${value}" placeholder="${placeholder}" ${requiredAttr}>
        </div>
    `;
}

function createCheckboxGroup(name, label, options, selectedValues = []) {
    let checkboxesHtml = options.map(option => `
        <label>
            <input type="checkbox" name="${name}" value="${option.value}" ${selectedValues.includes(option.value) ? 'checked' : ''}>
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

function createSelectInput(id, label, options, selectedValue = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    const optionsHtml = options.map(option => `
        <option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>
    `).join('');
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <select id="${id}" ${requiredAttr}>
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

function createDatePicker(id, label, value = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <input type="date" id="${id}" value="${value}" ${requiredAttr}>
        </div>
    `;
}

function createTimePicker(id, label, value = '', required = false) {
    const requiredAttr = required ? 'required' : '';
    return `
        <div class="form-group">
            <label for="${id}">${label}${required ? ' *' : ''}</label>
            <input type="time" id="${id}" value="${value}" ${requiredAttr}>
        </div>
    `;
}

function createColorPicker(id, label, value = '#007bff') {
    return `
        <div class="form-group">
            <label for="${id}">${label}</label>
            <input type="color" id="${id}" value="${value}">
        </div>
    `;
}
// --- Fin des fonctions de gestion des Modales ---


// --- Gestion des personnes ---
function savePeopleToLocalStorage() {
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
}

function loadPeopleFromLocalStorage() {
    const storedPeople = localStorage.getItem(STORAGE_KEY_PEOPLE);
    if (storedPeople) {
        people = JSON.parse(storedPeople);
        // **MODIFIE :** Assurer que chaque personne a une propriété isVisible (pour la compatibilité)
        people = people.map(p => ({
            ...p,
            isVisible: p.isVisible !== undefined ? p.isVisible : true // Par défaut visible
        }));
    }
}

// **MODIFIE :** Fonction pour rendre la liste des personnes avec gestion de la visibilité
function renderPeopleList() {
    const peopleListUl = document.getElementById('peopleList');
    if (!peopleListUl) return;

    peopleListUl.innerHTML = '';
    people.forEach(person => {
        const li = document.createElement('li');
        // Ajoute une classe 'person-hidden' si la personne n'est pas visible
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

        // Ajout des écouteurs d'événements pour les boutons de la liste
        li.querySelector('.toggle-visibility-btn').addEventListener('click', (e) => togglePersonVisibility(person.id, e.currentTarget));
        li.querySelector('.edit-person-btn').addEventListener('click', () => showEditPersonModal(person.id));
        li.querySelector('.delete-person-btn').addEventListener('click', () => confirmDeletePerson(person.id));
    });
}

// **NOUVEAU :** Fonction pour basculer la visibilité d'une personne
function togglePersonVisibility(personId, buttonElement) {
    const person = people.find(p => p.id === personId);
    if (person) {
        person.isVisible = !person.isVisible;
        savePeopleToLocalStorage(); // Sauvegarder le nouvel état de visibilité

        // Mettre à jour l'icône du bouton et le titre
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

        // **IMPORTANT :** Mettre à jour l'affichage du calendrier
        updateCalendarEventsDisplay();
        showToast(`Visibilité de ${person.name} : ${person.isVisible ? 'Affichée' : 'Masquée'}.`, 'info');
    }
}

function showAddPersonModal() {
    const content = `
        ${createInput('personName', 'Nom de la personne', 'text', '', 'Ex: Jean Dupont', true)}
        ${createInput('personColor', 'Couleur d\'affichage (optionnel)', 'color', '#007bff')}
    `;
    createAndShowModal(
        'Ajouter une nouvelle personne',
        content,
        'Ajouter',
        'addPerson()'
    );
}

function addPerson() {
    const nameInput = document.getElementById('personName');
    const colorInput = document.getElementById('personColor');
    const name = nameInput ? nameInput.value.trim() : '';
    const color = colorInput ? colorInput.value : '#007bff';

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
        color: color,
        isVisible: true // **NOUVEAU :** Par défaut visible
    };
    people.push(newPerson);
    savePeopleToLocalStorage();
    renderPeopleList();
    closeModal();
    showToast(`Personne "${name}" ajoutée !`, 'success');

    // **NOUVEAU :** Mettre à jour le calendrier pour inclure cette nouvelle personne (si elle a des événements)
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
        ${createInput('editPersonColor', 'Couleur d\'affichage (optionnel)', 'color', person.color)}
    `;
    createAndShowModal(
        `Modifier ${person.name}`,
        content,
        'Sauvegarder',
        `editPerson('${personId}')`
    );
}

function editPerson(personId) {
    const nameInput = document.getElementById('editPersonName');
    const colorInput = document.getElementById('editPersonColor');
    const newName = nameInput ? nameInput.value.trim() : '';
    const newColor = colorInput ? colorInput.value : '';

    if (!newName) {
        showToast('Le nom de la personne est requis.', 'error');
        return;
    }

    const person = people.find(p => p.id === personId);
    if (person) {
        // Vérifier si le nouveau nom existe déjà pour une autre personne
        if (people.some(p => p.id !== personId && p.name.toLowerCase() === newName.toLowerCase())) {
            showToast('Une autre personne avec ce nom existe déjà.', 'error');
            return;
        }

        const oldName = person.name;
        person.name = newName;
        person.color = newColor; // Mettre à jour la couleur

        // Mettre à jour les événements existants avec la nouvelle couleur (le nom dans le titre d'événement sera mis à jour par l'affichage)
        allCalendarEvents.forEach(event => {
            if (event.personId === person.id) {
                event.backgroundColor = person.color;
                event.borderColor = person.color;
                // Mettre à jour le titre de l'événement pour refléter le nouveau nom de la personne
                // On suppose le format "Nom (Type)"
                const eventTypeMatch = event.title.match(/\(([^)]+)\)$/);
                const eventType = eventTypeMatch ? eventTypeMatch[1] : event.type; // Utilise le type si pas trouvé
                event.title = `${person.name} (${eventType})`;
            }
        });

        savePeopleToLocalStorage();
        saveCalendarEvents(); // Sauvegarder les événements mis à jour
        renderPeopleList();
        updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir le calendrier
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

function deletePerson(personId) {
    const initialPeopleCount = people.length;
    people = people.filter(p => p.id !== personId);
    if (people.length < initialPeopleCount) {
        // Supprimer aussi tous les événements associés à cette personne
        allCalendarEvents = allCalendarEvents.filter(event => event.personId !== personId);
        savePeopleToLocalStorage();
        saveCalendarEvents();
        renderPeopleList();
        updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir le calendrier
        closeModal();
        showToast('Personne et ses événements supprimés !', 'success');
    } else {
        showToast("Erreur: Personne introuvable pour suppression.", "error");
    }
}

// --- Gestion des événements du calendrier ---
function saveCalendarEvents() {
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(allCalendarEvents));
}

function loadCalendarEvents() {
    const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (storedEvents) {
        allCalendarEvents = JSON.parse(storedEvents);
        // S'assurer que les événements ont toutes les propriétés nécessaires, notamment pour les titres
        allCalendarEvents = allCalendarEvents.map(event => {
            const person = people.find(p => p.id === event.personId);
            // Reconstruire le titre si nécessaire pour s'assurer qu'il reflète le nom actuel de la personne
            if (person && (!event.title || !event.title.includes(person.name))) {
                return {
                    ...event,
                    title: `${person.name} (${event.type})`,
                    backgroundColor: event.backgroundColor || person.color,
                    borderColor: event.borderColor || person.color
                };
            }
            return event;
        });
    } else {
        allCalendarEvents = [];
    }
}

// **NOUVEAU :** Fonction pour mettre à jour l'affichage des événements dans FullCalendar
function updateCalendarEventsDisplay() {
    // Filtrer les événements pour n'afficher que ceux des personnes visibles
    const visiblePeopleIds = people.filter(p => p.isVisible).map(p => p.id);
    const eventsToShow = allCalendarEvents.filter(event => visiblePeopleIds.includes(event.personId));

    // Mettre à jour les événements du calendrier FullCalendar
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
        // **MODIFIE :** Les événements sont maintenant gérés via `updateCalendarEventsDisplay`
        // events: [], // Laisser vide car updateCalendarEventsDisplay va le populer
        eventDidMount: function(info) {
            // Personnalisation de l'affichage des événements (par exemple, ajout de bulles d'info)
            info.el.title = `${info.event.title}\n${info.event.extendedProps.description || ''}`;
        },
        eventClick: function(info) {
            // Gérer le clic sur un événement
            const eventId = info.event.id;
            // FullCalendar met les props étendues dans extendedProps
            const eventType = info.event.extendedProps.type;
            const personId = info.event.extendedProps.personId;
            showEditPlanningEventModal(eventId, eventType, personId);
        },
        select: function(info) {
            // Gérer la sélection d'une plage de dates
            showAddPlanningEventModal(info.startStr, info.endStr);
        },
        events: [] // Initialement vide, sera rempli par updateCalendarEventsDisplay
    });
    calendar.render();
}

function showAddPlanningEventModal(startStr = '', endStr = '') {
    if (people.length === 0) {
        showToast("Veuillez ajouter au moins une personne d'abord.", "error");
        return;
    }

    const personOptions = people.map(p => ({ value: p.id, label: p.name }));
    const eventTypeOptions = [
        { value: 'permanence', label: 'Permanence' },
        { value: 'telework', label: 'Télétravail' },
        { value: 'leave', label: 'Congé' },
        { value: 'formation', label: 'Formation' },
        { value: 'mission', label: 'Mission' }
    ];

    const content = `
        ${createSelectInput('personSelect', 'Personne', personOptions, people[0].id, true)}
        ${createSelectInput('eventTypeSelect', 'Type d\'événement', eventTypeOptions, 'permanence', true)}
        ${createDatePicker('eventStartDate', 'Date de début', startStr, true)}
        ${createTimePicker('eventStartTime', 'Heure de début (optionnel)')}
        ${createDatePicker('eventEndDate', 'Date de fin (optionnel)', endStr)}
        ${createTimePicker('eventEndTime', 'Heure de fin (optionnel)')}
        ${createTextArea('eventDescription', 'Description (optionnel)')}
        <div class="form-group">
            <label for="eventColor">Couleur de l'événement (optionnel, sinon couleur de la personne)</label>
            <input type="color" id="eventColor" value="">
        </div>
        <div class="recurring-options">
            <h4>Récurrence (pour Télétravail/Permanence)</h4>
            ${createCheckboxGroup('recurrenceDays', 'Jours de récurrence', [
                { label: 'Lundi', value: '1' }, // dayjs().day() -> 0=Dimanche, 1=Lundi
                { label: 'Mardi', value: '2' },
                { label: 'Mercredi', value: '3' },
                { label: 'Jeudi', value: '4' },
                { label: 'Vendredi', value: '5' }
            ])}
            ${createDatePicker('recurrenceEndDate', 'Fin de récurrence (optionnel)')}
        </div>
    `;

    createAndShowModal('Ajouter un événement', content, 'Ajouter', 'addPlanningEvent()');
}

function addPlanningEvent() {
    const personId = document.getElementById('personSelect').value;
    const eventType = document.getElementById('eventTypeSelect').value;
    const startDate = document.getElementById('eventStartDate').value;
    const startTime = document.getElementById('eventStartTime').value;
    const endDate = document.getElementById('eventEndDate').value;
    const endTime = document.getElementById('eventEndTime').value;
    const description = document.getElementById('eventDescription').value;
    const customColor = document.getElementById('eventColor').value;
    const recurrenceDays = Array.from(document.querySelectorAll('input[name="recurrenceDays"]:checked')).map(cb => parseInt(cb.value));
    const recurrenceEndDate = document.getElementById('recurrenceEndDate').value;

    if (!personId || !eventType || !startDate) {
        showToast('Veuillez remplir tous les champs requis.', 'error');
        return;
    }

    const person = people.find(p => p.id === personId);
    if (!person) {
        showToast('Personne sélectionnée introuvable.', 'error');
        return;
    }

    const eventBaseColor = customColor || person.color;

    const generateEvent = (start, end) => {
        return {
            id: crypto.randomUUID(),
            title: `${person.name} (${eventType})`,
            start: start,
            end: end,
            personId: person.id,
            type: eventType,
            description: description,
            backgroundColor: eventBaseColor,
            borderColor: eventBaseColor,
            allDay: !startTime && !endTime // Si pas d'heure, c'est un événement toute la journée
        };
    };

    let eventsToAdd = [];
    if (recurrenceDays.length > 0 && recurrenceEndDate) {
        let currentDay = dayjs(startDate);
        const endRecurrence = dayjs(recurrenceEndDate);

        while (currentDay.isSameOrBefore(endRecurrence, 'day')) {
            // dayjs().day() retourne 0 pour dimanche, 1 pour lundi...
            if (recurrenceDays.includes(currentDay.day())) {
                const startDateTime = startTime ? currentDay.format('YYYY-MM-DD') + 'T' + startTime : currentDay.format('YYYY-MM-DD');
                let endDateTime = null;
                if (endDate) { // Si une date de fin spécifique est donnée pour un événement récurrent
                    let tempEndDate = dayjs(endDate);
                    // Assurer que l'événement ne dépasse pas la fin de récurrence sur la même journée
                    if (currentDay.isSame(tempEndDate, 'day') || currentDay.isBefore(tempEndDate, 'day')) {
                        endDateTime = endTime ? tempEndDate.format('YYYY-MM-DD') + 'T' + endTime : tempEndDate.format('YYYY-MM-DD');
                    }
                } else if (endTime) { // Si pas de date de fin mais une heure de fin
                    endDateTime = currentDay.format('YYYY-MM-DD') + 'T' + endTime;
                } else { // Si pas de date ou heure de fin, c'est un événement d'une journée entière
                    endDateTime = currentDay.add(1, 'day').format('YYYY-MM-DD'); // FullCalendar end est exclusif
                }

                eventsToAdd.push(generateEvent(startDateTime, endDateTime));
            }
            currentDay = currentDay.add(1, 'day');
        }
    } else {
        const startDateTime = startTime ? startDate + 'T' + startTime : startDate;
        let endDateTime = null;
        if (endDate) {
            endDateTime = endTime ? endDate + 'T' + endTime : endDate;
            if (!endTime && !startTime && dayjs(startDate).isSame(dayjs(endDate), 'day')) {
                // Si pas d'heure et même jour, FullCalendar a besoin du jour suivant pour un événement d'une journée entière
                endDateTime = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
            } else if (!endTime && !startTime && dayjs(endDate).isAfter(dayjs(startDate), 'day')) {
                endDateTime = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
            }
        } else if (startTime && endTime) { // Cas où il y a une heure de début et fin sans date de fin explicite (sur le même jour)
            endDateTime = startDate + 'T' + endTime;
        } else if (!startTime && !endTime) { // Cas d'un événement d'une journée entière sans fin explicite
            endDateTime = dayjs(startDate).add(1, 'day').format('YYYY-MM-DD'); // Fin exclusive
        }

        eventsToAdd.push(generateEvent(startDateTime, endDateTime));
    }

    // Ajouter les événements générés à allCalendarEvents
    eventsToAdd.forEach(event => allCalendarEvents.push(event));
    saveCalendarEvents();
    updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir l'affichage du calendrier
    closeModal();
    showToast(`Événement(s) pour ${person.name} ajouté(s) !`, 'success');
}

function showEditPlanningEventModal(eventId, eventType, personId) {
    const event = allCalendarEvents.find(e => e.id === eventId);
    if (!event) {
        showToast("Événement introuvable.", "error");
        return;
    }

    const personOptions = people.map(p => ({ value: p.id, label: p.name }));
    const eventTypeOptions = [
        { value: 'permanence', label: 'Permanence' },
        { value: 'telework', label: 'Télétravail' },
        { value: 'leave', label: 'Congé' },
        { value: 'formation', label: 'Formation' },
        { value: 'mission', label: 'Mission' }
    ];

    const startDate = event.start ? dayjs(event.start).format('YYYY-MM-DD') : '';
    const startTime = event.start && event.start.includes('T') ? dayjs(event.start).format('HH:mm') : '';
    // Pour la date de fin, FullCalendar stocke la fin exclusive.
    // Si c'est un événement allDay sans heure de début, la fin est le jour suivant.
    // Il faut soustraire 1 jour pour l'afficher correctement dans un date picker.
    let endDate = '';
    let endTime = '';

    if (event.end) {
        const endDayjs = dayjs(event.end);
        if (event.allDay && dayjs(event.start).isBefore(endDayjs, 'day')) {
            endDate = endDayjs.subtract(1, 'day').format('YYYY-MM-DD');
        } else {
            endDate = endDayjs.format('YYYY-MM-DD');
            endTime = event.end.includes('T') ? endDayjs.format('HH:mm') : '';
        }
    }

    const content = `
        ${createSelectInput('editPersonSelect', 'Personne', personOptions, event.personId, true)}
        ${createSelectInput('editEventTypeSelect', 'Type d\'événement', eventTypeOptions, event.type, true)}
        ${createDatePicker('editEventStartDate', 'Date de début', startDate, true)}
        ${createTimePicker('editEventStartTime', 'Heure de début (optionnel)', startTime)}
        ${createDatePicker('editEventEndDate', 'Date de fin (optionnel)', endDate)}
        ${createTimePicker('editEventEndTime', 'Heure de fin (optionnel)', endTime)}
        ${createTextArea('editEventDescription', 'Description (optionnel)', event.description || '')}
        <div class="form-group">
            <label for="editEventColor">Couleur de l'événement (optionnel)</label>
            <input type="color" id="editEventColor" value="${event.backgroundColor || ''}">
        </div>
        <button class="button-danger" onclick="confirmDeleteEvent('${event.id}')">Supprimer cet événement</button>
    `;

    createAndShowModal('Modifier un événement', content, 'Sauvegarder', `editPlanningEvent('${event.id}')`);
}

function editPlanningEvent(eventId) {
    const personId = document.getElementById('editPersonSelect').value;
    const eventType = document.getElementById('editEventTypeSelect').value;
    const startDate = document.getElementById('editEventStartDate').value;
    const startTime = document.getElementById('editEventStartTime').value;
    const endDate = document.getElementById('editEventEndDate').value;
    const endTime = document.getElementById('editEventEndTime').value;
    const description = document.getElementById('editEventDescription').value;
    const customColor = document.getElementById('editEventColor').value;

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

    const startDateTime = startTime ? startDate + 'T' + startTime : startDate;
    let endDateTime = null;
    if (endDate) {
        endDateTime = endTime ? endDate + 'T' + endTime : endDate;
        if (!endTime && !startTime && dayjs(startDate).isSame(dayjs(endDate), 'day')) {
            endDateTime = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
        } else if (!endTime && !startTime && dayjs(endDate).isAfter(dayjs(startDate), 'day')) {
            endDateTime = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
        }
    } else if (startTime && endTime) {
        endDateTime = startDate + 'T' + endTime;
    } else if (!startTime && !endTime) {
        endDateTime = dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');
    }

    const updatedEvent = {
        ...allCalendarEvents[eventIndex],
        title: `${person.name} (${eventType})`,
        start: startDateTime,
        end: endDateTime,
        personId: person.id,
        type: eventType,
        description: description,
        backgroundColor: customColor || person.color,
        borderColor: customColor || person.color,
        allDay: !startTime && !endTime // Mettre à jour allDay si les heures sont retirées
    };

    allCalendarEvents[eventIndex] = updatedEvent;
    saveCalendarEvents();
    updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir l'affichage du calendrier
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

function deleteEvent(eventId) {
    const initialEventCount = allCalendarEvents.length;
    allCalendarEvents = allCalendarEvents.filter(e => e.id !== eventId);
    if (allCalendarEvents.length < initialEventCount) {
        saveCalendarEvents();
        updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir l'affichage du calendrier
        closeModal();
        showToast('Événement supprimé !', 'success');
    } else {
        showToast("Erreur: Événement introuvable pour suppression.", "error");
    }
}


// --- Exportation de données ---
function exportDataToJson() {
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
    URL.revokeObjectURL(url);
    showToast('Données exportées en JSON !', 'success');
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

function importDataFromJson() {
    const jsonData = document.getElementById('importJsonData').value;
    if (!jsonData) {
        showToast('Veuillez coller les données JSON.', 'error');
        return;
    }
    try {
        const parsedData = JSON.parse(jsonData);
        if (parsedData.people && Array.isArray(parsedData.people)) {
            people = parsedData.people;
            // Assurer que les personnes importées ont la propriété isVisible
            people = people.map(p => ({
                ...p,
                isVisible: p.isVisible !== undefined ? p.isVisible : true
            }));
            savePeopleToLocalStorage();
            renderPeopleList();
            showToast('Personnes importées avec succès !', 'success');
        }
        if (parsedData.events && Array.isArray(parsedData.events)) {
            allCalendarEvents = parsedData.events;
            saveCalendarEvents();
            updateCalendarEventsDisplay(); // **MODIFIE :** Rafraîchir l'affichage du calendrier
            showToast('Événements importés avec succès !', 'success');
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

function showExportModal() {
    const content = `<p>Choisissez un format d'exportation :</p>`;
    createAndShowModal(
        'Options d\'exportation',
        content,
        null, null, // Pas de bouton principal par défaut
        'Fermer'
    );
}

// Fonction pour capturer et exporter en PDF plusieurs mois
async function exportPlanningToPdfMultiMonth() {
    showToast("Génération du PDF en cours...", 'info', 5000);
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !calendar) {
        showToast("Erreur: Calendrier non trouvé.", "error");
        return;
    }

    // Sauvegarder la vue et la date originales
    const originalView = calendar.view.type;
    const originalDate = calendar.getDate();

    try {
        // Définir la vue sur month pour la capture
        calendar.changeView('dayGridMonth');

        const pdf = new jspdf.jsPDF('p', 'mm', 'a4'); // Format A4, portrait
        const pdfPageWidthMm = pdf.internal.pageSize.getWidth();
        const pdfPageHeightMm = pdf.internal.pageSize.getHeight();
        const margin = 10; // Marge en mm
        const availableWidth = pdfPageWidthMm - 2 * margin;
        const availableHeight = pdfPageHeightMm - 2 * margin;

        let currentMonth = dayjs(originalDate).startOf('month');
        let currentPage = 1;

        const numberOfMonthsToExport = 2; // Exporter le mois actuel et le mois suivant

        for (let i = 0; i < numberOfMonthsToExport; i++) {
            if (currentPage > 1) {
                pdf.addPage();
            }
            // Aller au mois correct pour la capture
            calendar.gotoDate(currentMonth.toDate());
            await new Promise(resolve => setTimeout(resolve, 100)); // Laisser le temps à FullCalendar de se rendre

            const canvas = await html2canvas(calendarEl, {
                scale: 2, // Augmenter la résolution pour une meilleure qualité
                useCORS: true, // Important si des images externes sont utilisées
                logging: false,
                backgroundColor: null // Important pour les thèmes clairs/sombres si tu ne veux pas de fond blanc par défaut
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidthPx = canvas.width;
            const imgHeightPx = canvas.height;

            // Convertir les dimensions du canvas en mm
            const imgWidthMm = imgWidthPx * 25.4 / 96; // 96 DPI par défaut pour les navigateurs
            const imgHeightMm = imgHeightPx * 25.4 / 96;

            let finalWidthMm, finalHeightMm;
            const aspectRatio = imgWidthMm / imgHeightMm;

            if (imgWidthMm > availableWidth || imgHeightMm > availableHeight) {
                if (aspectRatio > availableWidth / availableHeight) {
                    finalWidthMm = availableWidth;
                    finalHeightMm = availableWidth / aspectRatio;
                } else {
                    finalHeightMm = availableHeight;
                    finalWidthMm = availableHeight * aspectRatio;
                }
            } else {
                finalWidthMm = imgWidthMm;
                finalHeightMm = imgHeightMm;
            }

            // Centrer l'image
            const x = (pdfPageWidthMm - finalWidthMm) / 2;
            const y = (pdfPageHeightMm - finalHeightMm) / 2;

            pdf.addImage(imgData, 'PNG', x, y, finalWidthMm, finalHeightMm);

            currentMonth = currentMonth.add(1, 'month');
            currentPage++;
        }

        pdf.save(`planning_electri-cal_multi-mois_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`);
        showToast("Exportation PDF multi-mois réussie !", 'success');

    } catch (error) {
        console.error('Erreur lors de l\'exportation PDF multi-mois :', error);
        showToast("Erreur lors de l'exportation PDF multi-mois. Vérifiez la console.", 'error');
    } finally {
        // Restaurer la vue et la date originales, même en cas d'erreur
        calendar.changeView(originalView);
        calendar.gotoDate(originalDate); // Revenir à la date initiale
    }
}

// Fonction pour capturer et exporter en PNG plusieurs mois
async function exportPlanningToPngMultiMonth() {
    showToast("Génération du(des) PNG(s) en cours...", 'info', 5000);
    const calendarEl = document.getElementById('calendar');
    if (!calendarEl || !calendar) {
        showToast("Erreur: Calendrier non trouvé.", "error");
        return;
    }

    // Sauvegarder la vue et la date originales
    const originalView = calendar.view.type;
    const originalDate = calendar.getDate();

    try {
        // Définir la vue sur month pour la capture
        calendar.changeView('dayGridMonth');

        let currentMonth = dayjs(originalDate).startOf('month');
        const numberOfMonthsToExport = 2; // Exporter le mois actuel et le mois suivant

        for (let i = 0; i < numberOfMonthsToExport; i++) {
            // Aller au mois correct pour la capture
            calendar.gotoDate(currentMonth.toDate());
            await new Promise(resolve => setTimeout(resolve, 100)); // Laisser le temps à FullCalendar de se rendre

            const canvas = await html2canvas(calendarEl, {
                scale: 2, // Augmenter la résolution pour une meilleure qualité
                useCORS: true, // Important si des images externes sont utilisées
                logging: false,
                backgroundColor: null
            });

            // Créer un lien de téléchargement pour le PNG
            const imgUrl = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = imgUrl;
            a.download = `planning_electri-cal_mois-${currentMonth.format('YYYY-MM')}_${dayjs().format('HHmmss')}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            currentMonth = currentMonth.add(1, 'month');
        }

        showToast("Exportation PNG multi-mois réussie !", 'success');

    } catch (error) {
        console.error('Erreur lors de l\'exportation PNG multi-mois :', error);
        showToast("Erreur lors de l'exportation PNG multi-mois. Vérifiez la console.", 'error');
    } finally {
        // Restaurer la vue et la date originales, même en cas d'erreur
        calendar.changeView(originalView);
        calendar.gotoDate(originalDate); // Revenir à la date initiale
    }
}

// --- Statistiques (à développer) ---
function showStatsModal() {
    showToast("Fonctionnalité de statistiques à venir !", "info");
    // const content = `<p>Graphiques des jours de permanence, télétravail, congés...</p>`;
    // createAndShowModal('Statistiques', content, null, null, 'Fermer');
}
