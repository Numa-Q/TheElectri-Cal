/* style.css */

/* Réinitialisation de base pour inclure padding et border dans la largeur/hauteur */
*, *::before, *::after {
    box-sizing: border-box;
}

/* Variables CSS pour les couleurs du thème clair */
:root {
    --bg-gradient-start: #fceabb; /* Couleur chaude douce */
    --bg-gradient-end: #f8b500;   /* Couleur chaude plus intense */
    --main-bg-color: rgba(255, 255, 255, 0.4); /* Fond glassmorphism clair */
    --border-color: rgba(255, 255, 255, 0.3);
    --text-color: #333;
    --header-bg: #e9a600; /* Une couleur qui s'harmonise avec le dégradé */
    --button-bg: #ff7f50; /* Corail, pour un bouton chaleureux */
    --button-hover-bg: #e6673d;
    --sidebar-text-color: #444;
    --modal-bg: rgba(255, 255, 255, 0.9);
    --toast-info-bg: #17a2b8;
    --toast-success-bg: #28a745;
    --toast-error-bg: #dc3545;
    --toast-text-color: white;
    --footer-bg: rgba(255, 255, 255, 0.2);
    --input-bg: #f5f5f5;
    --input-border: #ccc;
    --input-focus-border: #888;
    --fullcalendar-border: #e0e0e0; /* Couleur des bordures pour FullCalendar */
    --fullcalendar-bg: #ffffff; /* Fond des jours pour FullCalendar */
    --fullcalendar-text: #333; /* Texte des jours pour FullCalendar */
    --fullcalendar-header-bg: #f0f0f0; /* Fond de l'en-tête du calendrier */
}

/* Variables CSS pour les couleurs du thème sombre */
body.dark-mode {
    --bg-gradient-start: #2c3e50; /* Bleu foncé */
    --bg-gradient-end: #34495e;   /* Gris-bleu foncé */
    --main-bg-color: rgba(0, 0, 0, 0.4);
    --border-color: rgba(255, 255, 255, 0.1);
    --text-color: #f5f5f5;
    --header-bg: #1a252f;
    --button-bg: #4a69bd; /* Un bleu plus profond */
    --button-hover-bg: #3a57a0;
    --sidebar-text-color: #ddd;
    --modal-bg: rgba(0, 0, 0, 0.8);
    --toast-info-bg: #117a8b;
    --toast-success-bg: #1e7e34;
    --toast-error-bg: #bd2130;
    --toast-text-color: white;
    --footer-bg: rgba(0, 0, 0, 0.2);
    --input-bg: #333;
    --input-border: #555;
    --input-focus-border: #888;
    --fullcalendar-border: #555;
    --fullcalendar-bg: #333;
    --fullcalendar-text: #f5f5f5;
    --fullcalendar-header-bg: #2a2a2a;
}

body {
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    margin: 0;
    padding: 0;
    background: linear-gradient(135deg, var(--bg-gradient-start), var(--bg-gradient-end));
    color: var(--text-color);
    min-height: 100vh; /* S'assure que le dégradé couvre toute la hauteur */
    display: flex;
    flex-direction: column; /* Permet au footer de rester en bas */
}

/* Styles pour le conteneur principal */
main {
    display: flex;
    flex: 1; /* Permet au main de prendre l'espace restant */
    padding: 20px;
    gap: 20px;
    max-width: 1500px; /* AUGMENTÉ : pour donner plus d'espace au calendrier */
    width: calc(100% - 40px); /* Prend 100% de la largeur moins le padding total */
    margin: 20px auto; /* Centre le contenu principal */
    background: var(--main-bg-color);
    border-radius: 15px;
    backdrop-filter: blur(10px); /* Effet glassmorphism */
    border: 1px solid var(--border-color);
    box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.1);
}

.sidebar {
    flex: 0 0 280px; /* Taille fixe pour la sidebar */
    min-width: 280px; /* S'assure qu'elle ne rétrécit pas trop */
    background: var(--main-bg-color); /* Utilise la même couleur de fond pour un look unifié */
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    display: flex;
    flex-direction: column;
    gap: 15px;
    border: 1px solid var(--border-color);
}

.sidebar h2 {
    color: var(--text-color);
    margin-top: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
    font-size: 1.4em;
}

.sidebar ul {
    list-style: none;
    padding: 0;
    margin: 0;
    flex-grow: 1; /* Permet à la liste de prendre l'espace */
    overflow-y: auto; /* Ajoute une barre de défilement si la liste est longue */
}

