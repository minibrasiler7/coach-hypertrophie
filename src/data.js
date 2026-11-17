/* ===== Données : muscles, zones, exercices, programme, conseils, sources ===== */
const MUSCLES = {pecs:'Pectoraux', dos:'Dos', epaules:'Épaules', biceps:'Biceps', triceps:'Triceps',
  quads:'Quadriceps', ischios:'Ischio-jambiers', fessiers:'Fessiers', mollets:'Mollets', abdos:'Abdominaux'};
const ZONES = {ep:'Épaule', co:'Coude', po:'Poignet', nu:'Nuque', do:'Bas du dos', ha:'Hanche', ge:'Genou', ch:'Cheville / pied'};
const EQ = {machine:'Machine', cable:'Poulie', dumbbell:'Haltères', barbell:'Barre', smith:'Barre guidée', body:'Poids du corps'};
const GENERIC_ST = {dumbbell:1, barbell:1, cable:1, body:1, ezbar:1};

/* X(id, nom, muscle principal, muscles secondaires (0,5 série), créneau, poste, matériel,
     type c=polyarticulaire i=isolation, pas de charge, sollicitation articulaire 0-3, photo, consignes, options) */
const EX = [];
function X(id,n,m,s,slot,st,eq,t,inc,j,img,cues,o){ EX.push(Object.assign({id:id,n:n,m:m,s:s,slot:slot,st:st,eq:eq,t:t,inc:inc,j:j,img:img,cues:cues},o||{})); }

// ---------- Pectoraux
X('dc_halt','Développé couché haltères','pecs',['triceps','epaules'],'press_h','dumbbell','dumbbell','c',2,{ep:2,co:1,po:1},'Dumbbell_Bench_Press',
  ['Allongé, pieds au sol, omoplates serrées.','Descends les haltères au niveau de la poitrine, coudes à 45°.','Pousse sans décoller les épaules du banc.'],{per:1,start:14});
X('chest_press','Chest press machine','pecs',['triceps','epaules'],'press_h','chestpress','machine','c',5,{ep:1,co:1,po:1},'Machine_Bench_Press',
  ['Règle le siège : poignées à hauteur de poitrine.','Pousse sans verrouiller les coudes, reviens lentement.','Garde les omoplates collées au dossier.'],{start:30});
X('dc_barre','Développé couché barre','pecs',['triceps','epaules'],'press_h','benchbar','barbell','c',2.5,{ep:3,co:2,po:2},'Barbell_Bench_Press_-_Medium_Grip',
  ['Yeux sous la barre, omoplates serrées, pieds ancrés.','Descends la barre sur le bas de la poitrine.','Poignets droits, coudes à 45° du buste.'],{start:40});
X('dc_smith','Développé couché barre guidée','pecs',['triceps','epaules'],'press_h','smith','smith','c',2.5,{ep:2,co:1,po:2},'Smith_Machine_Bench_Press',
  ['Banc centré sous la barre guidée.','Descends sur le milieu de la poitrine, pousse droit.','Omoplates serrées pendant toute la série.'],{start:30});
X('pompes','Pompes','pecs',['triceps','epaules'],'press_h','body','body','c',2.5,{ep:1,co:1,po:2},'Pushups',
  ['Mains un peu plus larges que les épaules, corps gainé.','Descends la poitrine près du sol, repousse.','Ne creuse pas le bas du dos.'],{bw:1,noload:1});
X('di_halt','Développé incliné haltères','pecs',['triceps','epaules'],'press_incline','dumbbell','dumbbell','c',2,{ep:2,co:1,po:1},'Incline_Dumbbell_Press',
  ['Banc incliné à 30°, omoplates serrées.','Descends les haltères sur le haut de la poitrine.','Pousse vers le haut, pas vers l\'avant.'],{per:1,start:12});
X('di_machine','Développé incliné machine','pecs',['triceps','epaules'],'press_incline','inclinepress','machine','c',5,{ep:1,co:1,po:1},'Leverage_Incline_Chest_Press',
  ['Règle le siège : poignées au niveau du haut de la poitrine.','Pousse, puis reviens lentement jusqu\'à l\'étirement.','Dos et tête contre le dossier.'],{start:25});
X('di_smith','Développé incliné barre guidée','pecs',['triceps','epaules'],'press_incline','smith','smith','c',2.5,{ep:2,co:1,po:2},'Smith_Machine_Incline_Bench_Press',
  ['Banc incliné à 30° sous la barre guidée.','Descends sur le haut de la poitrine.','Coudes sous la barre, poignets droits.'],{start:25});
X('di_barre','Développé incliné barre','pecs',['triceps','epaules'],'press_incline','inclinebar','barbell','c',2.5,{ep:3,co:2,po:2},'Barbell_Incline_Bench_Press_-_Medium_Grip',
  ['Banc incliné à 30°, prise un peu plus large que les épaules.','Descends la barre sous les clavicules.','Garde les fesses sur le banc.'],{start:30});
X('pecdeck','Pec deck (butterfly)','pecs',[],'fly','pecdeck','machine','i',5,{ep:2},'Butterfly',
  ['Siège réglé : coudes à hauteur d\'épaules.','Ramène les bras devant toi, serre une seconde.','Reviens lentement jusqu\'à sentir l\'étirement des pectoraux.'],{start:25});
X('ecarte_poulie','Écarté à la poulie vis-à-vis','pecs',[],'fly','cable','cable','i',2.5,{ep:2,co:1},'Cable_Crossover',
  ['Poulies hautes, un pied devant, buste légèrement penché.','Ramène les mains devant toi, coudes légèrement fléchis.','Laisse les bras s\'ouvrir lentement au retour.'],{per:1,start:10});
X('ecarte_poulie_basse','Écarté poulie basse','pecs',[],'fly','cable','cable','i',2.5,{ep:1,co:1},'Low_Cable_Crossover',
  ['Poulies en bas, un pied devant.','Monte les mains devant la poitrine, de bas en haut.','Garde les coudes légèrement fléchis.'],{per:1,start:7.5});
X('ecarte_halt','Écarté haltères','pecs',[],'fly','dumbbell','dumbbell','i',1,{ep:3,co:1,po:1},'Dumbbell_Flyes',
  ['Allongé, haltères au-dessus de la poitrine, coudes souples.','Ouvre les bras en arc de cercle jusqu\'à l\'étirement.','Ne descends pas plus bas que les épaules.'],{per:1,start:8});

