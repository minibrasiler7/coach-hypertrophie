/* ===== Logique : état, choix d'exercice, charge conseillée, volume, rapport ===== */
function defaultState(){
  return {v:1, updatedAt:0,
    profile:{days:4, dur:60, bw:null},
    settings:{voice:true, tips:true, beep:false, audio:'ambient', restC:150, restI:90, rate:1},
    unavail:{}, pain:{}, prefs:{}, incs:{}, rot:0, cur:null, sessions:[], deleted:{}};
}
function r2(x){ return Math.round(x*100)/100; }
function floorTo(x, inc){ return r2(Math.floor(x/inc + 1e-9)*inc); }
function incOf(S, ex){ return (S.incs && S.incs[ex.id]) || ex.inc; }
function effW(S, ex, w){ return ex.bw ? ((S.profile.bw||75) + (w||0)) : (w||0); }
function e1rm(w, r){ return w*(1 + r/30); }
function fmtKg(w){ return String(r2(w)).replace('.', ','); }
function clone(o){ return JSON.parse(JSON.stringify(o)); }
function cycle(S){ return CYCLES[S.profile.days] || CYCLES[4]; }
function todayTpl(S){ var c=cycle(S); return c[((S.rot%c.length)+c.length)%c.length]; }
function weekStart(ts){ var d=new Date(ts); d.setHours(0,0,0,0); var wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return d.getTime(); }
function hasPain(pain){ for(var k in pain) if(pain[k]>0) return true; return false; }

/* ---------- Historique d'un exercice ---------- */
function exHistory(S, exId){
  var out=[];
  S.sessions.forEach(function(se){
    se.items.forEach(function(it){
      if(it.exId!==exId) return;
      var sets=it.sets.filter(function(s){return s.r>0;});
      if(sets.length) out.push({t:se.start, sets:sets, light:!!it.light, sid:se.id});
    });
  });
  out.sort(function(a,b){return a.t-b.t;});
  return out;
}
function bestSet(S, ex, sets){
  var b=null, be=-1;
  sets.forEach(function(s){ var e=e1rm(effW(S,ex,s.w), s.r); if(e>be){ be=e; b=s; } });
  return b ? {set:b, e1:be} : null;
}

/* Score d'une séance sur un exercice : 1RM estimé moyen sur les n premières séries.
   Il monte aussi quand les dernières séries gagnent des répétitions. */
function sessScore(S, ex, sets, n){
  var t=0, k=Math.min(n, sets.length), i;
  for(i=0;i<k;i++) t+=e1rm(effW(S,ex,sets[i].w), sets[i].r);
  return k ? t/k : 0;
}

/* ---------- Plan de séance ---------- */
function planFor(S, tplId){
  var tpl=TPL[tplId], dur=S.profile.dur||60;
  return tpl.items.map(function(it,i){
    var sets=it.sets;
    if(dur<=45) sets=Math.max(2, sets-1);
    else if(dur>=75 && i<3) sets=sets+1;
    if(S.profile.days<=2 && i<5) sets=sets+1;
    return {key:tplId+'|'+i, slot:it.slot, sets:sets, lo:it.reps[0], hi:it.reps[1], pref:it.pref||null};
  });
}
function restFor(S, ex){ return ex.t==='c' ? (S.settings.restC||150) : (S.settings.restI||90); }
function estMinutes(S, items){
  var t=0;
  items.forEach(function(it){ var ex=EXI[it.exId]; if(!ex || it.state==='skip') return; t += it.tg.sets*(45+restFor(S,ex)) + 60; });
  return Math.max(5, Math.round(t/300)*5);
}

/* ---------- Disponibilité et douleur ---------- */
function unavailKey(ex){ return GENERIC_ST[ex.st] ? 'ex:'+ex.id : 'st:'+ex.st; }
function isAvail(S, ex){ return !S.unavail['ex:'+ex.id] && !(!GENERIC_ST[ex.st] && S.unavail['st:'+ex.st]); }
function stressOf(ex, pain){ var m=0; for(var k in pain){ if(pain[k]>0) m=Math.max(m, ex.j[k]||0); } return m; }
function painLevelFor(ex, pain){ var m=0; for(var k in pain){ if(pain[k]>0 && (ex.j[k]||0)>=2) m=Math.max(m, pain[k]); } return m; }
function painZonesFor(ex, pain){ var a=[]; for(var k in pain){ if(pain[k]>0 && (ex.j[k]||0)>=2) a.push(k); } return a; }

