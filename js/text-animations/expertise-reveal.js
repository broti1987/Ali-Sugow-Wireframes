/* Ali & Sugow — expertise list reveal
   Fold 2: the six practice areas slide up into place one by one as the fold lands, and replay
   when you scroll back up past it. Styles: css/text-animations.css (.expertise li / a / .is-in).
   Depends on js/core.js (window.AS). */
(function(){
  "use strict";
  var reduce=AS.reduce;

  var list=document.querySelector(".expertise");
  var items=[].slice.call(list.querySelectorAll("a"));
  items.forEach(function(a,i){ a.style.setProperty("--d", (i*0.09).toFixed(2)+"s"); });
  if(reduce){ list.classList.add("is-in"); }
  else {
    /* in once fold 2 has nearly landed; reset when it is back below the screen, so it plays again */
    var shown=false;
    (function watch(){
      var top=list.getBoundingClientRect().top, vh=window.innerHeight;
      if(!shown && top < vh*0.62){ list.classList.add("is-in"); shown=true; }
      else if(shown && top > vh){ list.classList.remove("is-in"); shown=false; }
      requestAnimationFrame(watch);
    })();
  }
})();