// ---------- Dos
X('tirage_large','Tirage vertical prise large','dos',['biceps'],'pull_v','latpull','machine','c',5,{ep:2,co:1,po:1},'Wide-Grip_Lat_Pulldown',
  ['Cuisses calées, prise plus large que les épaules.','Tire la barre vers le haut de la poitrine.','Tire avec les coudes, sans balancer le buste.'],{start:35});
X('tirage_neutre','Tirage vertical prise neutre serrée','dos',['biceps'],'pull_v','latpull','machine','c',5,{ep:1,co:1},'V-Bar_Pulldown',
  ['Poignée serrée, paumes face à face.','Tire vers le haut de la poitrine, coudes le long du corps.','Laisse les bras se tendre complètement en haut.'],{start:35});
X('tractions','Tractions','dos',['biceps'],'pull_v','pullupbar','body','c',2.5,{ep:2,co:2,po:1},'Pullups',
  ['Suspendu, prise un peu plus large que les épaules.','Monte le menton au-dessus de la barre.','Descends bras presque tendus, sans à-coup.'],{bw:1});
X('tirage_supi','Tirage vertical en supination','dos',['biceps'],'pull_v','latpull','machine','c',5,{ep:1,co:2,po:2},'Underhand_Cable_Pulldowns',
  ['Paumes vers toi, mains largeur d\'épaules.','Tire la barre vers la poitrine.','Contrôle la remontée jusqu\'à l\'étirement.'],{start:35});
X('rowing_poulie','Rowing assis à la poulie','dos',['biceps'],'row','seatedrow','machine','c',5,{ep:1,co:1,do:1},'Seated_Cable_Rows',
  ['Assis, dos droit, genoux légèrement fléchis.','Tire la poignée vers le nombril, coudes près du corps.','Laisse les épaules partir vers l\'avant au retour.'],{start:35});
X('rowing_machine','Rowing machine, poitrine en appui','dos',['biceps'],'row','rowmachine','machine','c',5,{ep:1,co:1},'Leverage_Iso_Row',
  ['Poitrine contre l\'appui, pieds au sol.','Tire les coudes vers l\'arrière, serre les omoplates.','Reviens bras tendus, lentement.'],{start:30});
X('rowing_halt','Rowing haltère un bras','dos',['biceps'],'row','dumbbell','dumbbell','c',2,{ep:1,co:1,po:1,do:1},'One-Arm_Dumbbell_Row',
  ['Un genou et une main sur le banc, dos plat.','Tire l\'haltère vers la hanche.','Ne tourne pas le buste.'],{per:1,start:16});
X('rowing_tbar','Rowing T-bar, poitrine en appui','dos',['biceps'],'row','tbar','machine','c',5,{ep:1,co:1,po:1},'Lying_T-Bar_Row',
  ['Poitrine sur l\'appui, bras tendus.','Tire les poignées vers toi, serre les omoplates.','Redescends lentement jusqu\'à l\'étirement.'],{start:20});
X('rowing_incline','Rowing haltères sur banc incliné','dos',['biceps'],'row','dumbbell','dumbbell','c',2,{ep:1,co:1,po:1},'Dumbbell_Incline_Row',
  ['Poitrine sur un banc incliné à 30–45°.','Tire les haltères vers les hanches.','Garde la poitrine sur le banc.'],{per:1,start:12});
X('rowing_barre','Rowing barre buste penché','dos',['biceps'],'row','barbell','barbell','c',2.5,{ep:1,co:1,po:1,do:3,ha:1},'Bent_Over_Barbell_Row',
  ['Buste penché à 45°, dos plat, genoux fléchis.','Tire la barre vers le nombril.','Gaine le ventre, ne te redresse pas.'],{start:40});
X('pullover_poulie','Pull-over poulie, bras tendus','dos',[],'lat_iso','cable','cable','i',2.5,{ep:2,co:1},'Straight-Arm_Pulldown',
  ['Debout face à la poulie haute, bras tendus.','Abaisse la barre jusqu\'aux cuisses, bras presque tendus.','Remonte lentement jusqu\'à l\'étirement du dos.'],{start:20});
X('pullover_halt','Pull-over haltère','dos',[],'lat_iso','dumbbell','dumbbell','i',2,{ep:3,co:1},'Straight-Arm_Dumbbell_Pullover',
  ['Allongé, un haltère tenu à deux mains au-dessus de la poitrine.','Descends l\'haltère derrière la tête, bras souples.','Arrête-toi quand l\'étirement devient fort.'],{start:14});

// ---------- Épaules
X('de_halt','Développé épaules haltères assis','epaules',['triceps'],'press_v','dumbbell','dumbbell','c',2,{ep:2,co:1,po:1,do:1,nu:1},'Seated_Dumbbell_Press',
  ['Assis, dossier presque vertical, haltères à hauteur d\'oreilles.','Pousse au-dessus de la tête sans cambrer.','Redescends jusqu\'à hauteur d\'oreilles.'],{per:1,start:10});
X('de_machine','Développé épaules machine','epaules',['triceps'],'press_v','shoulderpress','machine','c',5,{ep:2,co:1,po:1},'Machine_Shoulder_Military_Press',
  ['Siège réglé : poignées à hauteur d\'épaules.','Pousse vers le haut sans verrouiller les coudes.','Dos contre le dossier.'],{start:20});
X('de_neutre','Développé épaules haltères, prise neutre','epaules',['triceps'],'press_v','dumbbell','dumbbell','c',2,{ep:1,co:1,po:1,do:1},'Standing_Palms-In_Dumbbell_Press',
  ['Haltères devant les épaules, paumes face à face.','Pousse vers le haut, coudes vers l\'avant.','Cette prise est plus douce pour l\'épaule.'],{per:1,start:10});
X('de_smith','Développé épaules barre guidée','epaules',['triceps'],'press_v','smith','smith','c',2.5,{ep:2,co:1,po:2,do:1},'Smith_Machine_Overhead_Shoulder_Press',
  ['Assis sous la barre guidée, barre au niveau du menton.','Pousse au-dessus de la tête.','Coudes sous la barre.'],{start:20});
