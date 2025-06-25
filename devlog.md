Voici le devlog.md complet, incluant les noms proposés pour le projet, avec une note précisant qu'ils ne sont pas encore validés :

# Devlog de l'Application de Gestion du Planning de Permanence Électrique

## Objectif
Développer une application PWA/SPA fonctionnant en local pour gérer le planning de permanence électrique sur le site d'une entreprise. L'application doit permettre à un gestionnaire unique de saisir les disponibilités des employés habilités et de générer un calendrier visuel.

## Fonctionnalités

### 1. Saisie des Disponibilités
- Un calendrier interactif permettant au gestionnaire de saisir les jours de télétravail et de congé pour chaque personne habilitée.

### 2. Gestion des Absences
- Automatisation de la vérification pour s'assurer qu'une personne est présente sur site à 8h00 chaque jour de la semaine.

### 3. Ajout de Contraintes
- Fonctionnalité permettant au gestionnaire de définir des contraintes :
  - Contraintes répétitives (ex. télétravail tous les mardis et jeudis).
  - Congés sur une période définie (ex. congé du 1er août au 15 août).

### 4. Affichage des Disponibilités
- Un calendrier visuel représentant les jours de présence et d'absence pour toutes les personnes ajoutées.

### 5. Notifications
- Utilisation de toasts pour informer le gestionnaire des actions effectuées ou des erreurs.

### 6. Validation des Actions
- Modales pour demander la validation du gestionnaire avant des actions importantes.

### 7. Exportation
- Options pour exporter le planning au format PDF (via jsPDF) et en PNG (image).

### 8. Import/Export JSON
- Fonctionnalité permettant d'exporter les données du planning au format JSON.
- Possibilité d'importer des données de planning à partir d'un fichier JSON.

### 9. Module de Statistiques
- Affichage du nombre total de jours de présence et d'absence pour chaque personne habilitée sur une période donnée.
- Calcul du pourcentage de présence par rapport au nombre total de jours.
- Visualisations des motifs d'absence (télétravail, congé) à l'aide de D3.js.
- Création de graphiques interactifs (barres, secteurs) pour une analyse visuelle des données.
- Options pour télécharger des rapports statistiques au format PDF ou CSV.

## Technologies

