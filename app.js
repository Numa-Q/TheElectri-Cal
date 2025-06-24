// app.js
// Fichier JavaScript principal de l'application
// Contient toute la logique de l'application.

document.addEventListener('DOMContentLoaded', () => {
    console.log("Application de gestion du planning chargée !");

    // Initialisation de Day.js
    dayjs.extend(dayjs_plugin_customParseFormat);
    dayjs.extend(dayjs_plugin_isBetween);

    // TODO: Initialiser FullCalendar
    // TODO: Charger les données initiales (LocalStorage)
    // TODO: Gérer les événements des boutons
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
            ${showCancelButton ? '<button id="cancelModalBtn" style="background-color: #6c757d; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer; margin-right: 10px;">Annuler</button>' : ''}
            ${showConfirmButton ? '<button id="confirmModalBtn" style="background-color: #28a745; color: white; padding: 8px 15px; border: none; border-radius: 5px; cursor: pointer;">Confirmer</button>' : ''}
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