X('de_barre','Développé militaire barre','epaules',['triceps'],'press_v','barbell','barbell','c',2.5,{ep:3,co:1,po:2,do:2,nu:1},'Standing_Military_Press',
  ['Debout, barre sur le haut de la poitrine, ventre gainé.','Pousse la barre au-dessus de la tête.','Serre les fessiers pour ne pas cambrer.'],{start:30});
X('lat_halt','Élévations latérales haltères','epaules',[],'lateral','dumbbell','dumbbell','i',1,{ep:2,po:1,nu:1},'Side_Lateral_Raise',
  ['Debout, haltères le long du corps, buste à peine penché.','Monte les bras sur les côtés jusqu\'à l\'horizontale.','Pense à écarter les coudes, pas à monter les mains.'],{per:1,start:6});
X('lat_poulie','Élévations latérales à la poulie','epaules',[],'lateral','cable','cable','i',1.25,{ep:2},'Standing_Low-Pulley_Deltoid_Raise',
  ['Poulie basse, poignée dans la main opposée.','Monte le bras sur le côté jusqu\'à l\'horizontale.','Tension constante : reviens lentement.'],{per:1,start:5});
X('lat_scaption','Élévations dans le plan de l\'omoplate','epaules',[],'lateral','dumbbell','dumbbell','i',1,{ep:1},'Dumbbell_Scaption',
  ['Haltères devant les cuisses, pouces vers le haut.','Monte les bras à 30° vers l\'avant, jusqu\'aux épaules.','Trajectoire en V, sans hausser les épaules.'],{per:1,start:5});
X('lat_incline','Élévation latérale couché sur banc incliné','epaules',[],'lateral','dumbbell','dumbbell','i',1,{ep:2},'One-Arm_Incline_Lateral_Raise',
  ['Allongé sur le côté sur un banc incliné.','Monte l\'haltère jusqu\'à l\'horizontale.','Descends lentement, bras devant toi.'],{per:1,start:5});
X('rear_machine','Pec deck inversé','epaules',[],'rear_delt','pecdeck','machine','i',5,{ep:1},'Reverse_Machine_Flyes',
  ['Face à la machine, poitrine contre l\'appui.','Écarte les bras vers l\'arrière.','Bras presque tendus, sans hausser les épaules.'],{start:15});
X('face_pull','Face pull à la corde','epaules',[],'rear_delt','cable','cable','i',2.5,{ep:1,co:1},'Face_Pull',
  ['Poulie à hauteur du visage, corde en mains.','Tire la corde vers le front, coudes hauts.','Écarte les mains en fin de mouvement.'],{start:15});
X('oiseau_poulie','Oiseau à la poulie','epaules',[],'rear_delt','cable','cable','i',1.25,{ep:1},'Cable_Rear_Delt_Fly',
  ['Poulie à hauteur d\'épaule, poignée dans la main opposée.','Écarte le bras vers l\'arrière.','Garde le bras presque tendu.'],{per:1,start:5});
X('oiseau_halt','Oiseau haltères, assis penché','epaules',[],'rear_delt','dumbbell','dumbbell','i',1,{ep:1,do:1},'Seated_Bent-Over_Rear_Delt_Raise',
  ['Assis, buste penché sur les cuisses.','Écarte les bras sur les côtés.','Petits poids, mouvement contrôlé.'],{per:1,start:5});

// ---------- Biceps
X('curl_incline','Curl incliné haltères','biceps',[],'curl','dumbbell','dumbbell','i',1,{ep:1,co:2,po:1},'Incline_Dumbbell_Curl',
  ['Banc incliné à 60°, bras pendants.','Fléchis les coudes sans avancer les épaules.','Redescends jusqu\'au bras tendu : c\'est là que le biceps travaille le plus.'],{per:1,start:8});
X('curl_ez','Curl barre EZ','biceps',[],'curl','ezbar','barbell','i',2.5,{co:2,po:1},'EZ-Bar_Curl',
  ['Debout, coudes près du corps.','Monte la barre sans balancer le buste.','Descends en 2 à 3 secondes.'],{start:20});
X('curl_poulie','Curl à la poulie basse','biceps',[],'curl','cable','cable','i',2.5,{co:1,po:1},'Standing_Biceps_Cable_Curl',
  ['Face à la poulie basse, coudes près du corps.','Monte la barre vers les épaules.','Tension constante, pas d\'élan.'],{start:20});
X('curl_pupitre_machine','Curl pupitre machine','biceps',[],'curl','curlmachine','machine','i',5,{co:2,po:1},'Machine_Preacher_Curls',
  ['Bras à plat sur le pupitre.','Fléchis les coudes, serre en haut.','Redescends presque bras tendus.'],{start:20});
X('curl_pupitre','Curl pupitre barre EZ','biceps',[],'curl','preacher','barbell','i',2.5,{co:2,po:1},'Preacher_Curl',
  ['Bras sur le pupitre, barre EZ en mains.','Monte la barre vers les épaules.','Descends lentement, sans décoller les coudes.'],{start:15});
X('curl_halt','Curl haltères debout','biceps',[],'curl','dumbbell','dumbbell','i',1,{co:1,po:1},'Dumbbell_Bicep_Curl',
  ['Debout, haltères le long du corps.','Monte en tournant les paumes vers le haut.','Coudes fixes.'],{per:1,start:9});
X('curl_marteau','Curl marteau','biceps',[],'hammer','dumbbell','dumbbell','i',1,{co:1},'Hammer_Curls',
  ['Haltères le long du corps, paumes face à face.','Monte sans tourner les poignets.','Coudes collés au buste.'],{per:1,start:10});
X('curl_marteau_corde','Curl marteau à la corde','biceps',[],'hammer','cable','cable','i',2.5,{co:1},'Cable_Hammer_Curls_-_Rope_Attachment',
  ['Poulie basse, corde, paumes face à face.','Monte la corde vers les épaules.','Coudes fixes, descends lentement.'],{start:20});
X('curl_inverse','Curl inversé barre EZ','biceps',[],'hammer','ezbar','barbell','i',2.5,{co:2,po:2},'Reverse_Barbell_Curl',
  ['Barre en mains, paumes vers le bas.','Monte la barre, poignets droits.','Charge légère, mouvement strict.'],{start:15});

