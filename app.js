// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
// MODIFIÉ : Version de l'application mise à jour pour inclure les dernières corrections et fonctionnalités
const APP_VERSION = "v20.50.2";

// MODIFIÉ : Informations sur les versions des librairies pour la vérification manuelle
const LIBRARIES_INFO = [
    { name: "FullCalendar", currentVersion: "6.1.17", latestKnownVersion: "6.1.17", recommendation: "À jour", sourceUrl: "https://fullcalendar.io/" },
    { name: "Day.js", currentVersion: "1.11.10", latestKnownVersion: "1.11.11", recommendation: "Mise à jour mineure recommandée", sourceUrl: "https://day.js.org/" },
    { name: "Font Awesome", currentVersion: "5.15.4", latestKnownVersion: "6.5.2", recommendation: "Mise à jour majeure recommandée", sourceUrl: "https://fontawesome.com/" },
    { name: "jsPDF", currentVersion: "2.5.1", latestKnownVersion: "2.10.0", recommendation: "Mise à jour mineure recommandée (correction de bugs)", sourceUrl: "https://parall.ax/products/jspdf" },
    // NOUVEAU: Ajout de html2canvas dans la liste des librairies
    { name: "html2canvas", currentVersion: "1.4.1", latestKnownVersion: "1.4.1", recommendation: "À jour", sourceUrl: "https://html2canvas.hertzen.com/" }
];

// Références aux éléments du DOM pour les modales et toasts
let addPersonModal;
let addPersonForm;
let editPersonModal;
let editPersonForm;
let addEventModal;
let addEventForm;
let statsModal;
let libraryVersionsModal;
// NOUVEAU: Référence à la modale d'options d'export PNG
let exportPngOptionsModal;

// MODIFIÉ: Variables pour la gestion des événements
let currentEditedEvent = null; // Pour stocker l'événement en cours d'édition
let currentEventFormMode = 'add'; // 'add' ou 'edit'


// --- Fonctions utilitaires ---

/**
 * Affiche un message toast à l'utilisateur.
 * @param {string} message - Le message à afficher.
 * @param {string} type - Le type de message ('info', 'success', 'error').
 * @param {number} duration - Durée d'affichage en ms (par défaut 3000).
 */
function showToast(message, type = 'info', duration = 3000) {
    const toastsContainer = document.getElementById('toastsContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastsContainer.appendChild(toast);

    // Ajout d'un spinner pour les messages 'info' longs
    if (type === 'info' && duration === 0) { // Duration 0 signifies indefinite loading
        const spinner = document.createElement('i');
        spinner.className = 'fas fa-spinner fa-spin toast-spinner';
        toast.prepend(spinner); // Add spinner at the beginning
    }

    // Gérer la disparition
    if (duration > 0) {
        setTimeout(() => {
            toast.classList.add('fade-out');
            toast.addEventListener('transitionend', () => toast.remove());
        }, duration);
    }
}

/**
 * Ouvre une modale spécifique.
 * @param {string} modalId - L'ID de la modale à ouvrir.
 */
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'flex'; // Make it flex to center content
        // Force a reflow for the transition to work
        modal.offsetHeight;
        modal.classList.add('show');
    }
}

/**
 * Ferme une modale spécifique.
 * @param {string} modalId - L'ID de la modale à fermer.
 */
function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('show');
        // Wait for the transition to finish before hiding completely
        modal.addEventListener('transitionend', function handler() {
            modal.style.display = 'none';
            modal.removeEventListener('transitionend', handler);
        });
    }
}

/**
 * Vide les champs d'un formulaire.
 * @param {HTMLFormElement} form - Le formulaire à vider.
 */
function clearForm(form) {
    form.reset(); // Réinitialise les champs du formulaire
}


// --- Gestion des Personnes ---

/**
 * Charge les personnes depuis le stockage local.
 */
function loadPeople() {
    const storedPeople = localStorage.getItem('people');
    if (storedPeople) {
        people = JSON.parse(storedPeople);
    } else {
        // Initialiser avec des personnes par défaut si le stockage est vide
        people = [
            { id: 'P001', name: 'Alice Dubois', skills: ['électricité', 'plomberie'], availability: 'fulltime', hidden: false },
            { id: 'P002', name: 'Bob Martin', skills: ['électricité'], availability: 'fulltime', hidden: false },
            { id: 'P003', name: 'Charlie Bernard', skills: ['mécanique'], availability: 'parttime', hidden: false }
        ];
    }
    renderPeopleList();
}

/**
 * Sauvegarde les personnes dans le stockage local.
 */
function savePeople() {
    localStorage.setItem('people', JSON.stringify(people));
}

/**
 * Génère un ID unique pour une nouvelle personne.
 * @returns {string} L'ID unique généré.
 */
function generatePersonId() {
    return 'P' + String(people.length + 1).padStart(3, '0');
}

/**
 * Affiche la liste des personnes dans la sidebar.
 */