.sidebar li {
    /* MODIFIED: Increased opacity for better visibility */
    background: rgba(255, 255, 255, 0.15);
    padding: 10px 15px;
    margin-bottom: 8px;
    border-radius: 8px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    /* MODIFIED: Increased border opacity for better definition */
    border: 1px solid rgba(255, 255, 255, 0.3);
    transition: background-color 0.2s ease;
    color: var(--sidebar-text-color);
    min-height: 45px; /* Assure une hauteur minimale pour les boutons */
}

.dark-mode .sidebar li {
    /* MODIFIED: Increased opacity for better visibility in dark mode */
    background: rgba(0, 0, 0, 0.15);
    /* MODIFIED: Increased border opacity for better definition in dark mode */
    border: 1px solid rgba(255, 255, 255, 0.1);
}

.sidebar li:hover {
    background-color: rgba(255, 255, 255, 0.2);
}

.dark-mode .sidebar li:hover {
    background-color: rgba(0, 0, 0, 0.2);
}

.person-hidden {
    opacity: 0.6;
    font-style: italic;
}

/* Fix for sidebar action buttons: use --button-bg color */
.person-actions button {
    background-color: var(--button-bg); /* Use the main button background color */
    border: 1px solid var(--button-bg); /* Match the border color */
    color: white; /* Ensure icon is white */
    cursor: pointer;
    margin-left: 5px;
    font-size: 0.9em;
    padding: 5px;
    border-radius: 5px;
    transition: background-color 0.2s ease, border-color 0.2s ease, transform 0.1s ease;
    display: inline-flex; /* Ensure flex behavior for centering icon */
    align-items: center;
    justify-content: center;
}

.person-actions button:hover {
    background-color: var(--button-hover-bg);
    border-color: var(--button-hover-bg);
    transform: translateY(-1px); /* Slight lift effect on hover */
}

/* Ensure the icon itself inherits color */
.person-actions button i {
    color: inherit; /* Ensure icon color matches button text color (white) */
}


.main-content {
    flex: 1; /* Le contenu principal prend l'espace restant */
    background: var(--main-bg-color);
    border-radius: 10px;
    padding: 20px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    border: 1px solid var(--border-color);
    display: flex; /* Utilise flexbox pour le contenu interne */
    flex-direction: column;
}

.main-content h2 {
    color: var(--text-color);
    margin-top: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
    font-size: 1.4em;
}

/* Styles pour FullCalendar */
#calendar {
    flex-grow: 1; /* Permet au calendrier de prendre tout l'espace disponible */
    padding-top: 15px;
    /* FullCalendar overrides */
    --fc-border-color: var(--fullcalendar-border);
    --fc-neutral-bg-color: var(--fullcalendar-bg);
    --fc-daygrid-event-dot-width: 8px; /* Ajuste la taille du point d'événement */
    color: var(--fullcalendar-text); /* Couleur du texte par défaut */
}

.fc-button {
    background-color: var(--button-bg) !important;
    border-color: var(--button-bg) !important;
    color: white !important;
    text-transform: capitalize !important; /* Pour que les noms de vue soient en minuscules */
}

.fc-button:hover {
    background-color: var(--button-hover-bg) !important;
    border-color: var(--button-hover-bg) !important;
}

.fc-daygrid-day-number {
    color: var(--fullcalendar-text);
}

.fc-col-header-cell {
    background-color: var(--fullcalendar-header-bg);
    color: var(--fullcalendar-text);
}

.fc-event {
    border-radius: 4px;
    padding: 2px 4px;
    font-size: 0.85em;
    font-weight: bold;
    cursor: pointer;
    white-space: normal; /* Permet au texte de passer à la ligne */
    overflow: hidden; /* Cache le texte qui dépasse */
    text-overflow: ellipsis; /* Ajoute des points de suspension si le texte est tronqué */
}

/* Header */
header {
    background-color: var(--header-bg);
    color: white;
    padding: 15px 20px;
    text-align: center;
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

header h1 {
    margin: 0;
    font-size: 1.8em;
    flex-grow: 1;
}

/* Global button styles for sidebar action buttons and header theme button */
#addPersonBtn,
#addPlanningEventBtn,
#exportPdfBtn,
#exportPngBtn,
#exportJsonBtn,
#importJsonBtn,
#showStatsBtn,
#themeToggleButton {
    background-color: var(--button-bg);
    color: white;
    border: none; /* No border for these specific buttons */
    padding: 8px 15px;
    border-radius: 5px;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
    /* Ensure consistent spacing and */
}

/* NEW: Class to temporarily hide events for PNG export */
.hide-for-png-export {
    display: none !important;
}