// ---------- Triceps
X('tri_corde_haut','Extension triceps au-dessus de la tête, poulie','triceps',[],'tri_overhead','cable','cable','i',2.5,{ep:2,co:2,po:1},'Cable_Rope_Overhead_Triceps_Extension',
  ['Dos à la poulie, corde derrière la tête, coudes hauts.','Tends les bras vers l\'avant et le haut.','Laisse la corde redescendre loin derrière la tête.'],{start:15});
X('tri_halt_haut','Extension triceps haltère au-dessus de la tête','triceps',[],'tri_overhead','dumbbell','dumbbell','i',2,{ep:2,co:2,po:1},'Seated_Triceps_Press',
  ['Assis, un haltère tenu à deux mains au-dessus de la tête.','Descends derrière la nuque, coudes vers le plafond.','Tends les bras sans écarter les coudes.'],{start:14});
X('barre_front','Barre au front (barre EZ)','triceps',[],'tri_overhead','ezbar','barbell','i',2.5,{ep:1,co:3,po:1},'EZ-Bar_Skullcrusher',
  ['Allongé, barre au-dessus du front, bras tendus.','Fléchis les coudes, descends la barre vers le front.','Coudes fixes et serrés.'],{start:20});
X('tri_corde','Extension triceps poulie haute, corde','triceps',[],'tri_push','cable','cable','i',2.5,{co:2,po:1},'Triceps_Pushdown_-_Rope_Attachment',
  ['Face à la poulie haute, coudes collés au corps.','Tends les bras vers le bas, écarte la corde en bas.','Remonte jusqu\'à la poitrine.'],{start:20});
X('tri_barre','Extension triceps poulie haute, barre','triceps',[],'tri_push','cable','cable','i',2.5,{co:2,po:2},'Triceps_Pushdown',
  ['Face à la poulie haute, barre en mains.','Pousse vers le bas jusqu\'aux bras tendus.','Coudes immobiles.'],{start:25});
X('tri_machine','Extension triceps machine','triceps',[],'tri_push','trimachine','machine','i',5,{co:2,po:1},'Machine_Triceps_Extension',
  ['Bras sur l\'appui, poignées en mains.','Tends les bras.','Reviens lentement, coudes fixes.'],{start:20});
X('dips_machine','Dips machine','triceps',['pecs','epaules'],'tri_push','dipmachine','machine','c',5,{ep:2,co:2,po:1},'Dip_Machine',
  ['Assis, mains sur les poignées, coudes vers l\'arrière.','Pousse vers le bas jusqu\'aux bras tendus.','Remonte en contrôlant.'],{start:40});
X('dips','Dips aux barres parallèles','triceps',['pecs','epaules'],'tri_push','dipbars','body','c',2.5,{ep:3,co:2,po:2},'Dips_-_Triceps_Version',
  ['En appui bras tendus sur les barres.','Descends jusqu\'aux bras à 90°.','Buste droit pour cibler les triceps.'],{bw:1});
X('kickback','Kickback triceps haltère','triceps',[],'tri_push','dumbbell','dumbbell','i',1,{ep:1,co:1,do:1},'Tricep_Dumbbell_Kickback',
  ['Buste penché, coude collé au buste, bras fléchi.','Tends le bras vers l\'arrière.','Seul l\'avant-bras bouge.'],{per:1,start:6});

// ---------- Quadriceps
X('presse','Presse à cuisses','quads',['fessiers'],'squat','legpress','machine','c',10,{ge:2,ha:1,do:1,ch:1},'Leg_Press',
  ['Pieds largeur d\'épaules, au milieu du plateau.','Descends jusqu\'à 90° ou plus, sans décoller le bassin.','Pousse sans verrouiller les genoux.'],{start:80});
X('hack','Hack squat machine','quads',['fessiers'],'squat','hack','machine','c',10,{ge:3,ha:1,do:1,ch:2},'Hack_Squat',
  ['Dos et épaules contre les appuis.','Descends aussi bas que possible, talons au sol.','Genoux dans l\'axe des pieds.'],{start:40});
X('squat_barre','Squat barre','quads',['fessiers'],'squat','squatrack','barbell','c',2.5,{ge:2,ha:2,do:3,ch:2,ep:1,po:1},'Barbell_Squat',
  ['Barre sur les trapèzes, pieds largeur d\'épaules.','Descends hanches en arrière, cuisses au moins parallèles.','Dos gainé, genoux dans l\'axe des pieds.'],{start:50});
X('squat_smith','Squat barre guidée','quads',['fessiers'],'squat','smith','smith','c',5,{ge:2,ha:1,do:2,ch:1},'Smith_Machine_Squat',
  ['Barre guidée sur les trapèzes, pieds un peu en avant.','Descends cuisses parallèles au sol.','Pousse dans les talons.'],{start:40});
X('fente_bulgare','Fente bulgare haltères','quads',['fessiers'],'squat','dumbbell','dumbbell','c',2,{ge:2,ha:2,do:1,ch:2},'Split_Squat_with_Dumbbells',
  ['Pied arrière sur un banc, haltères en mains.','Descends le genou arrière vers le sol.','Buste droit, poids sur le pied avant.'],{per:1,start:10});
X('squat_halt','Squat gobelet haltère','quads',['fessiers'],'squat','dumbbell','dumbbell','c',2,{ge:2,ha:1,do:1,ch:2},'Goblet_Squat',
  ['Un haltère tenu contre la poitrine.','Descends entre tes jambes, coudes à l\'intérieur des genoux.','Dos droit, talons au sol.'],{start:16});
X('fentes','Fentes haltères','quads',['fessiers'],'squat','dumbbell','dumbbell','c',2,{ge:2,ha:1,do:1,ch:2},'Dumbbell_Lunges',
  ['Debout, haltères le long du corps.','Fais un grand pas en avant, descends, repousse.','Genou avant au-dessus du pied.'],{per:1,start:10});
X('squat_banc','Squat haltères jusqu\'au banc','quads',['fessiers'],'squat','dumbbell','dumbbell','c',2,{ge:1,ha:1,do:1,ch:1},'Dumbbell_Squat_To_A_Bench',
  ['Dos à un banc, haltères en mains.','Descends jusqu\'à effleurer le banc, remonte.','Amplitude réduite : plus doux pour les genoux.'],{per:1,start:10});