function renderPeopleList() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = ''; // Vider la liste existante

    people.forEach(person => {
        const li = document.createElement('li');
        li.dataset.personId = person.id;
        if (person.hidden) {
            li.classList.add('person-hidden');
        }

        const personNameSpan = document.createElement('span');
        personNameSpan.textContent = person.name;
        li.appendChild(personNameSpan);

        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'person-actions';

        const editButton = document.createElement('button');
        editButton.innerHTML = '<i class="fas fa-edit"></i>';
        editButton.title = 'Modifier';
        editButton.onclick = (e) => {
            e.stopPropagation(); // Empêche l'ouverture de la modale d'événement
            openEditPersonModal(person.id);
        };
        actionsDiv.appendChild(editButton);

        const toggleVisibilityButton = document.createElement('button');
        toggleVisibilityButton.innerHTML = person.hidden ? '<i class="fas fa-eye-slash"></i>' : '<i class="fas fa-eye"></i>';
        toggleVisibilityButton.title = person.hidden ? 'Afficher' : 'Masquer';
        toggleVisibilityButton.onclick = (e) => {
            e.stopPropagation();
            togglePersonVisibility(person.id);
        };
        actionsDiv.appendChild(toggleVisibilityButton);

        const deleteButton = document.createElement('button');
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.title = 'Supprimer';
        deleteButton.onclick = (e) => {
            e.stopPropagation();
            deletePerson(person.id);
        };
        actionsDiv.appendChild(deleteButton);

        li.appendChild(actionsDiv);
        peopleList.appendChild(li);
    });

    updateCalendarEvents(); // Mettre à jour les événements du calendrier après avoir rendu la liste
}

/**
 * Ajoute une nouvelle personne.
 */
function addPerson() {
    const name = document.getElementById('newPersonName').value;
    const skills = Array.from(document.getElementById('newPersonSkills').selectedOptions).map(option => option.value);
    const availability = document.getElementById('newPersonAvailability').value;

    if (name) {
        const newPerson = {
            id: generatePersonId(),
            name,
            skills,
            availability,
            hidden: false
        };
        people.push(newPerson);
        savePeople();
        renderPeopleList();
        closeModal('addPersonModal');
        clearForm(addPersonForm);
        showToast(`Personne ${name} ajoutée.`, 'success');
    } else {
        showToast("Le nom de la personne est requis.", "error");
    }
}

/**
 * Ouvre la modale pour modifier une personne existante.
 * @param {string} personId - L'ID de la personne à modifier.
 */
function openEditPersonModal(personId) {
    const person = people.find(p => p.id === personId);
    if (person) {
        document.getElementById('editPersonId').value = person.id;
        document.getElementById('editPersonName').value = person.name;
        const editSkillsSelect = document.getElementById('editPersonSkills');
        Array.from(editSkillsSelect.options).forEach(option => {
            option.selected = person.skills.includes(option.value);
        });
        document.getElementById('editPersonAvailability').value = person.availability;
        openModal('editPersonModal');
    }
}

/**
 * Met à jour une personne existante.
 */
function updatePerson() {
    const id = document.getElementById('editPersonId').value;
    const name = document.getElementById('editPersonName').value;
    const skills = Array.from(document.getElementById('editPersonSkills').selectedOptions).map(option => option.value);
    const availability = document.getElementById('editPersonAvailability').value;

    if (name) {
        const personIndex = people.findIndex(p => p.id === id);
        if (personIndex > -1) {
            people[personIndex] = { ...people[personIndex], name, skills, availability };
            savePeople();
            renderPeopleList();
            closeModal('editPersonModal');
            showToast(`Personne ${name} mise à jour.`, 'success');
        }
    } else {
        showToast("Le nom de la personne est requis.", "error");
    }
}

/**
 * Supprime une personne.
 * @param {string} personId - L'ID de la personne à supprimer.
 */
