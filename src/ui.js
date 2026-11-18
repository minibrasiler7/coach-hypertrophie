/* ===== Interface ===== */
var LS_KEY='coach-hypertrophie-v1';
var S=null, view='home';
var ui={sheet:null, painDraft:null, keep:true, edit:null, histEx:null, reportId:null, toastT:null, sync:'local', storeOk:true, msg:'', confirm:null, stepW:2.5, textOut:''};

function now(){ return Date.now(); }
function $(id){ return document.getElementById(id); }
function h(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function plural(n, w){ return n+' '+w+(n>1?'s':''); }
function fmtDur(sec){ sec=Math.max(0,Math.round(sec)); var m=Math.floor(sec/60), s=sec%60; return m+':'+(s<10?'0':'')+s; }
function fmtDate(ts, long){ return new Date(ts).toLocaleDateString('fr-CH', long?{weekday:'long',day:'numeric',month:'long'}:{weekday:'short',day:'numeric',month:'short'}); }
function fmtTime(ts){ return new Date(ts).toLocaleTimeString('fr-CH',{hour:'2-digit',minute:'2-digit'}); }
function fmtRest(sec){ var m=Math.floor(sec/60), s=sec%60; return (m?m+' min':'')+(s?(m?' ':'')+s+(m?'':' s'):''); }
function parseNum(v){ var x=parseFloat(String(v).replace(',','.')); return isNaN(x)?null:x; }
function unitOf(ex){ return ex.bw ? 'lest ajouté, en kg' : ex.per ? (ex.eq==='dumbbell'?'par haltère':'par côté') : ''; }
function loadTxt(ex, w){ return ex.bw ? (w>0 ? 'PC + '+fmtKg(w)+' kg' : 'Poids du corps') : fmtKg(w)+' kg'; }
function fmtSets(x){ return fmtKg(Math.round(x*2)/2); }
var ZONE_ART={ep:'l’épaule', co:'le coude', po:'le poignet', nu:'la nuque', do:'le bas du dos', ha:'la hanche', ge:'le genou', ch:'la cheville et le pied'};
function zonesTxt(a){ return a.map(function(z){return ZONE_ART[z];}).join(', '); }

/* ---------- Sauvegarde sur l'appareil ---------- */
function loadLocal(){
  try{ var t=localStorage.getItem(LS_KEY); if(t){ var o=JSON.parse(t); if(o && o.v===1) return o; } }
  catch(e){ ui.storeOk=false; }
  return null;
}
function saveLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(S)); ui.storeOk=true; }catch(e){ ui.storeOk=false; } }
function normalize(o){
  var d=defaultState(), s=Object.assign(d, o||{});
  s.profile=Object.assign(defaultState().profile, (o&&o.profile)||{});
  s.settings=Object.assign(defaultState().settings, (o&&o.settings)||{});
  ['unavail','pain','prefs','incs','deleted'].forEach(function(k){ if(!s[k] || typeof s[k]!=='object') s[k]={}; });
  if(!Array.isArray(s.sessions)) s.sessions=[];
  if(!CYCLES[s.profile.days]) s.profile.days=4;
  if(s.cur && (!s.cur.items || !TPL[s.cur.tplId])) s.cur=null;
  return s;
}
function save(what, arg){ S.updatedAt=now(); saveLocal(); Sync.push(what, arg); }

/* ---------- Sauvegarde dans le compte (si disponible) ---------- */
function withTimeout(p, ms){ return new Promise(function(res, rej){ var t=setTimeout(function(){ rej(new Error('timeout')); }, ms); p.then(function(v){ clearTimeout(t); res(v); }, function(e){ clearTimeout(t); rej(e); }); }); }
function metaDoc(){ var o=clone(S); delete o.sessions; return o; }
var Sync={col:null, ready:false, timer:null, busy:{}, dirty:{},
  init:function(){
    var self=this, c;
    try{ c=window.claude; if(!c || typeof c.use!=='function') return; }catch(e){ return; }
    Promise.all([c.use('db'), c.use('user')]).then(function(r){
      var db=r[0], user=r[1]; if(!db || !user) return null;
      return Promise.resolve(user.id()).then(function(uid){
        if(!uid) return null;
        self.col=db.collection('data/users/'+uid);
        return withTimeout(self.col.limit(1000).get(), 12000);
      });
    }).then(function(snap){
      if(!snap) return;
      self.ready=true; ui.sync='cloud';
      self.merge(snap); saveLocal();
      if(!ui.sheet) render();
    }).catch(function(){ ui.sync='local'; });
  },
  merge:function(snap){
    var remoteMeta=null, remote={}, local={}, id, self=this;
    snap.docs.forEach(function(d){ var x=d.data(); if(!x) return; if(d.id==='meta') remoteMeta=x; else if(d.id.indexOf('s_')===0 && x.id) remote[x.id]=x; });
    S.sessions.forEach(function(s){ local[s.id]=s; });
    var deleted=Object.assign({}, (remoteMeta && remoteMeta.deleted)||{}, S.deleted||{});
    for(id in remote){ if(!local[id] && !deleted[id]) S.sessions.push(clone(remote[id])); }
    for(id in local){ if(!remote[id] && !deleted[id]) (function(se){ self.write('s_'+se.id, function(){ return se; }); })(local[id]); }
    for(id in deleted){ if(remote[id]) self.remove('s_'+id); }
    S.sessions=S.sessions.filter(function(s){ return !deleted[s.id]; }).sort(function(a,b){ return a.start-b.start; });
    S.deleted=deleted;
    if(remoteMeta && (remoteMeta.updatedAt||0)>(S.updatedAt||0)){
      var keepSessions=S.sessions, m=clone(remoteMeta);
      S=normalize(Object.assign(m, {sessions:keepSessions, deleted:deleted}));
      if(S.cur && view!=='workout') view='home';
      if(!S.cur && view==='workout') view='home';
    } else if((S.updatedAt||0)>0) this.metaSoon();
  },
  push:function(what, arg){
    if(!this.ready) return;
    if(what==='session' && arg) this.write('s_'+arg.id, function(){ return arg; });
    if(what==='delete' && arg) this.remove('s_'+arg);
    this.metaSoon();
  },
  metaSoon:function(){ var self=this; clearTimeout(this.timer); this.timer=setTimeout(function(){ self.write('meta', metaDoc); }, 1500); },
  write:function(id, fn){
    var self=this, data;
    if(!this.col) return;
    if(this.busy[id]){ this.dirty[id]=fn; return; }
    try{ data=clone(fn()); }catch(e){ return; }
    this.busy[id]=true;
    this.col.doc(id).set(data).then(function(){ ui.sync='cloud'; }, function(){ ui.sync='error'; }).then(function(){
      self.busy[id]=false;
      if(self.dirty[id]){ var f=self.dirty[id]; delete self.dirty[id]; self.write(id, f); }
    });
  },
  remove:function(id){ try{ if(this.col) this.col.doc(id).delete().catch(function(){}); }catch(e){} }
};

/* ---------- Voix du coach : phrases enregistrées, superposées à la musique ---------- */
var CACHE='coach-v2';
/* « ambient » : le son de la page se superpose à celui des autres applications au lieu de le couper.
   À régler avant de créer le contexte audio. Sur iPhone, ce mode suit le bouton silencieux. */
