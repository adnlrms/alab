/* ALAB live sharing (optional, opt-in)
   Sends this device's location and its current triangulated heat index to the
   Division's ALAB relay ONLY while the app is open on screen and sharing is on.
   Also sends classroom thermometer readings when they are saved.
   Nothing is sent before the user reads the privacy notice and agrees. */
(function(){
"use strict";
var PING_MS=5*60e3, MOVE_M=300, KEY="alab.share", OUTBOX="alab.outbox", MAX_OUT=300;
var ROLES=["School Head","Teacher","School DRRM Coordinator","Division personnel","Other"];
function ld(k,d){try{var v=localStorage.getItem(k);return v?JSON.parse(v):d;}catch(e){return d;}}
function sv(k,v){try{localStorage.setItem(k,JSON.stringify(v));}catch(e){}}
function q(s){return document.querySelector(s);}
function h(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
function base(){return (window.cfg&&cfg.relay||"").trim().replace(/\/+$/,"");}
function devId(){var id=ld("alab.deviceId",null);if(!id){id=(window.crypto&&crypto.randomUUID?crypto.randomUUID():"d"+Date.now().toString(36)+Math.random().toString(36).slice(2,12));sv("alab.deviceId",id);}return id;}

var sh=Object.assign({on:false,agreed:0,code:"",school:"",schoolId:"",district:"",role:"",name:""},ld(KEY,{}));
var st={last:0,lastLevel:null,lastPos:null,state:"off",msg:"",busy:false,timer:null};
function save(){sv(KEY,sh);}

/* ---------- UI ---------- */
var css=document.createElement("style");
css.textContent=
"#shareChip{display:inline-flex;align-items:center;gap:6px;margin:6px 0 0;padding:5px 11px;border-radius:99px;border:1px solid var(--line);background:var(--card);color:var(--ink2);font-size:12.5px;font-weight:700}"+
"#shareChip .d{width:8px;height:8px;border-radius:50%;background:#9aa0a6}"+
"#shareChip[data-s=on] .d{background:#1e9e4a;box-shadow:0 0 0 3px rgba(30,158,74,.2)}#shareChip[data-s=queued] .d{background:#e8a317}#shareChip[data-s=err] .d{background:#c4120f}"+
"#sheetShare .note{text-align:left;font-size:13px;line-height:1.45;color:var(--ink2);background:var(--bg,rgba(0,0,0,.03));border:1px solid var(--line);border-radius:12px;padding:10px 12px;margin:8px 0}"+
"#sheetShare .note ul{margin:6px 0 0 18px;padding:0}#sheetShare .note li{margin:3px 0}"+
"#sheetShare .agree{display:flex;gap:10px;align-items:flex-start;font-size:13.5px;margin:10px 0}#sheetShare .agree input{width:20px;height:20px;flex:none;margin-top:1px}"+
"#sheetShare .rowb{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}#sheetShare .rowb .btn{flex:1}"+
"#sheetShare .err{color:#c4120f;font-size:13px;font-weight:700;min-height:1em}"+
"#shareSet{margin-top:8px}#shareSet .switch b{font-size:14px}";
document.head.appendChild(css);

var chip=document.createElement("button");chip.id="shareChip";chip.type="button";chip.dataset.s="off";
chip.innerHTML='<span class="d"></span><span id="shareTxt">Live map: off</span>';
var pill=q("#locPill"); if(pill&&pill.parentNode) pill.parentNode.insertBefore(chip,pill.nextSibling);

var sheet=document.createElement("div");sheet.className="sheet";sheet.id="sheetShare";sheet.setAttribute("role","dialog");sheet.setAttribute("aria-label","Live map sharing");
sheet.innerHTML=
'<button class="grab" aria-label="Close"></button><h3>Division live heat map</h3>'+
'<div class="note"><b>Privacy notice (Data Privacy Act of 2012)</b><ul>'+
'<li><b>What is sent:</b> this device\'s location (GPS, with its accuracy), the triangulated heat index and 4H level every few minutes, and the classroom thermometer readings you save. Also your school, school ID, district, role and (optional) name.</li>'+
'<li><b>When:</b> only while ALAB is open on your screen and this switch is on. Nothing is sent when the app is closed or in the background.</li>'+
'<li><b>Why:</b> so the Schools Division Office can see heat conditions across schools in real time and keep day-to-day records under DM No. 064, s. 2026.</li>'+
'<li><b>Who sees it:</b> authorised SDO personnel with the admin passcode only. It is not public.</li>'+
'<li><b>How long:</b> live locations are removed after 24 hours without activity. Readings are kept for 3 years to compare hot seasons, then deleted automatically.</li>'+
'<li><b>Your choices:</b> sharing is voluntary. ALAB works fully without it. You can stop at any time, and “Delete my data” removes your location and name from all records on the server. Questions: the Division Data Protection Officer.</li>'+
'</ul></div>'+
'<label for="shCode">Division join code</label><input id="shCode" autocomplete="off" autocapitalize="characters" placeholder="From your SDO">'+
'<div class="two"><div><label for="shSchool">School</label><input id="shSchool"></div><div><label for="shSchoolId">School ID</label><input id="shSchoolId" inputmode="numeric"></div></div>'+
'<div class="two"><div><label for="shDistrict">District</label><input id="shDistrict" placeholder="e.g. Buenavista I"></div>'+
'<div><label for="shRole">Role</label><select id="shRole"><option value="">Choose…</option>'+ROLES.map(function(r){return "<option>"+r+"</option>";}).join("")+'</select></div></div>'+
'<label for="shName">Name (optional)</label><input id="shName" autocomplete="name" placeholder="Leave blank to stay anonymous">'+
'<label class="agree"><input type="checkbox" id="shAgree"><span>I have read the privacy notice and I agree to share my location and readings while ALAB is open.</span></label>'+
'<p class="err" id="shErr"></p>'+
'<div class="rowb"><button class="btn big" id="shStart">Agree &amp; start sharing</button></div>'+
'<div class="rowb" id="shManage" hidden><button class="btn sec" id="shStop">Stop sharing</button><button class="btn sec" id="shDelete">Delete my data</button></div>'+
'<p style="font-size:12px;color:var(--muted);margin-top:10px" id="shInfo"></p>';
var scrim=q("#scrim"); (scrim&&scrim.parentNode?scrim.parentNode:document.body).appendChild(sheet);
sheet.querySelector(".grab").onclick=function(){closeSheets();};

// entry in Settings
var done=q("#saveSettings");
if(done){var box=document.createElement("div");box.id="shareSet";
  box.innerHTML='<div class="switch"><span><b>Division live map</b><br><small style="color:var(--muted)" id="shareSetTxt">Off. Share your location and readings with the SDO</small></span><button class="btn sec" id="shareOpen" style="padding:8px 12px">Set up</button></div>';
  done.parentNode.insertBefore(box,done); q("#shareOpen").onclick=function(){openShare();};}
chip.onclick=function(){openShare();};

function openShare(){
  q("#shCode").value=sh.code||""; q("#shSchool").value=sh.school||(window.cfg&&cfg.school)||""; q("#shSchoolId").value=sh.schoolId||(window.cfg&&cfg.schoolId)||"";
  q("#shDistrict").value=sh.district||""; q("#shRole").value=sh.role||""; q("#shName").value=sh.name||"";
  q("#shAgree").checked=!!sh.agreed; q("#shErr").textContent="";
  q("#shStart").textContent=sh.on?"Save changes":"Agree & start sharing";
  q("#shManage").hidden=!(sh.on||sh.agreed);
  q("#shInfo").textContent="Device code: "+devId().slice(0,8)+" · "+(base()?"Relay: "+base().replace(/^https?:\/\//,""):"No relay link yet: add it in Settings first.");
  openSheet("#sheetShare");
}

q("#shStart").onclick=function(){
  var e=q("#shErr"), v={code:q("#shCode").value.trim(),school:q("#shSchool").value.trim(),schoolId:q("#shSchoolId").value.trim(),district:q("#shDistrict").value.trim(),role:q("#shRole").value,name:q("#shName").value.trim()};
  if(!base()){e.textContent="Add the ALAB relay link in Settings first.";return;}
  if(!v.code){e.textContent="Enter the Division join code.";return;}
  if(!v.school){e.textContent="Enter your school.";return;}
  if(!v.role){e.textContent="Choose your role.";return;}
  if(!q("#shAgree").checked){e.textContent="Please read the notice and tick the box to agree.";return;}
  var b=q("#shStart"); b.disabled=true; e.textContent="";
  // check the join code with a first live ping
  Object.assign(sh,v,{agreed:Date.now()});
  send(true).then(function(r){ b.disabled=false;
    if(r&&r.ok){ sh.on=true; save(); closeSheets(); toast("Sharing on. The SDO live map now shows your heat index."); flush(); }
    else if(r&&r.status===403){ sh.on=false; save(); e.textContent="Wrong Division join code. Ask your SDO for the current code."; }
    else if(r&&r.status===400){ sh.on=false; save(); e.textContent=r.error||"The server did not accept this."; }
    else if(r&&r.noloc){ sh.on=true; save(); closeSheets(); toast("Sharing on. Waiting for your location and weather data…"); }
    else { sh.on=true; save(); closeSheets(); toast("Sharing on. Will send when the connection is back."); }
    paint(); });
};
q("#shStop").onclick=function(){ sh.on=false; save(); post("/api/me/stop",{device_id:devId()}).then(function(){toast("Sharing stopped. Your live location was removed from the map.");},function(){toast("Sharing stopped on this device.");}); closeSheets(); paint(); };
q("#shDelete").onclick=function(){
  if(!confirm("Delete my data from the Division server? Your live location is removed, and your name and location are erased from all past readings. This cannot be undone.")) return;
  post("/api/me/delete",{device_id:devId()}).then(function(r){
    if(r.ok){ sh.on=false; sh.agreed=0; save(); sv(OUTBOX,[]); localStorage.removeItem("alab.deviceId"); closeSheets(); toast("Your data was deleted from the server."); }
    else toast("Could not delete: "+(r.error||"server error")); paint();
  },function(){toast("No connection. Try again when online.");});
};

function paint(){
  var out=ld(OUTBOX,[]).length, s=!sh.on?"off":st.state==="err"?"err":out?"queued":"on";
  chip.dataset.s=s;
  q("#shareTxt").textContent=!sh.on?"Live map: off":s==="err"?"Live map: "+(st.msg||"not sending"):out?"Live map: "+out+" waiting to send":"Live map: sharing"+(st.last?" · "+ago(Date.now()-st.last):"");
  var t=q("#shareSetTxt"); if(t) t.textContent=sh.on?"On while ALAB is open · "+(sh.school||""):"Off. Share your location and readings with the SDO";
  var o=q("#shareOpen"); if(o) o.textContent=sh.on?"Manage":"Set up";
}
function ago(ms){var m=Math.round(ms/60000);return m<1?"just now":m<60?m+" min ago":Math.round(m/60)+" h ago";}

/* ---------- network ---------- */
function post(path,obj){
  return fetch(base()+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(obj),cache:"no-store"})
    .then(function(r){return r.json().catch(function(){return {};}).then(function(j){j.status=r.status;if(r.ok&&j.ok!==false)j.ok=true;return j;});});
}
function who(){return {code:sh.code,device_id:devId(),school:sh.school,school_id:sh.schoolId,district:sh.district,role:sh.role,name:sh.name||null};}
function locNow(){try{var p=here();return p&&p.lat!=null?p:null;}catch(e){return null;}}
function snapshot(){
  try{
    var T=triangulate(); if(!T) return null;
    var legs=(T.legs||[]).map(function(l){return l.k==="class"?(l.measured?"thermometer":"class-est"):l.k;}).join("+");
    var detail=legs+(T.verified?" | verified":" | unverified")+(T.reason?" | "+T.reason:"")+(T.room?" | room "+T.room:"");
    return {hi:T.hi,level:T.level||levelOf(T.hi),t:T.lead&&T.lead.t,rh:T.lead&&T.lead.rh,nsrc:T.nsrc,verified:!!T.verified,detail:detail.slice(0,300)};
  }catch(e){return null;}
}
function send(force){
  if(!force&&(!sh.on||document.hidden||st.busy)) return Promise.resolve(null);
  if(!base()) { st.state="err"; st.msg="no relay link"; paint(); return Promise.resolve(null); }
  var p=locNow(), s=snapshot();
  if(!p||!s) return Promise.resolve({noloc:true});
  if(!navigator.onLine){ st.state="err"; st.msg="offline"; paint(); return Promise.resolve(null); }
  st.busy=true;
  var body=Object.assign(who(),{lat:+p.lat.toFixed(5),lon:+p.lon.toFixed(5),acc:p.acc!=null?Math.round(p.acc):null,loc_kind:p.kind||"gps"},s);
  return post("/api/ping",body).then(function(r){
    st.busy=false;
    if(r.ok&&r.throttled){ st.state="on"; st.msg=""; clearTimeout(st.retry); st.retry=setTimeout(function(){send();},50e3); }
    else if(r.ok){ st.last=Date.now(); st.lastLevel=s.level; st.lastPos={lat:p.lat,lon:p.lon}; st.state="on"; st.msg=""; }
    else { st.state="err"; st.msg=r.status===403?"wrong join code":r.status===503?"server not set up":(r.error||"error").slice(0,40);
      if(r.status===403&&!force){ sh.on=false; save(); toast("Live map sharing stopped: the Division join code changed. Enter the new code."); } }
    paint(); return r;
  },function(){ st.busy=false; st.state="err"; st.msg="no connection"; paint(); return null; });
}

/* thermometer readings: queued, sent now or when back online */
function queueReading(r){
  var p=locNow(); if(!p) p=st.lastPos;
  var item=Object.assign(who(),{room:r.room||null,slot:r.slot,t:+r.rawT.toFixed(1),rh:Math.round(r.rawRH),hi:r.hi,level:r.level,ts:r.ts,
    lat:p?+p.lat.toFixed(5):null,lon:p?+p.lon.toFixed(5):null,acc:p&&p.acc!=null?Math.round(p.acc):null,detail:"chart "+r.T+" °C / "+r.R+"%"});
  var out=ld(OUTBOX,[]); out.push(item); if(out.length>MAX_OUT) out=out.slice(-MAX_OUT); sv(OUTBOX,out); paint(); flush();
}
var flushing=false;
function flush(){
  if(flushing||!sh.on||!base()||!navigator.onLine) return;
  var out=ld(OUTBOX,[]); if(!out.length) return; flushing=true;
  var it=out[0]; it.code=sh.code; if(it.lat==null){var p=locNow();if(p){it.lat=+p.lat.toFixed(5);it.lon=+p.lon.toFixed(5);}}
  if(it.lat==null){flushing=false;return;}
  post("/api/reading",it).then(function(r){
    flushing=false;
    if(r.ok||r.status===400){ var o=ld(OUTBOX,[]); o.shift(); sv(OUTBOX,o); if(r.ok&&st.state==="err"){st.state="on";st.msg="";} paint(); if(r.ok) setTimeout(flush,300); }   // drop invalid ones, keep going
    else { st.state="err"; st.msg=r.status===403?"wrong join code":"server error"; paint(); }
  },function(){flushing=false;});
}

/* ---------- hooks into the app ---------- */
var _add=window.addReading;
if(typeof _add==="function") window.addReading=function(o){
  _add.apply(this,arguments);
  if(sh.on&&o&&o.src==="manual"){ var r=readings[readings.length-1]; if(r&&r.src==="manual") queueReading(r); setTimeout(function(){send();},1500); }
};
var _render=window.render;
if(typeof _render==="function") window.render=function(){
  var r=_render.apply(this,arguments);
  if(sh.on&&!document.hidden){ var l=document.body.dataset.l; if(st.lastLevel&&l&&l!=="none"&&l!==st.lastLevel&&Date.now()-st.last>50e3) send(); }
  return r;
};
function dist(a,b){var R=6371e3,r=Math.PI/180,dl=(b.lat-a.lat)*r,dn=(b.lon-a.lon)*r,x=Math.sin(dl/2)*Math.sin(dl/2)+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dn/2)*Math.sin(dn/2);return 2*R*Math.asin(Math.sqrt(x));}
function tick(){
  if(!sh.on||document.hidden) { paint(); return; }
  var p=locNow(), due=Date.now()-st.last>=PING_MS, moved=p&&st.lastPos&&dist(p,st.lastPos)>MOVE_M&&Date.now()-st.last>50e3;
  var l=document.body.dataset.l, changed=st.lastLevel&&l&&l!=="none"&&l!==st.lastLevel;
  if(due||moved||changed||!st.last) send(); else paint();
  flush();
}
document.addEventListener("visibilitychange",function(){ if(!document.hidden) setTimeout(tick,2500); });
addEventListener("online",function(){ setTimeout(tick,1500); });
st.timer=setInterval(tick,30e3);
setTimeout(tick,8000);
paint();
window.ALABLive={send:send,flush:flush,state:function(){return {share:sh,st:st,outbox:ld(OUTBOX,[])};}};
})();
