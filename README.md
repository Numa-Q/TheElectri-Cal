# TheElectri-Cal
styles.css -> to be deleted.


## EVO
### Export CSV
~~Ajouter la période sélectionnée en en tête de fichier.~~ v20.48.5.1
Ajouter la date et l'heure d'export dans le nom de fichier (?)

### Export pdf 
~~ajouter la date et l'heure d'export dans le nom de fichier~~ V20.48.4 

### Controle de version/dette technique.
Mecanisme de vérification des librairies utilisées

## OWASP
Appliquer les mesures OWASP
Faire un rapport des mesures applicables, appliquées

## Déplacer toasts
Pour une meilleure lecture les toasts devraient s'afficher en bas de page, pas en haut.

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