X('leg_ext','Leg extension','quads',[],'quad_iso','legext','machine','i',5,{ge:2},'Leg_Extensions',
  ['Dossier réglé, genoux dans l\'axe de la machine.','Tends les jambes, serre une seconde.','Redescends en 2 à 3 secondes.'],{start:30});
X('fente_arriere','Fentes arrière haltères','quads',['fessiers'],'quad_iso','dumbbell','dumbbell','c',2,{ge:1,ha:1,do:1,ch:1},'Dumbbell_Rear_Lunge',
  ['Debout, haltères le long du corps.','Recule une jambe, descends, reviens.','Le pas en arrière soulage le genou.'],{per:1,start:8});

// ---------- Ischio-jambiers et fessiers
X('sdt_roumain','Soulevé de terre roumain','ischios',[],'hinge','barbell','barbell','c',2.5,{do:2,ha:2,po:1},'Romanian_Deadlift',
  ['Debout, barre contre les cuisses, genoux à peine fléchis.','Recule les hanches, la barre glisse le long des jambes.','Dos plat, descends jusqu\'à l\'étirement des ischios.'],{full:['fessiers'],start:40});
X('sdt_halt','Soulevé de terre jambes tendues, haltères','ischios',[],'hinge','dumbbell','dumbbell','c',2,{do:2,ha:2,po:1},'Stiff-Legged_Dumbbell_Deadlift',
  ['Haltères devant les cuisses.','Recule les hanches, descends le long des jambes.','Dos plat, remonte en serrant les fessiers.'],{full:['fessiers'],per:1,start:14});
X('ext_lombaires','Extension au banc à 45°','ischios',[],'hinge','hyper','body','c',2.5,{do:2,ha:1},'Hyperextensions_Back_Extensions',
  ['Hanches sur le coussin, chevilles calées.','Descends le buste, remonte jusqu\'à l\'alignement.','Ne dépasse pas la ligne du corps.'],{full:['fessiers'],bw:1});
X('pull_through','Tirage poulie entre les jambes','ischios',[],'hinge','cable','cable','c',2.5,{do:1,ha:1},'Pull_Through',
  ['Dos à la poulie basse, corde entre les jambes.','Recule les hanches puis redresse-toi.','Le mouvement vient des hanches, pas des bras.'],{full:['fessiers'],start:25});
X('hip_thrust','Hip thrust barre','fessiers',['ischios'],'glute','barbell','barbell','c',5,{do:1,ha:1},'Barbell_Hip_Thrust',
  ['Haut du dos sur un banc, barre sur les hanches.','Monte le bassin jusqu\'à l\'alignement.','Serre les fessiers en haut, menton rentré.'],{start:40});
X('kick_poulie','Kickback fessier à la poulie','fessiers',[],'glute','cable','cable','i',2.5,{do:1,ha:1},'One-Legged_Cable_Kickback',
  ['Sangle à la cheville, face à la poulie basse.','Pousse la jambe vers l\'arrière.','Ne cambre pas le dos.'],{per:1,start:10});
X('abducteurs','Abducteurs machine','fessiers',[],'glute','abductor','machine','i',5,{ha:1},'Thigh_Abductor',
  ['Assis, coussins à l\'extérieur des genoux.','Écarte les jambes.','Reviens lentement.'],{start:30});
X('leg_curl_assis','Leg curl assis','ischios',[],'ham_curl','legcurlseated','machine','i',5,{ge:1},'Seated_Leg_Curl',
  ['Dossier réglé, coussin au-dessus des talons.','Ramène les talons sous le siège.','Remonte lentement jusqu\'aux jambes tendues.'],{start:30});
X('leg_curl_allonge','Leg curl allongé','ischios',[],'ham_curl','legcurllying','machine','i',5,{ge:1,do:1},'Lying_Leg_Curls',
  ['À plat ventre, coussin au-dessus des talons.','Ramène les talons vers les fessiers.','Hanches collées au banc.'],{start:25});
X('leg_curl_debout','Leg curl debout','ischios',[],'ham_curl','legcurlstanding','machine','i',2.5,{ge:1},'Standing_Leg_Curl',
  ['Debout, une jambe calée.','Ramène le talon vers la fesse.','Contrôle la descente.'],{per:1,start:10});

// ---------- Mollets
X('mollets_debout','Mollets debout machine','mollets',[],'calf','calfstanding','machine','i',5,{ch:2,do:1},'Standing_Calf_Raises',
  ['Épaules sous les coussins, avant des pieds sur la marche.','Monte sur la pointe des pieds.','Descends les talons le plus bas possible.'],{start:40});
X('mollets_presse','Mollets à la presse','mollets',[],'calf','legpress','machine','i',10,{ch:2},'Calf_Press_On_The_Leg_Press_Machine',
  ['Avant des pieds en bas du plateau.','Pousse avec les pointes de pieds.','Laisse les talons revenir loin : étirement complet.'],{start:60});
X('mollets_assis','Mollets assis machine','mollets',[],'calf','calfseated','machine','i',5,{ch:2},'Seated_Calf_Raise',
  ['Assis, coussins sur les genoux.','Monte les talons.','Descends lentement jusqu\'à l\'étirement.'],{start:20});
X('mollets_smith','Mollets debout barre guidée','mollets',[],'calf','smith','smith','i',5,{ch:2,do:1},'Smith_Machine_Calf_Raise',
  ['Barre guidée sur les trapèzes, pointes sur une cale.','Monte sur les pointes.','Étirement complet en bas.'],{start:40});
X('mollets_halt','Mollets debout sur une jambe, haltère','mollets',[],'calf','dumbbell','dumbbell','i',2,{ch:2},'Standing_Dumbbell_Calf_Raise',
  ['Un pied sur une marche, haltère dans la main du même côté.','Monte sur la pointe.','Descends le talon sous la marche.'],{start:10});

// ---------- Abdominaux
X('crunch_poulie','Crunch à la poulie haute','abdos',[],'abs','cable','cable','i',2.5,{do:2,nu:1},'Cable_Crunch',
  ['À genoux face à la poulie haute, corde près des tempes.','Enroule le buste vers les genoux.','Les hanches ne bougent pas.'],{start:25});
