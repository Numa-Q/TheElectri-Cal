// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
const STORAGE_KEY_PEOPLE = 'electricalPermanencePeople';
const STORAGE_KEY_EVENTS = 'electricalPermanenceEvents'; // Pour les futurs événements du calendrier

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.7"; // Incrémentation de la version pour l'export

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
    renderPeopleList(); // Afficher la liste des personnes chargées

    // Initialisation de FullCalendar
    initFullCalendar();

    // Charger les événements du calendrier après l'initialisation
    loadCalendarEvents();

    // Gestion du thème sombre/clair
    const themeToggleButton = document.getElementById('themeToggleButton');
    const body = document.body;

    // Charger le thème préféré de l'utilisateur depuis le LocalStorage
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
        body.classList.add('dark-mode');
        themeToggleButton.textContent = 'Thème Clair';
    } else {
        themeToggleButton.textContent = 'Thème Sombre';
    }

    themeToggleButton.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggleButton.textContent = 'Thème Clair';
            showToast('Thème sombre activé', 'info');
        } else {
            localStorage.setItem('theme', 'light');
            themeToggleButton.textContent = 'Thème Sombre';
            showToast('Thème clair activé', 'info');
        }
    });

    // Écouteur d'événement pour les boutons
    document.getElementById('addPersonBtn').addEventListener('click', () => {
        showAddPersonModal();
    });

    document.getElementById('addPlanningEventBtn').addEventListener('click', () => {
        // Ouvre la modale sans présélection de date au clic sur le bouton général
        showAddPlanningEventModal(dayjs().format('YYYY-MM-DD'), dayjs().format('YYYY-MM-DD'));
    });

    // Nouveau : Écouteur pour le bouton d'export
    document.getElementById('exportPlanningBtn').addEventListener('click', () => {
        showExportModal();
    });
});

/**
 * Fonction utilitaire pour afficher un toast.
 * @param {string} message - Le message à afficher dans le toast.
 * @param {'success'|'error'|'info'} type - Le type de toast (couleur et icône si implémenté).
 */
function showToast(message, type = 'info') {
    const toastsContainer = document.getElementById('toastsContainer');
    const toast = document.createElement('div');
    toast.classList.add('toast', type);
    toast.textContent = message;

    toastsContainer.appendChild(toast);

    // Force reflow pour l'animation
    void toast.offsetWidth;

    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            toast.remove();
        }, { once: true });
    }, 3000); // Le toast disparaît après 3 secondes
}

/**
 * Fonction utilitaire pour créer et afficher une modale.
 * @param {string} title - Le titre de la modale.
 * @param {string} contentHtml - Le contenu HTML de la modale.
 * @param {Function} onConfirm - Fonction de rappel à exécuter si l'utilisateur confirme.
 * @param {Function} onCancel - Fonction de rappel à exécuter si l'utilisateur annule (optionnel).
 * @param {boolean} showConfirmButton - Affiche le bouton de confirmation (true par default).
 * @param {boolean} showCancelButton - Affiche le bouton d'annulation (true par default).
 */
function showModal(title, contentHtml, onConfirm, onCancel = () => {}, showConfirmButton = true, showCancelButton = true) {
    const modalsContainer = document.getElementById('modalsContainer');
    modalsContainer.innerHTML = ''; // Nettoie le conteneur avant d'ajouter une nouvelle modale

    const modal = document.createElement('div');
    modal.classList.add('modal');
    modal.style.display = 'flex'; // Assure que le conteneur modal est un flexbox

    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content');

    modalContent.innerHTML = `
        <span class="close-button">&times;</span>
        <h2>${title}</h2>
        <div>${contentHtml}</div>
        <div style="margin-top: 20px; text-align: right;">
            ${showCancelButton ? '<button id="cancelModalBtn">Annuler</button>' : ''}
            ${showConfirmButton ? '<button id="confirmModalBtn">Confirmer</button>' : ''}
        </div>
    `;

    modal.appendChild(modalContent); // Ajout du contenu à la modale
    modalsContainer.appendChild(modal); // Ajout de la modale au conteneur

    const closeButton = modalContent.querySelector('.close-button');
    const confirmButton = modalContent.querySelector('#confirmModalBtn');
    const cancelButton = modalContent.querySelector('#cancelModalBtn');

    const closeModal = () => {
        modal.style.display = 'none';
        modalsContainer.innerHTML = ''; // Nettoie complètement après fermeture
    };

    closeButton.onclick = () => {
        closeModal();
        onCancel(); // Exécute le callback d'annulation si l'utilisateur ferme via la croix
    };

    if (confirmButton) {
        confirmButton.onclick = () => {
            onConfirm();
            closeModal();
        };
    }

    if (cancelButton) {
        cancelButton.onclick = () => {
            onCancel();
            closeModal();
        };
    }

    // Fermer la modale si l'utilisateur clique en dehors du contenu
    window.onclick = (event) => {
        if (event.target === modal) { // Si le clic est sur l'arrière-plan de la modale
            closeModal();
            onCancel();
        }
    };
}