function candList(S, p){
  var pref=(S.prefs && S.prefs[p.key]) || p.pref, list=SLOTS[p.slot].slice();
  if(pref && EXI[pref]) list=[pref].concat(list.filter(function(x){return x!==pref;}));
  return list.map(function(id){return EXI[id];});
}
/* Choisit l'exercice d'un créneau.
   ctx.pain    : zones douloureuses {zone: 1 gêne | 2 douleur}
   ctx.used    : exercices déjà pris dans la séance
   ctx.exclude : exercices à écarter
   ctx.avoidSt : postes occupés, proposés en dernier */
function pickExercise(S, p, ctx){
  ctx=ctx||{};
  var pain=ctx.pain||{}, used=ctx.used||{}, excl=ctx.exclude||{}, avoid=ctx.avoidSt||{};
  function ok(e){ return isAvail(S,e) && !used[e.id] && !excl[e.id]; }
  function order(a){ return a.filter(function(e){return !avoid[e.st];}).concat(a.filter(function(e){return avoid[e.st];})); }
  var list=order(candList(S,p).filter(ok)), fb=[];
  (FALLBACK[p.slot]||[]).forEach(function(sl){ SLOTS[sl].forEach(function(id){ var e=EXI[id]; if(ok(e)) fb.push(e); }); });
  fb=order(fb);
  var first=list[0]||null;
  if(!hasPain(pain)){
    if(first) return {ex:first, light:false, why:null};
    if(fb[0]) return {ex:fb[0], light:false, why:'cross'};
    return null;
  }
  var soft=list.filter(function(e){return stressOf(e,pain)<=1;});
  if(soft.length) return {ex:soft[0], light:false, why: soft[0]===first ? null : 'pain'};
  var soft2=fb.filter(function(e){return stressOf(e,pain)<=1;});
  if(soft2.length) return {ex:soft2[0], light:false, why:'pain'};
  if(!list.length) return null;
  var best=list.slice().sort(function(a,b){return stressOf(a,pain)-stressOf(b,pain);})[0];
  if(painLevelFor(best,pain)>=2 || stressOf(best,pain)>=3) return {ex:null, skip:true, why:'pain', would:best};
  return {ex:best, light:true, why: best===first ? 'light' : 'pain'};
}
function alternatives(S, cur, it){
  var idx=cur.items.indexOf(it), used=usedMap(cur, idx), seen={}, out=[];
  function push(e, cross){
    if(seen[e.id]) return; seen[e.id]=1;
    out.push({ex:e, cross:cross, avail:isAvail(S,e), used:!!used[e.id], stress:stressOf(e,cur.pain||{}), current:e.id===it.exId});
  }
  candList(S, planItemOf(cur,it)).forEach(function(e){ push(e,false); });
  (FALLBACK[it.slot]||[]).forEach(function(sl){ SLOTS[sl].forEach(function(id){ push(EXI[id], true); }); });
  return out;
}