X('crunch_machine','Crunch machine','abdos',[],'abs','abmachine','machine','i',5,{do:2,nu:1},'Ab_Crunch_Machine',
  ['Assis, pieds calés, poignées en mains.','Enroule le buste vers l\'avant.','Reviens lentement.'],{start:25});
X('releve_genoux','Relevé de genoux à la chaise romaine','abdos',[],'abs','captain','body','i',2.5,{do:1,ep:1,ha:2},'Knee_Hip_Raise_On_Parallel_Bars',
  ['Avant-bras sur les appuis, dos contre le dossier.','Monte les genoux vers la poitrine.','Enroule le bassin en haut.'],{bw:1,noload:1});
X('releve_jambes','Relevé de jambes suspendu','abdos',[],'abs','pullupbar','body','i',2.5,{do:1,ep:2,ha:2,po:1},'Hanging_Leg_Raise',
  ['Suspendu à la barre, bras tendus.','Monte les jambes à l\'horizontale.','Sans balancer.'],{bw:1,noload:1});
X('crunch_sol','Crunch au sol','abdos',[],'abs','body','body','i',2.5,{do:1,nu:2},'Crunches',
  ['Allongé, genoux fléchis, mains aux tempes.','Décolle les épaules en enroulant le buste.','Ne tire pas sur la nuque.'],{bw:1,noload:1});
X('dead_bug','Dead bug','abdos',[],'abs','body','body','i',2.5,{ep:1,ha:1},'Dead_Bug',
  ['Sur le dos, bras au plafond, genoux à 90°.','Tends un bras et la jambe opposée, alterne.','Bas du dos plaqué au sol.'],{bw:1,noload:1});

const EXI = {}; EX.forEach(function(e){ EXI[e.id] = e; });

/* Créneaux : le premier exercice disponible de la liste est proposé par défaut */
const SLOTS = {
  press_h:['dc_halt','chest_press','dc_barre','dc_smith','pompes'],
  press_incline:['di_halt','di_machine','di_smith','di_barre'],
  fly:['pecdeck','ecarte_poulie','ecarte_poulie_basse','ecarte_halt'],
  pull_v:['tirage_large','tirage_neutre','tractions','tirage_supi'],
  row:['rowing_poulie','rowing_machine','rowing_halt','rowing_tbar','rowing_incline','rowing_barre'],
  lat_iso:['pullover_poulie','pullover_halt'],
  press_v:['de_halt','de_machine','de_neutre','de_smith','de_barre'],
  lateral:['lat_halt','lat_poulie','lat_scaption','lat_incline'],
  rear_delt:['rear_machine','face_pull','oiseau_poulie','oiseau_halt'],
  curl:['curl_incline','curl_ez','curl_poulie','curl_pupitre_machine','curl_pupitre','curl_halt'],
  hammer:['curl_marteau','curl_marteau_corde','curl_inverse'],
  tri_overhead:['tri_corde_haut','tri_halt_haut','barre_front'],
  tri_push:['tri_corde','tri_barre','tri_machine','dips_machine','dips','kickback'],
  squat:['presse','hack','squat_barre','squat_smith','fente_bulgare','squat_halt','fentes','squat_banc'],
  quad_iso:['leg_ext','fente_arriere'],
  hinge:['sdt_roumain','sdt_halt','ext_lombaires','pull_through'],
  glute:['hip_thrust','kick_poulie','abducteurs'],
  ham_curl:['leg_curl_assis','leg_curl_allonge','leg_curl_debout'],
  calf:['mollets_debout','mollets_presse','mollets_assis','mollets_smith','mollets_halt'],
  abs:['crunch_poulie','crunch_machine','releve_genoux','releve_jambes','crunch_sol','dead_bug']
};
/* Créneaux voisins : même muscle, autre mouvement. Servent quand rien ne convient dans le créneau. */
const FALLBACK = {
  press_h:['press_incline','fly'], press_incline:['press_h','fly'], fly:['press_incline','press_h'],
  pull_v:['row','lat_iso'], row:['pull_v','lat_iso'], lat_iso:['pull_v','row'],
  press_v:['lateral'], lateral:['press_v'], rear_delt:[],
  curl:['hammer'], hammer:['curl'], tri_overhead:['tri_push'], tri_push:['tri_overhead'],
  squat:['quad_iso'], quad_iso:['squat'], hinge:['ham_curl','glute'], glute:['hinge'], ham_curl:['hinge'],
  calf:[], abs:[]
};