/**
 * Gère les données de l'application.
 * Les données seront stockées dans le LocalStorage.
 */

/**
 * Charge les personnes depuis le LocalStorage.
 */
function loadPeopleFromLocalStorage() {
    const storedPeople = localStorage.getItem(STORAGE_KEY_PEOPLE);
    if (storedPeople) {
        people = JSON.parse(storedPeople);
    } else {
        people = []; // S'assurer que le tableau est vide si rien n'est stocké
    }
}

/**
 * Sauvegarde les personnes dans le LocalStorage.
 */
function savePeopleToLocalStorage() {
    localStorage.setItem(STORAGE_KEY_PEOPLE, JSON.stringify(people));
}

/**
 * Affiche la modale pour ajouter une nouvelle personne.
 */
function showAddPersonModal() {
    const content = `
        <label for="personName">Nom de la personne :</label>
        <input type="text" id="personName" placeholder="Ex: Jean Dupont" required>
    `;

    showModal(
        "Ajouter une nouvelle personne",
        content,
        () => {
            const personNameInput = document.getElementById('personName');
            const name = personNameInput.value.trim();

            if (name) {
                addPerson(name);
                showToast(`Personne "${name}" ajoutée !`, 'success');
            } else {
                showToast("Le nom de la personne ne peut pas être vide.", 'error');
            }
        }
    );
}

/**
 * Ajoute une personne au tableau et la sauvegarde.
 * @param {string} name - Le nom de la personne à ajouter.
 */
function addPerson(name) {
    // Générer un ID simple et unique (pour une application locale, un timestamp peut suffire)
    const id = `person_${Date.now()}`;
    people.push({ id: id, name: name });
    savePeopleToLocalStorage();
    renderPeopleList(); // Mettre à jour l'affichage de la liste
}

/**
 * Supprime une personne du tableau et la sauvegarde.
 * @param {string} personId - L'ID de la personne à supprimer.
 */
function deletePerson(personId) {
    showModal(
        "Confirmer la suppression",
        "Êtes-vous sûr de vouloir supprimer cette personne ? Tous les événements qui lui sont associés seront effacés.",
        () => {
            people = people.filter(p => p.id !== personId);
            // Supprimer aussi les événements associés à cette personne du calendrier
            calendar.getEvents().filter(event => event.extendedProps.personId === personId).forEach(event => event.remove());
            savePeopleToLocalStorage();
            saveCalendarEvents(); // Sauvegarder les événements mis à jour
            renderPeopleList(); // Mettre à jour l'affichage de la liste
            showToast("Personne supprimée avec succès.", "success");
        },
        () => {
            showToast("Suppression annulée.", "info");
        },
        true, true // Afficher les boutons confirmer et annuler
    );
}

/**
 * Affiche la liste des personnes dans la sidebar.
 */
function renderPeopleList() {
    const peopleListUl = document.getElementById('peopleList');
    peopleListUl.innerHTML = ''; // Nettoyer la liste existante

    if (people.length === 0) {
        peopleListUl.innerHTML = '<li style="justify-content: center; opacity: 0.7;">Aucune personne ajoutée.</li>';
        return;
    }

    people.forEach(person => {
        const li = document.createElement('li');
        li.innerHTML = `
            <span>${person.name}</span>
            <button data-person-id="${person.id}" class="delete-person-btn" title="Supprimer cette personne">&times;</button>
        `;
        peopleListUl.appendChild(li);
    });

    // Ajouter des écouteurs d'événements aux boutons de suppression
    document.querySelectorAll('.delete-person-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            const personId = event.target.dataset.personId;
            deletePerson(personId);
        });
    });
}

/**
 * Initialise FullCalendar.
 */
function initFullCalendar() {
    const calendarEl = document.getElementById('calendar');
    calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'fr', // Définir la langue en français
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay'
        },
        events: [], // Le tableau est vide au démarrage, les événements sont ajoutés après
        editable: true, // Permettre de glisser-déposer les événements
        selectable: true, // Permettre la sélection de dates
        dateClick: function(info) {
            // Gérer le clic sur une date pour ajouter une disponibilité
            showAddPlanningEventModal(info.dateStr, info.dateStr);
        },
        eventClick: function(info) {
            // Gérer le clic sur un événement pour le modifier/supprimer
            showEditEventModal(info.event);
        },
        select: function(info) {
            // Gérer la sélection d'une plage de dates
            showAddPlanningEventModal(info.startStr, info.endStr);
        },
        eventDrop: function(info) {
            // Gérer le déplacement d'un événement (drag & drop)
            showToast(`Événement "${info.event.title}" déplacé au ${dayjs(info.event.start).format('DD/MM/YYYY')}`, 'success');
            saveCalendarEvents(); // Sauvegarder après le déplacement
        },
        eventResize: function(info) {
            // Gérer le redimensionnement d'un événement
            showToast(`Événement "${info.event.title}" redimensionné.`, 'success');
            saveCalendarEvents(); // Sauvegarder après le redimensionnement
        }
    });
    calendar.render();
}