function deletePerson(personId) {
    const personName = people.find(p => p.id === personId)?.name || 'inconnue';
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${personName} ? Cela supprimera également tous ses événements.`)) {
        people = people.filter(p => p.id !== personId);
        // Supprimer les événements associés à cette personne
        allCalendarEvents = allCalendarEvents.filter(event => event.personId !== personId);
        savePeople();
        saveEvents(); // Sauvegarder les événements mis à jour
        renderPeopleList();
        updateCalendarEvents();
        showToast(`Personne ${personName} et ses événements supprimés.`, 'success');
    }
}

/**
 * Change la visibilité d'une personne (masquer/afficher).
 * @param {string} personId - L'ID de la personne.
 */
function togglePersonVisibility(personId) {
    const person = people.find(p => p.id === personId);
    if (person) {
        person.hidden = !person.hidden;
        savePeople();
        renderPeopleList(); // Re-render pour appliquer la classe CSS
        updateCalendarEvents(); // Mettre à jour le calendrier pour masquer/afficher les événements de cette personne
        showToast(`Visibilité de ${person.name} : ${person.hidden ? 'masquée' : 'visible'}.`, 'info');
    }
}


// --- Gestion des Événements de Planning ---

/**
 * Charge les événements depuis le stockage local.
 */
function loadEvents() {
    const storedEvents = localStorage.getItem('calendarEvents');
    if (storedEvents) {
        allCalendarEvents = JSON.parse(storedEvents);
    } else {
        allCalendarEvents = [
            { id: 'E001', title: 'Permanence A', start: '2025-07-01', end: '2025-07-02', personId: 'P001', type: 'Permanence', notes: 'Ronde de nuit', color: '#ff7f50' },
            { id: 'E002', title: 'Backup B', start: '2025-07-03', end: '2025-07-04', personId: 'P002', type: 'Backup', notes: 'Support technique', color: '#6a0dad' }
        ];
    }
    updateCalendarEvents();
}

/**
 * Sauvegarde les événements dans le stockage local.
 */
function saveEvents() {
    localStorage.setItem('calendarEvents', JSON.stringify(allCalendarEvents));
}

/**
 * Génère un ID unique pour un nouvel événement.
 * @returns {string} L'ID unique généré.
 */
function generateEventId() {
    return 'E' + String(allCalendarEvents.length + 1).padStart(3, '0');
}

/**
 * Met à jour le calendrier avec les événements filtrés et mis à jour.
 */
function updateCalendarEvents() {
    const visibleEvents = allCalendarEvents.filter(event => {
        const person = people.find(p => p.id === event.personId);
        return person && !person.hidden;
    }).map(event => {
        // Appliquer la couleur basée sur le type ou l'utilisateur
        let eventColor = event.color; // Garder la couleur si elle est déjà définie
        const person = people.find(p => p.id === event.personId);
        if (!eventColor && person) {
            // Logique de couleur par défaut basée sur le type ou la personne
            switch (event.type) {
                case 'Permanence':
                    eventColor = '#ff7f50'; // Couleur orange
                    break;
                case 'Backup':
                    eventColor = '#6a0dad'; // Couleur violette
                    break;
                case 'Formation':
                    eventColor = '#007bff'; // Couleur bleue
                    break;
                default:
                    eventColor = '#28a745'; // Vert par défaut
            }
        }

        // Ajouter le nom de la personne au titre pour l'affichage
        const personName = person ? person.name : 'Personne inconnue';
        const displayTitle = `${event.title} (${personName})`;

        return {
            ...event,
            title: displayTitle,
            color: eventColor,
            extendedProps: { // Stocker les propriétés originales ici
                personId: event.personId,
                type: event.type,
                notes: event.notes,
                originalTitle: event.title // Garder le titre original
            }
        };
    });

    calendar.setOption('events', visibleEvents);
}


/**
 * Ouvre la modale d'ajout/édition d'événement.
 * @param {object|null} event - L'objet événement à éditer, ou null pour un nouvel événement.
 */
function openAddEditEventModal(event = null) {
    clearForm(addEventForm); // Toujours vider avant de remplir

    document.getElementById('eventPersonId').innerHTML = ''; // Vider les options existantes
    people.forEach(person => {
        const option = document.createElement('option');
        option.value = person.id;
        option.textContent = person.name;
        document.getElementById('eventPersonId').appendChild(option);
    });

    // Remplir les types d'événements
    const eventTypeSelect = document.getElementById('eventType');
    eventTypeSelect.innerHTML = ''; // Vider les options existantes
    ['Permanence', 'Backup', 'Formation', 'Autre'].forEach(type => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        eventTypeSelect.appendChild(option);
    });

    if (event) {
        currentEventFormMode = 'edit';
        currentEditedEvent = event; // Stocker l'événement en cours d'édition
        document.getElementById('eventModalTitle').textContent = "Modifier l'événement";
        document.getElementById('addEditEventButton').textContent = "Modifier l'événement";
        document.getElementById('deleteEventButton').style.display = 'inline-block'; // Afficher le bouton supprimer

        // Remplir le formulaire avec les données de l'événement
        document.getElementById('eventId').value = event.id || '';
        document.getElementById('eventTitle').value = event.extendedProps.originalTitle || event.title; // Utiliser le titre original
        document.getElementById('eventPersonId').value = event.extendedProps.personId || '';
        document.getElementById('eventStartDate').value = dayjs(event.start).format('YYYY-MM-DD');
        // Gérer la date de fin qui peut être non incluse dans FullCalendar (end-1 jour)
        const endDate = event.end ? dayjs(event.end).subtract(1, 'day').format('YYYY-MM-DD') : dayjs(event.start).format('YYYY-MM-DD');
        document.getElementById('eventEndDate').value = endDate;
        document.getElementById('eventType').value = event.extendedProps.type || '';
        document.getElementById('eventNotes').value = event.extendedProps.notes || '';
        document.getElementById('eventColor').value = event.color || '#ff7f50'; // Couleur par défaut si non définie
    } else {
        currentEventFormMode = 'add';
        currentEditedEvent = null;
        document.getElementById('eventModalTitle').textContent = "Ajouter un événement";
        document.getElementById('addEditEventButton').textContent = "Ajouter l'événement";
        document.getElementById('deleteEventButton').style.display = 'none'; // Cacher le bouton supprimer
        document.getElementById('eventId').value = generateEventId(); // Générer un nouvel ID pour un nouvel événement
        document.getElementById('eventColor').value = '#ff7f50'; // Couleur par défaut pour nouvel événement
    }

    openModal('addEventModal');
}

/**
 * Ajoute ou modifie un événement de planning.
 */
function addEditPlanningEvent() {
    const id = document.getElementById('eventId').value;
    const title = document.getElementById('eventTitle').value;
    const personId = document.getElementById('eventPersonId').value;
    const startDate = document.getElementById('eventStartDate').value;
    const endDate = document.getElementById('eventEndDate').value;
    const type = document.getElementById('eventType').value;
    const notes = document.getElementById('eventNotes').value;
    const color = document.getElementById('eventColor').value;

    if (!title || !personId || !startDate || !endDate || !type) {
        showToast("Tous les champs sont obligatoires.", "error");
        return;
    }

    const startDayJs = dayjs(startDate);
    const endDayJs = dayjs(endDate);

    if (endDayJs.isBefore(startDayJs)) {
        showToast("La date de fin ne peut pas être antérieure à la date de début.", "error");
        return;
    }

    // La date de fin de FullCalendar est exclusive, donc +1 jour
    const fcEndDate = endDayJs.add(1, 'day').format('YYYY-MM-DD');

    const newEvent = {
        id: currentEventFormMode === 'add' ? generateEventId() : id,
        title: title, // Le titre que l'utilisateur a entré
        start: startDayJs.format('YYYY-MM-DD'),
        end: fcEndDate, // Date de fin pour FullCalendar
        personId: personId,
        type: type,
        notes: notes,
        color: color // Couleur sélectionnée
    };

    if (currentEventFormMode === 'add') {
        allCalendarEvents.push(newEvent);
        showToast(`Événement "${title}" ajouté.`, 'success');
    } else { // mode 'edit'
        const eventIndex = allCalendarEvents.findIndex(e => e.id === id);
        if (eventIndex > -1) {
            allCalendarEvents[eventIndex] = newEvent;
            showToast(`Événement "${title}" modifié.`, 'success');
        }
    }

    saveEvents();
    updateCalendarEvents();
    closeModal('addEventModal');
}

/**
 * Supprime un événement de planning.
 */
function deletePlanningEvent() {
    if (currentEditedEvent && confirm(`Êtes-vous sûr de vouloir supprimer l'événement "${currentEditedEvent.extendedProps.originalTitle || currentEditedEvent.title}" ?`)) {
        allCalendarEvents = allCalendarEvents.filter(event => event.id !== currentEditedEvent.id);
        saveEvents();
        updateCalendarEvents();
        closeModal('addEventModal');
        showToast("Événement supprimé.", "success");
        currentEditedEvent = null; // Réinitialiser
    }
}