/* Séances types. reps = fourchette de répétitions. pref = exercice préféré pour varier entre A et B. */
const TPL = {
  UA:{n:'Haut du corps A', items:[
    {slot:'press_h',sets:3,reps:[6,10]},{slot:'row',sets:3,reps:[8,12]},{slot:'press_incline',sets:3,reps:[8,12]},
    {slot:'pull_v',sets:3,reps:[8,12]},{slot:'lateral',sets:3,reps:[12,20]},{slot:'tri_overhead',sets:3,reps:[10,15]},
    {slot:'curl',sets:3,reps:[10,15]}]},
  LA:{n:'Bas du corps A', items:[
    {slot:'squat',sets:3,reps:[6,10]},{slot:'hinge',sets:3,reps:[8,12]},{slot:'quad_iso',sets:3,reps:[10,15]},
    {slot:'ham_curl',sets:3,reps:[10,15]},{slot:'calf',sets:4,reps:[8,15]},{slot:'abs',sets:3,reps:[10,15]}]},
  UB:{n:'Haut du corps B', items:[
    {slot:'pull_v',sets:3,reps:[8,12],pref:'tirage_neutre'},{slot:'press_incline',sets:3,reps:[8,12],pref:'di_machine'},
    {slot:'row',sets:3,reps:[10,15],pref:'rowing_machine'},{slot:'fly',sets:3,reps:[10,15]},
    {slot:'rear_delt',sets:3,reps:[12,20]},{slot:'lateral',sets:3,reps:[12,20],pref:'lat_poulie'},
    {slot:'hammer',sets:3,reps:[10,15]},{slot:'tri_push',sets:3,reps:[10,15]}]},
  LB:{n:'Bas du corps B', items:[
    {slot:'ham_curl',sets:3,reps:[8,12]},{slot:'squat',sets:3,reps:[8,12],pref:'hack'},{slot:'glute',sets:3,reps:[8,12]},
    {slot:'quad_iso',sets:3,reps:[12,20]},{slot:'calf',sets:4,reps:[10,20],pref:'mollets_assis'},
    {slot:'abs',sets:3,reps:[10,15],pref:'releve_genoux'}]},
  PA:{n:'Poussée A', items:[
    {slot:'press_h',sets:3,reps:[6,10]},{slot:'press_v',sets:3,reps:[8,12]},{slot:'fly',sets:3,reps:[10,15]},
    {slot:'lateral',sets:4,reps:[12,20]},{slot:'tri_overhead',sets:3,reps:[10,15]},{slot:'tri_push',sets:2,reps:[10,15]}]},
  TA:{n:'Tirage A', items:[
    {slot:'pull_v',sets:3,reps:[8,12]},{slot:'row',sets:3,reps:[8,12]},{slot:'lat_iso',sets:3,reps:[12,15]},
    {slot:'rear_delt',sets:3,reps:[12,20]},{slot:'curl',sets:3,reps:[10,15]},{slot:'hammer',sets:3,reps:[10,15]}]},
  PB:{n:'Poussée B', items:[
    {slot:'press_incline',sets:3,reps:[8,12]},{slot:'press_v',sets:3,reps:[10,15],pref:'de_machine'},
    {slot:'press_h',sets:3,reps:[10,15],pref:'chest_press'},{slot:'lateral',sets:4,reps:[12,20],pref:'lat_poulie'},
    {slot:'tri_push',sets:3,reps:[10,15]},{slot:'tri_overhead',sets:2,reps:[10,15]}]},
  TB:{n:'Tirage B', items:[
    {slot:'row',sets:3,reps:[8,12],pref:'rowing_machine'},{slot:'pull_v',sets:3,reps:[10,15],pref:'tirage_neutre'},
    {slot:'row',sets:3,reps:[10,15],pref:'rowing_halt'},{slot:'rear_delt',sets:3,reps:[12,20],pref:'face_pull'},
    {slot:'hammer',sets:3,reps:[10,15]},{slot:'curl',sets:3,reps:[10,15],pref:'curl_poulie'}]},
  FA:{n:'Corps entier A', items:[
    {slot:'squat',sets:3,reps:[6,10]},{slot:'press_h',sets:3,reps:[6,10]},{slot:'row',sets:3,reps:[8,12]},
    {slot:'ham_curl',sets:3,reps:[10,15]},{slot:'lateral',sets:3,reps:[12,20]},{slot:'tri_overhead',sets:2,reps:[10,15]},
    {slot:'curl',sets:2,reps:[10,15]}]},
  FB:{n:'Corps entier B', items:[
    {slot:'hinge',sets:3,reps:[8,12]},{slot:'press_incline',sets:3,reps:[8,12]},{slot:'pull_v',sets:3,reps:[8,12]},
    {slot:'quad_iso',sets:3,reps:[10,15]},{slot:'rear_delt',sets:3,reps:[12,20]},{slot:'calf',sets:3,reps:[8,15]},
    {slot:'abs',sets:3,reps:[10,15]}]},
  FC:{n:'Corps entier C', items:[
    {slot:'squat',sets:3,reps:[8,12],pref:'hack'},{slot:'pull_v',sets:3,reps:[8,12],pref:'tirage_neutre'},
    {slot:'press_v',sets:3,reps:[8,12]},{slot:'ham_curl',sets:3,reps:[10,15]},{slot:'fly',sets:3,reps:[10,15]},
    {slot:'hammer',sets:2,reps:[10,15]},{slot:'tri_push',sets:2,reps:[10,15]},{slot:'calf',sets:3,reps:[10,20],pref:'mollets_assis'}]}
};
const CYCLES = {2:['FA','FB'], 3:['FA','FB','FC'], 4:['UA','LA','UB','LB'], 5:['UA','LA','PA','TA','LB'], 6:['PA','TA','LA','PB','TB','LB']};

/* Conseils dits pendant le repos */
const TIPS_REST = [
  'Garde une à deux répétitions en réserve. Les séries proches de l\'échec construisent plus de muscle.',
  'Prends ton repos en entier. Plus d\'une minute entre les séries donne un peu plus de muscle.',
  'Une répétition de plus que la dernière fois, c\'est déjà un progrès.',
  'Cherche l\'étirement complet du muscle en bas du mouvement.',
  'Le volume compte. Vise au moins dix séries par muscle et par semaine.',
  'Monter les répétitions ou monter la charge : les deux font grossir le muscle.',
  'Contrôle la descente, deux à trois secondes. Remonte fort.',
  'La régularité compte plus que le programme parfait.',
  'Côté assiette : environ un virgule six gramme de protéines par kilo de poids de corps, chaque jour.',
  'Machine ou poids libres : le muscle grossit autant. Choisis ce qui est libre et confortable.'
];
/* Rappels dits pendant la série */
const TIPS_SET = [
  'Contrôle la descente.',
  'Amplitude complète.',
  'Respire. Souffle en poussant.',
  'Reste gainé.',
  'Les dernières répétitions comptent le plus.'
];