/**
 * Affiche la modale pour gérer les présences/absences (télétravail, congé, permanence).
 * @param {string} startStr - Date de début de la sélection (format YYYY-MM-DD).
 * @param {string} [endStr] - Date de fin de la sélection (format YYYY-MM-DD), exclusive pour FullCalendar.
 */
function showAddPlanningEventModal(startStr, endStr = startStr) {
    if (people.length === 0) {
        showToast("Veuillez d'abord ajouter des personnes habilitées pour assigner des événements.", "error");
        return;
    }

    // Ajuster endStr pour l'affichage dans la modale: FullCalendar end date is exclusive.
    // Si la sélection est d'un jour unique, la date de fin affichée est la même que la date de début.
    // Si une plage est sélectionnée, la date de fin affichée est la date de fin réelle (endStr - 1 jour).
    let displayEndDate = dayjs(endStr).subtract(1, 'day').format('YYYY-MM-DD');
    if (startStr === displayEndDate) { // Si la sélection est d'un jour unique (start = end - 1 day)
        displayEndDate = startStr;
    }

    const peopleOptions = people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    const content = `
        <label for="eventPerson">Personne :</label>
        <select id="eventPerson">${peopleOptions}</select>

        <label for="eventType">Type d'événement :</label>
        <select id="eventType">
            <option value="permanence">Permanence</option>
            <option value="telework-single">Télétravail (ponctuel)</option>
            <option value="telework-recurring">Télétravail (répétitif)</option>
            <option value="holiday">Congé</option>
        </select>

        <div id="dateRangeFields" style="display: none;">
            <label for="startDate">Date de début :</label>
            <input type="date" id="startDate" value="${startStr}">

            <label for="endDate">Date de fin :</label>
            <input type="date" id="endDate" value="${displayEndDate}">
             <p style="font-size: 0.8em; color: gray; margin-top: 5px;">Si jour unique, mettre la même date de début et de fin.</p>
        </div>

        <div id="teleworkRecurringFields" style="display: none;" class="recurring-options">
            <h4>Jours de télétravail répétitif :</h4>
            <div class="day-checkboxes">
                <label><input type="checkbox" name="recurringDay" value="1"> Lundi</label>
                <label><input type="checkbox" name="recurringDay" value="2"> Mardi</label>
                <label><input type="checkbox" name="recurringDay" value="3"> Mercredi</label>
                <label><input type="checkbox" name="recurringDay" value="4"> Jeudi</label>
                <label><input type="checkbox" name="recurringDay" value="5"> Vendredi</label>
            </div>
            <label for="recurringUntilDate">Répéter jusqu'au :</label>
            <input type="date" id="recurringUntilDate" value="${dayjs().add(6, 'month').format('YYYY-MM-DD')}">
            <p style="font-size: 0.8em; color: gray; margin-top: 5px;">Les événements seront générés jusqu'à cette date.</p>
        </div>
    `;

    showModal(
        "Gérer les Présences/Absences",
        content,
        () => {
            const personId = document.getElementById('eventPerson').value;
            const eventType = document.getElementById('eventType').value;
            const selectedPerson = people.find(p => p.id === personId);

            if (!selectedPerson) {
                showToast("Personne sélectionnée invalide.", "error");
                return;
            }

            if (eventType === 'telework-recurring') {
                const selectedDays = Array.from(document.querySelectorAll('#teleworkRecurringFields input[name="recurringDay"]:checked'))
                                       .map(cb => parseInt(cb.value));
                const recurringUntilDate = document.getElementById('recurringUntilDate').value;

                if (selectedDays.length === 0) {
                    showToast("Veuillez sélectionner au moins un jour pour le télétravail répétitif.", "error");
                    return;
                }
                if (!recurringUntilDate) {
                    showToast("Veuillez spécifier une date de fin pour le télétravail répétitif.", "error");
                    return;
                }
                addRecurringTelework(personId, selectedPerson.name, selectedDays, recurringUntilDate);
            } else { // permanence, telework-single, holiday
                let startDate = document.getElementById('startDate').value;
                let endDate = document.getElementById('endDate').value;

                if (!startDate || !endDate) {
                    showToast("Veuillez spécifier les dates de début et de fin.", "error");
                    return;
                }

                // Adjust end date for FullCalendar exclusivity for ranges
                if (dayjs(endDate).isSame(dayjs(startDate), 'day')) {
                    // Si une seule journée, la fin pour FullCalendar est le lendemain
                    endDate = dayjs(startDate).add(1, 'day').format('YYYY-MM-DD');
                } else {
                    // Si une plage, la fin pour FullCalendar est la date de fin réelle + 1 jour
                    endDate = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
                }

                // Pour telework-single, on passe le type 'telework' à addEventToCalendar
                const actualType = (eventType === 'telework-single') ? 'telework' : eventType;
                addEventToCalendar(personId, selectedPerson.name, actualType, startDate, endDate);
            }
            showToast("Événement de planning ajouté avec succès !", 'success');
        }
    );

    // --- LOGIQUE DE VISIBILITÉ DES CHAMPS DE LA MODALE ---
    const eventTypeSelect = document.getElementById('eventType');
    const dateRangeFields = document.getElementById('dateRangeFields');
    const teleworkRecurringFields = document.getElementById('teleworkRecurringFields');

    const updateVisibility = () => {
        const selectedType = eventTypeSelect.value;

        // Réinitialiser la visibilité de tous les groupes
        dateRangeFields.style.display = 'none';
        teleworkRecurringFields.style.display = 'none';

        if (selectedType === 'permanence' || selectedType === 'telework-single' || selectedType === 'holiday') {
            dateRangeFields.style.display = 'block'; // Afficher les champs de date simple
        } else if (selectedType === 'telework-recurring') {
            teleworkRecurringFields.style.display = 'block'; // Afficher les champs de récurrence
        }
    };

    // Attacher l'écouteur d'événements
    eventTypeSelect.addEventListener('change', updateVisibility);

    // Déclencher la fonction au chargement initial de la modale (important !)
    // S'assurer que le display par défaut est correct
    updateVisibility();
}