function applyAudio(){ try{ if(navigator.audioSession && navigator.audioSession.type!=='ambient') navigator.audioSession.type='ambient'; }catch(e){} }
function isIOS(){ try{ return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==='MacIntel' && navigator.maxTouchPoints>1); }catch(e){ return false; } }
function isInstalled(){ try{ return !!(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)); }catch(e){ return false; } }
function voiceOn(){ return !!S.settings.voice && (!!S.settings.force || !(isIOS() && !isInstalled())); }
var Snd={ctx:null, out:null, index:null, indexDir:null, indexP:null, packs:{}, bufs:{}, queue:[], src:null, gen:0, tail:null, log:[],
  supported:function(){ return !!(window.AudioContext || window.webkitAudioContext); },
  dir:function(){ return 'snd/'+(S.settings.vox==='m'?'m':'f')+'/'; },
  /* À appeler pendant un geste de l'utilisateur : le téléphone n'autorise le son qu'à ce moment-là. */
  unlock:function(){
    if(!voiceOn() || !this.supported()) return;
    try{
      applyAudio();
      if(!this.ctx){
        var C=window.AudioContext || window.webkitAudioContext, lim;
        this.ctx=new C(); this.out=this.ctx.createGain(); lim=this.ctx.createDynamicsCompressor();
        lim.threshold.value=-3; lim.knee.value=0; lim.ratio.value=20; lim.attack.value=0.002; lim.release.value=0.1;
        this.out.connect(lim); lim.connect(this.ctx.destination);
      }
      this.out.gain.value=S.settings.vol||1;
      if(this.ctx.state!=='running' && this.ctx.resume){ var p=this.ctx.resume(); if(p && p.catch) p.catch(function(){}); }
    }catch(e){}
  },
  reset:function(){ this.stop(); this.index=null; this.indexDir=null; this.indexP=null; this.packs={}; this.bufs={}; },
  loadIndex:function(){
    var self=this, d=this.dir();
    if(this.index && this.indexDir===d) return Promise.resolve(this.index);
    if(this.indexP && this.indexDir===d) return this.indexP;
    this.indexDir=d; this.index=null;
    this.indexP=fetch(d+'index.json').then(function(r){ if(!r.ok) throw new Error('index'); return r.json(); }).then(function(j){ if(self.indexDir===d) self.index=j; return j; });
    this.indexP.catch(function(){ if(self.indexDir===d) self.indexP=null; });
    return this.indexP;
  },
  loadPack:function(pack){
    var self=this, k=this.dir()+pack;
    if(this.packs[k]) return this.packs[k];
    var p=fetch(k+'.mp3').then(function(r){ if(!r.ok) throw new Error('paquet'); return r.arrayBuffer(); });
    p.catch(function(){ delete self.packs[k]; });
    return (this.packs[k]=p);
  },
  buffer:function(pack, clip){
    var self=this, k=this.dir()+pack+':'+clip;
    if(this.bufs[k]) return Promise.resolve(this.bufs[k]);
    return Promise.all([this.loadIndex(), this.loadPack(pack)]).then(function(r){
      var o=r[0][pack] && r[0][pack][clip];
      if(!o || !self.ctx) throw new Error('extrait');
      var part=r[1].slice(o[0], o[1]);
      return new Promise(function(res, rej){ var pr=self.ctx.decodeAudioData(part, res, rej); if(pr && pr.catch) pr.catch(function(){}); });
    }).then(function(b){ self.bufs[k]=b; return b; });
  },
  preload:function(packs){
    var self=this;
    if(!voiceOn() || !this.supported()) return;
    this.loadIndex().catch(function(){});
    packs.forEach(function(p){ self.loadPack(p).catch(function(){}); });
  },
  /* say([['coach','go1'],['presse','n']]) dit les extraits à la suite. Avec suite=true, attend la fin de la phrase en cours. */
  say:function(list, suite){
    var self=this;
    if(!list || !list.length) return;
    this.log.push(list.map(function(x){ return x[0]+':'+x[1]; }).join(' ')); if(this.log.length>80) this.log.shift();
    if(!voiceOn() || !this.ctx) return;
    if(!suite) this.stop();
    var gen=this.gen;
    this.tail=(this.tail || Promise.resolve()).then(function(){
      return Promise.all(list.map(function(x){ return self.buffer(x[0], x[1]).catch(function(){ return null; }); }));
    }).then(function(bufs){
      if(gen!==self.gen) return;
      bufs.forEach(function(b){ if(b) self.queue.push(b); });
      self.pump();
    }).catch(function(){});
  },
  pump:function(){
    var self=this, s;
    if(this.src || !this.queue.length || !this.ctx) return;
    try{
      if(this.ctx.state!=='running' && this.ctx.resume){ var p=this.ctx.resume(); if(p && p.catch) p.catch(function(){}); }
      s=this.ctx.createBufferSource(); s.buffer=this.queue.shift(); s.connect(this.out);
      var done=function(){ if(self.src===s){ self.src=null; self.pump(); } };
      s.onended=done; this.src=s; s.start();
      setTimeout(done, s.buffer.duration*1000+1500);          // garde-fou si le téléphone a suspendu le son
    }catch(e){ this.src=null; }
  },
  stop:function(){ this.gen++; this.queue=[]; var s=this.src; this.src=null; try{ if(s){ s.onended=null; s.stop(); } }catch(e){} }
};
var WL=null;
function wake(){ try{ if(navigator.wakeLock && navigator.wakeLock.request) navigator.wakeLock.request('screen').then(function(l){ WL=l; }, function(){}); }catch(e){} }
function unwake(){ try{ if(WL){ WL.release(); WL=null; } }catch(e){} }
function preload(cur){ cur.items.forEach(function(it){ try{ var im=new Image(); im.src='img/'+it.exId+'.jpg'; }catch(e){} }); }
function toast(msg, ms){
  var el=$('toast'); el.innerHTML='<div>'+h(msg)+'</div>'; el.className='on';
  clearTimeout(ui.toastT); ui.toastT=setTimeout(function(){ el.className=''; }, ms||4200);
}

/* ---------- Contexte de l'exercice en cours ---------- */
function ctxOf(){
  var cur=S.cur, it=curItem(cur), ex=EXI[it.exId];
  var rec=recommend(S, ex, it.tg, it.light, cur.start), adv=setAdvice(S, ex, rec, it.sets);
  var k=it.key+'#'+it.exId+'#'+it.sets.length+'#'+(it.light?1:0);
  if(!cur.input || cur.input.key!==k) cur.input={key:k, w:adv.w, r:adv.r, rir:null};
  ui.stepW=incOf(S, ex);
  var n=it.sets.length, goal=(rec.per[n] && adv.w===rec.w) ? rec.per[n] : null;
  return {cur:cur, it:it, ex:ex, rec:rec, adv:adv, goal:goal};
}
/* ---------- Coach : quoi dire et quand ----------
   Normalement : signal de reprise, un conseil sur l'exercice aux deux premières séries, un encouragement par série.
   Peu : signal de reprise, un conseil par exercice, un encouragement sur la dernière série. Jamais de chiffres : ils sont à l'écran. */
function pickLine(key){
  var n=COACH[key].length, i;
  if(n<2) return key+'0';
  S.lines=S.lines||{}; i=Math.floor(Math.random()*n);
  if(i===S.lines[key]) i=(i+1)%n;
  S.lines[key]=i; return key+i;
}
var Coach={
  quiet:function(){ return S.settings.talk==='peu'; },
  clear:function(){ var c=S.cur; if(c){ c.tipAt=null; c.encAt=null; c.tip=null; } },
  tipFor:function(c, n){
    if(c.it.light) return n===0 ? ['coach','light0'] : null;
    if(n===0) return [c.ex.id, (this.quiet() && exHistory(S,c.ex.id).length%2) ? 't2' : 't1'];
    if(n===1 && !this.quiet()) return [c.ex.id,'t2'];
    return null;
  },
  /* Nom de l'exercice, suivi du conseil si la série peut commencer tout de suite */
  intro:function(lead, withTip){
    if(!S.cur) return;
    var c=ctxOf(), n=c.it.sets.length, a=[], tip=withTip ? this.tipFor(c,n) : null;
    this.clear();
    if(lead) a.push(['coach',lead]);
    a.push([c.ex.id,'n']);
    if(tip){ a.push(tip); c.cur.tipKey=c.it.key+'#'+c.ex.id+'#'+n; }
    Snd.preload([c.ex.id]); Snd.say(a);
  },
  /* Fin du repos : signal, puis conseil et encouragement programmés pendant la série */
  go:function(manual){
    if(!S.cur) return;
    var c=ctxOf(), cur=c.cur, n=c.it.sets.length, t=now(), last=(c.it.tg.sets>1 && n===c.it.tg.sets-1);
    this.clear();
    if(!manual) Snd.say([['coach', pickLine(last?'last':'go')]]);
    var key=c.it.key+'#'+c.ex.id+'#'+n, tip=(cur.tipKey===key) ? null : this.tipFor(c,n);
    if(tip){ cur.tipKey=key; cur.tip=tip; cur.tipAt=t+(manual?1200:3800); }
    var reps=c.goal || Math.round((c.rec.lo+c.rec.hi)/2);
    if(!this.quiet() || last) cur.encAt=t+1000*Math.max(12, Math.min(30, reps*1.8))+(tip?2500:0);
  },
  /* Série validée : un mot si l'objectif est atteint, et le nom de l'exercice suivant */
  setDone:function(reached, nextEx, back){
    var a=[];
    this.clear();
    if(!this.quiet() && reached) a.push(['coach', pickLine('ok')]);
    if(nextEx){ Snd.preload([nextEx.id]); if(!this.quiet()){ a.push(['coach', back?'back0':'next0']); a.push([nextEx.id,'n']); } }
    if(a.length) Snd.say(a); else Snd.stop();
  },
  tick:function(t){
    var cur=S.cur;
    if(cur.tipAt && t>=cur.tipAt){ if(cur.tip && t-cur.tipAt<20000) Snd.say([cur.tip], true); cur.tipAt=null; cur.tip=null; }
    if(cur.encAt && t>=cur.encAt){ if(t-cur.encAt<20000) Snd.say([['coach', pickLine('enc')]], true); cur.encAt=null; }
  }
};
function itemNotes(cur, it){
  var plan=(it.planId && it.planId!==it.exId) ? EXI[it.planId] : null, a=[];
  if(it.swap==='pain' && plan) a.push('Remplace « '+plan.n+' » : plus doux pour '+(zonesTxt(painZonesFor(plan,cur.pain))||'la zone sensible')+'.');
  if(it.swap==='busy' && plan) a.push('Remplace « '+plan.n+' » pour aujourd’hui : machine occupée.');
  if(it.swap==='absent') a.push('Remplace un exercice absent de ta salle. Choix retenu pour les prochaines séances.');
  if(it.light) a.push('Version douce : charge réduite, 15 à 20 répétitions, descente en 3 secondes. Arrête si la douleur dépasse 5 sur 10.');
  return a;
}