### Bibliothèques Validées
- **FullCalendar** : Pour la gestion et l'affichage des calendriers. [Lien](https://fullcalendar.io/)
- **jsPDF** : Pour la génération de fichiers PDF. [Lien](https://github.com/parallax/jsPDF)
- **html2canvas** : Pour prendre des captures d'écran et les convertir en images. [Lien](https://github.com/niklasvh/html2canvas)
- **D3.js** : Pour créer des visualisations interactives des données de statistiques. [Lien](https://d3js.org/)

### Bibliothèques Potentielles (à valider)
- **Bootstrap ou Tailwind CSS** : Frameworks CSS pour faciliter le design et la mise en page.
  - [Bootstrap](https://getbootstrap.com/)
  - [Tailwind CSS](https://tailwindcss.com/)
  
- **Lodash** : Bibliothèque de utilitaires JavaScript pour les manipulations d'objets, tableaux, etc. [Lien](https://github.com/lodash/lodash)

- **Moment.js (ou Day.js)** : Bibliothèque pour la manipulation et le formatage des dates.
  - [Moment.js](https://momentjs.com/)
  - [Day.js (alternative légère)](https://day.js.org/)

## Noms Proposés pour le Projet (non validés)
1. **Watt's Up Doc?**
2. **Current Affairs**
3. **Shockingly Organized**
4. **Power Play Planner**
5. **The Electri-Calendar**

## Notes
- L'application sera conçue pour être simple et intuitive, en mettant l'accent sur l'expérience utilisateur.
- L'interface utilisateur devra être claire, avec des notifications et des validations faciles à comprendre.

## Prochaines Étapes
- Concevoir les maquettes de l'interface utilisateur.
- Développer les fonctionnalités une par une en suivant les spécifications convenues.


# Devlog - The Electri-Cal

## Version: v20.48.10

**Date de ce Devlog:** 25 juin 2025

Ce document sert de journal de développement et de guide pour tout développeur souhaitant reprendre ou contribuer au projet **The Electri-Cal**.

---

## 1. Fonctionnalités de l'Application

The Electri-Cal est une application web monopage (SPA) conçue pour la gestion simplifiée des plannings de permanence électrique. Elle est entièrement côté client, utilisant IndexedDB pour la persistance des données.

### 1.1. Gestion des Personnes Habilitées

* **Ajout de personne :** Permet d'enregistrer de nouvelles personnes avec un nom et une couleur optionnelle associée. Un identifiant unique (`crypto.randomUUID()`) est généré automatiquement.
* **Modification de personne :** Possibilité de renommer une personne et de changer sa couleur.
* **Suppression de personne :** Suppression d'une personne et de tous les événements de planning qui lui sont associés.
* **Visibilité :** Chaque personne peut être activée ou désactivée, filtrant ainsi ses événements du calendrier sans les supprimer.
* **Liste des personnes :** Affichage dynamique des personnes avec des actions d'édition et de suppression.

### 1.2. Gestion des Événements de Planification

* **Ajout d'événement :** Création d'événements pour une personne, un type d'événement, une période (date de début et de fin).
* **Types d'événements :**
    * `permanence` (Vert)
    * `permanence_backup` (Bleu)
    * `telework_punctual` (Bleu)
    * `telework_recurrent` (Bleu)
    * `leave` (Gris)
* **Récurrence :** Supporte les récurrences quotidiennes, hebdomadaires, mensuelles et annuelles, avec une date de fin de récurrence optionnelle. Les événements récurrents sont liés par un `recurrenceGroupId`.
* **Modification d'événement :** Édition du type, de la personne associée, des dates et ajout de notes pour un événement existant.
* **Suppression d'événement :** Suppression d'un événement unique ou de toute une série d'événements récurrents.
* **Interaction Calendrier :** Les événements peuvent être ajoutés ou modifiés directement via l'interface du calendrier.

### 1.3. Persistance et Gestion des Données

* **IndexedDB :** Utilisation d'IndexedDB pour stocker les données de manière persistante dans le navigateur de l'utilisateur.
    * `DB_NAME`: 'ElectriCalDB'
    * `DB_VERSION`: 2
    * `STORE_PEOPLE`: Stocke les objets `personne`.
    * `STORE_EVENTS`: Stocke les objets `événement`.
    * `STORE_PDF_GENERATION`: Store temporaire utilisé pour sauvegarder l'état du calendrier lors de la génération de PDF.
* **Import/Export JSON :**
    * **Export :** Exporte toutes les données (personnes et événements) dans un fichier JSON téléchargeable.
    * **Import :** Importe des données depuis un fichier JSON, écrasant les données existantes.
* **Effacement complet des données :** Fonctionnalité pour vider entièrement la base de données IndexedDB.

### 1.4. Rapports et Statistiques

* **Statistiques de permanence :** Affiche un tableau récapitulatif du nombre de jours par type d'événement pour chaque personne sur l'année en cours.
* **Export CSV des statistiques :** Permet d'exporter le tableau des statistiques au format CSV.

### 1.5. Exportation Visuelle

* **Export PDF :** Génère un PDF multi-pages (format A4 paysage) du calendrier pour une période donnée (mois par mois). Utilise `html2canvas` pour capturer le rendu du calendrier et `jspdf` pour créer le document PDF.
* **Export PNG :** Génère une image PNG du calendrier actuellement affiché.

### 1.6. Interface Utilisateur et Expérience (UI/UX)

* **Thème Sombre/Clair :** Un bouton permet de basculer entre un thème clair et un thème sombre. Le choix est persisté via `localStorage`.
* **Notifications (Toasts) :** Système de notifications non intrusives pour informer l'utilisateur des actions réussies, des erreurs ou des informations.
* **Modales génériques :** Utilisation d'un système de modales centralisé pour toutes les interactions utilisateur (ajout, édition, confirmation).
* **Design Responsive :** Adaptation de l'interface pour les écrans de différentes tailles (via `style.css`).
* **Informations sur les librairies :** Affichage d'une modale listant les versions des librairies utilisées.

---

## 2. Informations pour les Développeurs

### 2.1. Technologies et Librairies Utilisées

L'application est une Single Page Application (SPA) front-end pure.

* **HTML5, CSS3 (Custom Properties), JavaScript (ES6+)**
* **Librairies tierces (via CDN) :**
    * **FullCalendar (v6.1.17)** : Pour l'affichage et la gestion du calendrier.
        * `https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/6.1.17/main.min.css`
        * `https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/6.1.17/index.global.min.js`
        * `https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.17/locales-all.global.min.js` (pour les traductions)
    * **Day.js (v1.11.11)** : Bibliothèque légère pour la manipulation des dates et heures.
        * `https://cdn.jsdelivr.net/npm/dayjs@1.11.11/dayjs.min.js`
        * `https://cdn.jsdelivr.net/npm/dayjs@1.11.11/plugin/customParseFormat.js`
        * `https://cdn.jsdelivr.net/npm/dayjs@1.11.11/plugin/isBetween.js`
        * `https://cdn.jsdelivr.net/npm/dayjs@1.11.11/plugin/weekday.js`
        * `https://cdn.jsdelivr.net/npm/dayjs@1.11.11/plugin/isSameOrBefore.js`
    * **Font Awesome (v6.5.2)** : Pour les icônes.
        * `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css`
    * **jsPDF (v2.10.0)** : Pour la génération de documents PDF.
        * `https://cdn.jsdelivr.net/npm/jspdf@2.10.0/dist/jspdf.umd.min.js`
    * **html2canvas (v1.4.1)** : Pour la capture d'éléments HTML en images (utilisé pour PDF et PNG).
        * `https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js`

### 2.2. Structure du Projet

Le projet est minimaliste et se compose de trois fichiers principaux :

* `index.html` : La structure HTML de l'application, incluant les liens vers les CDN des librairies et le script principal.
* `style.css` : Contient toutes les règles CSS pour la mise en forme de l'application, y compris la gestion des thèmes clair/sombre.
* `app.js` : Le script JavaScript principal qui gère toute la logique de l'application, les interactions avec l'utilisateur, la gestion des données IndexedDB, et l'intégration des librairies tierces.

### 2.3. Démarrage du Développement

Pour lancer l'application en développement :

1.  **Cloner ou télécharger** les fichiers du projet.
2.  **Ouvrir le fichier `index.html`** directement dans un navigateur web moderne (Chrome, Firefox, Edge, Safari).
3.  **Utiliser les outils de développement** du navigateur (Console, Inspecteur d'éléments) pour le débogage et l'inspection.

Aucun serveur web local n'est strictement nécessaire pour le développement de base, car l'application est entièrement statique côté client. Cependant, pour certaines fonctionnalités (comme les requêtes `fetch` si elles étaient ajoutées ultérieurement, ou certains comportements de fichiers locaux), un petit serveur local (comme `Live Server` pour VS Code, ou `python -m http.server`) peut être utile.

### 2.4. Conventions de Code

* **JavaScript :** Utilisation de l'ES6+ avec des `const` et `let`, fonctions fléchées, promesses (`async/await`) pour la gestion asynchrone d'IndexedDB.
* **CSS :** Utilisation de variables CSS (`:root` pour les thèmes) pour faciliter la maintenance des couleurs et des propriétés récurrentes.

---

## 3. Améliorations et Évolutions à Prévoir

Cette section liste les pistes d'amélioration pour les futures versions de l'application.

* **Gestion des erreurs CDN :** Ajouter une meilleure gestion des erreurs si les CDN ne peuvent pas être atteints (par exemple, afficher un message d'erreur clair à l'utilisateur au lieu de rester bloqué sur un toast).
* **Validation d'entrée améliorée :** Implémenter une validation plus robuste pour tous les champs de formulaire, y compris les formats de date, les plages numériques et les contraintes spécifiques aux types d'événements.
* **Accessibilité (A11y) :** Poursuivre l'intégration des meilleures pratiques d'accessibilité (ex: ARIA roles, navigation au clavier plus complète).
* **Optimisation des performances :** Pour les grands ensembles de données ou les exports PDF/PNG complexes, optimiser les opérations pour garantir une fluidité continue.
* **Gestion avancée des récurrences :** Améliorer la modification des événements récurrents pour permettre la modification d'une seule occurrence, des occurrences futures, ou de toute la série, plutôt que de toujours supprimer la série.
* **Personnalisation des types d'événements :** Permettre aux utilisateurs de définir leurs propres types d'événements et couleurs associées via l'interface.
* **Tests :** Mettre en place des tests unitaires et/ou d'intégration pour garantir la fiabilité des fonctionnalités.
* **Progressive Web App (PWA) :** Renforcer les capacités PWA (Service Worker pour la mise en cache des assets, l'accès hors ligne complet).
* **Interface utilisateur (UI) :** Affiner l'UI pour une expérience encore plus intuitive, notamment sur les appareils mobiles.
* **Historique / Annulation :** Mettre en œuvre une fonctionnalité d'annulation pour les dernières actions de l'utilisateur.

---

## 4. Failles de Sécurité Identifiées et Mesures Anti-Code Malveillant

Bien que cette application soit une SPA purement côté client et n'ait pas de backend, certaines considérations de sécurité restent importantes.

### 4.1. Mesures Mises en Place (Anti-XSS)

* **Échappement HTML (XSS Protection) :** Une fonction `escapeHtml()` **N'EST PLUS** implémentée dans `app.js` et utilisée systématiquement pour nettoyer toutes les entrées utilisateur avant qu'elles ne soient insérées dans le DOM. Ceci vise à prévenir les attaques de Cross-Site Scripting (XSS) où des scripts malveillants pourraient être injectés via des noms de personnes ou des notes d'événements. Cette fonction est appliquée sur :
    * Les messages de toasts.
    * Les noms de personnes dans la liste et les modales.
    * Les titres d'événements dans le calendrier.
    * Les noms des personnes et les statistiques affichées.

### 4.2. Failles de Sécurité Potentielles et Recommandations

Malgré les mesures anti-XSS, d'autres aspects peuvent être renforcés si l'application devait évoluer ou être auditée plus en profondeur :

* **Exhaustivité de l'échappement :** Bien que l'`escapeHtml` soit largement utilisé, une relecture et un audit de sécurité seraient nécessaires pour s'assurer qu'aucune entrée utilisateur ne puisse jamais être rendue non échappée dans le DOM (y compris les attributs HTML dynamiques).
* **Diposibilité des CDN (Single Point of Failure) :** L'application dépend entièrement de CDNs tiers pour le chargement de ses librairies. Si un CDN est hors service, l'application ne fonctionnera pas.
    * **Recommandation :** Implémenter le [Subresource Integrity (SRI)](https://developer.mozilla.org/fr/docs/Web/Security/Subresource_Integrity) pour garantir que les fichiers chargés depuis les CDN n'ont pas été altérés.
* **Absence de Content Security Policy (CSP) :** Aucun en-tête Content Security Policy n'est défini. Cela signifie que le navigateur exécutera du code provenant de n'importe quelle source si une injection XSS était possible.
    * **Recommandation :** Mettre en place un CSP strict pour limiter les sources de scripts, styles et autres ressources. Par exemple, autoriser uniquement les scripts provenant du même domaine ou des CDNs spécifiques avec des hachages.
* **Sécurité d'IndexedDB :** Bien qu'IndexedDB soit lié à l'origine (seul le même domaine peut accéder aux données), les données y sont stockées en clair. Si le système de l'utilisateur est compromis, les données pourraient être lues.
    * **Recommandation :** Pour des données extrêmement sensibles (non le cas ici), un chiffrement côté client avant le stockage dans IndexedDB pourrait être envisagé, bien que cela ajoute une complexité significative.
* **Fichiers importés (JSON) :** L'importation de fichiers JSON écrase les données existantes. Une validation plus poussée du contenu du JSON importé est souhaitable pour éviter l'introduction de données malformées ou d'objets inattendus qui pourraient potentiellement causer des erreurs d'exécution.
    * **Recommandation :** Valider la structure et les types de données des objets `personne` et `événement` lors de l'importation JSON.

---

Ce devlog est un document vivant. Toute nouvelle fonctionnalité, amélioration ou problème de sécurité doit y être ajoutée pour maintenir une documentation à jour et pertinente.