/**
 * Affiche la modale pour modifier ou supprimer un événement existant.
 * @param {Object} event - L'objet événement FullCalendar.
 */
function showEditEventModal(event) {
    const personName = people.find(p => p.id === event.extendedProps.personId)?.name || 'Inconnu';
    const eventTypeMap = {
        'telework': 'Télétravail',
        'holiday': 'Congé',
        'permanence': 'Permanence'
    };
    const eventTypeDisplay = eventTypeMap[event.extendedProps.type] || 'Type inconnu';

    // Ajuster la date de fin pour l'affichage (FullCalendar est exclusif)
    let displayEndDate = event.endStr ? dayjs(event.endStr).subtract(1, 'day').format('YYYY-MM-DD') : dayjs(event.startStr).format('YYYY-MM-DD');

    let content = `
        <p><strong>Personne :</strong> ${personName}</p>
        <p><strong>Type :</strong> ${eventTypeDisplay}</p>
        <p><strong>Du :</strong> ${dayjs(event.startStr).format('DD/MM/YYYY')}</p>
        <p><strong>Au :</strong> ${dayjs(event.startStr).isSame(dayjs(displayEndDate), 'day') ? '(jour unique)' : dayjs(displayEndDate).format('DD/MM/YYYY')}</p>
        <div style="margin-top: 20px; text-align: center;">
            <button id="deleteEventBtn" style="background-color: #dc3545; color: white; margin-right: 10px;">Supprimer cet événement</button>
    `;

    // Si c'est un événement de télétravail récurrent, ajouter l'option de suppression de série
    if (event.extendedProps.type === 'telework' && event.extendedProps.recurringSeriesId) {
        content += `
            <button id="deleteRecurringSeriesBtn" style="background-color: #f0ad4e; color: white;">Supprimer la série répétitive</button>
        `;
    }
    content += `</div>`;


    showModal(
        "Détails de l'événement",
        content,
        () => { /* Pas de confirmation directe, les boutons de suppression ont leur propre handler */ },
        () => { /* Annulation de la modale */ },
        false, // Pas de bouton confirmer général
        true   // Bouton annuler (fermer)
    );

    document.getElementById('deleteEventBtn').addEventListener('click', () => {
        showModal(
            "Confirmer la suppression",
            "Êtes-vous sûr de vouloir supprimer cet événement ?",
            () => {
                event.remove(); // Supprime l'événement du calendrier
                saveCalendarEvents(); // Sauvegarde les événements mis à jour
                showToast("Événement supprimé avec succès.", "success");
            },
            () => {
                showToast("Suppression annulée.", "info");
            }
        );
    });

    // Écouteur pour le bouton de suppression de série
    const deleteRecurringSeriesBtn = document.getElementById('deleteRecurringSeriesBtn');
    if (deleteRecurringSeriesBtn) {
        deleteRecurringSeriesBtn.addEventListener('click', () => {
            showModal(
                "Confirmer la suppression de la série",
                "Êtes-vous sûr de vouloir supprimer TOUS les événements de cette série de télétravail répétitif pour cette personne ?",
                () => {
                    deleteRecurringSeries(event.extendedProps.recurringSeriesId, event.extendedProps.personId);
                    showToast("Série de télétravail répétitif supprimée avec succès.", "success");
                },
                () => {
                    showToast("Suppression de la série annulée.", "info");
                }
            );
        });
    }
}


