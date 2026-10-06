/* Ali & Sugow — slot-machine link hover
   Every letter of a link becomes a three-row column (letter, random letter, letter) that rolls up
   on hover / focus, staggered left to right. Styles: css/text-animations.css (.slot, .reel-ch).
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- nav: slot-machine roll on hover ----------
     each letter is a three-row column (letter, a random letter, letter) that spins up on
     hover, staggered left to right, and lands with a slight overshoot */
  (function(){
    var ABC="ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    [].forEach.call(document.querySelectorAll(".nav a, .foot-menu a, .foot-links a, .expertise a, .sec-btn .sec-label"), function(a){
      var txt=a.textContent; a.setAttribute("aria-label", txt);
      var slot=document.createElement("span"); slot.className="slot"; slot.setAttribute("aria-hidden","true");
      for(var i=0;i<txt.length;i++){
        var c=txt[i], col=document.createElement("span"); col.className="reel-ch"; col.style.setProperty("--i", i);
        var mid = c===" " ? " " : ABC[Math.floor(Math.random()*26)];
        [c, mid, c].forEach(function(ch){ var sp=document.createElement("span"); sp.textContent=ch; col.appendChild(sp); });
        slot.appendChild(col);
      }
      a.textContent=""; a.appendChild(slot);
    });
  })();
})();
