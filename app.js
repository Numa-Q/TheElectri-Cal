// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
let allCalendarEvents = []; // Stocke tous les événements pour filtrage

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.30"; // INCEMENTATION : Correction Day.js max/min + SyntaxError général

// Définition des couleurs des événements par type
const EVENT_COLORS = {
    'permanence': '#28a745', // Vert
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
                db.createObjectStore(STORE_PEOPLE, { keyPath: 'id', autoIncrement: true });
            }
            if (!db.objectStoreNames.contains(STORE_EVENTS)) {
                db.createObjectStore(STORE_EVENTS, { keyPath: 'id', autoIncrement: true });
            }
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            resolve(db);
        };

        request.onerror = (event) => {
            console.error('Erreur lors de l\\'ouverture de la base de données IndexedDB:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Fonctions utilitaires pour IndexedDB
async function addData(storeName, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.add(data);
        request.onsuccess = () => resolve(request.result);\n        request.onerror = () => reject(request.error);\n    });
}

async function getAllData(storeName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);\n        request.onerror = () => reject(request.error);\n    });
}

async function updateData(storeName, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.put(data);
        request.onsuccess = () => resolve(request.result);\n        request.onerror = () => reject(request.error);\n    });
}

async function deleteData(storeName, id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const request = store.delete(id);
        request.onsuccess = () => resolve();\n        request.onerror = () => reject(request.error);\n    });
}

// --- Gestion des Personnes ---
// Charger les personnes depuis IndexedDB ou le LocalStorage (pour la migration)
async function loadPeopleFromLocalStorage() {
    try {
        const storedPeople = await getAllData(STORE_PEOPLE);
        if (storedPeople.length > 0) {
            people = storedPeople;
            console.log("Personnes chargées depuis IndexedDB.");
        } else {
            // Tentative de migration depuis LocalStorage si IndexedDB est vide
            const localPeople = JSON.parse(localStorage.getItem(STORAGE_KEY_PEOPLE) || '[]');
            if (localPeople.length > 0) {
                for (const person of localPeople) {
                    await addData(STORE_PEOPLE, person);
                }
                people = localPeople;
                localStorage.removeItem(STORAGE_KEY_PEOPLE); // Nettoyer LocalStorage après migration
                console.log("Personnes migrées depuis LocalStorage vers IndexedDB.");
            } else {
                console.log("Aucune personne à charger.");
            }
        }
    } catch (error) {
        console.error('Erreur lors du chargement des personnes:', error);
        showToast("Erreur lors du chargement des personnes.", 'error');
    }
}

// Sauvegarder les personnes dans IndexedDB
async function savePeopleToIndexedDB() {
    try {
        // Pour une sauvegarde simple, nous pouvons clear le store et tout réajouter
        // Ou itérer sur 'people' et faire des update/add
        // Ici, pour simplifier et éviter les duplicatas, on peut clear et add.
        // Cette stratégie dépend de la taille des données.
        // Pour des petites listes, c'est acceptable.
        const db = await openDB();
        const transaction = db.transaction(STORE_PEOPLE, 'readwrite');
        const store = transaction.objectStore(STORE_PEOPLE);
        await store.clear();
        for (const person of people) {
            await store.add(person);
        }
        console.log("Personnes sauvegardées dans IndexedDB.");
    } catch (error) {
        console.error('Erreur lors de la sauvegarde des personnes:', error);
        showToast("Erreur lors de la sauvegarde des personnes.", 'error');
    }
}