// --- Fonctions d'Export/Import ---

/**
 * Exporte le calendrier et les personnes au format JSON.
 */
function exportDataAsJson() {
    const data = {
        people: people,
        events: allCalendarEvents
    };
    const jsonString = JSON.stringify(data, null, 2); // Beau formatage JSON
    const blob = new Blob([jsonString], { type: 'application/json' });
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

/**
 * Importe des données depuis un fichier JSON.
 */
function importDataFromJson() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.people && importedData.events) {
                        if (confirm("Voulez-vous remplacer les données existantes ou ajouter les nouvelles données ?\n\nOK pour remplacer, Annuler pour ajouter.")) {
                            people = importedData.people;
                            allCalendarEvents = importedData.events;
                            showToast("Données remplacées avec succès.", "success");
                        } else {
                            // Ajouter de nouvelles personnes en évitant les doublons d'ID
                            importedData.people.forEach(newPerson => {
                                if (!people.some(p => p.id === newPerson.id)) {
                                    people.push(newPerson);
                                }
                            });
                            // Ajouter de nouveaux événements en évitant les doublons d'ID
                            importedData.events.forEach(newEvent => {
                                if (!allCalendarEvents.some(e => e.id === newEvent.id)) {
                                    allCalendarEvents.push(newEvent);
                                }
                            });
                            showToast("Données ajoutées avec succès.", "success");
                        }
                        savePeople();
                        saveEvents();
                        renderPeopleList();
                        updateCalendarEvents();
                    } else {
                        showToast("Fichier JSON invalide : doit contenir 'people' et 'events'.", "error");
                    }
                } catch (error) {
                    showToast("Erreur de lecture du fichier JSON : " + error.message, "error");
                }
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

/**
 * Exporte le calendrier au format PDF (fonction existante ou simulée).
 * NOTE: L'implémentation réelle de jsPDF n'est pas fournie ici.
 * Il est probable que cette fonction utiliserait html2canvas en interne
 * pour capturer le contenu du calendrier, puis jsPDF pour l'intégrer au PDF.
 */
function exportCalendarAsPdf() {
    showToast("Export PDF en cours... (fonctionnalité à implémenter avec jsPDF)", "info", 0);
    // Simuler un délai pour une tâche complexe
    setTimeout(() => {
        showToast("Export PDF terminé!", "success");
    }, 2000);
}

// NOUVEAU: Fonctions pour l'export PNG avec options

/**
 * Affiche la modale d'options d'export PNG et la remplit dynamiquement.
 */
function showExportPngOptionsModal() {
    openModal('exportPngOptionsModal');

    const pngEventTypeFiltersContainer = document.getElementById('pngEventTypeFilters');
    pngEventTypeFiltersContainer.innerHTML = ''; // Vider les options précédentes

    // Récupérer tous les types d'événements uniques
    const uniqueEventTypes = [...new Set(allCalendarEvents.map(event => event.type))];

    uniqueEventTypes.forEach(type => {
        if (type) { // Assurez-vous que le type n'est pas vide
            const checkboxDiv = document.createElement('div');
            checkboxDiv.className = 'checkbox-group-item'; // Pour le style si besoin
            const input = document.createElement('input');
            input.type = 'checkbox';
            input.id = `pngFilter-${type}`;
            input.value = type;
            input.checked = true; // Par défaut, tout est coché

            const label = document.createElement('label');
            label.htmlFor = `pngFilter-${type}`;
            label.textContent = type;

            checkboxDiv.appendChild(input);
            checkboxDiv.appendChild(label);
            pngEventTypeFiltersContainer.appendChild(checkboxDiv);
        }
    });

    // Option pour le fond blanc est déjà statique dans l'HTML, juste s'assurer qu'elle est cochée par défaut
    document.getElementById('pngAddWhiteBackground').checked = true;

    // Remplir les dates de début et fin avec la vue actuelle du calendrier
    const view = calendar.view;
    if (view) {
        document.getElementById('pngStartDate').value = dayjs(view.currentStart).format('YYYY-MM-DD');
        document.getElementById('pngEndDate').value = dayjs(view.currentEnd).subtract(1, 'day').format('YYYY-MM-DD'); // -1 jour car currentEnd est exclusif
    }
}