/* ---------- Vues ---------- */
function vTabs(){
  var t=[['home','Séance'],['progress','Progrès'],['science','Science'],['settings','Réglages']], cur=(view==='report')?'progress':view;
  return '<nav class="tabs"><div>'+t.map(function(x){ return '<button data-act="tab" data-v="'+x[0]+'" class="'+(cur===x[0]?'on':'')+'">'+x[1]+'</button>'; }).join('')+'</div></nav>';
}
function volBlock(done, planned){
  var out='<div class="vol">', m;
  for(m in MUSCLES){
    var d=done[m]||0, p=planned[m]||0;
    out+='<span>'+MUSCLES[m]+'</span><div class="bar"><i class="'+(d>=10?'ok':'')+'" style="width:'+Math.min(100,d*5)+'%"></i><em></em></div><span class="v"><b>'+fmtSets(d)+'</b> / '+fmtSets(p)+'</span>';
  }
  return out+'</div>';
}
function vHome(){
  var t=now(), c=cycle(S), tplId=todayTpl(S), html='';
  html+='<header class="brand"><b>Coach Hypertrophie</b><span>'+h(cap(fmtDate(t,true)))+'</span></header>';
  if(S.cur){
    var ns=0; S.cur.items.forEach(function(it){ ns+=it.sets.length; });
    html+='<section class="card"><div class="eyebrow">Séance en cours</div><h1 class="title">'+h(S.cur.name)+'</h1>'
      +'<p class="muted">Commencée à '+fmtTime(S.cur.start)+' · '+plural(ns,'série')+' faite'+(ns>1?'s':'')+' · '+plural(remaining(S.cur),'exercice')+' à faire</p>'
      +'<button class="btn primary block" data-act="resume">Reprendre la séance</button></section>';
  } else {
    var pv=buildSession(S, tplId, t), act=pv.items.filter(function(it){ return it.state==='todo'; }), nsets=0, mus=[], zones=[], z;
    act.forEach(function(it){ nsets+=it.tg.sets; var m=MUSCLES[EXI[it.exId].m]; if(mus.indexOf(m)<0) mus.push(m); });
    for(z in S.pain) if(S.pain[z]>0) zones.push(ZONES[z]+(S.pain[z]>=2?' (douleur)':' (gêne)'));
    html+='<section class="card"><div class="eyebrow">Séance du jour · '+(c.indexOf(tplId)+1)+' sur '+c.length+' dans la rotation</div>'
      +'<h1 class="title">'+h(pv.name)+'</h1><p class="muted">'+mus.join(' · ')+'</p>'
      +'<p class="small muted num">'+plural(act.length,'exercice')+' · '+nsets+' séries · environ '+estMinutes(S,pv.items)+' min</p>'
      +(zones.length ? '<p class="note">Zones sensibles : '+h(zones.join(', '))+'. La séance est adaptée.</p>' : '')
      +'<button class="btn primary block" data-act="start">Commencer la séance</button><ul class="exlist">';
    pv.items.forEach(function(it){
      var ex=EXI[it.exId];
      if(it.state==='skip'){ html+='<li class="off"><span class="n">'+h(ex.n)+'</span><span class="d">'+(it.swap==='painskip'?'écarté : douleur':'indisponible')+'</span></li>'; return; }
      var rec=recommend(S, ex, it.tg, it.light, t);
      html+='<li><span class="n">'+h(ex.n)+(it.light?' <span class="pill warn">doux</span>':'')+'</span><span class="d">'+it.tg.sets+' × '+rec.lo+'–'+rec.hi+' · '+(rec.kind==='first' ? 'à régler' : loadTxt(ex,rec.w))+'</span></li>';
    });
    html+='</ul><div class="row wrap"><button class="link grow" data-act="pick">Faire une autre séance</button><button class="link" data-act="pain">Douleur ou gêne ?</button></div></section>';
  }
  var ws=weekStart(t), nweek=S.sessions.filter(function(s){ return s.start>=ws; }).length;
  html+='<section class="card"><div class="eyebrow">Cette semaine</div><h2 class="h2">'+plural(nweek,'séance')+' sur '+S.profile.days+' prévues</h2>'
    +volBlock(volumeWeek(S, t, S.cur?S.cur.items:null), plannedWeek(S))
    +'<p class="small muted">Séries par muscle depuis lundi : faites / prévues. Trait jaune : 10 séries, le repère hebdomadaire pour l’hypertrophie.</p></section>';
  var last=S.sessions[S.sessions.length-1];
  if(last){
    var rp=buildReport(S,last);
    html+='<section class="card"><div class="eyebrow">Dernière séance</div><button class="sess" data-act="report" data-id="'+h(last.id)+'"><span><b>'+h(last.name)+'</b><small>'+h(cap(fmtDate(last.start,true)))+' · '+rp.nSets+' séries · '+rp.ton+' kg</small></span><span class="pill '+(rp.up>rp.down?'good':rp.down>rp.up?'bad':'')+'">'+h(rp.verdict.replace('Séance ',''))+'</span></button></section>';
  }
  return html;
}

function vWorkout(){
  var c=ctxOf(), cur=c.cur, it=c.it, ex=c.ex, rec=c.rec, n=it.sets.length, html='', t=now();
  html+='<header class="wtop"><button class="btn sm" data-act="quit">Quitter</button><div class="mid"><b>'+h(cur.name)+'</b><span id="chrono">'+fmtDur((t-cur.start)/1000)+'</span></div><button class="btn sm" data-act="finish">Terminer</button></header>';
  html+='<div class="segs">'+cur.order.map(function(i){ var x=cur.items[i]; return '<i class="'+(x===it?'cur':x.state==='done'?'done':x.state==='skip'?'skip':'')+'"></i>'; }).join('')+'</div>';
  if(it.deferred===1 && !n){
    html+='<div class="banner"><div>On revient sur <b>'+h(ex.n)+'</b>. La machine est libre ?</div><div class="row"><button class="btn dark grow" data-act="ackfree">Oui, on y va</button><button class="btn grow" data-act="busy">Toujours occupée</button></div></div>';
  }
  html+='<button class="demo" id="demo" data-act="demo" aria-label="Démonstration de l’exercice : mettre en pause ou relancer"><span class="ph" style="background-image:url(\'img/'+ex.id+'.jpg\')"></span><span class="lbl">Départ ↔ arrivée</span></button>';
  html+='<div><h1 class="exname">'+h(ex.n)+'</h1><div class="chips" style="margin-top:8px"><span class="pill solid">'+MUSCLES[ex.m]+'</span><span class="pill">'+EQ[ex.eq]+'</span>'+(it.light?'<span class="pill warn">Version douce</span>':'')+'</div></div>';
  itemNotes(cur,it).forEach(function(x){ html+='<p class="note">'+h(x)+'</p>'; });

  var isFirst=(rec.kind==='first' && !n), goal=c.goal ? String(c.goal) : rec.lo+'–'+rec.hi;
  html+='<section class="plate"><div class="eyebrow">'+(isFirst?'Charge de départ':'Charge conseillée')+' · série '+(n+1)+' sur '+it.tg.sets+'</div>';
  if(ex.bw && !(c.adv.w>0)) html+='<div class="load txt">Poids du corps</div>';
  else html+='<div class="load num">'+(ex.bw?'+ ':'')+fmtKg(c.adv.w)+'<small>kg</small></div>';
  html+='<div class="unit">'+h(unitOf(ex))+'</div><div class="side"><b>'+goal+'</b><span>répétitions'+(c.goal?' visées':'')+'</span><span>'+(it.light?'sans forcer':'1–2 en réserve')+'</span></div></section>';
  var why=c.adv.note || rec.msg;
  if(n && !c.adv.note) why=(c.goal && rec.last && rec.last.R[n]!=null) ? 'Même charge. Sur cette série la dernière fois : '+rec.last.R[n]+' répétitions. Vise '+c.goal+'.'
                                  : 'Même charge. Reste entre '+rec.lo+' et '+rec.hi+' répétitions, avec 1 ou 2 en réserve.';
  html+='<p class="why">'+h(why)+'</p>';
  if(rec.plateau && !n) html+='<p class="note">Pas de progrès sur cet exercice depuis 3 séances. Termine chaque série à 1 ou 2 répétitions de l’échec et ajoute une série aujourd’hui.</p>';
  if(!n){ var wu=warmups(S, ex, c.adv.w); if(wu.length && !isFirst) html+='<p class="small muted">Montée en charge avant la première série : '+wu.map(function(x){ return fmtKg(x.w)+' kg × '+x.r; }).join(', puis ')+'.</p>'; }
  if(n) html+='<div class="chips">'+it.sets.map(function(s,i){ return '<button class="setchip" data-act="editset" data-i="'+i+'">S'+(i+1)+' · '+(ex.bw?(s.w>0?'+'+fmtKg(s.w)+' kg':'PC'):fmtKg(s.w)+' kg')+' × '+s.r+(s.rir!=null?' · R'+(s.rir>=3?'3+':s.rir):'')+'</button>'; }).join('')+'</div>';

  if(cur.rest){
    var left=Math.max(0,(cur.rest.end-t)/1000);
    html+='<section class="rest"><div class="eyebrow">Repos</div><div class="t" id="rest-time">'+fmtDur(Math.ceil(left))+'</div><div class="bar"><i id="rest-bar" style="width:'+Math.max(0,Math.min(100,100*(1-left/cur.rest.total)))+'%"></i></div>'
      +'<div class="row"><button class="btn grow" data-act="restadj" data-d="-15">− 15 s</button><button class="btn grow" data-act="restadj" data-d="15">+ 15 s</button></div>'
      +'<button class="btn primary block" data-act="restskip">Reprendre maintenant</button>'
      +'</section>';
  } else {
    html+='<div class="inputs"><div class="stp"><label for="in-w">'+(ex.bw?'Lest (kg)':'Charge (kg)')+'</label><div><button data-act="step" data-k="w" data-d="-1" aria-label="Moins de charge">−</button><input id="in-w" inputmode="decimal" autocomplete="off" value="'+fmtKg(cur.input.w)+'"><button data-act="step" data-k="w" data-d="1" aria-label="Plus de charge">+</button></div></div>'
      +'<div class="stp"><label for="in-r">Répétitions faites</label><div><button data-act="step" data-k="r" data-d="-1" aria-label="Moins de répétitions">−</button><input id="in-r" inputmode="numeric" autocomplete="off" value="'+cur.input.r+'"><button data-act="step" data-k="r" data-d="1" aria-label="Plus de répétitions">+</button></div></div></div>'
      +'<div class="field"><span>Répétitions encore possibles à la fin</span><div class="seg" id="rir">'+[0,1,2,3].map(function(v){ return '<button data-act="rir" data-v="'+v+'" class="'+(cur.input.rir===v?'on':'')+'">'+(v===3?'3 ou +':v)+'</button>'; }).join('')+'</div></div>'
      +'<button class="btn primary block" data-act="logset">Série terminée</button>'
      +'<button class="link small" data-act="stepsize">Pas de charge : '+fmtKg(ui.stepW)+' kg. Changer</button>';
  }
  html+='<section class="card"><div class="eyebrow">Comment faire</div><ol class="cues">'+ex.cues.map(function(x){ return '<li>'+h(x)+'</li>'; }).join('')+'</ol></section>';
  html+='<div class="acts">'
    +(n ? '' : '<button class="btn" data-act="busy">Machine occupée</button><button class="btn" data-act="absent">Pas dans ma salle</button>')
    +'<button class="btn" data-act="pain">J’ai mal</button><button class="btn" data-act="alt">Autre exercice</button>'
    +'<button class="btn" data-act="addset">+ 1 série</button><button class="btn" data-act="skip">'+(n?'Arrêter cet exercice':'Passer')+'</button></div>';
  var q=cur.order.filter(function(i,p){ return p!==cur.pos && cur.items[i].state==='todo'; });
  if(q.length){
    html+='<section class="card"><div class="eyebrow">Ensuite</div><ul class="queue">'+q.map(function(i){ var x=cur.items[i], e=EXI[x.exId]; return '<li><button data-act="jump" data-i="'+i+'"><span>'+h(e.n)+(x.deferred===1?' <span class="pill">en attente</span>':'')+'</span><span class="d num">'+(x.sets.length?x.sets.length+' / ':'')+x.tg.sets+' × '+(x.light?'15–20':x.tg.lo+'–'+x.tg.hi)+'</span></button></li>'; }).join('')+'</ul></section>';
  }
  html+='<button class="link small" data-act="voicetoggle">Voix du coach : '+(S.settings.voice?(!Snd.supported()?'indisponible sur cet appareil':voiceOn()?'activée':'muette ici'):'coupée')+'. Changer</button>';
  return html;
}