function renderPeopleList() {
    const peopleList = document.getElementById('peopleList');
    peopleList.innerHTML = '';
    if (people.length === 0) {
        peopleList.innerHTML = '<li class="no-people">Aucune personne enregistrée.</li>';
        return;
    }

    people.forEach(person => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${person.name}</span>
            <div class="actions">
                <button class="edit-btn" data-id="${person.id}" title="Modifier"><i class="fas fa-edit"></i></button>
                <button class="delete-btn" data-id="${person.id}" title="Supprimer"><i class="fas fa-trash"></i></button>
            </div>
        `;
        peopleList.appendChild(li);
    });

    // Ajout des écouteurs d'événements pour les boutons d'édition et de suppression
    peopleList.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const personId = parseInt(event.currentTarget.dataset.id);
            editPerson(personId);
        });
    });

    peopleList.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const personId = parseInt(event.currentTarget.dataset.id);
            deletePerson(personId);
        });
    });
}

function addPerson() {
    const modalContent = `
        <h2>Ajouter une nouvelle personne</h2>
        <div class="form-group">
            <label for="personName">Nom de la personne :</label>
            <input type="text" id="personName" class="form-control" placeholder="Ex: Jean Dupont" required>
        </div>
        <div class="button-group">
            <button class="button-primary" id="savePersonBtn">Ajouter</button>
            <button class="button-secondary" onclick="closeModal('addPersonModal')">Annuler</button>
        </div>
    `;
    showModal('addPersonModal', modalContent);

    document.getElementById('savePersonBtn').onclick = async () => {
        const personNameInput = document.getElementById('personName');
        const personName = personNameInput.value.trim();
        if (personName) {
            const newPerson = { name: personName };
            await addData(STORE_PEOPLE, newPerson);
            await loadPeopleFromLocalStorage(); // Recharger pour obtenir les IDs à jour
            renderPeopleList();
            closeModal('addPersonModal');
            showToast("Personne ajoutée avec succès !", 'success');
        } else {
            showToast("Le nom de la personne ne peut pas être vide.", 'error');
        }
    };
}

async function editPerson(personId) {
    const personToEdit = people.find(p => p.id === personId);
    if (!personToEdit) {
        showToast("Personne non trouvée.", 'error');
        return;
    }

    const modalContent = `
        <h2>Modifier la personne</h2>
        <div class="form-group">
            <label for="editPersonName">Nom de la personne :</label>
            <input type="text" id="editPersonName" class="form-control" value="${personToEdit.name}" required>
        </div>
        <div class="button-group">
            <button class="button-primary" id="updatePersonBtn">Mettre à jour</button>
            <button class="button-secondary" onclick="closeModal('editPersonModal')">Annuler</button>
        </div>
    `;
    showModal('editPersonModal', modalContent);

    document.getElementById('updatePersonBtn').onclick = async () => {
        const newName = document.getElementById('editPersonName').value.trim();
        if (newName) {
            personToEdit.name = newName;
            await updateData(STORE_PEOPLE, personToEdit);
            await loadPeopleFromLocalStorage(); // Recharger pour s'assurer de l'état frais
            renderPeopleList();
            closeModal('editPersonModal');
            showToast("Personne mise à jour avec succès !", 'success');
        } else {
            showToast("Le nom de la personne ne peut pas être vide.", 'error');
        }\n    };
}

async function deletePerson(personId) {
    if (confirm("Êtes-vous sûr de vouloir supprimer cette personne ? Tous les événements associés seront également supprimés.")) {
        try {
            await deleteData(STORE_PEOPLE, personId);
            people = people.filter(p => p.id !== personId);
            // Supprimer les événements associés à cette personne
            let eventsToDelete = (await getAllData(STORE_EVENTS)).filter(event => event.personId === personId);
            for (const event of eventsToDelete) {
                await deleteData(STORE_EVENTS, event.id);
            }
            await loadCalendarEvents(); // Recharger les événements du calendrier
            renderPeopleList();
            showToast("Personne et ses événements supprimés avec succès !", 'success');
        } catch (error) {
            console.error('Erreur lors de la suppression de la personne:', error);
            showToast("Erreur lors de la suppression de la personne.", 'error');
        }
    }
}

// --- Gestion des Événements du Calendrier (Présences/Absences) ---
async function loadCalendarEvents() {
    try {
        allCalendarEvents = await getAllData(STORE_EVENTS);
        console.log("Événements chargés depuis IndexedDB:", allCalendarEvents);
        calendar.setOption('events', allCalendarEvents);
    } catch (error) {
        console.error('Erreur lors du chargement des événements du calendrier:', error);
        showToast("Erreur lors du chargement des événements du calendrier.", 'error');
    }
}

async function saveCalendarEvent(eventData) {
    try {
        const id = await addData(STORE_EVENTS, eventData);
        eventData.id = id; // Assigner l'ID retourné par IndexedDB
        await loadCalendarEvents(); // Recharger les événements pour rafraîchir le calendrier
        showToast("Événement de planning ajouté avec succès !", 'success');
    } catch (error) {
        console.error('Erreur lors de l\\'ajout de l\\'événement de planning:', error);
        showToast("Erreur lors de l'ajout de l'événement de planning.", 'error');
    }
}

async function updateCalendarEvent(eventData) {
    try {
        await updateData(STORE_EVENTS, eventData);
        await loadCalendarEvents();
        showToast("Événement de planning mis à jour avec succès !", 'success');
    } catch (error) {
        console.error('Erreur lors de la mise à jour de l\\'événement de planning:', error);
        showToast("Erreur lors de la mise à jour de l'événement de planning.", 'error');
    }
}

async function deleteCalendarEvent(eventId) {
    try {
        await deleteData(STORE_EVENTS, eventId);
        await loadCalendarEvents();
        showToast("Événement de planning supprimé avec succès !", 'success');
    } catch (error) {
        console.error('Erreur lors de la suppression de l\\'événement de planning:', error);
        showToast("Erreur lors de la suppression de l'événement de planning.", 'error');
    }
}

function showAddPlanningEventModal(event = null) {
    if (people.length === 0) {
        showToast("Veuillez d'abord ajouter des personnes.", 'info');
        return;
    }

    const isEdit = event !== null;
    const modalTitle = isEdit ? 'Modifier un événement de planning' : 'Ajouter un événement de planning';
    const submitButtonText = isEdit ? 'Mettre à jour' : 'Ajouter';

    const personOptions = people.map(person => 
        `<option value=\"${person.id}\"${isEdit && event.personId === person.id ? ' selected' : ''}>${person.name}</option>`
    ).join('');

    const eventTypeOptions = Object.keys(EVENT_COLORS).map(type => 
        `<option value=\"${type}\"${isEdit && event.type === type ? ' selected' : ''}>${formatEventType(type)}</option>`
    ).join('');

    const selectedDaysHtml = (isEdit && event.recurrentDays) ? event.recurrentDays.map(day => `checked`).join('') : ``;
    const dayCheckboxesHtml = `
        <div class=\"day-checkboxes\">
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"0\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(0) ? 'checked' : ''}> Dimanche</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"1\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(1) ? 'checked' : ''}> Lundi</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"2\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(2) ? 'checked' : ''}> Mardi</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"3\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(3) ? 'checked' : ''}> Mercredi</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"4\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(4) ? 'checked' : ''}> Jeudi</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"5\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(5) ? 'checked' : ''}> Vendredi</label>
            <label><input type=\"checkbox\" name=\"recurrentDay\" value=\"6\" ${isEdit && event.recurrentDays && event.recurrentDays.includes(6) ? 'checked' : ''}> Samedi</label>
        </div>
    `;

    const modalContent = `
        <h2>${modalTitle}</h2>
        <div class=\"form-group\">
            <label for=\"personSelect\">Personne :</label>
            <select id=\"personSelect\" class=\"form-control\" required>${personOptions}</select>
        </div>
        <div class=\"form-group\">
            <label for=\"eventType\">Type d'événement :</label>
            <select id=\"eventType\" class=\"form-control\" required>${eventTypeOptions}</select>
        </div>
        <div class=\"form-group\">
            <label for=\"startDate\">Date de début :</label>
            <input type=\"date\" id=\"startDate\" class=\"form-control\" value=\"${isEdit && event.start ? dayjs(event.start).format('YYYY-MM-DD') : ''}\" required>\n        </div>
        <div class=\"form-group\">
            <label for=\"endDate\">Date de fin (incluse) :</label>
            <input type=\"date\" id=\"endDate\" class=\"form-control\" value=\"${isEdit && event.end ? dayjs(event.end).format('YYYY-MM-DD') : ''}\">\n        </div>
        <div class=\"form-group\">
            <label for=\"isRecurrent\">Répéter chaque semaine :</label>
            <input type=\"checkbox\" id=\"isRecurrent\" ${isEdit && event.recurrent ? 'checked' : ''}>
        </div>
        <div class=\"form-group\" id=\"recurrentDaysContainer\" style=\"display:${isEdit && event.recurrent ? 'block' : 'none'};\">\n            <label>Jours de la semaine concernés :</label>
            ${dayCheckboxesHtml}
        </div>
        <div class=\"form-group\">
            <label for=\"eventTitle\">Titre de l'événement (optionnel) :</label>
            <input type=\"text\" id=\"eventTitle\" class=\"form-control\" value=\"${isEdit && event.title ? event.title : ''}\">\n        </div>
        <div class=\"form-group\">
            <label for=\"comments\">Commentaires (optionnel) :</label>
            <textarea id=\"comments\" class=\"form-control\">${isEdit && event.comments ? event.comments : ''}</textarea>\n        </div>
        <div class=\"button-group\">
            <button class=\"button-primary\" id=\"saveEventBtn\">${submitButtonText}</button>
            ${isEdit ? `<button class=\"button-tertiary\" id=\"deleteEventBtn\">Supprimer</button>` : ''}\n            <button class=\"button-secondary\" onclick=\"closeModal('addPlanningEventModal')\">Annuler</button>
        </div>
    `;
    showModal('addPlanningEventModal', modalContent);

    const isRecurrentCheckbox = document.getElementById('isRecurrent');
    const recurrentDaysContainer = document.getElementById('recurrentDaysContainer');

    isRecurrentCheckbox.addEventListener('change', () => {
        recurrentDaysContainer.style.display = isRecurrentCheckbox.checked ? 'block' : 'none';
    });

    if (isEdit && event.recurrent) {
        recurrentDaysContainer.style.display = 'block';
    }

    document.getElementById('saveEventBtn').onclick = async () => {
        const personId = parseInt(document.getElementById('personSelect').value);
        const eventType = document.getElementById('eventType').value;
        const startDate = document.getElementById('startDate').value;
        let endDate = document.getElementById('endDate').value;
        const isRecurrent = document.getElementById('isRecurrent').checked;
        const eventTitle = document.getElementById('eventTitle').value.trim();
        const comments = document.getElementById('comments').value.trim();

        if (!startDate) {
            showToast("La date de début est obligatoire.", 'error');
            return;
        }

        // Si pas de date de fin, utiliser la date de début pour un événement d'une journée
        if (!endDate) {
            endDate = startDate; 
        }

        // Valider que la date de fin n'est pas antérieure à la date de début
        if (dayjs(endDate).isBefore(dayjs(startDate))) {
            showToast("La date de fin ne peut pas être antérieure à la date de début.", 'error');
            return;
        }

        let recurrentDays = [];
        if (isRecurrent) {
            document.querySelectorAll('input[name=\"recurrentDay\"]:checked').forEach(checkbox => {
                recurrentDays.push(parseInt(checkbox.value));
            });
            if (recurrentDays.length === 0) {
                showToast("Veuillez sélectionner au moins un jour de la semaine pour les événements récurrents.", 'error');
                return;
            }
        }

        const selectedPerson = people.find(p => p.id === personId);
        const newEvent = {\n            id: isEdit ? event.id : undefined, // Garder l'ID pour la mise à jour
            personId: personId,
            personName: selectedPerson ? selectedPerson.name : 'Inconnu',
            start: startDate,
            end: endDate,
            title: eventTitle || `${selectedPerson ? selectedPerson.name : 'Inconnu'} - ${formatEventType(eventType)}`,
            allDay: true, // Les événements de planning sont généralement sur toute la journée
            backgroundColor: EVENT_COLORS[eventType] || '#3788d8',
            borderColor: EVENT_COLORS[eventType] || '#3788d8',
            type: eventType,
            recurrent: isRecurrent,
            recurrentDays: isRecurrent ? recurrentDays : [],
            comments: comments
        };

        if (isEdit) {
            await updateCalendarEvent(newEvent);
        } else {
            await saveCalendarEvent(newEvent);
        }

        closeModal('addPlanningEventModal');
    };

    if (isEdit) {
        document.getElementById('deleteEventBtn').onclick = async () => {
            if (confirm("Êtes-vous sûr de vouloir supprimer cet événement ?")) {
                await deleteCalendarEvent(event.id);
                closeModal('addPlanningEventModal');
            }
        };
    }
}

function formatEventType(type) {
    switch (type) {
        case 'permanence': return 'Permanence';
        case 'telework_punctual': return 'Télétravail (Ponctuel)';
        case 'telework_recurrent': return 'Télétravail (Récurrent)';
        case 'leave': return 'Congé';
        default: return type;
    }\n}

// --- Initialisation de FullCalendar ---
async function initFullCalendar() {
    const calendarEl = document.getElementById('calendar');
    const today = dayjs();

    // Initialisation de Day.js plugins (répétée ici pour s'assurer que les plugins sont bien étendus pour cette instance de Day.js si nécessaire)
    // Normalement, dayjs.extend ne doit être appelé qu'une seule fois au chargement.
    // Cette partie est laissée pour compatibilité avec votre code original,
    // mais si des problèmes persistent, un examen plus approfondi de la portée de dayjs pourrait être nécessaire.
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);
    dayjs.extend(dayjs_plugin_weekday);
    dayjs.extend(dayjs_plugin_isSameOrBefore);
    dayjs.extend(dayjs_plugin_maxMin); // dayjs_plugin_maxMin est maintenant défini dans index.html

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
        // Les événements seront chargés dynamiquement
        events: [],
        eventClick: function(info) {
            // Ouvre la modale d'édition pour l'événement cliqué
            const eventId = info.event.id;
            const eventToEdit = allCalendarEvents.find(e => e.id == eventId);
            if (eventToEdit) {
                showAddPlanningEventModal(eventToEdit);
            }
        },
        datesSet: function(info) {
            // Appelé quand la date d'affichage du calendrier change (navigation mois/semaine)
            // Permet de mettre à jour la liste des événements si nécessaire
            console.log('Calendrier datesSet:', info.startStr, info.endStr);
        },
        eventDidMount: function(info) {
            // Rendu personnalisé des événements pour inclure les commentaires
            const comments = info.event.extendedProps.comments;
            if (comments) {
                const commentsEl = document.createElement('div');
                commentsEl.classList.add('fc-event-comments');
                commentsEl.innerText = comments;
                info.el.querySelector('.fc-event-main').appendChild(commentsEl);
            }
        }
    });
    calendar.render();
}

// --- Fonctions Modales et Toasts ---
function showModal(id, content) {
    const modalsContainer = document.getElementById('modalsContainer');
    const modalHtml = `
        <div id=\"${id}\" class=\"modal-backdrop\">\n            <div class=\"modal-content glass-effect\">\n                ${content}\n            </div>\n        </div>
    `;
    modalsContainer.innerHTML = modalHtml;
    modalsContainer.querySelector(`#${id}`).style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.style.display = 'none';
        modal.remove(); // Supprimer la modale du DOM
    }
}

