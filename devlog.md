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


N'hésitez pas à modifier ou à ajouter des éléments si nécessaire !
