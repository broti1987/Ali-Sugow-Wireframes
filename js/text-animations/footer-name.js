/* Ali & Sugow — footer firm name
   Scales "ALI & SUGOW ADVOCATES LLP" so it always spans the footer card exactly, and slides the
   letters up into place (left to right) each time it scrolls into view. Styles: css/text-animations.css (.big, .bl).
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- footer firm name: scaled so it always spans the wrapper exactly ---------- */
  (function(){
    var big=document.getElementById("big"), span=big.firstElementChild;
    /* split into letters for the come-in */
    var txt=span.textContent; span.setAttribute("aria-label", txt); span.textContent="";
    var letters=[];
    for(var ci=0;ci<txt.length;ci++){ var b=document.createElement("span"); b.className="bl"; b.setAttribute("aria-hidden","true"); b.textContent=txt[ci]; span.appendChild(b); letters.push(b); }
    function fit(){
      big.style.fontSize="100px";
      var w=big.clientWidth, tw=span.getBoundingClientRect().width;
      if(tw>0) big.style.fontSize=(100*w/tw).toFixed(2)+"px";
    }
    window.addEventListener("resize", fit, {passive:true});
    fit();

    /* come-in: each letter slides up into place from under its line, rolling left to right */
    var foot=document.querySelector(".site-footer"), n=letters.length, c=(n-1)/2, seeds=[];
    function rnd(k){ var x=Math.sin(k*91.7+13.1)*43758.5453; return x-Math.floor(x); }
    for(var li=0;li<n;li++){
      /* subtle: a short rise with a hint of tilt, rolling left to right */
      seeds.push({ y: 1.2, r: 0, x: 0, d: li/n*0.35 });
    }
    /* played once each time the name scrolls into view (reset once the footer has left the screen) */
    var state="armed", t0=0, DUR=1100;
    function apply(p){
      var em=parseFloat(big.style.fontSize)||85;
      for(var i=0;i<n;i++){
        var sd=seeds[i], e=1-Math.pow(1-clamp01((p-sd.d)/0.65),3), q=1-e;
        letters[i].style.transform = q<0.001 ? "" :
          "translate3d(0,"+(sd.y*em*q).toFixed(1)+"px,0)";
      }
    }
    function watch(now){
      var vh=window.innerHeight, r=big.getBoundingClientRect(), fr=foot.getBoundingClientRect();
      if(state==="armed" && r.top < vh-40){ state="playing"; t0=now; }
      if(state==="playing"){ var p=clamp01((now-t0)/DUR); apply(p); if(p>=1) state="done"; }
      if(state==="done" && fr.top > vh){ state="armed"; apply(0); }
      requestAnimationFrame(watch);
    }
    if(reduce){ apply(1); } else { apply(0); requestAnimationFrame(watch); }
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(fit);
  })();
})();