/* ---------- Construction et déroulé de la séance ---------- */
function buildSession(S, tplId, now){
  var plan=planFor(S,tplId), used={}, items=[];
  plan.forEach(function(p){
    var base=pickExercise(S,p,{used:used});
    var pk=pickExercise(S,p,{used:used, pain:S.pain});
    var it={key:p.key, slot:p.slot, tg:{sets:p.sets, lo:p.lo, hi:p.hi}, sets:[], state:'todo', deferred:0,
            exId:null, planId:(base&&base.ex)?base.ex.id:null, light:false, swap:null};
    if(!pk || !pk.ex){
      it.state='skip'; it.exId=(base&&base.ex)?base.ex.id:SLOTS[p.slot][0]; it.swap=(pk&&pk.skip)?'painskip':'none';
    } else {
      it.exId=pk.ex.id; it.light=!!pk.light;
      if(pk.why==='pain'||pk.why==='light') it.swap=pk.why;
      used[pk.ex.id]=1;
    }
    items.push(it);
  });
  var cur={id:String(now), tplId:tplId, name:TPL[tplId].n, start:now, end:null, pain:clone(S.pain||{}),
           items:items, order:items.map(function(_,i){return i;}), pos:0, input:null, rest:null, setStart:now};
  var p0=firstTodoPos(cur,0); cur.pos=p0<0?0:p0;
  return cur;
}
function curItem(cur){ return cur.items[cur.order[cur.pos]]; }
function firstTodoPos(cur, from){
  var p;
  for(p=from;p<cur.order.length;p++) if(cur.items[cur.order[p]].state==='todo') return p;
  for(p=0;p<from;p++) if(cur.items[cur.order[p]].state==='todo') return p;
  return -1;
}
function remaining(cur){ return cur.items.filter(function(it){return it.state==='todo';}).length; }
function usedMap(cur, exceptIdx){
  var u={};
  cur.items.forEach(function(it,i){ if(i!==exceptIdx && it.exId && it.state!=='skip') u[it.exId]=1; });
  return u;
}
function planItemOf(cur, it){
  var t=TPL[cur.tplId].items[+it.key.split('|')[1]]||{};
  return {key:it.key, slot:it.slot, pref:t.pref||null};
}
/* Passe à l'exercice suivant à faire. Renvoie false quand la séance est finie. */
function advance(cur){
  var p=firstTodoPos(cur, cur.pos);
  if(p<0) return false;
  cur.pos=p; return true;
}
function logSet(S, set, now){
  var cur=S.cur, it=curItem(cur);
  it.sets.push({w:set.w, r:set.r, rir:(set.rir==null?null:set.rir), t:now});
  var finished=it.sets.length>=it.tg.sets;
  if(finished) it.state='done';
  return {item:it, finished:finished, more:remaining(cur)>0};
}
/* Machine occupée : on fait d'abord l'exercice suivant, puis on revient. Deuxième fois : remplacement pour aujourd'hui. */
function actBusy(S){
  var cur=S.cur, idx=cur.order[cur.pos], it=cur.items[idx], other=-1, p;
  for(p=cur.pos+1;p<cur.order.length;p++){ if(cur.items[cur.order[p]].state==='todo'){ other=p; break; } }
  if(it.deferred===0 && other>=0){
    it.deferred=1;
    var otherIdx=cur.order[other];
    cur.order.splice(other,1); cur.order.splice(cur.pos,1);
    cur.order.splice(cur.pos,0,otherIdx,idx);
    return {type:'defer', it:it, next:cur.items[otherIdx]};
  }
  var ex=EXI[it.exId], avoid={}, ex0={}; avoid[ex.st]=1; ex0[it.exId]=1;
  var pk=pickExercise(S, planItemOf(cur,it), {used:usedMap(cur,idx), pain:cur.pain, exclude:ex0, avoidSt:avoid});
  if(pk && pk.ex){ it.exId=pk.ex.id; it.light=!!pk.light; it.swap='busy'; it.deferred=2; return {type:'replace', old:ex, ex:pk.ex}; }
  it.state='skip'; it.swap='busyskip';
  return {type:'skip', old:ex};
}
/* Machine absente de la salle : on la retient et on remplace partout dans la séance. */
function actAbsent(S){
  var cur=S.cur, idx=cur.order[cur.pos], it=cur.items[idx], ex=EXI[it.exId], changes=[];
  S.unavail[unavailKey(ex)]=1;
  cur.items.forEach(function(x,i){
    if(x.state!=='todo' || x.sets.length) return;
    var e=EXI[x.exId]; if(isAvail(S,e)) return;
    var pk=pickExercise(S, planItemOf(cur,x), {used:usedMap(cur,i), pain:cur.pain});
    if(pk && pk.ex){ x.exId=pk.ex.id; x.planId=pk.ex.id; x.light=!!pk.light; x.swap='absent'; changes.push({old:e, ex:pk.ex, current:i===idx}); }
    else { x.state='skip'; x.swap='absentskip'; changes.push({old:e, ex:null, current:i===idx}); }
  });
  return {old:ex, changes:changes};
}
/* Douleur : on remplace les exercices qui chargent la zone, sinon version douce, sinon on passe. */
function actPain(S, pain){
  var out=[];
  S.pain=clone(pain);
  var cur=S.cur; if(!cur) return out;
  cur.pain=clone(pain);
  var curIdx=cur.order[cur.pos];
  cur.items.forEach(function(x,i){
    if(x.state!=='todo') return;
    var e=EXI[x.exId], st=stressOf(e,pain), wasPain=(x.swap==='pain'||x.swap==='light');
    if(st<2 && !wasPain){ return; }
    if(x.sets.length){
      if(st>=2){ x.state='done'; out.push({type:'stop', old:e, current:i===curIdx}); }
      return;
    }
    var pk=pickExercise(S, planItemOf(cur,x), {used:usedMap(cur,i), pain:pain});
    if(!pk || !pk.ex){ x.state='skip'; x.swap='painskip'; out.push({type:'skip', old:e, current:i===curIdx}); return; }
    var changed=pk.ex.id!==x.exId || !!pk.light!==!!x.light;
    x.exId=pk.ex.id; x.light=!!pk.light;
    x.swap=(pk.why==='pain'||pk.why==='light') ? pk.why : null;
    if(changed) out.push({type:pk.light?'light':'swap', old:e, ex:pk.ex, current:i===curIdx});
  });
  return out;
}
function actChoose(S, exId, keep){
  var cur=S.cur, it=curItem(cur), ex=EXI[exId];
  it.exId=exId; it.swap='choice'; it.deferred=2;
  it.light=hasPain(cur.pain) && stressOf(ex,cur.pain)>=2;
  if(keep){ S.prefs[it.key]=exId; it.planId=exId; }
  return ex;
}
function actSkip(S){
  var it=curItem(S.cur);
  it.state=it.sets.length?'done':'skip';
  if(!it.sets.length && !it.swap) it.swap='userskip';
  return it;
}
function finishSession(S, now){
  var cur=S.cur; if(!cur) return null;
  var any=cur.items.some(function(it){return it.sets.length>0;});
  var se={id:cur.id, tplId:cur.tplId, name:cur.name, start:cur.start, end:now, pain:cur.pain,
    items:cur.items.map(function(it){
      return {exId:it.exId, planId:it.planId, slot:it.slot, key:it.key, tg:it.tg, sets:it.sets, light:!!it.light, swap:it.swap||null, state:it.sets.length?'done':'skip'};
    })};
  S.cur=null;
  if(!any) return null;
  S.sessions.push(se);
  var c=cycle(S), i=c.indexOf(se.tplId);
  S.rot=((i>=0 ? i+1 : S.rot+1) % c.length);
  return se;
}