function vReport(){
  var se=null; S.sessions.forEach(function(s){ if(s.id===ui.reportId) se=s; });
  if(!se){ view='progress'; return vProgress(); }
  var rep=buildReport(S,se), isLast=S.sessions[S.sessions.length-1]===se, html='';
  html+='<header class="brand"><b>Rapport de séance</b><span>'+h(cap(fmtDate(se.start,true)))+'</span></header>';
  html+='<section class="card"><div class="eyebrow">'+h(se.name)+' · '+fmtTime(se.start)+'–'+fmtTime(se.end)+'</div><h1 class="title">'+h(rep.verdict)+'</h1>'
    +'<div class="tiles"><div class="tile"><b>'+rep.durMin+'</b><span>minute'+(rep.durMin>1?'s':'')+'</span></div><div class="tile"><b>'+rep.nSets+'</b><span>séries</span></div><div class="tile"><b>'+rep.nReps+'</b><span>répétitions</span></div>'
    +'<div class="tile"><b>'+rep.ton+'</b><span>kg soulevés</span></div><div class="tile"><b>'+(rep.cmp ? rep.up+' / '+rep.cmp : '–')+'</b><span>en hausse</span></div><div class="tile"><b>'+rep.prs+'</b><span>record'+(rep.prs>1?'s':'')+'</span></div></div>'
    +'<ul class="list">'+rep.comments.map(function(x){ return '<li>'+h(x)+'</li>'; }).join('')+'</ul></section>';
  html+='<section class="card"><div class="eyebrow">Exercice par exercice</div><div>';
  rep.rows.forEach(function(r){
    if(!r.sets.length) return;
    var p=r.status==='up'?'<span class="pill good">▲ '+(r.delta>=0?'+':'')+fmtKg(Math.round(r.delta*10)/10)+' %</span>':r.status==='down'?'<span class="pill bad">▼ '+fmtKg(Math.round(r.delta*10)/10)+' %</span>':r.status==='same'?'<span class="pill">= stable</span>':'<span class="pill">référence</span>';
    html+='<div class="rrow"><div class="hd"><b>'+h(r.name)+(r.light?' <span class="pill warn">doux</span>':'')+'</b><span class="row">'+(r.pr?'<span class="pill solid">Record</span>':'')+p+'</span></div>'
      +'<div class="sets">'+r.sets.map(function(s){ return h(setLabel(r,s)); }).join(' · ')+'</div>'
      +(r.prev?'<div class="sets">Fois précédente, meilleure série : '+h(setLabel(r,r.prev))+'</div>':'')+'</div>';
  });
  html+='</div>'+(rep.skipped.length?'<p class="small muted">Non faits : '+h(rep.skipped.join(', '))+'.</p>':'')+'</section>';
  html+='<section class="card"><div class="eyebrow">Volume de la semaine après cette séance</div>'+volBlock(rep.week, plannedWeek(S))+'<p class="small muted">Séries par muscle : faites / prévues. Trait jaune : 10 séries.</p></section>';
  if(isLast && !S.cur) html+='<section class="card"><div class="eyebrow">Prochaine séance</div><h2 class="h2">'+h(TPL[todayTpl(S)].n)+'</h2><p class="small muted">Laisse au moins 48 heures avant de retravailler les mêmes muscles.</p></section>';
  html+='<button class="btn dark block" data-act="copyreport">Copier le rapport</button><button class="btn block" data-act="tab" data-v="home">Retour à l’accueil</button><button class="link small" data-act="delsession">Supprimer cette séance</button>';
  return html;
}