/**
 * Ajoute un événement au calendrier (télétravail, congé, ou permanence).
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne concernée.
 * @param {'telework'|'holiday'|'permanence'} type - Type d'événement.
 * @param {string} start - Date de début (YYYY-MM-DD).
 * @param {string} end - Date de fin (YYYY-MM-DD), exclusive pour FullCalendar.
 * @param {string} [recurringSeriesId] - ID de la série de récurrence (optionnel).
 */
function addEventToCalendar(personId, personName, type, start, end, recurringSeriesId = null) {
    let title = '';
    let classNames = [];
    if (type === 'telework') {
        title = `TT - ${personName}`;
        classNames = ['telework'];
    } else if (type === 'holiday') {
        title = `Congé - ${personName}`;
        classNames = ['holiday'];
    } else if (type === 'permanence') {
        title = `Permanence - ${personName}`;
        classNames = ['permanence'];
    }

    const newEvent = {
        id: `event_${Date.now()}_${personId}_${type}`, // ID plus robuste
        personId: personId,
        title: title,
        start: start,
        end: end,
        allDay: true,
        classNames: classNames,
        extendedProps: {
            type: type,
            recurringSeriesId: recurringSeriesId // Ajout de l'ID de série
        }
    };
    calendar.addEvent(newEvent);
    saveCalendarEvents(); // Sauvegarder les événements après ajout
}

/**
 * Ajoute des événements de télétravail répétitifs.
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne.
 * @param {number[]} daysOfWeek - Tableau des jours de la semaine (0=dimanche, 1=lundi...6=samedi).
 * @param {string} untilDateStr - Date de fin de la récurrence (YYYY-MM-DD).
 */
function addRecurringTelework(personId, personName, daysOfWeek, untilDateStr) {
    const recurringSeriesId = `recurring_${Date.now()}_${personId}`; // ID unique pour cette série

    let currentDate = dayjs(); // Commence à partir d'aujourd'hui
    const untilDate = dayjs(untilDateStr);

    let eventsGenerated = 0;
    const maxEvents = 365 * 2; // Limite généreuse pour deux ans de récurrence

    while (currentDate.isBefore(untilDate) || currentDate.isSame(untilDate, 'day')) {
        // dayjs().day() retourne 0 pour dimanche, 1 pour lundi, etc.
        // Nos checkboxes vont de 1 (lundi) à 5 (vendredi).
        if (daysOfWeek.includes(currentDate.day())) {
            // Ajouter un événement de télétravail pour ce jour, avec l'ID de série
            addEventToCalendar(personId, personName, 'telework', currentDate.format('YYYY-MM-DD'), currentDate.add(1, 'day').format('YYYY-MM-DD'), recurringSeriesId);
            eventsGenerated++;
            if (eventsGenerated >= maxEvents) {
                showToast("Trop d'événements générés pour la contrainte répétitive. Limite atteinte.", "error");
                break;
            }
        }
        currentDate = currentDate.add(1, 'day');
    }
    showToast(`Télétravail répétitif ajouté pour ${personName}. ${eventsGenerated} événements générés.`, 'success');
}

/**
 * Supprime tous les événements appartenant à une série de récurrence spécifique pour une personne donnée.
 * @param {string} seriesId - L'ID de la série de récurrence à supprimer.
 * @param {string} personId - L'ID de la personne concernée par la série.
 */
function deleteRecurringSeries(seriesId, personId) {
    const eventsToDelete = calendar.getEvents().filter(event =>
        event.extendedProps.type === 'telework' &&
        event.extendedProps.recurringSeriesId === seriesId &&
        event.extendedProps.personId === personId
    );

    eventsToDelete.forEach(event => event.remove());
    saveCalendarEvents(); // Sauvegarder après la suppression
}


/**
 * Sauvegarde les événements du calendrier dans le LocalStorage.
 */
function saveCalendarEvents() {
    const events = calendar.getEvents().map(event => ({
        id: event.id,
        personId: event.extendedProps.personId,
        title: event.title,
        start: event.startStr,
        end: event.endStr,
        allDay: event.allDay,
        classNames: event.classNames,
        extendedProps: event.extendedProps // Assure que les extendedProps sont conservées
    }));
    localStorage.setItem(STORAGE_KEY_EVENTS, JSON.stringify(events));
}

/**
 * Charge les événements du calendrier depuis le LocalStorage.
 */
