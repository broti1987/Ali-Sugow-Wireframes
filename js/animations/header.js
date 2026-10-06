/* Ali & Sugow — header states
   Bar shows the logotype once past the top fold, turns dark over Our Work, and slides away when the footer arrives.
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  var header=document.getElementById("site-header"), footerEl=document.querySelector(".site-footer");
  var lastTop=null, lastDark=null, lastGone=null;
  function update(){
    var vh=window.innerHeight;
    var isTop = window.scrollY < vh*0.2, isDark = AS.state.groundDark;
    var isGone = footerEl.getBoundingClientRect().top < vh*0.85;
    if(isTop!==lastTop){ header.classList.toggle("is-top", isTop); lastTop=isTop; }
    if(isDark!==lastDark){ header.classList.toggle("is-dark", isDark); lastDark=isDark; }
    if(isGone!==lastGone){ header.classList.toggle("is-gone", isGone); lastGone=isGone; }
    requestAnimationFrame(update);
  }
  requestAnimationFrame(update);
})();