function chartSvg(pts){
  var W=320, H=150, L=38, R=12, T=12, B=24, min=Infinity, max=-Infinity, i;
  pts.forEach(function(p){ min=Math.min(min,p.v); max=Math.max(max,p.v); });
  if(max-min<1){ max+=1; min-=1; }
  var pad=(max-min)*0.12; min-=pad; max+=pad;
  function x(k){ return pts.length===1 ? (L+(W-R))/2 : L+(W-L-R)*k/(pts.length-1); }
  function y(v){ return T+(H-T-B)*(1-(v-min)/(max-min)); }
  var d='', area='';
  for(i=0;i<pts.length;i++){ d+=(i?'L':'M')+x(i).toFixed(1)+' '+y(pts[i].v).toFixed(1); }
  area=d+'L'+x(pts.length-1).toFixed(1)+' '+(H-B)+'L'+x(0).toFixed(1)+' '+(H-B)+'Z';
  var lo=pts.reduce(function(a,p){ return Math.min(a,p.v); },Infinity), hi=pts.reduce(function(a,p){ return Math.max(a,p.v); },-Infinity), lastP=pts[pts.length-1];
  var s='<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Évolution du 1RM estimé">';
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(hi).toFixed(1)+'" y2="'+y(hi).toFixed(1)+'" stroke="var(--line)" stroke-dasharray="3 4"/>';
  if(hi-lo>=1) s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(lo).toFixed(1)+'" y2="'+y(lo).toFixed(1)+'" stroke="var(--line)" stroke-dasharray="3 4"/>';
  s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+(H-B)+'" y2="'+(H-B)+'" stroke="var(--line)"/>';
  if(pts.length>1) s+='<path d="'+area+'" fill="var(--accent)" opacity=".22"/><path d="'+d+'" fill="none" stroke="var(--ink)" stroke-width="2" stroke-linejoin="round"/>';
  for(i=0;i<pts.length-1;i++) s+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(pts[i].v).toFixed(1)+'" r="2.5" fill="var(--ink)"/>';
  s+='<circle cx="'+x(pts.length-1).toFixed(1)+'" cy="'+y(lastP.v).toFixed(1)+'" r="5" fill="var(--accent)" stroke="var(--ink)" stroke-width="2"/>';
  s+='<text x="'+(L-6)+'" y="'+(y(hi)+4).toFixed(1)+'" text-anchor="end">'+Math.round(hi)+'</text>';
  if(hi-lo>=1) s+='<text x="'+(L-6)+'" y="'+(y(lo)+4).toFixed(1)+'" text-anchor="end">'+Math.round(lo)+'</text>';
  s+='<text x="'+L+'" y="'+(H-7)+'">'+h(fmtDate(pts[0].t))+'</text>';
  if(pts.length>1) s+='<text x="'+(W-R)+'" y="'+(H-7)+'" text-anchor="end">'+h(fmtDate(lastP.t))+'</text>';
  return s+'</svg>';
}
function vProgress(){
  var html='<header class="brand"><b>Progrès</b><span>'+plural(S.sessions.length,'séance')+' enregistrée'+(S.sessions.length>1?'s':'')+'</span></header>';
  var withH=EX.filter(function(e){ return exHistory(S,e.id).some(function(x){ return !x.light; }); });
  if(!S.sessions.length){
    return html+'<section class="card"><h2 class="h2">Rien à afficher pour l’instant</h2><p>Termine ta première séance. Tu verras ici ton historique, tes records et la courbe de chaque exercice.</p><button class="btn dark" data-act="tab" data-v="home">Voir la séance du jour</button></section>';
  }
  if(withH.length){
    if(!ui.histEx || !EXI[ui.histEx] || withH.indexOf(EXI[ui.histEx])<0){
      var lastS=S.sessions[S.sessions.length-1], f=lastS.items.filter(function(it){ return it.sets.length && !it.light; })[0];
      ui.histEx=(f && EXI[f.exId]) ? f.exId : withH[0].id;
    }
    var ex=EXI[ui.histEx], H=exHistory(S,ex.id).filter(function(x){ return !x.light; });
    var pts=H.map(function(e){ return {t:e.t, v:bestSet(S,ex,e.sets).e1}; }), first=pts[0].v, lastV=pts[pts.length-1].v, dl=(lastV/first-1)*100;
    html+='<section class="card"><div class="eyebrow">Progression par exercice</div>'
      +'<select id="hist-ex" data-bind="histex" aria-label="Exercice">'+withH.map(function(e){ return '<option value="'+e.id+'"'+(e.id===ex.id?' selected':'')+'>'+h(e.n)+'</option>'; }).join('')+'</select>'
      +'<div class="row wrap"><span class="h2 num">'+fmtKg(Math.round(lastV*10)/10)+' kg</span>'+(pts.length>1?'<span class="pill '+(dl>=1?'good':dl<=-1?'bad':'')+'">'+(dl>=0?'+':'')+fmtKg(Math.round(dl*10)/10)+' % depuis le début</span>':'')+'</div>'
      +chartSvg(pts)
      +'<p class="small muted">Force maximale estimée sur une répétition (1RM, formule d’Epley)'+(ex.bw?', poids du corps compris':'')+'. Meilleure série de chaque séance.</p><div>';
    H.slice(-5).reverse().forEach(function(e){ html+='<div class="set-row small"><span>'+h(cap(fmtDate(e.t)))+'</span><span class="num muted">'+e.sets.map(function(s){ return (ex.bw?(s.w>0?'+'+fmtKg(s.w):'PC'):fmtKg(s.w))+' × '+s.r; }).join(' · ')+'</span></div>'; });
    html+='</div></section>';
  }
  html+='<section class="card"><div class="eyebrow">Séances</div><div>';
  S.sessions.slice().reverse().slice(0,40).forEach(function(se){
    var rp=buildReport(S,se);
    html+='<button class="sess" data-act="report" data-id="'+h(se.id)+'"><span><b>'+h(se.name)+'</b><small>'+h(cap(fmtDate(se.start,true)))+' · '+rp.nSets+' séries · '+rp.ton+' kg'+(rp.prs?' · '+plural(rp.prs,'record'):'')+'</small></span><span class="pill '+(rp.up>rp.down?'good':rp.down>rp.up?'bad':'')+'">'+h(rp.verdict.replace('Séance ',''))+'</span></button>';
  });
  return html+'</div></section>';
}

function vScience(){
  var html='<header class="brand"><b>Science</b><span>'+SCIENCE.length+' règles</span></header>'
    +'<p class="muted">Chaque règle du programme vient d’études publiées. Voici ce qu’elles montrent et ce que l’application en fait.</p>';
  SCIENCE.forEach(function(x){
    html+='<section class="card sci"><div class="eyebrow">'+h(x.t)+'</div><h2 class="k">'+h(x.k)+'</h2><p>'+h(x.d)+'</p><p class="app">'+h(x.app)+'</p><div class="src">'
      +x.src.map(function(s){ return '<a href="'+h(s[1])+'" rel="noopener">'+h(s[0])+'</a>'; }).join('')+'</div></section>';
  });
  return html+'<p class="small muted">Ces repères viennent d’études sur des adultes en bonne santé. Ils ne remplacent pas un avis médical.</p>';
}

function segHtml(act, cur, opts){
  return '<div class="seg">'+opts.map(function(o){ return '<button data-act="'+act+'" data-v="'+o[0]+'" class="'+(String(cur)===String(o[0])?'on':'')+'">'+o[1]+'</button>'; }).join('')+'</div>';
}
function vSettings(){
  var st=S.settings, html='<header class="brand"><b>Réglages</b><span></span></header>';
  html+='<section class="card"><div class="eyebrow">Programme</div>'
    +'<div class="field"><span>Séances par semaine</span>'+segHtml('setdays', S.profile.days, [[2,'2'],[3,'3'],[4,'4'],[5,'5'],[6,'6']])+'</div>'
    +'<p class="small muted">Rotation : '+cycle(S).map(function(id){ return TPL[id].n; }).join(' → ')+'.</p>'
    +'<div class="field"><span>Durée d’une séance</span>'+segHtml('setdur', S.profile.dur, [[45,'45 min'],[60,'60 min'],[75,'75 min']])+'</div>'
    +'<div class="field"><span>Poids du corps, en kg (facultatif)</span><input class="inp" id="bw" data-bind="bw" inputmode="decimal" autocomplete="off" placeholder="par exemple 78" value="'+(S.profile.bw?fmtKg(S.profile.bw):'')+'"></div>'
    +'<p class="small muted">Sert aux exercices au poids du corps et à la cible de protéines.</p></section>';
  html+='<section class="card"><div class="eyebrow">Repos entre les séries</div>'
    +'<div class="set-row"><span>Exercices polyarticulaires</span><span class="row"><button class="btn sm" data-act="setrest" data-k="restC" data-d="-15">−</button><b class="num sw" style="text-align:center">'+fmtRest(st.restC)+'</b><button class="btn sm" data-act="setrest" data-k="restC" data-d="15">+</button></span></div>'
    +'<div class="set-row"><span>Exercices d’isolation</span><span class="row"><button class="btn sm" data-act="setrest" data-k="restI" data-d="-15">−</button><b class="num sw" style="text-align:center">'+fmtRest(st.restI)+'</b><button class="btn sm" data-act="setrest" data-k="restI" data-d="15">+</button></span></div></section>';
  html+='<section class="card"><div class="eyebrow">Coach vocal</div>'
    +(Snd.supported()?'':'<p class="note alert">Ce navigateur ne peut pas lire la voix du coach. Les consignes restent affichées à l’écran.</p>')
    +((isIOS() && !isInstalled())?'<p class="note alert">Tu n’es pas dans l’application installée. Ici, l’iPhone coupe la musique des autres applications dès qu’une page produit du son. Le coach reste donc muet. Pour l’entendre par-dessus ta musique, ouvre l’application depuis son icône sur l’écran d’accueil.</p><div class="field"><span>Ici, le coach</span>'+segHtml('setforce', st.force?1:0, [[0,'Reste muet'],[1,'Parle quand même']])+'</div>':'')
    +'<div class="field"><span>Voix</span>'+segHtml('setvoice', st.voice?1:0, [[1,'Activée'],[0,'Coupée']])+'</div>'
    +'<div class="field"><span>Timbre</span>'+segHtml('setvox', st.vox==='m'?'m':'f', [['f','Voix féminine'],['m','Voix masculine']])+'</div>'
    +'<div class="field"><span>Le coach parle</span>'+segHtml('settalk', st.talk==='peu'?'peu':'normal', [['normal','Normalement'],['peu','Peu']])+'</div>'
    +'<div class="field"><span>Volume de la voix</span>'+segHtml('setvol', st.vol||1, [[0.6,'Doux'],[1,'Normal'],[1.5,'Fort']])+'</div>'
    +'<button class="btn" data-act="testvoice">Tester la voix</button>'
    +'<p class="small muted">Normalement : signal de reprise, un conseil sur l’exercice aux deux premières séries, un encouragement à chaque série. Peu : signal de reprise, un conseil par exercice, un encouragement sur la dernière série. Le coach ne lit plus les charges : elles sont à l’écran.</p>'
    +'<p class="small muted">La voix est enregistrée et se superpose à ta musique. Lance d’abord ta musique, puis ouvre l’application depuis son icône. Le mode silencieux de l’iPhone coupe la voix du coach : désactive-le.</p></section>';
  var un=Object.keys(S.unavail).filter(function(k){ return S.unavail[k]; });
  html+='<section class="card"><div class="eyebrow">Absent de ma salle</div>';
  if(!un.length) html+='<p class="small muted">Rien pour l’instant. Pendant une séance, touche « Pas dans ma salle » : l’exercice ne sera plus proposé.</p>';
  un.forEach(function(k){
    var label;
    if(k.indexOf('ex:')===0) label=EXI[k.slice(3)] ? EXI[k.slice(3)].n : k;
    else label=EX.filter(function(e){ return e.st===k.slice(3); }).map(function(e){ return e.n; }).join(', ');
    html+='<div class="set-row"><span class="small">'+h(label)+'</span><button class="btn sm" data-act="restore" data-k="'+h(k)+'">Remettre</button></div>';
  });
  html+='</section>';
  var zs=[]; for(var z in S.pain) if(S.pain[z]>0) zs.push(ZONES[z]+(S.pain[z]>=2?' (douleur)':' (gêne)'));
  html+='<section class="card"><div class="eyebrow">Zones sensibles</div><p class="small '+(zs.length?'':'muted')+'">'+(zs.length?h(zs.join(', ')):'Aucune zone signalée.')+'</p><button class="btn" data-act="pain">Modifier</button></section>';
  html+='<section class="card"><div class="eyebrow">Mes données</div><p class="small">'
    +(ui.sync==='cloud' ? 'Sauvegarde : dans ton compte Claude et sur cet appareil. Tes séances te suivent d’un appareil à l’autre.'
      : ui.sync==='error' ? 'Sauvegarde dans ton compte : dernière écriture refusée. Les données restent sur cet appareil.'
      : (ui.storeOk ? (inClaude() ? 'Sauvegarde : sur cet appareil seulement pour l’instant.' : 'Sauvegarde : sur cet appareil. Touche « Copier mes données » de temps en temps pour garder une copie ailleurs.')
                    : 'Sauvegarde impossible sur cet appareil : les données seront perdues à la fermeture. Copie-les ci-dessous.'))+'</p>'
    +'<button class="btn" data-act="export">Copier mes données</button><button class="btn" data-act="importopen">Importer des données</button><button class="btn danger" data-act="resetask">Tout effacer</button></section>';
  if(canInstall()) html+='<section class="card"><div class="eyebrow">Sur l’écran d’accueil</div><p class="small">Sur iPhone, ouvre cette page dans Safari, touche le bouton Partager, puis « Sur l’écran d’accueil ». L’application s’ouvre alors en plein écran et fonctionne sans réseau.</p></section>';
  return html+'<p class="small muted">Photos d’exercices : Free Exercise DB, domaine public.</p>';
}