/* ---------- Charge conseillée ---------- */
function recommend(S, ex, tg, light, now){
  var inc=incOf(S,ex), H=exHistory(S,ex.id);
  var Hn=H.filter(function(e){return !e.light;}), Hl=H.filter(function(e){return e.light;});
  var lo=tg.lo, hi=tg.hi, i;
  if(light){ lo=15; hi=20; }
  var out={w:null, lo:lo, hi:hi, per:[], kind:'first', msg:'', last:null, plateau:false, inc:inc, e1:null};
  function refOf(entry){
    var b=bestSet(S,ex,entry.sets);
    var R=entry.sets.filter(function(s){return s.w===b.set.w;}).map(function(s){return s.r;});
    return {w:b.set.w, e1:b.e1, R:R};
  }
  var src=light ? Hl : Hn, rf;
  if(!src.length){
    if(light && Hn.length){
      rf=refOf(Hn[Hn.length-1]);
      out.w=ex.bw ? 0 : Math.max(inc, floorTo(rf.w*0.7, inc)); out.kind='light';
      out.msg='Version douce : charge réduite de 30 %, '+lo+' à '+hi+' répétitions, descente en 3 secondes.';
    } else {
      out.w=ex.bw ? 0 : (ex.start||20);
      if(light && !ex.bw) out.w=Math.max(inc, floorTo(out.w*0.7, inc));
      out.msg=ex.bw ? 'Première fois sur cet exercice. Arrête-toi 2 répétitions avant l\'échec. Je m\'en sers pour la suite.'
                    : 'Première fois sur cet exercice. Règle la charge pour faire '+hi+' répétitions en gardant 2 en réserve. Je m\'en sers pour la suite.';
    }
    return out;
  }
  var last=src[src.length-1]; rf=refOf(last);
  var R=rf.R, days=(now-last.t)/86400000, lastRir=last.sets[last.sets.length-1].rir;
  out.last={t:last.t, sets:last.sets, w:rf.w, R:R}; out.e1=rf.e1;
  if(days>21 && !ex.bw){
    out.w=Math.max(inc, floorTo(rf.w*0.9, inc)); out.kind='return';
    out.msg='Reprise après '+Math.round(days)+' jours sans cet exercice : charge réduite de 10 %.';
  } else if(R.length>=Math.min(2,tg.sets) && R.every(function(r){return r>=hi;})){
    if(ex.noload){
      out.w=rf.w; out.kind='hold';
      out.msg='Tu fais '+hi+' répétitions sur toutes les séries. Ralentis la descente à 3 secondes ou ajoute une série.';
    } else {
      var step=(lastRir!=null && lastRir>=3) ? 2*inc : inc;
      out.w=r2(rf.w+step); out.kind='up';
      out.msg='La dernière fois : '+R.join(', ')+' répétitions à '+fmtKg(rf.w)+' kg. Haut de la fourchette atteint, on monte.';
    }
  } else if(R[0]<lo && !(ex.bw && rf.w<=0)){
    var target=ex.bw ? r2(rf.w-inc) : floorTo(rf.e1/(1+(lo+1)/30), inc);
    out.w=Math.max(ex.bw?0:inc, Math.min(r2(rf.w-inc), target)); out.kind='down';
    out.msg=R[0]+' répétitions la dernière fois à '+fmtKg(rf.w)+' kg : trop lourd pour '+lo+'–'+hi+'. On descend.';
  } else {
    out.w=rf.w; out.kind='hold';
    out.msg='Même charge. La dernière fois : '+R.join(', ')+' répétitions. Vise une de plus.';
    for(i=0;i<tg.sets;i++){
      if(R[i]==null) break;
      out.per[i]=Math.max(lo, Math.min(hi, R[i]+1));
    }
  }
  if(!light && Hn.length>=3){
    var l3=Hn.slice(-3), nn=Math.min(l3[0].sets.length, l3[1].sets.length, l3[2].sets.length);
    var a=l3.map(function(e){return sessScore(S,ex,e.sets,nn);});
    if(a[2]<=a[0]*1.005 && a[1]<=a[0]*1.005) out.plateau=true;
  }
  return out;
}
function warmups(S, ex, w){
  if(ex.t!=='c' || ex.bw || !w) return [];
  var inc=incOf(S,ex);
  return [{w:Math.max(inc,floorTo(w*0.5,inc)), r:8},{w:Math.max(inc,floorTo(w*0.75,inc)), r:4}].filter(function(x){return x.w<w;});
}
/* Charge et répétitions visées pour la prochaine série, selon les séries déjà faites */
function setAdvice(S, ex, rec, done){
  var inc=rec.inc, lo=rec.lo, hi=rec.hi, n=done.length, r;
  if(!n){
    if(rec.per[0]) r=rec.per[0];
    else if(rec.kind==='first') r=hi;
    else if(rec.kind==='up' && rec.e1 && effW(S,ex,rec.w)>0) r=Math.max(lo, Math.min(hi, Math.round(30*(rec.e1/effW(S,ex,rec.w)-1))));
    else r=Math.round((lo+hi)/2);
    return {w:rec.w, r:r, note:''};
  }
  var last=done[n-1], w=last.w, note='';
  if(last.r<lo && !(ex.bw && w<=0)){
    var k=(lo-last.r>=3) ? 2 : 1;
    w=Math.max(ex.bw?0:inc, r2(w-k*inc));
    note='Sous la fourchette : baisse à '+fmtKg(w)+' kg.';
  } else if(last.r>hi && (last.rir==null || last.rir>=2) && !ex.noload){
    w=r2(w+inc); note='Trop facile : monte à '+fmtKg(w)+' kg.';
  }
  if(w<last.w) r=Math.max(lo, Math.min(hi, last.r+2));
  else if(w>last.w) r=Math.max(lo, hi-2);
  else if(w===rec.w && rec.per[n]) r=rec.per[n];
  else r=Math.max(lo, Math.min(hi, last.r-1));
  return {w:w, r:r, note:note};
}

