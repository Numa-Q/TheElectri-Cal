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
    document.querySelector('footer p').innerHTML = `&copy; ${dayjs().year()}. ${APP_NAME}. Version ${APP_VERSION}`;


    // Initialisation de Day.js
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);

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

    // Écouteur d'événement pour le bouton "Ajouter une personne"
    document.getElementById('addPersonBtn').addEventListener('click', () => {
        showAddPersonModal();
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
    // Correction ici: le display flex doit être appliqué sur le modal lui-même pour qu'il centre le contenu
    modal.style.display = 'flex'; // Assure que le conteneur modal est un flexbox


    const modalContent = document.createElement('div');
    modalContent.classList.add('modal-content'); // Cette classe a maintenant un z-index plus élevé

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
        "Êtes-vous sûr de vouloir supprimer cette personne ? Toutes ses disponibilités seront effacées.",
        () => {
            people = people.filter(p => p.id !== personId);
            // Supprimer aussi les événements associés à cette personne du calendrier
            calendar.getEvents().filter(event => event.extendedProps.personId === personId).forEach(event => event.remove());
            savePeopleToLocalStorage();
            saveCalendarEvents(); // Sauvegarder les événements mis à jour
            renderPeopleList(); // Mettre à jour l'affichage de la liste
            // calendar.refetchEvents(); // Pas nécessaire si on supprime les events directement
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
        // Événements du calendrier (chargés par loadCalendarEvents)
        events: [], // Le tableau est vide au démarrage, les événements sont ajoutés après
        editable: true, // Permettre de glisser-déposer les événements
        selectable: true, // Permettre la sélection de dates
        dateClick: function(info) {
            // Gérer le clic sur une date pour ajouter une disponibilité
            showAddAvailabilityModal(info.dateStr);
        },
        eventClick: function(info) {
            // Gérer le clic sur un événement pour le modifier/supprimer
            showEditEventModal(info.event);
        },
        select: function(info) {
            // Gérer la sélection d'une plage de dates
            showAddAvailabilityModal(info.startStr, info.endStr);
        },
        eventDrop: function(info) {
            // Gérer le déplacement d'un événement (drag & drop)
            // L'événement info.event a déjà été mis à jour par FullCalendar
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
 * Affiche la modale pour ajouter une disponibilité (télétravail, congé, contrainte).
 * @param {string} startStr - Date de début de la sélection (format YYYY-MM-DD).
 * @param {string} [endStr] - Date de fin de la sélection (format YYYY-MM-DD).
 */
function showAddAvailabilityModal(startStr, endStr = startStr) {
    if (people.length === 0) {
        showToast("Veuillez d'abord ajouter des personnes habilitées pour assigner des disponibilités.", "error");
        return;
    }

    // Ajuster endStr pour l'affichage dans la modale: FullCalendar end date is exclusive, so for a single day, end should be start + 1 day
    // Pour l'affichage, si les dates sont les mêmes (clic sur un jour), on affiche juste la date de début.
    // Si une plage est sélectionnée, on affiche la date de fin réelle (décrémentée de 1 jour).
    const displayEndDate = (startStr === endStr || dayjs(endStr).diff(dayjs(startStr), 'day') === 1) ? startStr : dayjs(endStr).subtract(1, 'day').format('YYYY-MM-DD');


    const peopleOptions = people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    const content = `
        <label for="availabilityPerson">Personne :</label>
        <select id="availabilityPerson">${peopleOptions}</select>

        <label for="availabilityType">Type :</label>
        <select id="availabilityType">
            <option value="telework">Télétravail</option>
            <option value="holiday">Congé</option>
            <option value="recurrent">Contrainte Répétitive (hebdomadaire)</option>
        </select>

        <div id="dateRangeFields">
            <label for="startDate">Date de début :</label>
            <input type="date" id="startDate" value="${startStr}">

            <label for="endDate">Date de fin :</label>
            <input type="date" id="endDate" value="${displayEndDate}">
        </div>

        <div id="recurrentFields" style="display: none;">
            <label for="recurrentDay">Jour de la semaine :</label>
            <select id="recurrentDay">
                <option value="1">Lundi</option>
                <option value="2">Mardi</option>
                <option value="3">Mercredi</option>
                <option value="4">Jeudi</option>
                <option value="5">Vendredi</option>
                <option value="6">Samedi</option>
                <option value="0">Dimanche</option>
            </select>
            <label for="recurrentUntilDate">Répéter jusqu'au :</label>
            <input type="date" id="recurrentUntilDate" value="${dayjs().add(6, 'month').format('YYYY-MM-DD')}">
             <p style="font-size: 0.8em; color: gray; margin-top: 5px;">Les contraintes répétitives créeront des événements de télétravail jusqu'à cette date.</p>
        </div>
    `;

    showModal(
        "Ajouter une disponibilité",
        content,
        () => {
            const personId = document.getElementById('availabilityPerson').value;
            const type = document.getElementById('availabilityType').value;
            const selectedPerson = people.find(p => p.id === personId);

            if (!selectedPerson) {
                showToast("Personne sélectionnée invalide.", "error");
                return;
            }

            if (type === 'recurrent') {
                const recurrentDay = parseInt(document.getElementById('recurrentDay').value);
                const recurrentUntilDate = document.getElementById('recurrentUntilDate').value;

                if (!recurrentUntilDate) {
                    showToast("Veuillez spécifier une date de fin pour la contrainte répétitive.", "error");
                    return;
                }
                addRecurrentConstraint(personId, selectedPerson.name, recurrentDay, recurrentUntilDate);
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
            showToast("Disponibilité ajoutée avec succès !", 'success');
        }
    );

    // Gérer l'affichage des champs en fonction du type de disponibilité
    const availabilityTypeSelect = document.getElementById('availabilityType');
    const dateRangeFields = document.getElementById('dateRangeFields');
    const recurrentFields = document.getElementById('recurrentFields');

    // Mettre à jour l'état initial des champs si une sélection par défaut est déjà récurrente
    if (availabilityTypeSelect.value === 'recurrent') {
        dateRangeFields.style.display = 'none';
        recurrentFields.style.display = 'block';
    } else {
        dateRangeFields.style.display = 'block';
        recurrentFields.style.display = 'none';
    }


    availabilityTypeSelect.addEventListener('change', (event) => {
        if (event.target.value === 'recurrent') {
            dateRangeFields.style.display = 'none';
            recurrentFields.style.display = 'block';
        } else {
            dateRangeFields.style.display = 'block';
            recurrentFields.style.display = 'none';
            // Pré-remplir les dates si un click a eu lieu sur le calendrier
            document.getElementById('startDate').value = startStr;
            // Réajuster displayEndDate car la valeur initiale est passée en paramètre,
            // mais la logique de conversion pour FullCalendar est dans addEventToCalendar.
            // Ici, on veut juste la date de fin telle qu'elle sera affichée à l'utilisateur.
            document.getElementById('endDate').value = (startStr === endStr || dayjs(endStr).diff(dayjs(startStr), 'day') === 1) ? startStr : dayjs(endStr).subtract(1, 'day').format('YYYY-MM-DD');
        }
    });

    // Déclencher le changement initialement pour masquer/afficher les bons champs
    // Cela assure que la modale s'affiche correctement au premier affichage
    availabilityTypeSelect.dispatchEvent(new Event('change'));
}


/**
 * Affiche la modale pour modifier ou supprimer un événement existant.
 * @param {Object} event - L'objet événement FullCalendar.
 */
function showEditEventModal(event) {
    const personName = people.find(p => p.id === event.extendedProps.personId)?.name || 'Inconnu';
    const eventType = event.extendedProps.type === 'telework' ? 'Télétravail' : 'Congé';

    // Ajuster la date de fin pour l'affichage (FullCalendar est exclusif)
    const displayEndDate = event.endStr ? dayjs(event.endStr).subtract(1, 'day').format('YYYY-MM-DD') : dayjs(event.startStr).format('YYYY-MM-DD');

    const content = `
        <p><strong>Personne :</strong> ${personName}</p>
        <p><strong>Type :</strong> ${eventType}</p>
        <p><strong>Du :</strong> ${dayjs(event.startStr).format('DD/MM/YYYY')}</p>
        <p><strong>Au :</strong> ${displayEndDate !== dayjs(event.startStr).format('YYYY-MM-DD') ? dayjs(displayEndDate).format('DD/MM/YYYY') : ' (jour unique)'}</p>
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
 * Ajoute un événement au calendrier (télétravail ou congé).
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne concernée.
 * @param {'telework'|'holiday'} type - Type d'absence.
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
    }

    const newEvent = {
        id: `event_${Date.now()}`, // ID unique pour l'événement
        personId: personId, // Stocke l'ID de la personne dans extendedProps
        title: title,
        start: start,
        end: end, // FullCalendar end est exclusif, donc si c'est pour un jour, end = start + 1 jour
        allDay: true,
        classNames: classNames,
        extendedProps: { // Stocke des propriétés additionnelles ici
            type: type
        }
    };
    calendar.addEvent(newEvent);
    saveCalendarEvents(); // Sauvegarder les événements après ajout
}

/**
 * Ajoute une contrainte répétitive.
 * Pour l'instant, cela générera des événements individuels. Plus tard, on pourrait gérer les récurrences différemment.
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne.
 * @param {number} dayOfWeek - Jour de la semaine (0=dimanche, 1=lundi...6=samedi).
 * @param {string} untilDateStr - Date de fin de la contrainte (YYYY-MM-DD).
 */
function addRecurrentConstraint(personId, personName, dayOfWeek, untilDateStr) {
    let currentDate = dayjs(); // Commence à partir d'aujourd'hui
    const untilDate = dayjs(untilDateStr);

    let eventsGenerated = 0;
    const maxEvents = 365; // Limite pour éviter une boucle infinie ou trop d'événements

    while (currentDate.isBefore(untilDate) || currentDate.isSame(untilDate, 'day')) {
        if (currentDate.day() === dayOfWeek) {
            // Ajouter un événement de télétravail pour ce jour
            addEventToCalendar(personId, personName, 'telework', currentDate.format('YYYY-MM-DD'), currentDate.add(1, 'day').format('YYYY-MM-DD'));
            eventsGenerated++;
            if (eventsGenerated > maxEvents) {
                showToast("Trop d'événements générés pour la contrainte répétitive. Limite atteinte.", "error");
                break;
            }
        }
        currentDate = currentDate.add(1, 'day');
    }
    showToast(`Contrainte répétitive ajoutée pour ${personName}. ${eventsGenerated} événements générés.`, 'success');
}


/**
 * Sauvegarde les événements du calendrier dans le LocalStorage.
 */
function saveCalendarEvents() {
    const events = calendar.getEvents().map(event => ({
        id: event.id,
        personId: event.extendedProps.personId, // Assurez-vous que personId est bien stocké
        title: event.title,
        start: event.startStr,
        end: event.endStr,
        allDay: event.allDay,
        classNames: event.classNames,
        extendedProps: event.extendedProps // Sauvegarde toutes les extendedProps
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
            // FullCalendar requiert un objet EventSource Input pour l'ajout.
            // On s'assure que les extendedProps sont correctement transmises.
            calendar.addEvent({
                id: event.id,
                title: event.title,
                start: event.start,
                end: event.end,
                allDay: event.allDay,
                classNames: event.classNames,
                extendedProps: event.extendedProps
            });
        });
    }
}
