/* Ali & Sugow — Expertise wave lines
   Every .wave-line[data-wave] gets an SVG path that can carry a travelling wave (the same wave
   warp as the homepage lines).
     hint  the scroll hint under the hero copy: a slow wave towards its dot end only
     menu  hero index lines: straight at rest; on hover a small wave grows in near the start of the
           line and runs (about the size of the cursor ripple on the other pages)
     (also: the centre rule in the top fold follows the cursor left/right, straight)
     rule  the rule above each discipline: the same small wave, settling in just after the dot as the
           block scrolls into view. Hovering the block sets it moving and shifts it along the line
           towards the cursor; leaving brings it back to the dot and holds it
   Depends on js/core.js (window.AS). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;
  var NS="http://www.w3.org/2000/svg";

  /* per kind: amplitude (px), wavelength (px), speed (cycles/s), and an envelope along the line */
  function bump(x,c,r){ var d=(x-c)/r; return Math.exp(-d*d); }
  var KIND={
    hint: { amp:2.4, len:22, speed:.35, env:function(x,L){ var u=x/L; return smooth(clamp01((u-0.35)/0.4))*(1-smooth(clamp01((u-0.9)/0.1))); } },
    menu: { amp:4.5, len:40, speed:.9,  env:function(x){ return smooth(clamp01(x/18))*bump(x,70,56); } },
    rule: { amp:5,   len:44, speed:.8,  env:function(x,L,w){ return smooth(clamp01(x/18))*bump(x,w.c,60); } }
  };
  var REST_C=80;   /* where the rule's wave rests, px after the dot */
  var STEP=3;

  var waves=[].map.call(document.querySelectorAll(".wave-line[data-wave]"), function(el){
    var svg=document.createElementNS(NS,"svg"), path=document.createElementNS(NS,"path");
    svg.setAttribute("aria-hidden","true"); svg.appendChild(path); el.appendChild(svg);
    var kind=el.getAttribute("data-wave");
    var w={el:el, svg:svg, path:path, kind:kind, k:KIND[kind], vertical:kind==="hint",
           a:0, phase:0, L:0, last:""};
    if(kind==="menu") w.host=el.closest("a");
    if(kind==="rule"){ w.host=el.closest(".area"); w.c=REST_C; w.mx=null; }
    if(kind==="hint") w.a=1;
    return w;
  });

  function measure(){
    waves.forEach(function(w){
      var r=w.el.getBoundingClientRect(), pad=8;
      w.L = w.vertical ? r.height : r.width;
      /* the svg overhangs the 1px line so the wave has room either side */
      if(w.vertical){ w.svg.setAttribute("width", pad*2); w.svg.setAttribute("height", w.L); w.svg.style.left=(-pad)+"px"; w.svg.style.top="0px"; w.off=pad; }
      else { w.svg.setAttribute("width", w.L); w.svg.setAttribute("height", pad*2); w.svg.style.top=(-pad+0.5)+"px"; w.svg.style.left="0px"; w.off=pad; }
      w.last="";
    });
  }

  function draw(w){
    var L=w.L, k=w.k, d="", n=Math.max(2, Math.ceil(L/STEP)), i, x, y;
    var amp=k.amp*w.a, flat=amp<0.02;
    for(i=0;i<=n;i++){
      x=L*i/n;
      y = flat ? 0 : amp*k.env(x,L,w)*Math.sin(2*Math.PI*x/k.len - w.phase);
      if(flat && i>0 && i<n) continue;                      /* a straight line needs only its ends */
      d += (d?"L":"M") + (w.vertical ? (w.off+y).toFixed(2)+","+x.toFixed(1) : x.toFixed(1)+","+(w.off+y).toFixed(2));
    }
    if(d!==w.last){ w.path.setAttribute("d", d); w.last=d; }
  }

  /* hover state for the hosts */
  waves.forEach(function(w){
    if(!w.host) return;
    w.hover=false;
    w.host.addEventListener("mouseenter", function(){ w.hover=true; });
    w.host.addEventListener("mouseleave", function(){ w.hover=false; });
    if(w.kind==="rule") w.host.addEventListener("mousemove", function(e){ w.mx=e.clientX; });
    if(w.kind==="menu"){
      w.host.addEventListener("focus", function(){ w.hover=true; });
      w.host.addEventListener("blur", function(){ w.hover=false; });
    }
  });

  var t0=performance.now(), prev=t0;
  /* ---------- the centre rule in the top fold: follows the cursor left/right within REACH,
     staying straight (as the vertical line on the About page does) ---------- */
  var hero=document.querySelector(".ex-hero"), rule=document.querySelector(".ex-hero-rule");
  var REACH=88, FOLLOW=0.07, OFF=0, lastOff=null, MX=null, inHero=false;
  if(hero){
    window.addEventListener("pointermove", function(e){
      if(e.pointerType && e.pointerType!=="mouse") return;
      var r=hero.getBoundingClientRect();
      MX=e.clientX-(r.left+r.width/2);
      inHero = e.clientY>=r.top && e.clientY<=r.bottom;
    }, {passive:true});
    document.addEventListener("pointerleave", function(){ inHero=false; });
    window.addEventListener("blur", function(){ inHero=false; });
  }
  function follow(){
    if(!rule) return;
    var target=(!reduce && inHero && MX!==null) ? REACH*Math.tanh(MX/REACH) : 0;
    OFF+=(target-OFF)*FOLLOW;
    var o=Math.round(OFF*10)/10;
    if(o!==lastOff){ rule.style.transform="translateX("+o+"px)"; lastOff=o; }
  }

  function frame(now){
    var dt=Math.min(0.05,(now-prev)/1000); prev=now;
    var vh=window.innerHeight;
    follow();
    waves.forEach(function(w){
      var k=w.k;
      if(w.kind==="hint"){
        if(!reduce) w.phase+=dt*k.speed*2*Math.PI;
      } else if(w.kind==="menu"){
        var tgt=w.hover?1:0;
        w.a = reduce ? tgt : w.a+(tgt-w.a)*Math.min(1,dt*7);
        if(w.a<0.002 && !w.hover) w.a=0;
        if(!reduce && w.a>0) w.phase+=dt*k.speed*2*Math.PI;
      } else {
        /* rule: grows in once the block's top is well on screen; resets when it drops back below */
        var top=w.el.getBoundingClientRect().top;
        if(!w.seen && top < vh*0.85){ w.seen=true; w.inT=now; }
        else if(w.seen && top > vh){ w.seen=false; w.a=0; w.phase=0; }
        if(w.seen){
          var e=reduce?1:clamp01((now-w.inT)/1100);
          w.a=smooth(e);
          /* hover shift: the wave slides along the line towards the cursor, and back to rest after */
          var left=w.el.getBoundingClientRect().left;
          var tc = (w.hover && w.mx!==null) ? Math.max(REST_C, Math.min(w.L-80, w.mx-left)) : REST_C;
          w.c = reduce ? tc : w.c+(tc-w.c)*Math.min(1,dt*4);
          /* the wave travels in as it arrives, then holds; hovering the block sets it moving again */
          if(!reduce && (e<1 || w.hover)) w.phase+=dt*k.speed*2*Math.PI*(e<1 ? 1-e*0.6 : 1);
        }
      }
      draw(w);
    });
    requestAnimationFrame(frame);
  }

  var rt=null;
  window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(measure, 80); }, {passive:true});
  measure();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  requestAnimationFrame(frame);
})();