/* ---------- Volume hebdomadaire (méthode fractionnelle : muscle aidant = 0,5 série) ---------- */
function setCredit(ex){
  var c={}; c[ex.m]=1;
  (ex.full||[]).forEach(function(m){ c[m]=1; });
  (ex.s||[]).forEach(function(m){ if(!c[m]) c[m]=0.5; });
  return c;
}
function volumeOf(items){
  var v={};
  items.forEach(function(it){
    var ex=EXI[it.exId]; if(!ex) return;
    var n=it.sets.filter(function(s){return s.r>0;}).length; if(!n) return;
    var c=setCredit(ex); for(var m in c) v[m]=(v[m]||0)+n*c[m];
  });
  return v;
}
function volumeWeek(S, now, extraItems){
  var ws=weekStart(now), v={};
  function add(o){ for(var m in o) v[m]=(v[m]||0)+o[m]; }
  S.sessions.forEach(function(se){ if(se.start>=ws && se.start<ws+7*864e5) add(volumeOf(se.items)); });
  if(extraItems) add(volumeOf(extraItems));
  return v;
}
function plannedWeek(S){
  var v={};
  cycle(S).forEach(function(tplId){
    var used={};
    planFor(S,tplId).forEach(function(p){
      var pk=pickExercise(S,p,{used:used}); if(!pk || !pk.ex) return;
      used[pk.ex.id]=1;
      var c=setCredit(pk.ex); for(var m in c) v[m]=(v[m]||0)+p.sets*c[m];
    });
  });
  return v;
}