/* ---------- Feuilles (dialogues) ---------- */
var SHEETS={
  pain:function(){
    var d=ui.painDraft, html='<h2 class="h2">Où as-tu mal ?</h2><p class="small muted">Le coach remplace les exercices qui chargent la zone. S’il n’y en a pas d’autre : charge réduite de 30 % et 15–20 répétitions lentes pour une gêne, exercice écarté pour une douleur.</p>';
    for(var z in ZONES){
      html+='<div class="zone"><b>'+ZONES[z]+'</b><div class="seg">'+[[0,'Rien'],[1,'Gêne'],[2,'Douleur']].map(function(o){ return '<button data-act="painset" data-z="'+z+'" data-v="'+o[0]+'" class="'+((d[z]||0)===o[0]?'on':'')+'">'+o[1]+'</button>'; }).join('')+'</div></div>';
    }
    return html+'<p class="note alert">Gêne : jusqu’à 3 sur 10. Douleur : 4 ou plus. Douleur vive, soudaine ou qui augmente pendant l’effort : arrête la séance. Si elle dure plusieurs jours, consulte un médecin ou un physiothérapeute.</p>'
      +'<button class="btn primary block" data-act="painok">Valider</button><button class="btn block" data-act="close">Annuler</button>';
  },
  alt:function(){
    var cur=S.cur, it=curItem(cur), list=alternatives(S,cur,it), html='<h2 class="h2">Choisir un autre exercice</h2>';
    html+='<div class="field"><span>Ce choix vaut</span>'+segHtml('altkeep', ui.keep?1:0, [[1,'Pour les prochaines séances'],[0,'Aujourd’hui seulement']])+'</div>';
    list.forEach(function(a){
      var e=a.ex, dis=(!a.avail || a.used || a.current), tags='';
      if(a.current) tags+='<span class="pill solid">Actuel</span>';
      tags+='<span class="pill">'+EQ[e.eq]+'</span>';
      if(a.cross) tags+='<span class="pill">Autre mouvement, même muscle</span>';
      if(!a.avail) tags+='<span class="pill warn">Absent de ta salle</span>';
      if(a.used && !a.current) tags+='<span class="pill">Déjà dans la séance</span>';
      if(a.stress>=2) tags+='<span class="pill bad">Charge la zone sensible</span>';
      html+='<button class="alt'+(a.current?' cur':'')+'" data-act="altpick" data-id="'+e.id+'"'+(dis?' disabled':'')+'><b>'+h(e.n)+'</b><span class="chips">'+tags+'</span></button>';
    });
    return html+'<button class="btn block" data-act="close">Fermer</button>';
  },
  editset:function(){
    var e=ui.edit, ex=EXI[curItem(S.cur).exId];
    return '<h2 class="h2">Corriger la série '+(e.i+1)+'</h2><div class="inputs"><div class="stp"><label for="ed-w">'+(ex.bw?'Lest (kg)':'Charge (kg)')+'</label><div><button data-act="step" data-s="edit" data-k="w" data-d="-1">−</button><input id="ed-w" inputmode="decimal" value="'+fmtKg(e.w)+'"><button data-act="step" data-s="edit" data-k="w" data-d="1">+</button></div></div>'
      +'<div class="stp"><label for="ed-r">Répétitions</label><div><button data-act="step" data-s="edit" data-k="r" data-d="-1">−</button><input id="ed-r" inputmode="numeric" value="'+e.r+'"><button data-act="step" data-s="edit" data-k="r" data-d="1">+</button></div></div></div>'
      +'<button class="btn primary block" data-act="editsave">Enregistrer</button><button class="btn danger block" data-act="editdel">Supprimer cette série</button><button class="btn block" data-act="close">Annuler</button>';
  },
  stepsize:function(){
    var ex=EXI[curItem(S.cur).exId];
    return '<h2 class="h2">Pas de charge</h2><p class="small muted">'+h(ex.n)+' : de combien la charge monte ou descend d’un cran. Regarde les plaques de ta machine.</p>'
      +segHtml('stepset', ui.stepW, [[0.5,'0,5'],[1,'1'],[1.25,'1,25'],[2,'2'],[2.5,'2,5'],[5,'5'],[10,'10']])+'<button class="btn block" data-act="close">Fermer</button>';
  },
  quit:function(){
    return '<h2 class="h2">Quitter la séance ?</h2><button class="btn dark block" data-act="pause">Mettre en pause et revenir plus tard</button><button class="btn block" data-act="finishnow">Terminer et voir le rapport</button><button class="btn danger block" data-act="abandon">Abandonner sans enregistrer</button><button class="btn block" data-act="close">Continuer la séance</button>';
  },
  finish:function(){
    return '<h2 class="h2">Terminer maintenant ?</h2><p>Il reste '+plural(remaining(S.cur),'exercice')+' à faire.</p><button class="btn primary block" data-act="finishnow">Terminer et voir le rapport</button><button class="btn block" data-act="close">Continuer la séance</button>';
  },
  pick:function(){
    var c=cycle(S), today=todayTpl(S);
    return '<h2 class="h2">Choisir la séance</h2><p class="small muted">La rotation reprend ensuite à partir de la séance choisie.</p>'
      +c.map(function(id,i){ return '<button class="alt'+(id===today?' cur':'')+'" data-act="pickset" data-i="'+i+'"><b>'+h(TPL[id].n)+'</b><span class="small muted">'+plural(TPL[id].items.length,'exercice')+(id===today?' · prévue aujourd’hui':'')+'</span></button>'; }).join('')
      +'<button class="btn block" data-act="close">Fermer</button>';
  },
  confirm:function(){
    var c=ui.confirm;
    return '<h2 class="h2">'+h(c.title)+'</h2><p>'+h(c.text)+'</p><button class="btn danger block" data-act="confirmyes">'+h(c.yes)+'</button><button class="btn block" data-act="close">Annuler</button>';
  },
  text:function(){
    return '<h2 class="h2">'+h(ui.textTitle||'Texte')+'</h2><p class="small muted">La copie automatique a été refusée. Sélectionne le texte et copie-le.</p><textarea class="inp" readonly id="txt-out">'+h(ui.textOut)+'</textarea><button class="btn block" data-act="close">Fermer</button>';
  },
  importer:function(){
    return '<h2 class="h2">Importer des données</h2><p class="small muted">Colle ici le texte obtenu avec « Copier mes données ». Il remplace les données actuelles.</p><textarea class="inp" id="imp" placeholder="{ … }"></textarea>'
      +(ui.msg?'<p class="note alert">'+h(ui.msg)+'</p>':'')+'<button class="btn primary block" data-act="importgo">Importer</button><button class="btn block" data-act="close">Annuler</button>';
  }
};
function openSheet(n){ ui.sheet=n; renderSheet(); }
function closeSheet(){ ui.sheet=null; ui.msg=''; renderSheet(); }
function renderSheet(){
  var el=$('sheet');
  if(!ui.sheet || !SHEETS[ui.sheet]){ el.className=''; el.innerHTML=''; return; }
  el.className='on';
  el.innerHTML='<div class="bg" data-act="close"></div><div class="box" role="dialog" aria-modal="true">'+SHEETS[ui.sheet]()+'</div>';
}
function render(){
  if(view==='workout' && !S.cur) view='home';
  var root=$('app'), html;
  if(view==='workout') html=vWorkout();
  else html=(view==='progress'?vProgress():view==='science'?vScience():view==='settings'?vSettings():view==='report'?vReport():vHome())+vTabs();
  root.className='v-'+view; root.innerHTML=html;
  renderSheet();
}
function go(v){ view=v; render(); window.scrollTo(0,0); }

