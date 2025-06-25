# TheElectri-Cal
styles.css -> to be deleted.


## EVO
### Export CSV
~~Ajouter la période sélectionnée en en tête de fichier.~~ v20.48.5.1
Ajouter la date et l'heure d'export dans le nom de fichier (?)

### Export pdf 
~~ajouter la date et l'heure d'export dans le nom de fichier~~ V20.48.4 

### Controle de version/dette technique.
~~Mecanisme de vérification des librairies utilisées~~ (Manuel v20.48.10)

## OWASP
### Solutions pour prévenir l'XSS (sans régression fonctionnelle)
La solution principale pour l'XSS est l'échappement (ou encodage) des sorties. Cela signifie que toutes les données provenant d'une source non fiable (comme l'entrée utilisateur) doivent être converties en une forme sûre avant d'être insérées dans le HTML.
Ajoute du mécanisme dans la v20.48.10.1

La sécurité mise en place cible principalement la prévention des failles **XSS (Cross-Site Scripting)** en appliquant une stratégie d'**encodage HTML systématique** des données saisies par l'utilisateur avant qu'elles ne soient affichées dans l'interface.

Voici un résumé des mesures prises :

1.  **Fonction d'Échappement HTML (`escapeHTML`)** : Une nouvelle fonction utilitaire `escapeHTML(str)` a été ajoutée. Elle convertit les caractères spéciaux HTML (comme `<`, `>`, `&`, `"`, `'`) en leurs entités HTML correspondantes (par exemple, `<` devient `&lt;`). Cela neutralise tout code malveillant qui tenterait d'être injecté.

2.  **Sanitisation des Entrées Utilisateur** :
    * **Noms des Personnes** : Lors de l'ajout ou de la modification de personnes, le nom est désormais échappé via `escapeHTML()` avant d'être stocké dans IndexedDB et affiché dans la liste des personnes ou les titres d'événements.
    * **Importation de Données** : Les noms des personnes et les titres des événements importés via JSON sont également passés par `escapeHTML()` pour s'assurer qu'aucune donnée malveillante n'est introduite via ce canal.

3.  **Sécurisation de la Génération Dynamique d'HTML** :
    * **Messages des Toasts** : Tous les messages affichés dans les notifications "toast" sont échappés.
    * **Modales** :
        * Les titres des modales sont systématiquement échappés.
        * Le contenu des champs de formulaire générés (inputs, selects, textareas, datepickers) voit leurs valeurs et labels échappés.
        * Les messages affichés dans les modales de confirmation sont également échappés.
    * **Calendrier FullCalendar** : Les titres des événements affichés dans le calendrier (y compris les info-bulles et le contenu visuel des événements) sont échappés via la fonction `escapeHTML()`.
    * **Affichage des Listes et Tableaux** :
        * Les noms des personnes dans la liste latérale sont échappés.
        * Les données affichées dans la table des statistiques (noms des personnes, en-têtes) sont échappées.
        * Les noms des librairies dans la modale de vérification des versions sont échappés, ainsi que leurs URLs sources.
    * **Préparation des Données PDF et CSV** : Les noms des personnes et autres données textuelles utilisées pour la génération du PDF ou l'export CSV sont échappés pour garantir que même dans ces formats de sortie, les données proviennent d'une source nettoyée.

En résumé, l'approche est de traiter toutes les données provenant de l'utilisateur comme potentiellement non fiables et de les échapper systématiquement juste avant qu'elles ne soient insérées dans le HTML de la page. Cela garantit que les éventuels scripts malveillants injectés sont traités comme du texte simple et non exécutés par le navigateur, prévenant ainsi les attaques XSS.

## Déplacer toasts
~~Pour une meilleure lecture les toasts devraient s'afficher en bas de page, pas en haut~~. (v20.42.0)

## PDF jours en anglais
Oui, la ligne `Day.js current locale at PDF generation start: en` dans la console indique que la locale globale de Day.js est actuellement définie sur l'anglais au moment où ce message est enregistré dans la fonction `generatePermanencePdfTable`.

Cependant, en analysant le code `app.js`, il est important de noter que les noms des jours sont formatés spécifiquement en français à deux endroits clés :

1.  **Lors de la préparation des données PDF** (dans `preparePdfDataAndGeneratePdf`, ligne 1172) :
    `const formattedDayOfWeek = dayjsObj.locale('fr').format('ddd DD/MM');`
    Ceci assure que les noms des jours (comme "Lun", "Mar", etc.) sont générés en français *avant* d'être stockés temporairement et utilisés pour le PDF.

2.  **Lors de la génération du tableau PDF** (dans `generatePermanencePdfTable`, ligne 1255) :
    `dayPdfData.dayOfWeekFr = currentDay.locale('fr').format('ddd DD/MM');`
    Cette ligne, bien que potentiellement redondante si les données sont déjà formatées, réaffirme l'intention de s'assurer que le formatage du jour est en français juste avant son utilisation.

Le fait que le PDF affiche toujours les noms des jours en anglais, malgré ces appels explicites à `dayjs().locale('fr')`, suggère que le problème ne vient pas directement du formatage de la date par Day.js, mais plutôt de la façon dont la bibliothèque `jspdf` (utilisée pour générer le PDF) gère les caractères Unicode ou les polices. Il est possible que la police par défaut de `jspdf` ne supporte pas complètement les caractères accentués ou les spécificités de la langue française, ou qu'il y ait une autre interaction inattendue.

En résumé, la locale `en` signalée par le `console.log` est la locale globale de Day.js à ce moment précis, mais les chaînes de caractères des noms de jours sont explicitement générées en français avant d'être passées à `jspdf`. Si le PDF affiche toujours des noms anglais, cela pointe vers une limitation ou une configuration manquante au niveau de `jspdf` concernant le support des langues.

## Vérification des librairies 
Actuellement, la vérification des versions des librairies dans `app.js` est effectuée manuellement.
Il n'existe pas de mécanisme simple fonctionnant coté front end pour vérifier les librairies automatiquement.

Voici comment cela fonctionne :

1.  **Données statiques (`LIBRARIES_INFO`) :** Il existe une constante appelée `LIBRARIES_INFO` dans `app.js`. Cette constante est un tableau d'objets JavaScript. Chaque objet représente une librairie utilisée par l'application (FullCalendar, Day.js, Font Awesome, jsPDF). Pour chaque librairie, cet objet contient :
    * `name`: Le nom de la librairie.
    * `currentVersion`: La version actuellement utilisée dans votre application (telle que spécifiée dans les balises `<script>` de `index.html` ou gérée en interne).
    * `latestKnownVersion`: **C'est ici que l'information est manuelle.** Cette valeur est renseignée et mise à jour par le développeur après avoir vérifié la dernière version disponible de la librairie sur son site officiel ou son dépôt.
    * `recommendation`: Une recommandation (`"À jour"`, `"Mise à jour mineure recommandée"`, etc.) qui est également déterminée manuellement en comparant `currentVersion` et `latestKnownVersion`.
    * `sourceUrl`: L'URL du site officiel de la librairie, pour référence.

2.  **Affichage des informations (`showLibraryVersionsModal`) :** Lorsque vous cliquez sur le bouton "Vérifier versions librairies", la fonction `showLibraryVersionsModal` est appelée. Cette fonction parcourt simplement le tableau `LIBRARIES_INFO` et construit un tableau HTML pour afficher toutes ces informations.

En résumé, l'application affiche des informations sur les versions qui ont été préalablement renseignées et mises à jour à la main dans le code source de `app.js`. Elle ne va pas chercher ces informations dynamiquement sur le web au moment où vous cliquez sur le bouton.