function showToast(message, type = 'info', duration = 3000) {
    const toastsContainer = document.getElementById('toastsContainer');
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    toast.textContent = message;
    toastsContainer.appendChild(toast);

    // Force reflow pour l'animation CSS
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, duration);
}

// --- Gestion des exports ---
document.getElementById('exportPdfBtn').addEventListener('click', () => exportCalendarToPdf('single'));
document.getElementById('exportPngBtn').addEventListener('click', exportCalendarToPng);\ndocument.getElementById('exportJsonBtn').addEventListener('click', exportDataAsJson);\ndocument.getElementById('importJsonBtn').addEventListener('click', importDataFromJson);

// Nouveau bouton pour l'export PDF sur deux mois
const exportTwoMonthsPdfBtn = document.createElement('button');
exportTwoMonthsPdfBtn.id = 'exportTwoMonthsPdfBtn';
exportTwoMonthsPdfBtn.textContent = 'Exporter PDF (2 mois)';
exportTwoMonthsPdfBtn.addEventListener('click', () => exportCalendarToPdf('twoMonths'));
// Trouver l'emplacement pour insérer le nouveau bouton, par exemple après exportPdfBtn
const exportPdfBtn = document.getElementById('exportPdfBtn');
if (exportPdfBtn) {
    exportPdfBtn.parentNode.insertBefore(exportTwoMonthsPdfBtn, exportPdfBtn.nextSibling);
}