/* ---------- Déroulé ---------- */
function startRest(sec){
  var t=now();
  S.cur.rest={start:t, end:t+sec*1000, total:sec, ten:false};
}
function endRest(manual){
  var cur=S.cur; if(!cur || !cur.rest) return;
  cur.rest=null;
  saveLocal(); render();
  Coach.go(manual);
}
function doFinish(){
  var t=now(), se=finishSession(S, t);
  unwake(); closeSheet();
  if(!se){ save(); view='home'; render(); toast('Aucune série saisie : la séance n’a pas été enregistrée.'); Snd.stop(); return; }
  save('session', se);
  ui.reportId=se.id; view='report'; render(); window.scrollTo(0,0);
  Snd.say([['coach', pickLine('end')]]);
}
function afterChange(){
  var cur=S.cur;
  if(curItem(cur).state!=='todo'){ if(!advance(cur)){ doFinish(); return; } }
  cur.input=null; save(); render(); Coach.intro(null, !cur.rest);
}
function sessionPacks(cur){ return ['coach'].concat(cur.items.map(function(it){ return it.exId; })); }
function tick(){
  if(!S || !S.cur || view!=='workout') return;
  var cur=S.cur, t=now(), el=$('chrono');
  if(el) el.textContent=fmtDur((t-cur.start)/1000);
  if(cur.rest){
    var left=(cur.rest.end-t)/1000, rt=$('rest-time'), rb=$('rest-bar');
    if(rt) rt.textContent=fmtDur(Math.ceil(left));
    if(rb) rb.style.width=Math.max(0,Math.min(100,100*(1-left/cur.rest.total)))+'%';
    if(!cur.rest.ten && left<=10 && left>5 && cur.rest.total>=40){ cur.rest.ten=true; if(!Coach.quiet()) Snd.say([['coach','ten0']], true); }
    if(left<=0) endRest(false);
  } else Coach.tick(t);
}
function readInputs(){
  var cur=S.cur; if(!cur || !cur.input) return;
  var a=$('in-w'), b=$('in-r'), w, r;
  if(a){ w=parseNum(a.value); if(w!=null && w>=0) cur.input.w=r2(w); }
  if(b){ r=parseNum(b.value); if(r!=null && r>=0) cur.input.r=Math.round(r); }
}
function readEdit(){
  var a=$('ed-w'), b=$('ed-r'), w, r; if(!ui.edit) return;
  if(a){ w=parseNum(a.value); if(w!=null && w>=0) ui.edit.w=r2(w); }
  if(b){ r=parseNum(b.value); if(r!=null && r>=0) ui.edit.r=Math.round(r); }
}