/**
 * Exporte le calendrier au format PNG en fonction des options sélectionnées.
 */
async function exportCalendarAsPng() {
    showToast("Génération du PNG en cours...", "info", 0); // Durée 0 pour un toast persistant
    closeModal('exportPngOptionsModal'); // Fermer la modale pendant la génération

    const calendarEl = document.getElementById('calendar');
    const pngEventTypeCheckboxes = document.querySelectorAll('#pngEventTypeFilters input[type="checkbox"]');
    const addWhiteBackground = document.getElementById('pngAddWhiteBackground').checked;
    const startDateFilter = document.getElementById('pngStartDate').value;
    const endDateFilter = document.getElementById('pngEndDate').value;

    let selectedEventTypes = [];
    pngEventTypeCheckboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedEventTypes.push(checkbox.value);
        }
    });

    // Étape 1: Masquer les événements non sélectionnés et ceux hors de la plage de dates
    const allFcEvents = calendarEl.querySelectorAll('.fc-event');
    const originalDisplayStates = new Map(); // Pour stocker les états originaux

    allFcEvents.forEach(eventEl => {
        const eventId = eventEl.getAttribute('data-event-id');
        const fcEvent = calendar.getEventById(eventId);

        // Store original display to restore later
        originalDisplayStates.set(eventEl, eventEl.style.display);
        eventEl.style.display = ''; // Clear inline display before applying hide-class

        let shouldHide = false;

        if (fcEvent) {
            // Filtrer par type d'événement
            const eventType = fcEvent.extendedProps ? fcEvent.extendedProps.type : null;
            if (eventType && !selectedEventTypes.includes(eventType)) {
                shouldHide = true;
            }

            // Filtrer par plage de dates
            if (!shouldHide && startDateFilter && endDateFilter) {
                const eventStart = dayjs(fcEvent.start);
                // FullCalendar end is exclusive, so for comparison we adjust it
                const eventEnd = fcEvent.end ? dayjs(fcEvent.end).subtract(1, 'day') : eventStart;
                const filterStart = dayjs(startDateFilter);
                const filterEnd = dayjs(endDateFilter);

                // Check if event is within the selected range
                if (!eventStart.isSameOrBefore(filterEnd, 'day') || !eventEnd.isSameOrAfter(filterStart, 'day')) {
                    shouldHide = true;
                }
            }
        } else {
             // If fcEvent not found (e.g., non-event elements with fc-event class)
             // or if eventId is missing, assume we should hide it if filtering is active.
             // Or, more safely, only hide if it's definitely an event we don't want.
             // For now, if no event object, we don't apply type/date filter.
             // We only hide based on event type if event object exists.
        }

        if (shouldHide) {
            eventEl.classList.add('hide-for-png-export');
        }
    });

    // Timeout pour laisser le DOM se mettre à jour avant la capture
    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        const canvas = await html2canvas(calendarEl, {
            useCORS: true, // Important si des images externes sont utilisées (ex: via CSS)
            backgroundColor: addWhiteBackground ? '#FFFFFF' : null, // Fond blanc si coché
            scale: 2 // Augmenter l'échelle pour une meilleure qualité d'image
        });

        const link = document.createElement('a');
        link.download = `electri-cal_planning_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        link.href = canvas.toDataURL('image/png');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showToast("Export PNG terminé avec succès !", "success");

    } catch (error) {
        console.error("Erreur lors de la génération du PNG :", error);
        showToast("Échec de l'export PNG. Veuillez réessayer.", "error");
    } finally {
        // Étape 2: Restaurer la visibilité originale des événements
        allFcEvents.forEach(eventEl => {
            eventEl.classList.remove('hide-for-png-export');
            // Restore original display if it was explicitly set inline
            if (originalDisplayStates.has(eventEl) && originalDisplayStates.get(eventEl) !== '') {
                eventEl.style.display = originalDisplayStates.get(eventEl);
            } else {
                 eventEl.style.display = ''; // Clear inline style if it was empty
            }
        });
    }
}


// --- Fonctions de Statistiques ---

/**
 * Calcule et affiche les statistiques de permanence et de backup.
 */
function showStats() {
    openModal('statsModal');
    // Récupérer les dates de début et de fin de la vue actuelle du calendrier
    const currentViewStart = calendar.view.currentStart;
    const currentViewEnd = calendar.view.currentEnd; // Exclusif

    // Définir les valeurs par défaut dans le formulaire de stats
    document.getElementById('statsStartDate').value = dayjs(currentViewStart).format('YYYY-MM-DD');
    // La date de fin affichée doit être la dernière date incluse dans la vue, pas la date exclusive de FullCalendar
    document.getElementById('statsEndDate').value = dayjs(currentViewEnd).subtract(1, 'day').format('YYYY-MM-DD');

    // Déclencher le calcul des stats pour la période par défaut
    calculateAndDisplayStats();
}

/**
 * Calcule et affiche les statistiques en fonction de la période sélectionnée.
 */
function calculateAndDisplayStats() {
    const startDateStr = document.getElementById('statsStartDate').value;
    const endDateStr = document.getElementById('statsEndDate').value;
    const statsResultsDiv = document.getElementById('statsResults');

    if (!startDateStr || !endDateStr) {
        statsResultsDiv.innerHTML = '<p class="error-message">Veuillez sélectionner une plage de dates.</p>';
        return;
    }

    const startDate = dayjs(startDateStr);
    const endDate = dayjs(endDateStr);

    if (endDate.isBefore(startDate)) {
        statsResultsDiv.innerHTML = '<p class="error-message">La date de fin ne peut pas être antérieure à la date de début.</p>';
        return;
    }

    // Statistiques par personne et par type
    const statsByTypeAndPerson = {};
    const totalDaysByType = {};
    const totalDaysOverall = {}; // Pour le total des jours par personne, tous types confondus

    allCalendarEvents.forEach(event => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end).subtract(1, 'day'); // La date de fin est exclusive dans FullCalendar

        // Si l'événement est entièrement ou partiellement dans la période sélectionnée
        const intersectionStart = dayjs.max(eventStart, startDate);
        const intersectionEnd = dayjs.min(eventEnd, endDate);

        if (intersectionEnd.isSameOrAfter(intersectionStart)) {
            let daysInPeriod = intersectionEnd.diff(intersectionStart, 'day') + 1;

            const personName = people.find(p => p.id === event.personId)?.name || 'Inconnu';
            const eventType = event.type || 'Non spécifié';

            if (!statsByTypeAndPerson[personName]) {
                statsByTypeAndPerson[personName] = {};
                totalDaysOverall[personName] = 0;
            }
            if (!statsByTypeAndPerson[personName][eventType]) {
                statsByTypeAndPerson[personName][eventType] = 0;
            }

            statsByTypeAndPerson[personName][eventType] += daysInPeriod;
            totalDaysOverall[personName] += daysInPeriod;

            if (!totalDaysByType[eventType]) {
                totalDaysByType[eventType] = 0;
            }
            totalDaysByType[eventType] += daysInPeriod;
        }
    });

    let tableHtml = `
        <p class="info-message">Statistiques pour la période du ${startDate.format('DD/MM/YYYY')} au ${endDate.format('DD/MM/YYYY')}</p>
        <div class="stats-table-container">
            <table class="stats-table">
                <thead>
                    <tr>
                        <th>Personne</th>
                        <th>Type d'événement</th>
                        <th>Jours</th>
                    </tr>
                </thead>
                <tbody>
    `;

    for (const personName in statsByTypeAndPerson) {
        let firstRowForPerson = true;
        for (const eventType in statsByTypeAndPerson[personName]) {
            tableHtml += `
                <tr>
                    ${firstRowForPerson ? `<td rowspan="${Object.keys(statsByTypeAndPerson[personName]).length + 1}">${personName}</td>` : ''}
                    <td>${eventType}</td>
                    <td>${statsByTypeAndPerson[personName][eventType]}</td>
                </tr>
            `;
            firstRowForPerson = false;
        }
        // Ajouter la ligne de total pour la personne
        tableHtml += `
            <tr class="total-row">
                <td><strong>Total ${personName}</strong></td>
                <td><strong>${totalDaysOverall[personName]}</strong></td>
            </tr>
        `;
    }

    // Ajouter les totaux par type d'événement à la fin du tableau
    if (Object.keys(totalDaysByType).length > 0) {
        tableHtml += `
            <tr><td colspan="3"><hr></td></tr>
            <tr><th colspan="3">Totaux par type d'événement</th></tr>
        `;
        for (const eventType in totalDaysByType) {
            tableHtml += `
                <tr>
                    <td colspan="2">Total ${eventType}</td>
                    <td>${totalDaysByType[eventType]}</td>
                </tr>
            `;
        }
    }


    tableHtml += `
                </tbody>
            </table>
        </div>
        <div class="button-group" style="justify-content: flex-start; margin-top: 15px;">
            <button class="button-primary" onclick="exportStatsAsCsv('${startDateStr}', '${endDateStr}')">Exporter CSV</button>
        </div>
    `;

    statsResultsDiv.innerHTML = tableHtml;
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

// --- Vérification des versions de librairies ---

/**
 * Affiche la modale de vérification des versions des librairies.
 */
function showLibraryVersions() {
    openModal('libraryVersionsModal');
    const libraryVersionsBody = document.getElementById('libraryVersionsBody');
    libraryVersionsBody.innerHTML = '';

    LIBRARIES_INFO.forEach(lib => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><a href="${lib.sourceUrl}" target="_blank">${lib.name}</a></td>
            <td>${lib.currentVersion}</td>
            <td>${lib.latestKnownVersion}</td>
            <td class="${lib.recommendation.includes('Mise à jour') ? 'text-warning' : 'text-success'}">${lib.recommendation}</td>
        `;
        libraryVersionsBody.appendChild(row);
    });
}