function loadCalendarEvents() {
    const storedEvents = localStorage.getItem(STORAGE_KEY_EVENTS);
    if (storedEvents) {
        const events = JSON.parse(storedEvents);
        events.forEach(event => {
            // Reconstruit l'objet événement correctement pour FullCalendar
            calendar.addEvent({
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
                classNames: event.classNames,
                extendedProps: event.extendedProps // Assure que les extendedProps sont conservées
            });
        });
    }
}

/**
 * Affiche la modale d'options d'exportation.
 */
function showExportModal() {
    if (people.length === 0) {
        showToast("Veuillez d'abord ajouter des personnes pour exporter le planning.", "error");
        return;
    }

    const peopleCheckboxes = people.map(p => `
        <label>
            <input type="checkbox" name="exportPerson" value="${p.id}" checked> ${p.name}
        </label>
    `).join('<br>');

    const content = `
        <label for="exportFormat">Format d'exportation :</label>
        <select id="exportFormat">
            <option value="png">PNG (Image)</option>
            <option value="pdf">PDF (Document)</option>
        </select>

        <h4 style="margin-top: 15px;">Personnes à inclure :</h4>
        <label><input type="checkbox" id="selectAllPeople" checked> Sélectionner tout</label><br>
        <div id="exportPeopleList" class="day-checkboxes" style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 10px; border-radius: 5px;">
            ${peopleCheckboxes}
        </div>

        <h4 style="margin-top: 15px;">Période :</h4>
        <label for="exportPeriod">Sélectionner une période :</label>
        <select id="exportPeriod">
            <option value="currentWeek">Semaine en cours</option>
            <option value="currentMonth">Mois en cours</option>
            <option value="nextMonth">Mois prochain</option>
            <option value="currentAndNextMonth">Mois en cours + mois prochain</option>
            <option value="customRange">Plage de dates personnalisée</option>
        </select>

        <div id="customDateRangeFields" style="display: none; margin-top: 10px;">
            <label for="exportStartDate">Date de début :</label>
            <input type="date" id="exportStartDate" value="${dayjs().format('YYYY-MM-DD')}">
            <label for="exportEndDate">Date de fin :</label>
            <input type="date" id="exportEndDate" value="${dayjs().add(1, 'month').endOf('month').format('YYYY-MM-DD')}">
        </div>
    `;

    showModal(
        "Exporter le Planning",
        content,
        async () => { // Utilisation de async ici car les fonctions d'export seront asynchrones
            const format = document.getElementById('exportFormat').value;
            const selectedPersonIds = Array.from(document.querySelectorAll('#exportPeopleList input[name="exportPerson"]:checked'))
                                       .map(cb => cb.value);
            const period = document.getElementById('exportPeriod').value;
            let startDate = null;
            let endDate = null;

            // Déterminer la plage de dates en fonction de la sélection
            const today = dayjs();
            if (period === 'currentWeek') {
                startDate = today.startOf('week'); // Lundi
                endDate = today.endOf('week');     // Dimanche
            } else if (period === 'currentMonth') {
                startDate = today.startOf('month');
                endDate = today.endOf('month');
            } else if (period === 'nextMonth') {
                startDate = today.add(1, 'month').startOf('month');
                endDate = today.add(1, 'month').endOf('month');
            } else if (period === 'currentAndNextMonth') {
                startDate = today.startOf('month');
                endDate = today.add(1, 'month').endOf('month');
            } else if (period === 'customRange') {
                startDate = dayjs(document.getElementById('exportStartDate').value);
                endDate = dayjs(document.getElementById('exportEndDate').value);
                if (!startDate.isValid() || !endDate.isValid() || startDate.isAfter(endDate)) {
                    showToast("Dates personnalisées invalides.", "error");
                    return;
                }
            }

            // Filtrer les événements pour l'exportation
            const filteredEvents = calendar.getEvents().filter(event => {
                const eventStartDate = dayjs(event.start);
                const eventEndDate = event.endStr ? dayjs(event.endStr).subtract(1, 'day') : dayjs(event.startStr); // FullCalendar end is exclusive

                // Vérifier si la personne est sélectionnée OU si 'Toutes' sont sélectionnées (si on avait une option 'all')
                // Ici, on filtre directement par les IDs des personnes cochées
                const isPersonIncluded = selectedPersonIds.includes(event.extendedProps.personId);

                // Vérifier si l'événement chevauche la période d'exportation
                const isEventWithinPeriod = eventStartDate.isBetween(startDate, endDate, null, '[]') || // Événement commence ou finit dans la période
                                            eventEndDate.isBetween(startDate, endDate, null, '[]') ||
                                            (startDate.isBetween(eventStartDate, eventEndDate, null, '[]') && endDate.isBetween(eventStartDate, eventEndDate, null, '[]')); // Période d'exportation est à l'intérieur de l'événement

                return isPersonIncluded && isEventWithinPeriod;
            });

            // Sauvegarder la vue actuelle et la date pour la restaurer après l'export
            const originalView = calendar.view.type;
            const originalDate = calendar.getDate();

            // Temporairement ajuster la vue et les événements du calendrier pour l'exportation
            // Créer un calendrier temporaire ou manipuler la visibilité des événements serait plus robuste
            // Mais pour une première implémentation, nous allons simplement masquer/afficher les événements.
            // Pour l'export PNG/PDF du calendrier, il est préférable de manipuler le DOM du calendrier.
            // FullCalendar peut rendre des événements même s'ils ne sont pas dans la vue principale.
            // L'approche la plus simple est de changer la vue de FullCalendar, prendre le screenshot, puis revenir.
            // Cependant, cela peut être perturbant pour l'utilisateur.

            // Une alternative plus propre (mais plus complexe) serait de créer un élément DOM caché,
            // y initialiser un nouveau FullCalendar avec les événements filtrés et la vue désirée,
            // puis prendre la capture de cet élément. Pour l'instant, restons simple et capturons le calendrier actuel.

            // IMPORTANT : html2canvas capture le DOM VISIBLE. Pour exporter une période spécifique,
            // il faut que cette période soit visible dans le calendrier FullCalendar au moment de la capture.
            // Nous allons donc changer la vue du calendrier juste avant la capture.

            showToast("Préparation de l'exportation...", "info");

            let tempViewType = 'dayGridMonth'; // Vue par défaut pour 1 ou 2 mois
            if (period === 'currentWeek') {
                tempViewType = 'dayGridWeek';
            }
            // Pour 2 mois, FullCalendar n'a pas de vue native. On va faire 2 captures pour le PDF.
            // Pour l'image, on prendra juste la vue actuelle.

            // Déplacer le calendrier à la date de début de la période d'exportation
            calendar.changeView(tempViewType, startDate.toDate());

            // On attend que FullCalendar ait fini de rendre la nouvelle vue. Un petit délai est souvent nécessaire.
            await new Promise(resolve => setTimeout(resolve, 500)); // Petit délai

            if (format === 'png') {
                await exportCalendarAsPng();
            } else if (format === 'pdf') {
                 // Pour le PDF, on peut gérer les mois séparément ou tenter une seule capture si la vue le permet.
                if (period === 'currentAndNextMonth') {
                     await exportCalendarAsPdfMultiMonth(startDate.format('YYYY-MM-DD'), endDate.format('YYYY-MM-DD'));
                } else {
                    await exportCalendarAsPdf();
                }
            }

            // Restaurer la vue et la date originales
            calendar.changeView(originalView, originalDate);
        },
        () => {
            showToast("Exportation annulée.", "info");
        }
    );

    // LOGIQUE DE VISIBILITÉ DES CHAMPS DE DATE PERSONNALISÉS
    const exportPeriodSelect = document.getElementById('exportPeriod');
    const customDateRangeFields = document.getElementById('customDateRangeFields');

    const updateCustomDateFieldsVisibility = () => {
        if (exportPeriodSelect.value === 'customRange') {
            customDateRangeFields.style.display = 'block';
        } else {
            customDateRangeFields.style.display = 'none';
        }
    };
    exportPeriodSelect.addEventListener('change', updateCustomDateFieldsVisibility);
    updateCustomDateFieldsVisibility(); // Appel initial

    // Gérer le "Sélectionner tout" pour les personnes
    const selectAllPeopleCheckbox = document.getElementById('selectAllPeople');
    const exportPersonCheckboxes = document.querySelectorAll('#exportPeopleList input[name="exportPerson"]');

    selectAllPeopleCheckbox.addEventListener('change', (event) => {
        exportPersonCheckboxes.forEach(cb => {
            cb.checked = event.target.checked;
        });
    });

    // Si une case individuelle est décochée, décocher "Sélectionner tout"
    exportPersonCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            if (!cb.checked) {
                selectAllPeopleCheckbox.checked = false;
            } else {
                // Si toutes sont cochées manuellement, cocher "Sélectionner tout"
                const allChecked = Array.from(exportPersonCheckboxes).every(c => c.checked);
                selectAllPeopleCheckbox.checked = allChecked;
            }
        });
    });
}


