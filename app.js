// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
const STORAGE_KEY_PEOPLE = 'electricalPermanencePeople';
const STORAGE_KEY_EVENTS = 'electricalPermanenceEvents'; // Pour les futurs événements du calendrier

// Constante pour le nom et la version de l'application
const APP_NAME = "The Electri-Cal";
const APP_VERSION = "v20.3";


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
 * @param {boolean} showConfirmButton - Affiche le bouton de confirmation (true par défaut).
 * @param {boolean} showCancelButton - Affiche le bouton d'annulation (true par défaut).
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
    if (startStr === displayEndDate) { // Si la sélection est d'un jour unique (start = end - 1 jour)
        displayEndDate = startStr;
    }

    const peopleOptions = people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    const content = `
        <label for="eventPerson">Personne :</label>
        <select id="eventPerson">${peopleOptions}</select>

        <label for="eventType">Type d'événement :</label>
        <select id="eventType">
            <option value="permanence">Permanence</option>
            <option value="telework">Télétravail</option>
            <option value="holiday">Congé</option>
        </select>

        <div id="dateRangeFields">
            <label for="startDate">Date de début :</label>
            <input type="date" id="startDate" value="${startStr}">

            <label for="endDate">Date de fin :</label>
            <input type="date" id="endDate" value="${displayEndDate}">
             <p style="font-size: 0.8em; color: gray; margin-top: 5px;">Si jour unique, mettre la même date de début et de fin.</p>
        </div>

        <div id="teleworkRecurringFields" style="display: none;">
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
        "Gérer les Présences/Absences", // Nouveau titre de la modale
        content,
        () => {
            const personId = document.getElementById('eventPerson').value;
            const type = document.getElementById('eventType').value;
            const selectedPerson = people.find(p => p.id === personId);

            if (!selectedPerson) {
                showToast("Personne sélectionnée invalide.", "error");
                return;
            }

            if (type === 'telework' && document.getElementById('isTeleworkRecurring').checked) {
                const selectedDays = Array.from(document.querySelectorAll('input[name="recurringDay"]:checked'))
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
            } else {
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

                addEventToCalendar(personId, selectedPerson.name, type, startDate, endDate);
            }
            showToast("Événement de planning ajouté avec succès !", 'success');
        }
    );

    // Gérer l'affichage des champs en fonction du type d'événement
    const eventTypeSelect = document.getElementById('eventType');
    const dateRangeFields = document.getElementById('dateRangeFields');
    const teleworkRecurringFields = document.getElementById('teleworkRecurringFields');

    // Ajout d'une case à cocher "Répétitif" pour le télétravail
    const teleworkTypeOption = document.querySelector('#eventType option[value="telework"]');
    if (teleworkTypeOption && !teleworkTypeOption.dataset.hasRecurringCheckbox) {
        const checkboxHtml = `
            <div style="margin-top: 15px;">
                <label>
                    <input type="checkbox" id="isTeleworkRecurring"> Télétravail répétitif
                </label>
            </div>
        `;
        dateRangeFields.insertAdjacentHTML('afterend', checkboxHtml);
        teleworkTypeOption.dataset.hasRecurringCheckbox = 'true'; // Marque pour éviter de dupliquer
    }

    const isTeleworkRecurringCheckbox = document.getElementById('isTeleworkRecurring');


    const updateVisibility = () => {
        const selectedType = eventTypeSelect.value;

        // Réinitialiser la visibilité de la case à cocher pour le télétravail répétitif
        if (isTeleworkRecurringCheckbox) {
            isTeleworkRecurringCheckbox.parentElement.style.display = 'none';
            isTeleworkRecurringCheckbox.checked = false; // Réinitialiser l'état
        }

        if (selectedType === 'telework') {
            dateRangeFields.style.display = 'block';
            if (isTeleworkRecurringCheckbox) {
                isTeleworkRecurringCheckbox.parentElement.style.display = 'block';
            }
            if (isTeleworkRecurringCheckbox && isTeleworkRecurringCheckbox.checked) {
                teleworkRecurringFields.style.display = 'block';
                dateRangeFields.style.display = 'none'; // Masquer les dates simples si récurrent
            } else {
                teleworkRecurringFields.style.display = 'none';
            }
        } else if (selectedType === 'permanence' || selectedType === 'holiday') {
            dateRangeFields.style.display = 'block';
            teleworkRecurringFields.style.display = 'none';
        }
    };

    eventTypeSelect.addEventListener('change', updateVisibility);

    if (isTeleworkRecurringCheckbox) {
        isTeleworkRecurringCheckbox.addEventListener('change', updateVisibility);
    }

    // Déclencher le changement initialement pour masquer/afficher les bons champs
    // Cela assure que la modale s'affiche correctement au premier affichage
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

    const content = `
        <p><strong>Personne :</strong> ${personName}</p>
        <p><strong>Type :</strong> ${eventTypeDisplay}</p>
        <p><strong>Du :</strong> ${dayjs(event.startStr).format('DD/MM/YYYY')}</p>
        <p><strong>Au :</strong> ${dayjs(event.startStr).isSame(dayjs(displayEndDate), 'day') ? '(jour unique)' : dayjs(displayEndDate).format('DD/MM/YYYY')}</p>
        <div style="margin-top: 20px; text-align: center;">
            <button id="deleteEventBtn" style="background-color: #dc3545; color: white;">Supprimer l'événement</button>
        </div>
    `;

    showModal(
        "Détails de l'événement",
        content,
        () => { /* Pas de confirmation directe, le bouton de suppression a son propre handler */ },
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
}


/**
 * Ajoute un événement au calendrier (télétravail, congé, ou permanence).
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne concernée.
 * @param {'telework'|'holiday'|'permanence'} type - Type d'événement.
 * @param {string} start - Date de début (YYYY-MM-DD).
 * @param {string} end - Date de fin (YYYY-MM-DD), exclusive pour FullCalendar.
 */
function addEventToCalendar(personId, personName, type, start, end) {
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
            type: type
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
    let currentDate = dayjs(); // Commence à partir d'aujourd'hui
    const untilDate = dayjs(untilDateStr);

    let eventsGenerated = 0;
    const maxEvents = 365 * 2; // Limite généreuse pour deux ans de récurrence

    while (currentDate.isBefore(untilDate) || currentDate.isSame(untilDate, 'day')) {
        // dayjs().day() retourne 0 pour dimanche, 1 pour lundi, etc.
        if (daysOfWeek.includes(currentDate.day())) {
            // Ajouter un événement de télétravail pour ce jour
            addEventToCalendar(personId, personName, 'telework', currentDate.format('YYYY-MM-DD'), currentDate.add(1, 'day').format('YYYY-MM-DD'));
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
        extendedProps: event.extendedProps
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