/* Principes scientifiques affichés dans l'onglet Science */
const SCIENCE = [
  {t:'Volume', k:'Au moins 10 séries par muscle et par semaine',
   d:'Plus de séries par semaine donne plus de muscle, avec des gains qui ralentissent quand le volume monte. Une série où le muscle ne fait qu\'aider compte pour une demi-série.',
   app:'Le programme vise 10 à 16 séries par muscle. L\'accueil affiche ton compteur de la semaine.',
   src:[['Pelland et al., 2026, Sports Medicine (67 études)','https://sponet.de/sponet/Record/4097139'],
        ['ACSM, prise de position 2026','https://acsm.org/resistance-training-guidelines-update-2026/'],
        ['Schoenfeld, Ogborn & Krieger, 2017','https://www.pubmed.gov/27433992/']]},
  {t:'Effort', k:'Finis tes séries à 0–2 répétitions de l\'échec',
   d:'Plus une série se termine près de l\'échec, plus le muscle grossit. Aller jusqu\'à l\'échec complet n\'apporte pas d\'avantage net.',
   app:'Tu indiques tes répétitions en réserve après chaque série. Le coach te le signale si tu gardes trop de marge.',
   src:[['Robinson et al., 2024, Sports Medicine','https://doi.org/10.1007/s40279-024-02069-2'],
        ['Refalo et al., 2023, Sports Medicine','https://openrepository.aut.ac.nz/items/78679612-6ff4-4d00-95d1-7920d072a760/full']]},
  {t:'Progression', k:'Ajoute des répétitions, puis de la charge',
   d:'Progresser en répétitions ou en charge donne la même hypertrophie sur 8 semaines chez des pratiquants entraînés.',
   app:'Double progression : tu gardes la charge jusqu\'à atteindre le haut de la fourchette sur toutes les séries, puis la charge monte d\'un cran.',
   src:[['Plotkin et al., 2022, PeerJ','https://peerj.com/articles/14142']]},
  {t:'Charge', k:'De 5 à 30 répétitions, le muscle grossit autant',
   d:'L\'hypertrophie est comparable sur une large plage de charges, à condition de finir les séries près de l\'échec.',
   app:'6–10 répétitions sur les gros exercices, 10–20 sur les exercices d\'isolation. En cas de douleur : charge plus légère et 15–20 répétitions.',
   src:[['Schoenfeld et al., 2021, Sports','https://pmc.ncbi.nlm.nih.gov/articles/PMC7927075/']]},
  {t:'Repos', k:'Plus de 60 secondes entre les séries',
   d:'Les repos de plus de 60 secondes donnent un léger avantage pour l\'hypertrophie.',
   app:'Minuteur réglé sur 2 min 30 pour les exercices polyarticulaires et 1 min 30 pour l\'isolation. Tu peux le changer.',
   src:[['Singer et al., 2024, Frontiers in Sports and Active Living','https://doi.org/10.3389/fspor.2024.1429789']]},
  {t:'Amplitude', k:'Travaille le muscle en position étirée',
   d:'Le travail à grande longueur musculaire donne autant ou plus de muscle. Le leg curl assis fait plus grossir les ischios que le leg curl allongé (+14 % contre +9 %).',
   app:'Le programme choisit d\'abord le leg curl assis, le curl incliné et l\'extension triceps au-dessus de la tête. Le coach rappelle l\'étirement.',
   src:[['Wolf et al., 2023, Int. J. Strength and Conditioning','https://doaj.org/article/99e86b317bec40f5abc2f0008358737e'],
        ['Maeo et al., 2021, Med. Sci. Sports Exerc.','https://pubmed.ncbi.nlm.nih.gov/33009197/'],
        ['Korakakis et al., 2024, revue narrative','https://pmc.ncbi.nlm.nih.gov/articles/PMC10801605/']]},
  {t:'Tempo', k:'Une répétition dure entre 2 et 8 secondes',
   d:'L\'hypertrophie est similaire pour des répétitions de 0,5 à 8 secondes. Les répétitions très lentes (plus de 10 secondes) font moins bien.',
   app:'Le coach demande une descente contrôlée de 2 à 3 secondes, sans ralentir à l\'excès.',
   src:[['Schoenfeld, Ogborn & Krieger, 2015, Sports Medicine','https://pubmed.ncbi.nlm.nih.gov/25601394/']]},
  {t:'Fréquence', k:'Chaque muscle au moins 2 fois par semaine',
   d:'À volume égal, la fréquence change peu le résultat. Elle sert surtout à répartir les séries sur la semaine.',
   app:'La rotation des séances répartit le volume. Si tu changes le nombre de séances, le découpage s\'adapte.',
   src:[['Pelland et al., 2026','https://sponet.de/sponet/Record/4097139'],
        ['Saric et al., 2019, J. Strength Cond. Res.','https://pubmed.ncbi.nlm.nih.gov/30363041/']]},
  {t:'Matériel', k:'Machines et poids libres font grossir autant',
   d:'Aucune différence d\'hypertrophie n\'apparaît entre machines et poids libres.',
   app:'Quand une machine manque ou est occupée, le remplacement ne te fait rien perdre.',
   src:[['Haugen et al., 2023, BMC Sports Sci. Med. Rehabil.','https://doaj.org/article/a7282dba5e674176bde2a8239832d2f7']]},
  {t:'Semaine allégée', k:'Pas de semaine de pause imposée',
   d:'Une semaine d\'arrêt au milieu de 9 semaines n\'a rien changé à l\'hypertrophie et a un peu freiné la force.',
   app:'Le coach propose d\'alléger seulement si tes performances baissent.',
   src:[['Coleman et al., 2024, PeerJ','https://pubmed.ncbi.nlm.nih.gov/38274324/']]},
  {t:'Douleur', k:'Adapter plutôt qu\'arrêter',
   d:'Modèle de surveillance de la douleur : jusqu\'à 2 sur 10, sans risque. Jusqu\'à 5 sur 10, acceptable si la douleur est retombée le lendemain matin. Au-delà de 5, risque élevé.',
   app:'Tu signales la zone. Le coach remplace les exercices qui la chargent, ou allège la charge de 30 % avec 15–20 répétitions lentes. Une douleur vive ou qui dure demande un avis médical.',
   src:[['Smith et al., 2017, Br. J. Sports Med.','https://bjsm.bmj.com/content/51/23/1679.full'],
        ['Modèle de surveillance de la douleur (Thomeé, 1997)','https://www.physiotutors.com/?p=8188']]},
  {t:'Alimentation', k:'Protéines : environ 1,6 g par kilo et par jour',
   d:'Au-delà de 1,6 g/kg/jour, plus de protéines n\'ajoute pas de masse maigre. Chez des pratiquants entraînés, un gros surplus calorique a surtout ajouté du gras. La créatine a un effet réel mais petit.',
   app:'Le rapport de fin de séance rappelle ta cible de protéines si tu as saisi ton poids.',
   src:[['Morton et al., 2018, Br. J. Sports Med.','https://pubmed.ncbi.nlm.nih.gov/28698222/'],
        ['Helms et al., 2023, Sports Medicine - Open','https://doi.org/10.1186/s40798-023-00651-y'],
        ['Burke et al., 2023, Nutrients','https://pubmed.ncbi.nlm.nih.gov/37432300/']]}
];
