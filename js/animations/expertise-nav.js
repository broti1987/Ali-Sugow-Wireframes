/* Ali & Sugow — Expertise page navigation
   Side index: fixed at the right while the six disciplines are on screen; the current one shows its name.
   Case studies: the two filters (practice area, then service within it) narrow the cards.
   Also tells header.js when the dark case-studies band sits under the bar.
   Depends on js/core.js (window.AS). */
(function(){
  "use strict";
  var areasEl=document.getElementById("areas"), side=document.getElementById("side-menu");
  var cs=document.getElementById("case-studies");
  if(!areasEl) return;
  var areas=[].slice.call(areasEl.querySelectorAll(".area"));
  var links=[].slice.call(side.querySelectorAll("a"));

  /* ---------- side index + dark header ---------- */
  var lastId=null, lastOn=null;
  (function watch(){
    var vh=window.innerHeight, r=areasEl.getBoundingClientRect();
    var on = r.top < vh*0.5 && r.bottom > vh*0.5;
    if(on!==lastOn){ side.classList.toggle("is-on", on); lastOn=on; }
    var cur=areas[0].id;
    for(var i=0;i<areas.length;i++){ if(areas[i].getBoundingClientRect().top <= vh*0.5) cur=areas[i].id; }
    if(cur!==lastId){
      links.forEach(function(a){ var c=a.getAttribute("data-area")===cur; a.classList.toggle("is-current", c); if(c) a.setAttribute("aria-current","location"); else a.removeAttribute("aria-current"); });
      lastId=cur;
    }
    if(cs){ var c=cs.getBoundingClientRect(); AS.state.groundDark = c.top <= 44 && c.bottom >= 44; }
    requestAnimationFrame(watch);
  })();

  /* ---------- case-study filters ---------- */
  if(!cs) return;
  var cards=[].slice.call(cs.querySelectorAll(".cs-card")), empty=document.getElementById("cs-empty");
  var AREAS=areas.map(function(a){
    return { name:a.querySelector(".area-name").textContent, services:[].map.call(a.querySelectorAll(".tag"), function(t){ return t.textContent; }) };
  });
  var state={area:null, service:null};
  var filters={};
  [].forEach.call(cs.querySelectorAll(".cs-filter"), function(f){
    filters[f.getAttribute("data-filter")]={el:f, btn:f.querySelector("button"), list:f.querySelector(".cs-options"), label:f.querySelector(".cs-filter-label"), base:f.querySelector(".cs-filter-label").textContent};
  });

  function options(kind){
    if(kind==="area") return [null].concat(AREAS.map(function(a){ return a.name; }));
    var svc=[];
    if(state.area){ AREAS.forEach(function(a){ if(a.name===state.area) svc=a.services.slice(); }); }
    else AREAS.forEach(function(a){ svc=svc.concat(a.services); });
    return [null].concat(svc);
  }
  function render(kind){
    var F=filters[kind], cur=state[kind];
    F.list.innerHTML="";
    options(kind).forEach(function(v){
      var li=document.createElement("li"), b=document.createElement("button");
      b.type="button"; b.textContent = v || (kind==="area" ? "All practice areas" : "All services");
      b.setAttribute("role","option"); b.setAttribute("aria-selected", String(v===cur));
      b.addEventListener("click", function(){
        state[kind]=v;
        if(kind==="area") state.service=null;      /* services belong to an area */
        F.label.textContent = v || F.base;
        if(kind==="area") filters.service.label.textContent=filters.service.base;
        close(); apply();
      });
      li.appendChild(b); F.list.appendChild(li);
    });
  }
  function close(){ Object.keys(filters).forEach(function(k){ filters[k].list.hidden=true; filters[k].btn.setAttribute("aria-expanded","false"); }); }
  Object.keys(filters).forEach(function(k){
    var F=filters[k];
    F.list.setAttribute("role","listbox");
    F.btn.addEventListener("click", function(e){
      e.stopPropagation();
      var open=F.list.hidden; close();
      if(open){ render(k); F.list.hidden=false; F.btn.setAttribute("aria-expanded","true"); }
    });
  });
  document.addEventListener("click", function(e){ if(!e.target.closest(".cs-filter")) close(); });
  document.addEventListener("keydown", function(e){ if(e.key==="Escape") close(); });

  function apply(){
    var n=0;
    cards.forEach(function(c){
      var ok=(!state.area || c.getAttribute("data-area")===state.area) && (!state.service || c.getAttribute("data-service")===state.service);
      c.hidden=!ok; if(ok) n++;
    });
    empty.hidden = n>0;
  }
})();
