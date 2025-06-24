// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

let calendar; // Déclare la variable calendar globalement
let people = []; // Tableau pour stocker les personnes
const STORAGE_KEY_PEOPLE = 'electricalPermanencePeople';
const STORAGE_KEY_EVENTS = 'electricalPermanenceEvents'; // Pour les futurs événements du calendrier

document.addEventListener('DOMContentLoaded', () => {
    console.log("Application de gestion du planning chargée !");

    // Mise à jour de l'année du copyright
    document.getElementById('currentYear').textContent = dayjs().year();

    // Initialisation de Day.js
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);

    // Charger les données initiales
    loadPeopleFromLocalStorage();
    renderPeopleList(); // Afficher la liste des personnes chargées

    // Initialisation de FullCalendar
    initFullCalendar();

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
    modal.style.display = 'flex'; // Affiche la modale

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

    modalsContainer.appendChild(modal);

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
        if (event.target === modal) {
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
            // TODO: Supprimer aussi les événements associés à cette personne dans le calendrier
            savePeopleToLocalStorage();
            renderPeopleList(); // Mettre à jour l'affichage de la liste
            // calendar.refetchEvents(); // Recharger les événements du calendrier après suppression
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
        peopleListUl.innerHTML = '<li>Aucune personne ajoutée.</li>';
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
        // Événements du calendrier (à charger depuis le LocalStorage plus tard)
        events: [
            // { title: 'Télétravail Jean', start: '2025-06-10', classNames: ['telework'] },
            // { title: 'Congé Marie', start: '2025-06-15', end: '2025-06-18', classNames: ['holiday'] }
        ],
        editable: true, // Permettre de glisser-déposer les événements
        selectable: true, // Permettre la sélection de dates
        dateClick: function(info) {
            // Gérer le clic sur une date pour ajouter une disponibilité
            showAddAvailabilityModal(info.dateStr);
        },
        eventClick: function(info) {
            // Gérer le clic sur un événement pour le modifier/supprimer
            // TODO: Implémenter la modification/suppression d'événement
            showToast(`Clic sur l'événement: ${info.event.title}`, 'info');
        },
        select: function(info) {
            // Gérer la sélection d'une plage de dates
            showAddAvailabilityModal(info.startStr, info.endStr);
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
        showToast("Veuillez d'abord ajouter des personnes habilitées.", "error");
        return;
    }

    // Ajuster endStr pour FullCalendar si une seule date est sélectionnée (exclure la fin pour les jours uniques)
    // FullCalendar end date is exclusive, so for a single day, end should be start + 1 day
    const displayEndDate = (startStr === endStr) ? dayjs(startStr).format('YYYY-MM-DD') : dayjs(endStr).subtract(1, 'day').format('YYYY-MM-DD');

    const peopleOptions = people.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

    const content = `
        <label for="availabilityPerson">Personne :</label>
        <select id="availabilityPerson">${peopleOptions}</select>

        <label for="availabilityType">Type :</label>
        <select id="availabilityType">
            <option value="telework">Télétravail</option>
            <option value="holiday">Congé</option>
            <option value="recurrent">Contrainte Répétitive</option>
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
            <label for="recurrentEndDate">Date de fin (pour contrainte) :</label>
            <input type="date" id="recurrentEndDate">
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
                const recurrentEndDate = document.getElementById('recurrentEndDate').value;

                if (!recurrentEndDate) {
                    showToast("Veuillez spécifier une date de fin pour la contrainte répétitive.", "error");
                    return;
                }
                addRecurrentConstraint(personId, selectedPerson.name, recurrentDay, recurrentEndDate);
            } else {
                let startDate = document.getElementById('startDate').value;
                let endDate = document.getElementById('endDate').value;

                // Adjust end date for FullCalendar exclusivity for ranges
                if (startDate !== endDate) {
                    endDate = dayjs(endDate).add(1, 'day').format('YYYY-MM-DD');
                }

                if (!startDate || !endDate) {
                    showToast("Veuillez spécifier les dates de début et de fin.", "error");
                    return;
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

    availabilityTypeSelect.addEventListener('change', (event) => {
        if (event.target.value === 'recurrent') {
            dateRangeFields.style.display = 'none';
            recurrentFields.style.display = 'block';
        } else {
            dateRangeFields.style.display = 'block';
            recurrentFields.style.display = 'none';
            // Pré-remplir les dates si un click a eu lieu sur le calendrier
            document.getElementById('startDate').value = startStr;
            document.getElementById('endDate').value = displayEndDate;
        }
    });

    // Déclencher le changement initialement pour masquer/afficher les bons champs
    availabilityTypeSelect.dispatchEvent(new Event('change'));
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
        personId: personId,
        title: title,
        start: start,
        end: end, // FullCalendar end est exclusif, donc si c'est pour un jour, end = start + 1 jour
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
 * Ajoute une contrainte répétitive.
 * Pour l'instant, cela générera des événements individuels. Plus tard, on pourrait gérer les récurrences différemment.
 * @param {string} personId - ID de la personne concernée.
 * @param {string} personName - Nom de la personne.
 * @param {number} dayOfWeek - Jour de la semaine (0=dimanche, 1=lundi...6=samedi).
 * @param {string} endDateStr - Date de fin de la contrainte (YYYY-MM-DD).
 */
function addRecurrentConstraint(personId, personName, dayOfWeek, endDateStr) {
    let currentDate = dayjs();
    const endDate = dayjs(endDateStr);

    while (currentDate.isBefore(endDate) || currentDate.isSame(endDate, 'day')) {
        if (currentDate.day() === dayOfWeek) {
            // Ajouter un événement de télétravail pour ce jour
            addEventToCalendar(personId, personName, 'telework', currentDate.format('YYYY-MM-DD'), currentDate.add(1, 'day').format('YYYY-MM-DD'));
        }
        currentDate = currentDate.add(1, 'day');
    }
    showToast(`Contrainte répétitive ajoutée pour ${personName}.`, 'success');
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
            calendar.addEvent(event);
        });
    }
}
