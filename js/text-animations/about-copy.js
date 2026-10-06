/* Ali & Sugow — About Us copy fade
   Each fold's copy fades (with a small rise) from one fold to the next, scrubbed by scroll — the same
   progress that drives the drawing, so copy and drawing can never sit in a half-way state on their own.
   Timing comes from js/animations/about-canvas.js (AS.state.aboutP, AS.aboutFade).
   Depends on js/core.js (window.AS). */
(function(){
  "use strict";
  var groups=[].slice.call(document.querySelectorAll("[data-ab-copy]"));
  if(!groups.length) return;
  var clamp01=AS.clamp01, smooth=AS.smooth;

  var RISE=14;   /* px the copy travels as it fades in (from below) and out (upwards) */

  var last=groups.map(function(){ return ""; });
  (function watch(){
    var F=AS.aboutFade, p=AS.state.aboutP||0;
    if(F){
      groups.forEach(function(g,i){
        var r=F[g.getAttribute("data-ab-copy")]; if(!r) return;
        var a=smooth(clamp01((p-r[0])/((r[1]-r[0])||1))), b=smooth(clamp01((p-r[2])/((r[3]-r[2])||1)));
        if(p<r[0]) a=0; if(r[1]<0) a=1;
        var o=a*(1-b), y=AS.reduce ? 0 : (1-a)*RISE - b*RISE;
        var key=o.toFixed(3)+"|"+y.toFixed(1);
        if(key!==last[i]){
          g.style.opacity=o.toFixed(3);
          g.style.translate="0 "+y.toFixed(1)+"px";
          g.style.visibility = o<0.002 ? "hidden" : "visible";
          last[i]=key;
        }
      });
    }
    requestAnimationFrame(watch);
  })();
})();
