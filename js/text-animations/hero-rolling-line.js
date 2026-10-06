/* Ali & Sugow — hero rolling line
   Fold 1, line 2 ("Improving their communities." …). Phrases swap letter by letter: outgoing letters
   slide up and out, incoming ones slide up into place. Styles: css/text-animations.css (.roller, .rl).
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- hero line 2: each phrase swaps letter by letter — the outgoing letters slide up
     and out, the incoming ones slide up into place, left to right (same move as the footer name) ---------- */
  (function(){
    var lines=[].slice.call(document.querySelectorAll("#roller > span")), i=0;
    lines.forEach(function(ln){
      var txt=ln.textContent.replace(/(^|\s)(\S)/g, function(m,a,b){ return a+b.toUpperCase(); });
      ln.setAttribute("aria-label", txt); ln.textContent="";
      for(var k=0;k<txt.length;k++){ var c=document.createElement("span"); c.className="rl"; c.setAttribute("aria-hidden","true"); c.style.setProperty("--i",k); c.textContent=txt[k]; ln.appendChild(c); }
    });
    if(reduce || lines.length<2) return;
    setInterval(function(){
      if(document.hidden) return;
      var cur=lines[i], nxt=lines[(i+1)%lines.length];
      /* park the incoming phrase below the window without animating */
      nxt.classList.add("snap"); nxt.classList.remove("is-out","is-on"); void nxt.offsetHeight; nxt.classList.remove("snap");
      cur.classList.remove("is-on"); cur.classList.add("is-out");
      nxt.classList.add("is-on");
      i=(i+1)%lines.length;
    }, 2800);
  })();

})();