/* ---------- Actions ---------- */
var ACT={
  tab:function(d){ go(d.v); },
  close:function(){ closeSheet(); },
  start:function(){
    var cur=buildSession(S, todayTpl(S), now());
    if(!remaining(cur)){ toast('Aucun exercice possible avec les réglages actuels. Vérifie les zones sensibles et les machines absentes.'); return; }
    S.cur=cur; view='workout'; wake(); Snd.unlock(); preload(cur); Snd.preload(sessionPacks(cur));
    save(); render(); window.scrollTo(0,0);
    Coach.intro('start0', true);
    if(S.settings.voice && !voiceOn()) toast('Coach muet ici : dans ce navigateur, l’iPhone couperait ta musique. Ouvre l’application depuis son icône sur l’écran d’accueil.', 8000);
  },
  resume:function(){ view='workout'; wake(); Snd.unlock(); preload(S.cur); Snd.preload(sessionPacks(S.cur)); render(); window.scrollTo(0,0); },
  pick:function(){ openSheet('pick'); },
  pickset:function(d){ S.rot=+d.i; closeSheet(); save(); render(); },
  report:function(d){ ui.reportId=d.id; go('report'); },
  demo:function(d, el){ el.classList.toggle('paused'); },
  step:function(d){
    var edit=(d.s==='edit'), o=edit ? ui.edit : S.cur.input, dir=+d.d;
    if(edit) readEdit();
    if(d.k==='w'){ o.w=Math.max(0, r2(o.w+dir*ui.stepW)); var a=$(edit?'ed-w':'in-w'); if(a) a.value=fmtKg(o.w); }
    else { o.r=Math.max(0, o.r+dir); var b=$(edit?'ed-r':'in-r'); if(b) b.value=o.r; }
    if(!edit) saveLocal();
  },
  rir:function(d){
    var v=+d.v, inp=S.cur.input; inp.rir=(inp.rir===v)?null:v;
    var bs=$('rir').querySelectorAll('button'), i; for(i=0;i<bs.length;i++) bs[i].className=(+bs[i].getAttribute('data-v')===inp.rir)?'on':'';
  },
  logset:function(){
    var c=ctxOf(), cur=c.cur, inp=cur.input;
    if(!(inp.r>0)){ toast('Indique le nombre de répétitions faites.'); return; }
    var reached=c.goal ? inp.r>=c.goal : inp.r>=c.rec.hi;
    var res=logSet(S, {w:inp.w, r:inp.r, rir:inp.rir}, now()), sec=c.it.light ? Math.min(90, restFor(S,c.ex)) : restFor(S,c.ex);
    if(res.finished && !advance(cur)){ doFinish(); return; }
    cur.input=null; startRest(sec);
    Coach.setDone(reached, res.finished ? EXI[curItem(cur).exId] : null, res.finished && curItem(cur).deferred===1);
    save(); render();
    if(res.finished) window.scrollTo(0,0);
  },
  restadj:function(d){ var r=S.cur.rest; if(!r) return; r.end+=(+d.d)*1000; r.total=Math.max(15, r.total+(+d.d)); if(r.end<now()) r.end=now(); saveLocal(); tick(); },
  restskip:function(){ endRest(true); },
  stepsize:function(){ openSheet('stepsize'); },
  stepset:function(d){ var ex=EXI[curItem(S.cur).exId]; S.incs[ex.id]=+d.v; closeSheet(); S.cur.input=null; save(); render(); },
  editset:function(d){ var it=curItem(S.cur), s=it.sets[+d.i]; if(!s) return; ui.edit={i:+d.i, w:s.w, r:s.r}; openSheet('editset'); },
  editsave:function(){ readEdit(); var it=curItem(S.cur), s=it.sets[ui.edit.i]; if(s){ s.w=ui.edit.w; s.r=ui.edit.r; } closeSheet(); S.cur.input=null; save(); render(); },
  editdel:function(){ var it=curItem(S.cur); it.sets.splice(ui.edit.i,1); closeSheet(); S.cur.input=null; save(); render(); },
  ackfree:function(){ curItem(S.cur).deferred=2; save(); render(); },
  busy:function(){
    var r=actBusy(S);
    if(r.type==='defer'){ toast('OK. On fait d’abord « '+EXI[r.next.exId].n+' ». Je te repropose « '+EXI[r.it.exId].n+' » juste après.', 6000); afterChange(); }
    else if(r.type==='replace'){ toast('Remplacé pour aujourd’hui par « '+r.ex.n+' ». « '+r.old.n+' » reste dans ton programme.', 6000); afterChange(); }
    else { toast('Pas d’autre exercice libre pour ce muscle. On passe au suivant.', 5000); afterChange(); }
  },
  absent:function(){
    var r=actAbsent(S), mine=r.changes.filter(function(x){ return x.current; })[0];
    if(mine && mine.ex) toast('Noté : « '+r.old.n+' » ne sera plus proposé. À la place : « '+mine.ex.n+' ».', 6000);
    else toast('Noté. Aucun autre exercice disponible pour ce muscle : on passe au suivant.', 6000);
    afterChange();
  },
  pain:function(){ ui.painDraft=clone(S.pain||{}); openSheet('pain'); },
  painset:function(d){ ui.painDraft[d.z]=+d.v; renderSheet(); },
  painok:function(){
    var p={}, z; for(z in ui.painDraft) if(ui.painDraft[z]>0) p[z]=ui.painDraft[z];
    closeSheet();
    if(!S.cur){ S.pain=p; save(); render(); toast(hasPain(p) ? 'Noté. Les séances sont adaptées tant que la zone reste signalée.' : 'Aucune zone sensible : programme normal.'); return; }
    var ch=actPain(S,p), sw=0, li=0, sk=0;
    ch.forEach(function(x){ if(x.type==='swap') sw++; else if(x.type==='light') li++; else sk++; });
    var parts=[]; if(sw) parts.push(plural(sw,'exercice')+' remplacé'+(sw>1?'s':'')); if(li) parts.push(li+' allégé'+(li>1?'s':'')); if(sk) parts.push(sk+' écarté'+(sk>1?'s':''));
    toast(parts.length ? 'Séance adaptée : '+parts.join(', ')+'.' : (hasPain(p) ? 'Noté. Aucun exercice restant ne charge cette zone.' : 'Programme normal rétabli.'), 6000);
    afterChange();
  },
  alt:function(){ ui.keep=true; openSheet('alt'); },
  altkeep:function(d){ ui.keep=(+d.v===1); renderSheet(); },
  altpick:function(d){ var ex=actChoose(S, d.id, ui.keep); closeSheet(); toast('Exercice choisi : « '+ex.n+' »'+(ui.keep?', gardé pour les prochaines séances.':', pour aujourd’hui.')); afterChange(); },
  addset:function(){ var it=curItem(S.cur); if(it.tg.sets>=8) return; it.tg.sets++; save(); render(); toast('Une série ajoutée : '+it.tg.sets+' au total.'); },
  skip:function(){ actSkip(S); afterChange(); },
  jump:function(d){ var cur=S.cur, p=cur.order.indexOf(+d.i); if(p<0) return; cur.pos=p; cur.rest=null; cur.input=null; save(); render(); window.scrollTo(0,0); Coach.intro(null, true); },
  voicetoggle:function(){ S.settings.voice=!S.settings.voice; if(voiceOn()){ Snd.unlock(); Snd.preload(sessionPacks(S.cur)); Snd.say([['coach','test0']]); } else Snd.stop(); save(); render(); },
  quit:function(){ openSheet('quit'); },
  pause:function(){ closeSheet(); unwake(); Snd.stop(); go('home'); },
  finish:function(){ if(remaining(S.cur)>0) openSheet('finish'); else doFinish(); },
  finishnow:function(){ doFinish(); },
  abandon:function(){ S.cur=null; closeSheet(); unwake(); Snd.stop(); save(); go('home'); toast('Séance abandonnée. Rien n’a été enregistré.'); },
  copyreport:function(){
    var se=null; S.sessions.forEach(function(s){ if(s.id===ui.reportId) se=s; }); if(!se) return;
    var isLast=S.sessions[S.sessions.length-1]===se;
    copyText(reportText(buildReport(S,se), isLast?TPL[todayTpl(S)].n:null), 'Rapport copié.', 'Rapport de séance');
  },
  delsession:function(){ ui.confirm={title:'Supprimer cette séance ?', text:'Ses séries ne compteront plus dans tes progrès ni dans les charges conseillées.', yes:'Supprimer', fn:function(){
    var id=ui.reportId; S.sessions=S.sessions.filter(function(s){ return s.id!==id; }); S.deleted[id]=1; save('delete', id); go('progress'); toast('Séance supprimée.'); }}; openSheet('confirm'); },
  confirmyes:function(){ var f=ui.confirm && ui.confirm.fn; closeSheet(); if(f) f(); },
  setdays:function(d){ S.profile.days=+d.v; S.rot=0; save(); render(); },
  setdur:function(d){ S.profile.dur=+d.v; save(); render(); },
  setrest:function(d){ S.settings[d.k]=Math.max(30, Math.min(300, (S.settings[d.k]||90)+(+d.d))); save(); render(); },
  setvoice:function(d){ S.settings.voice=(+d.v===1); if(S.settings.voice) Snd.unlock(); else Snd.stop(); save(); render(); },
  setforce:function(d){ S.settings.force=(+d.v===1); if(!voiceOn()) Snd.stop(); save(); render(); },
  settalk:function(d){ S.settings.talk=(d.v==='peu')?'peu':'normal'; save(); render(); },
  setvox:function(d){ Snd.reset(); S.settings.vox=(d.v==='m')?'m':'f'; save(); render(); ACT.testvoice(); warmCache(); },
  setvol:function(d){ S.settings.vol=+d.v; save(); render(); ACT.testvoice(); },
  testvoice:function(){
    if(!Snd.supported()){ toast('Ce navigateur ne peut pas lire la voix du coach.'); return; }
    if(!S.settings.voice){ toast('La voix est coupée. Active-la d’abord.'); return; }
    if(!voiceOn()){ toast('Ici, le coach reste muet pour ne pas couper ta musique. Ouvre l’application depuis son icône, ou choisis « Parle quand même ».', 7000); return; }
    Snd.unlock(); Snd.preload(['coach']); Snd.say([['coach','test0']]);
  },
  restore:function(d){ delete S.unavail[d.k]; save(); render(); toast('Exercice remis dans le programme.'); },
  export:function(){ copyText(JSON.stringify(S), 'Données copiées. Colle-les dans une note pour les garder.', 'Mes données'); },
  importopen:function(){ ui.msg=''; openSheet('importer'); },
  importgo:function(){
    var el=$('imp'), o=null;
    try{ o=JSON.parse(el.value); }catch(e){ o=null; }
    if(!o || o.v!==1 || !Array.isArray(o.sessions)){ ui.msg='Texte non reconnu. Colle le texte complet obtenu avec « Copier mes données ».'; renderSheet(); return; }
    S=normalize(o); S.cur=null; closeSheet(); save();
    S.sessions.forEach(function(se){ Sync.push('session', se); });
    go('home'); toast(plural(S.sessions.length,'séance')+' importée'+(S.sessions.length>1?'s':'')+'.');
  },
  resetask:function(){ ui.confirm={title:'Tout effacer ?', text:'Toutes tes séances, tes réglages et tes machines absentes seront supprimés. Cette action est définitive.', yes:'Tout effacer', fn:function(){
    var del=Object.assign({}, S.deleted||{}); S.sessions.forEach(function(s){ del[s.id]=1; Sync.remove('s_'+s.id); });
    S=defaultState(); S.deleted=del; save(); go('home'); toast('Données effacées.'); }}; openSheet('confirm'); }
};
function copyText(txt, okMsg, title){
  function fallback(){ ui.textOut=txt; ui.textTitle=title; openSheet('text'); }
  try{
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(function(){ toast(okMsg); }, fallback);
    else fallback();
  }catch(e){ fallback(); }
}

document.addEventListener('click', function(e){
  var el=e.target.closest ? e.target.closest('[data-act]') : null;
  if(!el || el.disabled) return;
  var a=el.getAttribute('data-act');
  if(view==='workout'){ Snd.unlock(); if(!ui.sheet && a!=='step') readInputs(); }
  if(ACT[a]) ACT[a](el.dataset, el, e);
});
document.addEventListener('change', function(e){
  var el=e.target, b=el.getAttribute && el.getAttribute('data-bind');
  if(el.id==='in-w' || el.id==='in-r'){ readInputs(); saveLocal(); return; }
  if(b==='histex'){ ui.histEx=el.value; render(); }
  if(b==='bw'){ var v=parseNum(el.value); S.profile.bw=(v && v>=30 && v<=250) ? r2(v) : null; save(); render(); }
});
document.addEventListener('focusin', function(e){ var el=e.target; if(el && el.tagName==='INPUT' && el.select && /^(in-|ed-)/.test(el.id)){ try{ el.select(); }catch(x){} } });
document.addEventListener('visibilitychange', function(){ if(document.visibilityState==='visible'){ if(S && S.cur && view==='workout') wake(); tick(); } });

/* ---------- Version autonome (hors de Claude) : installation et hors connexion ---------- */
function inClaude(){ try{ return !!(window.claude && typeof window.claude.use==='function'); }catch(e){ return false; } }
function framed(){ try{ return window.self!==window.top; }catch(e){ return true; } }
function canInstall(){
  try{ return !inClaude() && !framed() && !(navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)); }
  catch(e){ return false; }
}
/* Garde les photos et la voix choisie sur le téléphone, pour la salle sans réseau. */
function warmCache(){
  try{
    if(!window.caches || framed() || inClaude()) return;
    var vox=(S.settings.vox==='m')?'m':'f', k='coach-cache', v=CACHE+':'+vox+':'+EX.length;
    try{ if(localStorage.getItem(k)===v) return; }catch(e){}
    window.caches.open(CACHE).then(function(c){
      var urls=EX.map(function(e){ return 'img/'+e.id+'.jpg'; })
        .concat(['snd/'+vox+'/index.json', 'snd/'+vox+'/coach.mp3'], EX.map(function(e){ return 'snd/'+vox+'/'+e.id+'.mp3'; })), i=0;
      (function next(){
        if(i>=urls.length){ try{ localStorage.setItem(k,v); }catch(e){} return; }
        var u=urls[i++];
        c.match(u).then(function(hit){ return hit || c.add(u); }).then(next, next);
      })();
    });
  }catch(e){}
}
function initOffline(){
  try{
    if(!('serviceWorker' in navigator) || framed() || inClaude()) return;
    if(location.protocol!=='https:' && location.hostname!=='localhost' && location.hostname!=='127.0.0.1') return;
    navigator.serviceWorker.register('sw.js').then(function(){
      try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
      warmCache();
    }).catch(function(){});
  }catch(e){}
}

/* ---------- Démarrage ---------- */
(function(){
  S=normalize(loadLocal());
  applyAudio();
  view='home';
  render();
  setInterval(tick, 500);
  Sync.init();
  initOffline();
})();