/**
 * Exporte le calendrier FullCalendar en tant qu'image PNG.
 * @param {HTMLElement} element - L'élément HTML à capturer (le conteneur du calendrier).
 */
async function exportCalendarAsPng() {
    showToast("Génération de l'image PNG...", 'info');
    const calendarEl = document.getElementById('calendar'); // Cible le conteneur principal du calendrier FullCalendar

    try {
        const canvas = await html2canvas(calendarEl, {
            scale: 2, // Augmente la résolution pour une meilleure qualité
            useCORS: true, // Important si vous avez des images ou styles cross-origin
            logging: false // Désactive le logging pour éviter le bruit dans la console
        });

        const image = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = image;
        link.download = `planning_electri-cal_${dayjs().format('YYYY-MM-DD_HHmmss')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        showToast("Exportation PNG réussie !", 'success');
    } catch (error) {
        console.error('Erreur lors de l\'exportation PNG :', error);
        showToast("Erreur lors de l'exportation PNG. Vérifiez la console.", 'error');
    }
}

/**
 * Exporte le calendrier FullCalendar en tant que document PDF.
 * Note: Cette fonction exporte la vue visible du calendrier.
 */
async function exportCalendarAsPdf() {
    showToast("Génération du document PDF...", 'info');
    const { jsPDF } = window.jspdf; // Accéder à jsPDF depuis l'objet window
    const calendarEl = document.getElementById('calendar');

    try {
        const canvas = await html2canvas(calendarEl, {
            scale: 2,
            useCORS: true,
            logging: false
        });

        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
            orientation: 'landscape', // Format paysage
            unit: 'px', // Unité en pixels
            format: [canvas.width, canvas.height] // Utilise la taille du canvas pour le format
        });

        // Calculer les dimensions pour adapter l'image au PDF tout en conservant les proportions
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
        const finalWidth = imgWidth * ratio;
        const finalHeight = imgHeight * ratio;

        pdf.addImage(imgData, 'PNG', 0, 0, finalWidth, finalHeight);
        pdf.save(`planning_electri-cal_${dayjs().format('YYYY-MM-DD_HHmmss')}.pdf`);
        showToast("Exportation PDF réussie !", 'success');

    } catch (error) {
        console.error('Erreur lors de l\'exportation PDF :', error);
        showToast("Erreur lors de l'exportation PDF. Vérifiez la console.", 'error');
    }
}

/**
 * Exporte le calendrier FullCalendar en tant que document PDF pour une plage de deux mois.
 * Cela implique de capturer chaque mois séparément.
 * @param {string} startPeriodStr - Date de début de la période (YYYY-MM-DD).
 * @param {string} endPeriodStr - Date de fin de la période (YYYY-MM-DD).
 */
async function exportCalendarAsPdfMultiMonth(startPeriodStr, endPeriodStr) {
    showToast("Génération du PDF sur deux mois...", 'info');
    const { jsPDF } = window.jspdf;
    const calendarEl = document.getElementById('calendar');
    const pdf = new jsPDF({
        orientation: 'landscape', // A4 paysage par défaut
        unit: 'mm',
        format: 'a4'
    });

    const originalView = calendar.view.type;
    const originalDate = calendar.getDate();

    let currentPage = 1;
    const padding = 10; // Marge en mm

    try {
        let currentMonth = dayjs(startPeriodStr).startOf('month');
        const endMonth = dayjs(endPeriodStr).startOf('month');

        while (currentMonth.isSameOrBefore(endMonth, 'month')) {
            if (currentPage > 1) {
                pdf.addPage();
            }

            // Changer la vue du calendrier au mois actuel
            calendar.changeView('dayGridMonth', currentMonth.toDate());
            await new Promise(resolve => setTimeout(resolve, 500)); // Attendre le rendu

            const canvas = await html2canvas(calendarEl, {
                scale: 2,
                useCORS: true,
                logging: false
            });

            const imgData = canvas.toDataURL('image/png');

            // Calculer les dimensions de l'image pour s'adapter à la page PDF avec padding
            const imgWidthPx = canvas.width;
            const imgHeightPx = canvas.height;

            const pdfPageWidthMm = pdf.internal.pageSize.getWidth();
            const pdfPageHeightMm = pdf.internal.pageSize.getHeight();

            // Convertir les dimensions de l'image en mm pour le calcul du ratio
            // Un pixel sur un écran standard est environ 0.264583 mm (96 dpi)
            // Pour html2canvas, la 'scale' affecte directement les pixels capturés, pas nécessairement le DPI de la sortie.
            // On va adapter l'image pour qu'elle remplisse la largeur ou la hauteur de la page.
            const imgWidthMm = imgWidthPx * 25.4 / 96; // Supposons 96 DPI par défaut, converti en mm (1 pouce = 25.4 mm)
            const imgHeightMm = imgHeightPx * 25.4 / 96;

            const availableWidth = pdfPageWidthMm - (2 * padding);
            const availableHeight = pdfPageHeightMm - (2 * padding);

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
        console.error('Erreur lors de l\'exportation PDF multi-mois :', error);
        showToast("Erreur lors de l'exportation PDF multi-mois. Vérifiez la console.", 'error');
    } finally {
        // Restaurer la vue et la date originales, même en cas d'erreur
        calendar.changeView(originalView, originalDate);
    }
}