async function exportCalendarToPdf(mode = 'single') {
    showToast("Préparation de l'exportation PDF...", 'info');

    const calendarEl = document.getElementById('calendar');
    const originalView = calendar.view.type;
    const originalDate = calendar.getDate(); // Sauvegarder la date actuelle

    try {
        let pdf;
        if (window.jspdf && window.jspdf.jsPDF) {
             pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        } else {
             // Fallback for older jspdf versions or direct include
             pdf = new jspdf.jsPDF('p', 'mm', 'a4');
        }

        const pdfPageWidthMm = pdf.internal.pageSize.getWidth();
        const pdfPageHeightMm = pdf.internal.pageSize.getHeight();
        const padding = 10; // Marge autour du contenu

        let currentMonth = dayjs(originalDate).startOf('month');
        let currentPage = 1;

        const numberOfMonthsToExport = (mode === 'twoMonths') ? 2 : 1;

        for (let i = 0; i < numberOfMonthsToExport; i++) {
            if (currentPage > 1) {
                pdf.addPage();
            }
            calendar.gotoDate(currentMonth.toDate());
            calendar.changeView('dayGridMonth');

            // Attendre que FullCalendar rende la vue
            await new Promise(resolve => setTimeout(resolve, 500)); // Petite pause pour le rendu

            const canvas = await html2canvas(calendarEl, {
                scale: 2, // Augmente la résolution pour une meilleure qualité PDF
                useCORS: true // Nécessaire si des images/ressources externes sont utilisées
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;

            const imgWidthMm = imgWidth * 0.264583; // Convertir px en mm (1 inch = 25.4 mm, 1px = 1/96 inch par défaut)
            const imgHeightMm = imgHeight * 0.264583;

            // Calculer la taille d'image pour qu'elle s'adapte à la page PDF avec padding
            const availableWidth = pdfPageWidthMm - 2 * padding;
            const availableHeight = pdfPageHeightMm - 2 * padding;

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
        showToast("Exportation PDF sur deux mois réussie !", 'success');

    } catch (error) {
        console.error('Erreur lors de l\\'exportation PDF multi-mois :', error);
        showToast("Erreur lors de l'exportation PDF multi-mois. Vérifiez la console.", 'error');
    } finally {\n        // Restaurer la vue et la date originales, même en cas d'erreur
        calendar.changeView(originalView, originalDate);
    }
}

async function exportCalendarToPng() {
    showToast("Préparation de l'exportation PNG...", 'info');
    const calendarEl = document.getElementById('calendar');
    try {
        const canvas = await html2canvas(calendarEl, {
            scale: 2, // Augmente la résolution pour une meilleure qualité PNG
            useCORS: true
        });
        const imgData = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `planning_electri-cal_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        showToast("Exportation PNG réussie !", 'success');
    } catch (error) {
        console.error('Erreur lors de l\\'exportation PNG :', error);
        showToast("Erreur lors de l'exportation PNG. Vérifiez la console.", 'error');
    }
}

async function exportDataAsJson() {
    try {
        const peopleData = await getAllData(STORE_PEOPLE);
        const eventsData = await getAllData(STORE_EVENTS);

        const dataToExport = {
            people: peopleData,
            events: eventsData,
            appVersion: APP_VERSION,
            exportDate: dayjs().format('YYYY-MM-DD HH:mm:ss')
        };

        const dataStr = JSON.stringify(dataToExport, null, 4);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `electri-cal_data_${dayjs().format('YYYY-MM-DD_HHmmss')}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast("Données exportées en JSON avec succès !", 'success');
    } catch (error) {
        console.error('Erreur lors de l\\'exportation JSON :', error);
        showToast("Erreur lors de l'exportation JSON. Vérifiez la console.", 'error');
    }
}

function importDataFromJson() {
    const modalContent = `
        <h2>Importer des données JSON</h2>
        <p>Attention : L'importation écrasera les données existantes (personnes et événements).</p>
        <div class=\"form-group\">
            <label for=\"jsonFile\">Sélectionnez un fichier JSON :</label>
            <input type=\"file\" id=\"jsonFile\" accept=\".json\" class=\"form-control\" required>
        </div>
        <div class=\"button-group\">
            <button class=\"button-primary\" id=\"performImportBtn\">Importer</button>
            <button class=\"button-secondary\" onclick=\"closeModal('importJsonModal')\">Annuler</button>
        </div>
    `;
    showModal('importJsonModal', modalContent);

    document.getElementById('performImportBtn').onclick = () => {
        const fileInput = document.getElementById('jsonFile');
        const file = fileInput.files[0];

        if (!file) {
            showToast("Veuillez sélectionner un fichier JSON.", 'error');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);

                if (!importedData.people || !importedData.events) {
                    showToast("Fichier JSON invalide : 'people' ou 'events' manquant.", 'error');
                    return;
                }

                // Vider les stores existants
                const db = await openDB();
                let transaction = db.transaction([STORE_PEOPLE, STORE_EVENTS], 'readwrite');
                await transaction.objectStore(STORE_PEOPLE).clear();
                await transaction.objectStore(STORE_EVENTS).clear();

                // Importer les personnes
                for (const person of importedData.people) {\n                    // S'assurer que les ID sont recréés par IndexedDB pour éviter les conflits
                    // Enlève l'ID existant, IndexedDB le générera si autoIncrement: true
                    const { id, ...personWithoutId } = person;
                    await addData(STORE_PEOPLE, personWithoutId);
                }
                showToast("Personnes importées.", 'info');

                // Importer les événements
                for (const event of importedData.events) {\n                     const { id, ...eventWithoutId } = event;
                    await addData(STORE_EVENTS, eventWithoutId);
                }
                showToast("Événements importés.", 'info');

                await loadPeopleFromLocalStorage();
                renderPeopleList();
                await loadCalendarEvents();

                closeModal('importJsonModal');
                showToast("Données importées avec succès !", 'success');

            } catch (error) {
                console.error('Erreur lors de l\\'importation JSON:', error);
                showToast("Erreur lors de l'importation JSON. Fichier invalide ou problème de données.", 'error');
            }\n        };
        reader.readAsText(file);
    };
}

// --- Statistiques ---
document.getElementById('showStatsBtn').addEventListener('click', showStatsModal);

async function showStatsModal() {
    const statsResultsDiv = document.createElement('div');
    statsResultsDiv.id = 'statsResults';
    statsResultsDiv.style.marginTop = '20px';

    const modalContent = `
        <h2>Statistiques de Permanence</h2>
        <div class=\"form-group\">
            <label for=\"statsYear\">Année :</label>
            <input type=\"number\" id=\"statsYear\" class=\"form-control\" value=\"${dayjs().year()}\" min=\"2000\" max=\"2100\">\n        </div>
        <div class=\"button-group\">
            <button class=\"button-primary\" id=\"generateStatsBtn\">Générer les Statistiques</button>
            <button class=\"button-secondary\" onclick=\"closeModal('statsModal')\">Fermer</button>
        </div>
        <div id=\"statsResults\"></div>
    `;
    showModal('statsModal', modalContent);

    document.getElementById('generateStatsBtn').onclick = generateStats;
    // Générer les stats initiales pour l'année en cours
    generateStats();
}

async function generateStats() {
    const statsYear = parseInt(document.getElementById('statsYear').value);
    const statsResultsDiv = document.getElementById('statsResults');
    statsResultsDiv.innerHTML = '<p>Génération des statistiques en cours...</p>';

    const allEvents = await getAllData(STORE_EVENTS);
    const allPeople = await getAllData(STORE_PEOPLE);

    const stats = {}; // { personId: { permanenceDays: 0, teleworkDays: 0, leaveDays: 0 } }
    allPeople.forEach(person => {
        stats[person.id] = { \n            name: person.name, \n            permanenceDays: 0, \n            teleworkDays: 0, \n            leaveDays: 0, \n            totalDays: 0 // Ajoutez un total de jours ici
        };
    });

    allEvents.forEach(event => {
        const eventStart = dayjs(event.start);
        const eventEnd = dayjs(event.end);

        // S'assurer que l'année de l'événement correspond à l'année des stats
        if (eventStart.year() !== statsYear && eventEnd.year() !== statsYear) {
            return; // Ignore les événements entièrement en dehors de l'année
        }

        // Calculer les jours inclus dans l'année des stats
        let currentDay = dayjs.max(eventStart, dayjs().year(statsYear).startOf('year'));
        const endOfDay = dayjs.min(eventEnd, dayjs().year(statsYear).endOf('year'));

        while (currentDay.isSameOrBefore(endOfDay, 'day')) {
            if (stats[event.personId]) {
                let isIncluded = false;

                if (event.recurrent) {
                    if (event.recurrentDays.includes(currentDay.day())) {
                        isIncluded = true;
                    }
                } else {
                    isIncluded = true;
                }

                if (isIncluded) {
                    switch (event.type) {
                        case 'permanence':
                            stats[event.personId].permanenceDays++;
                            break;
                        case 'telework_punctual':
                        case 'telework_recurrent':
                            stats[event.personId].teleworkDays++;
                            break;
                        case 'leave':
                            stats[event.personId].leaveDays++;
                            break;
                    }
                    stats[event.personId].totalDays++;
                }
            }
            currentDay = currentDay.add(1, 'day');
        }
    });

    let tableHtml = `
        <h3>Statistiques pour l'année ${statsYear}</h3>
        <table class=\"stats-table\">\n            <thead>
                <tr>
                    <th>Personne</th>
                    <th>Jours de Permanence</th>
                    <th>Jours de Télétravail</th>
                    <th>Jours de Congé</th>
                    <th>Total Jours (Calendrier)</th>
                </tr>
            </thead>
            <tbody>
    `;

    const sortedStats = Object.values(stats).sort((a, b) => a.name.localeCompare(b.name));

    if (sortedStats.length > 0) {
        sortedStats.forEach(stat => {
            tableHtml += `
                <tr>
                    <td>${stat.name}</td>
                    <td>${stat.permanenceDays}</td>
                    <td>${stat.teleworkDays}</td>
                    <td>${stat.leaveDays}</td>
                    <td>${stat.totalDays}</td>
                </tr>
            `;
        });
    } else {
        tableHtml += '<tr><td colspan=\"5\">Aucune donnée disponible pour cette année.</td></tr>';
    }

    tableHtml += `
            </tbody>
        </table>
        <div class=\"form-group button-group mt-3\">\n            <button class=\"button-secondary\" onclick=\"exportStatsAsCsv()\">Exporter en CSV</button>
        </div>
    `;
    statsResultsDiv.innerHTML = tableHtml;
}

function exportStatsAsCsv() {
    const statsResultsDiv = document.getElementById('statsResults');
    const table = statsResultsDiv ? statsResultsDiv.querySelector('table') : null;

    if (!table) {
        showToast(\"Aucune statistique à exporter.\", \"info\");
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

    const csvString = csv.join('\\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `electri-cal_permanence_stats_${dayjs().format('YYYY-MM-DD_HHmmss')}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    showToast(\"Statistiques exportées en CSV avec succès !\", 'success');
}

// --- Gestion du Thème Sombre/Clair ---
document.getElementById('themeToggleButton').addEventListener('click', toggleTheme);

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const isDark = document.body.classList.contains('dark-theme');
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
    document.getElementById('themeToggleButton').textContent = isDark ? 'Thème Clair' : 'Thème Sombre';
}

// Appliquer le thème sauvegardé au chargement
function applySavedTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-theme');
        document.getElementById('themeToggleButton').textContent = 'Thème Clair';
    } else {
        document.getElementById('themeToggleButton').textContent = 'Thème Sombre';
    }
}

// Appel initial pour appliquer le thème sauvegardé
applySavedTheme();

// --- Écouteurs d'événements globaux ---
document.getElementById('addPersonBtn').addEventListener('click', addPerson);

document.addEventListener('DOMContentLoaded', async () => {
    console.log(`${APP_NAME} - Version ${APP_VERSION} chargée !`);

    // Mise à jour de l'année du copyright et du nom/version de l'application
    document.getElementById('currentYear').textContent = dayjs().year();
    document.getElementById('appInfo').textContent = `${APP_NAME}. Version ${APP_VERSION}`;\n
    // Charger les données initiales
    await openDB(); // Assurez-vous que la DB est ouverte avant de charger les données
    await loadPeopleFromLocalStorage();
    renderPeopleList(); // Afficher la liste des personnes chargées

    // Initialisation de FullCalendar
    await initFullCalendar();

    // Charger les événements du calendrier après l'initialisation
    await loadCalendarEvents();
});
