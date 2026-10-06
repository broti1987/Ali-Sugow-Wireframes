/* Ali & Sugow — core
   Shared helpers used by every animation file, placeholder links, and the phone menu.
   Load this first. */
(function(){
  "use strict";
  window.AS = window.AS || {};
  AS.reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  AS.clamp01 = function(t){ return t<0?0:t>1?1:t; };
  AS.smooth  = function(t){ return t*t*(3-2*t); };
  AS.state   = { groundDark:false };   /* written by our-work-reels.js, read by header.js */

  /* placeholder links go nowhere yet — remove once real URLs are in */
  document.addEventListener("click", function(e){
    var a = e.target.closest && e.target.closest("[data-stub]");
    if(a) e.preventDefault();
  });

  /* ---------- mobile menu ---------- */
  var mb=document.getElementById("menu-btn"), mp=document.getElementById("menu-panel");
  mb.addEventListener("click", function(){
    var open = mp.hidden; mp.hidden = !open; mb.setAttribute("aria-expanded", String(open));
  });
  mp.addEventListener("click", function(e){ if(e.target.tagName==="A"){ mp.hidden=true; mb.setAttribute("aria-expanded","false"); } });
})();