// --- Initialisation de l'application ---

document.addEventListener('DOMContentLoaded', () => {
    // Initialisation de Day.js avec les plugins nécessaires
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday);
    dayjs.extend(dayjs_plugin_isSameOrBefore);
    dayjs.extend(dayjs_plugin_minMax);
    dayjs.extend(dayjs_plugin_isSameOrAfter);


    // Initialisation des références DOM pour les modales
    addPersonModal = document.getElementById('addPersonModal');
    addPersonForm = document.getElementById('addPersonForm');
    editPersonModal = document.getElementById('editPersonModal');
    editPersonForm = document.getElementById('editPersonForm');
    addEventModal = document.getElementById('addEventModal');
    addEventForm = document.getElementById('addEventForm');
    statsModal = document.getElementById('statsModal');
    libraryVersionsModal = document.getElementById('libraryVersionsModal');
    // NOUVEAU: Référence à la modale d'options d'export PNG
    exportPngOptionsModal = document.getElementById('exportPngOptionsModal');


    // Références aux boutons et ajout des écouteurs d'événements
    document.getElementById('addPersonBtn').addEventListener('click', () => openModal('addPersonModal'));
    document.getElementById('savePersonBtn').addEventListener('click', addPerson);
    document.getElementById('updatePersonBtn').addEventListener('click', updatePerson);
    document.getElementById('addPlanningEventBtn').addEventListener('click', () => openAddEditEventModal());
    document.getElementById('addEditEventButton').addEventListener('click', addEditPlanningEvent);
    document.getElementById('deleteEventButton').addEventListener('click', deletePlanningEvent);
    document.getElementById('exportJsonBtn').addEventListener('click', exportDataAsJson);
    document.getElementById('importJsonBtn').addEventListener('click', importDataFromJson);
    document.getElementById('showStatsBtn').addEventListener('click', showStats);
    document.getElementById('calculateStatsBtn').addEventListener('click', calculateAndDisplayStats);
    document.getElementById('showLibraryVersionsBtn').addEventListener('click', showLibraryVersions);
    document.getElementById('exportPdfBtn').addEventListener('click', exportCalendarAsPdf); // Appel de la fonction d'export PDF (à implémenter)
    // MODIFIÉ: Le bouton d'export PNG ouvre maintenant la modale d'options
    document.getElementById('exportPngBtn').addEventListener('click', showExportPngOptionsModal);

    // Initialisation du FullCalendar
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr', // Définir la locale en français
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        editable: true, // Permettre le glisser-déposer des événements
        droppable: true, // Permettre le dépôt d'éléments externes (si implémenté)
        eventDidMount: function(info) {
            // Ajouter un attribut data-event-id à l'élément DOM de l'événement
            // Pour faciliter la sélection lors de l'export PNG
            if (info.event.id) {
                info.el.setAttribute('data-event-id', info.event.id);
            }
        },
        eventClick: function(info) {
            // info.event est l'objet événement FullCalendar
            openAddEditEventModal(info.event);
        },
        eventDrop: function(info) {
            // Mise à jour de l'événement après un glisser-déposer
            const updatedEvent = allCalendarEvents.find(e => e.id === info.event.id);
            if (updatedEvent) {
                updatedEvent.start = dayjs(info.event.start).format('YYYY-MM-DD');
                if (info.event.end) {
                    updatedEvent.end = dayjs(info.event.end).format('YYYY-MM-DD');
                } else {
                    // Si l'événement n'avait pas de date de fin, elle est maintenant la même que le début + 1 jour
                    updatedEvent.end = dayjs(info.event.start).add(1, 'day').format('YYYY-MM-DD');
                }
                saveEvents();
                showToast(`Événement "${info.event.title}" déplacé.`, 'success');
            }
        },
        eventResize: function(info) {
            // Mise à jour de l'événement après un redimensionnement
            const updatedEvent = allCalendarEvents.find(e => e.id === info.event.id);
            if (updatedEvent) {
                updatedEvent.start = dayjs(info.event.start).format('YYYY-MM-DD');
                if (info.event.end) {
                    updatedEvent.end = dayjs(info.event.end).format('YYYY-MM-DD');
                }
                saveEvents();
                showToast(`Événement "${info.event.title}" redimensionné.`, 'success');
            }
        }
    });

    calendar.render();

    // Charger les données initiales
    loadPeople();
    loadEvents(); // Assurez-vous que les événements sont chargés après les personnes pour un bon mappage

    // Mise à jour de l'année dans le footer
    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME} ${APP_VERSION}`;

    // MODAL HTML STRUCTURES (for initial setup in the main app.js file)
    // If these modals are not defined in index.html, they should be created here
    // However, given the existing index.html structure, they should be in index.html
    // and merely referenced here.

    // Modal for Add Person
    const addPersonModalHtml = `
        <div id="addPersonModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Ajouter une nouvelle personne</h2>
                    <span class="close-button" onclick="closeModal('addPersonModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addPersonForm">
                        <div class="form-group">
                            <label for="newPersonName">Nom :</label>
                            <input type="text" id="newPersonName" required>
                        </div>
                        <div class="form-group">
                            <label for="newPersonSkills">Compétences :</label>
                            <select id="newPersonSkills" multiple>
                                <option value="électricité">Électricité</option>
                                <option value="plomberie">Plomberie</option>
                                <option value="mécanique">Mécanique</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="newPersonAvailability">Disponibilité :</label>
                            <select id="newPersonAvailability">
                                <option value="fulltime">Temps plein</option>
                                <option value="parttime">Temps partiel</option>
                                <option value="oncall">D'astreinte</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="button-primary" id="savePersonBtn">Ajouter</button>
                    <button class="button-secondary" onclick="closeModal('addPersonModal')">Annuler</button>
                </div>
            </div>
        </div>
    `;

    // Modal for Edit Person
    const editPersonModalHtml = `
        <div id="editPersonModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Modifier la personne</h2>
                    <span class="close-button" onclick="closeModal('editPersonModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="editPersonForm">
                        <input type="hidden" id="editPersonId">
                        <div class="form-group">
                            <label for="editPersonName">Nom :</label>
                            <input type="text" id="editPersonName" required>
                        </div>
                        <div class="form-group">
                            <label for="editPersonSkills">Compétences :</label>
                            <select id="editPersonSkills" multiple>
                                <option value="électricité">Électricité</option>
                                <option value="plomberie">Plomberie</option>
                                <option value="mécanique">Mécanique</option>
                                <option value="autre">Autre</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="editPersonAvailability">Disponibilité :</label>
                            <select id="editPersonAvailability">
                                <option value="fulltime">Temps plein</option>
                                <option value="parttime">Temps partiel</option>
                                <option value="oncall">D'astreinte</option>
                            </select>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="button-primary" id="updatePersonBtn">Mettre à jour</button>
                    <button class="button-secondary" onclick="closeModal('editPersonModal')">Annuler</button>
                </div>
            </div>
        </div>
    `;

    // Modal for Add/Edit Event
    const addEventModalHtml = `
        <div id="addEventModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2 id="eventModalTitle">Ajouter un événement</h2>
                    <span class="close-button" onclick="closeModal('addEventModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <form id="addEventForm">
                        <input type="hidden" id="eventId">
                        <div class="form-group">
                            <label for="eventTitle">Titre de l'événement :</label>
                            <input type="text" id="eventTitle" required>
                        </div>
                        <div class="form-group">
                            <label for="eventPersonId">Personne concernée :</label>
                            <select id="eventPersonId" required>
                                </select>
                        </div>
                        <div class="form-group">
                            <label for="eventStartDate">Date de début :</label>
                            <input type="date" id="eventStartDate" required>
                        </div>
                        <div class="form-group">
                            <label for="eventEndDate">Date de fin :</label>
                            <input type="date" id="eventEndDate" required>
                        </div>
                        <div class="form-group">
                            <label for="eventType">Type d'événement :</label>
                            <select id="eventType" required>
                                </select>
                        </div>
                        <div class="form-group">
                            <label for="eventNotes">Notes :</label>
                            <textarea id="eventNotes" rows="3"></textarea>
                        </div>
                        <div class="form-group">
                            <label for="eventColor">Couleur de l'événement :</label>
                            <input type="color" id="eventColor" value="#ff7f50">
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="button-primary" id="addEditEventButton">Ajouter l'événement</button>
                    <button class="button-danger" id="deleteEventButton">Supprimer</button>
                    <button class="button-secondary" onclick="closeModal('addEventModal')">Annuler</button>
                </div>
            </div>
        </div>
    `;

    // Modal for Stats
    const statsModalHtml = `
        <div id="statsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Statistiques de permanence</h2>
                    <span class="close-button" onclick="closeModal('statsModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <div class="form-group">
                        <label for="statsStartDate">Du :</label>
                        <input type="date" id="statsStartDate">
                    </div>
                    <div class="form-group">
                        <label for="statsEndDate">Au :</label>
                        <input type="date" id="statsEndDate">
                    </div>
                    <div class="button-group" style="justify-content: flex-start;">
                        <button class="button-primary" id="calculateStatsBtn">Calculer les statistiques</button>
                    </div>
                    <div id="statsResults" style="margin-top: 20px;">
                        </div>
                </div>
                <div class="modal-footer">
                    <button class="button-secondary" onclick="closeModal('statsModal')">Fermer</button>
                </div>
            </div>
        </div>
    `;

    // Modal for Library Versions
    const libraryVersionsModalHtml = `
        <div id="libraryVersionsModal" class="modal">
            <div class="modal-content">
                <div class="modal-header">
                    <h2>Versions des Librairies</h2>
                    <span class="close-button" onclick="closeModal('libraryVersionsModal')">&times;</span>
                </div>
                <div class="modal-body">
                    <p class="info-message">Cette section vous donne un aperçu des versions des bibliothèques externes utilisées par l'application et des recommandations de mise à jour.</p>
                    <div class="stats-table-container">
                        <table class="stats-table">
                            <thead>
                                <tr>
                                    <th>Librairie</th>
                                    <th>Version Actuelle</th>
                                    <th>Dernière Version Connue</th>
                                    <th>Recommandation</th>
                                </tr>
                            </thead>
                            <tbody id="libraryVersionsBody">
                                </tbody>
                        </table>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="button-secondary" onclick="closeModal('libraryVersionsModal')">Fermer</button>
                </div>
            </div>
        </div>
    `;

    // Append modals to the modalsContainer (if not already in index.html)
    const modalsContainer = document.getElementById('modalsContainer');
    // Check if modals already exist to prevent duplication if they are pre-defined in index.html
    if (!document.getElementById('addPersonModal')) modalsContainer.innerHTML += addPersonModalHtml;
    if (!document.getElementById('editPersonModal')) modalsContainer.innerHTML += editPersonModalHtml;
    if (!document.getElementById('addEventModal')) modalsContainer.innerHTML += addEventModalHtml;
    if (!document.getElementById('statsModal')) modalsContainer.innerHTML += statsModalHtml;
    if (!document.getElementById('libraryVersionsModal')) modalsContainer.innerHTML += libraryVersionsModalHtml;

    // MODIFIÉ : S'assurer que les références sont bien prises après l'ajout au DOM si nécessaire
    addPersonModal = document.getElementById('addPersonModal');
    addPersonForm = document.getElementById('addPersonForm');
    editPersonModal = document.getElementById('editPersonModal');
    editPersonForm = document.getElementById('editPersonForm');
    addEventModal = document.getElementById('addEventModal');
    addEventForm = document.getElementById('addEventForm');
    statsModal = document.getElementById('statsModal');
    libraryVersionsModal = document.getElementById('libraryVersionsModal');
    exportPngOptionsModal = document.getElementById('exportPngOptionsModal');

});
