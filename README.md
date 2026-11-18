# Coach Hypertrophie

Application web de musculation pour la prise de masse. Elle tient dans une seule page et s'utilise sur le téléphone, à la salle.

**Ouvrir l'application :** https://minibrasiler7.github.io/coach-hypertrophie/

## Sur iPhone

1. Ouvre l'adresse ci-dessus dans Safari.
2. Touche le bouton Partager, puis « Sur l'écran d'accueil ».
3. Lance l'application depuis son icône. Elle s'ouvre en plein écran et fonctionne sans réseau.

**Musique et voix du coach.** Lance d'abord ta musique (Apple Music, YouTube dans un autre navigateur…), puis ouvre
l'application **depuis son icône**. La voix se superpose alors à la musique. Dans un onglet Safari, l'iPhone coupe la
musique des autres applications dès qu'une page produit du son : le coach y reste muet par défaut.
Le mode silencieux de l'iPhone coupe la voix du coach.

## Ce qu'elle fait

- **Séance du jour.** Rotation de séances selon le nombre d'entraînements par semaine (2 à 6).
- **Charge conseillée.** Calculée à partir des séances précédentes : on ajoute des répétitions, puis de la charge.
- **Machine absente.** L'exercice est remplacé et n'est plus proposé.
- **Machine occupée.** L'exercice suivant passe devant, puis l'application revient sur le premier.
- **Douleur.** Les exercices qui chargent l'articulation sont remplacés, allégés ou écartés.
- **Modèle.** Deux photos (départ, arrivée) et trois consignes par exercice. 88 exercices.
- **Coach vocal.** Voix enregistrée, féminine ou masculine. Signal de reprise, un conseil sur l'exercice en cours,
  un encouragement pendant l'effort. Il ne lit pas les chiffres : ils sont à l'écran.
- **Rapport.** Durée, séries, kilos soulevés, progrès par exercice, records, volume de la semaine.

L'onglet « Science » de l'application liste les études qui fondent chaque règle.

## Tes données

Les séances sont enregistrées dans le navigateur du téléphone. Elles ne sont jamais envoyées dans ce dépôt.
Dans Réglages, « Copier mes données » donne une copie de sauvegarde. « Importer des données » la recharge.

## Modifier l'application

```
src/data.js        exercices, séances types, phrases du coach, sources scientifiques
src/logic.js       choix des exercices, charge conseillée, volume, rapport
src/ui.js          écrans, voix, minuteur, sauvegarde
src/style.css      mise en forme
src/index.tpl.html gabarit de la page
sw.js              fonctionnement hors connexion
img/               une image par exercice (deux photos côte à côte)
snd/f/, snd/m/     voix du coach : un fichier MP3 par exercice, plus coach.mp3 et index.json
tools/             fabrication de la voix
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
node test/offline.js http://localhost:8766/                 # hors connexion : page, photos, voix
```

### Refaire les images

Les photos viennent de [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) (domaine public).
`node build-img.js <dossier exercises de Free Exercise DB> img` les recadre et les assemble (nécessite `sharp`).

### Refaire la voix du coach

Les phrases sont dans `src/data.js` : `COACH` pour les phrases communes, le nom et les consignes de chaque exercice.
Elles sont enregistrées avec [Piper](https://github.com/OHF-Voice/piper1-gpl), une synthèse vocale neurale libre.
Chaque phrase est générée jusqu'à six fois ; la reconnaissance vocale Whisper choisit la version la mieux comprise.

```
node tools/voice-texts.js > textes.json
python3 tools/make-voice.py textes.json f snd --models <dossier des modèles>
python3 tools/make-voice.py textes.json m snd --models <dossier des modèles>
```

Lance les deux voix l'une après l'autre, pas en même temps. L'en-tête de `tools/make-voice.py` liste les modèles à télécharger.

Voix féminine : modèle `fr_FR-siwis-medium`, entraîné sur le corpus SIWIS (CC BY 4.0).
Voix masculine : modèle `fr_FR-upmc-medium`, locuteur « pierre », entraîné sur le corpus UPMC (CC BY-SA 4.0).

## Avertissement

Cette application donne des repères d'entraînement pour des adultes en bonne santé. Elle ne remplace pas un avis médical.
