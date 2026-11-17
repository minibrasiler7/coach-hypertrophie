# Coach Hypertrophie

Application web de musculation pour la prise de masse. Elle tient dans une seule page et s'utilise sur le téléphone, à la salle.

**Ouvrir l'application :** https://minibrasiler7.github.io/coach-hypertrophie/

## Sur iPhone

1. Ouvre l'adresse ci-dessus dans Safari.
2. Touche le bouton Partager, puis « Sur l'écran d'accueil ».
3. Lance l'application depuis son icône. Elle s'ouvre en plein écran et fonctionne sans réseau.

## Ce qu'elle fait

- **Séance du jour.** Rotation de séances selon le nombre d'entraînements par semaine (2 à 6).
- **Charge conseillée.** Calculée à partir des séances précédentes : on ajoute des répétitions, puis de la charge.
- **Machine absente.** L'exercice est remplacé et n'est plus proposé.
- **Machine occupée.** L'exercice suivant passe devant, puis l'application revient sur le premier.
- **Douleur.** Les exercices qui chargent l'articulation sont remplacés, allégés ou écartés.
- **Modèle.** Deux photos (départ, arrivée) et trois consignes par exercice. 87 exercices.
- **Coach vocal.** Annonce l'exercice, la charge, le repos, et donne des conseils.
- **Rapport.** Durée, séries, kilos soulevés, progrès par exercice, records, volume de la semaine.

L'onglet « Science » de l'application liste les études qui fondent chaque règle.

## Tes données

Les séances sont enregistrées dans le navigateur du téléphone. Elles ne sont jamais envoyées dans ce dépôt.
Dans Réglages, « Copier mes données » donne une copie de sauvegarde. « Importer des données » la recharge.

## Modifier l'application

```
src/data.js        exercices, séances types, conseils, sources scientifiques
src/logic.js       choix des exercices, charge conseillée, volume, rapport
src/ui.js          écrans, voix, minuteur, sauvegarde
src/style.css      mise en forme
src/index.tpl.html gabarit de la page
sw.js              fonctionnement hors connexion
img/               une image par exercice (deux photos côte à côte)
```

La page servie est `index.html`. Elle est produite à partir de `src/` :

```
node build.js
```

Après un changement de `src/`, relance cette commande, puis pousse `index.html` avec le reste.
Sur le téléphone, une nouvelle version apparaît au deuxième lancement de l'application.

### Tests

```
node test/logic.test.js                 # calculs : charge, douleur, rotation, rapport
python3 -m http.server 8766             # dans un autre terminal
node test/e2e.js http://localhost:8766/index.html shots     # séance complète (Playwright)
node test/e2e2.js http://localhost:8766/index.html          # minuteur, réglages, export
node test/offline.js http://localhost:8766/                 # hors connexion
```

### Refaire les images

Les photos viennent de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domaine public).
`node build-img.js <dossier exercises de Free Exercise DB> img` les recadre et les assemble (nécessite `sharp`).

## Avertissement

Cette application donne des repères d'entraînement pour des adultes en bonne santé. Elle ne remplace pas un avis médical.