/* ---------- Rapport de fin de séance ---------- */
function buildReport(S, se){
  var prevS={profile:S.profile, sessions:S.sessions.filter(function(x){return x.id!==se.id && x.start<se.start;})};
  var rows=[], nSets=0, nReps=0, ton=0, rirSum=0, rirN=0, prs=0, up=0, down=0, same=0, cmp=0, heavy=[], nEx=0;
  se.items.forEach(function(it){
    var ex=EXI[it.exId]; if(!ex) return;
    var sets=it.sets.filter(function(s){return s.r>0;});
    var row={exId:ex.id, name:ex.n, m:ex.m, per:!!ex.per, bw:!!ex.bw, sets:sets, light:!!it.light, swap:it.swap||null,
             planId:it.planId||null, tg:it.tg, status:'none', delta:null, pr:false, best:null, prev:null};
    if(sets.length){
      nEx++; nSets+=sets.length;
      sets.forEach(function(s){ nReps+=s.r; ton+=(s.w||0)*s.r*(ex.per?2:1); if(s.rir!=null){ rirSum+=s.rir; rirN++; } });
      var b=bestSet(S,ex,sets); row.best={w:b.set.w, r:b.set.r, e1:b.e1};
      var H=exHistory(prevS, ex.id).filter(function(e){return !!e.light===!!it.light;});
      if(H.length){
        var pb=bestSet(S,ex,H[H.length-1].sets);
        row.prev={w:pb.set.w, r:pb.set.r, e1:pb.e1, t:H[H.length-1].t};
        var pv=H[H.length-1].sets, nn=Math.min(sets.length, pv.length);
        row.delta=(sessScore(S,ex,sets,nn)/sessScore(S,ex,pv,nn)-1)*100; cmp++;
        if(row.delta>=1){ row.status='up'; up++; } else if(row.delta<=-2){ row.status='down'; down++; } else { row.status='same'; same++; }
        var allBest=Math.max.apply(null, H.map(function(e){return bestSet(S,ex,e.sets).e1;}));
        if(!it.light && b.e1>allBest*1.001){ row.pr=true; prs++; }
      } else row.status='new';
      var lo=it.light ? 15 : it.tg.lo;
      var loaded=sets.some(function(s){return s.w>0;});
      if((!ex.bw || loaded) && sets.filter(function(s){return s.r<lo;}).length>=2) heavy.push(ex.n);
    }
    rows.push(row);
  });
  var avgRir=rirN ? rirSum/rirN : null, com=[], verdict;
  if(!cmp){ verdict='Séance de référence'; com.push('Première séance enregistrée pour ces exercices. Les prochaines charges seront calculées à partir d\'aujourd\'hui.'); }
  else if(up/cmp>=0.6){ verdict='Séance en progrès'; com.push(up+' exercice'+(up>1?'s':'')+' sur '+cmp+' en hausse par rapport à la dernière fois.'); }
  else if(down/cmp>=0.5){ verdict='Séance en retrait'; com.push(down+' exercice'+(down>1?'s':'')+' sur '+cmp+' en baisse. Regarde ton sommeil et ton alimentation. Si cela se répète à la prochaine séance, allège de 10 % pendant une semaine.'); }
  else { verdict='Séance stable'; com.push(up+' en hausse, '+same+' stable'+(same>1?'s':'')+', '+down+' en baisse. Vise une répétition de plus par exercice la prochaine fois.'); }
  if(prs) com.push(prs+' record'+(prs>1?'s':'')+' battu'+(prs>1?'s':'')+' aujourd\'hui.');
  if(avgRir!=null && avgRir>=2.6) com.push('Tu gardes en moyenne '+fmtKg(Math.round(avgRir*10)/10)+' répétitions en réserve. Pour grossir, termine tes séries à 1 ou 2 répétitions de l\'échec.');
  if(avgRir!=null && rirN>=6 && avgRir<=0.4) com.push('Tu vas à l\'échec sur presque toutes les séries. Garde 1 à 2 répétitions en réserve sur les gros exercices : même gain, moins de fatigue.');
  if(heavy.length) com.push('Charge trop lourde pour la fourchette sur : '+heavy.join(', ')+'. Je la baisse la prochaine fois.');
  var zones=[]; for(var z in (se.pain||{})) if(se.pain[z]>0) zones.push(ZONES[z]);
  if(zones.length) com.push('Zone sensible aujourd\'hui : '+zones.join(', ')+'. Si la douleur dépasse 5 sur 10 ou dure encore demain matin, allège la prochaine séance. Si elle dure plusieurs jours, consulte un médecin ou un physiothérapeute.');
  if(S.profile.bw) com.push('Protéines : vise environ '+Math.round(S.profile.bw*1.6)+' g par jour (1,6 g par kilo).');
  var skipped=se.items.filter(function(it){return !it.sets.length;}).map(function(it){return EXI[it.exId]?EXI[it.exId].n:'';});
  return {id:se.id, name:se.name, start:se.start, end:se.end, durMin:Math.max(1,Math.round((se.end-se.start)/60000)),
    nEx:nEx, nSets:nSets, nReps:nReps, ton:Math.round(ton), avgRir:avgRir, prs:prs, up:up, down:down, same:same, cmp:cmp,
    verdict:verdict, comments:com, rows:rows, skipped:skipped,
    muscles:volumeOf(se.items), week:volumeWeek(S, se.start)};
}
function setLabel(row, s){
  if(row.bw) return (s.w>0 ? 'PC + '+fmtKg(s.w)+' kg' : 'PC')+' × '+s.r;
  return fmtKg(s.w)+' kg × '+s.r;
}
function reportText(rep, nextName){
  var d=new Date(rep.start), L=[];
  L.push('RAPPORT DE SÉANCE — '+rep.name);
  L.push(d.toLocaleDateString('fr-CH',{weekday:'long', day:'numeric', month:'long', year:'numeric'})+' · '+rep.durMin+' min');
  L.push(rep.verdict+' · '+rep.nSets+' séries · '+rep.nReps+' répétitions · '+rep.ton+' kg soulevés'+(rep.prs?' · '+rep.prs+' record(s)':''));
  L.push('');
  rep.rows.forEach(function(r){
    if(!r.sets.length) return;
    var s=r.sets.map(function(x){return setLabel(r,x);}).join(' | ');
    var t=r.status==='up'?'en hausse':r.status==='down'?'en baisse':r.status==='same'?'stable':'référence';
    if(r.delta!=null) t+=' ('+(r.delta>=0?'+':'')+fmtKg(Math.round(r.delta*10)/10)+' %)';
    L.push('• '+r.name+(r.light?' (version douce)':'')+' : '+s+' — '+t+(r.pr?' — RECORD':''));
  });
  if(rep.skipped.length){ L.push(''); L.push('Non faits : '+rep.skipped.join(', ')); }
  L.push('');
  rep.comments.forEach(function(c){ L.push('- '+c); });
  if(nextName){ L.push(''); L.push('Prochaine séance : '+nextName); }
  return L.join('\n');
}
