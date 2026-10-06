/* Ali & Sugow — testimonials + leading line
   Testimonials cycle every 5s (pause while the cursor is on the client grid; hover a tile to show its
   quote). A canvas line leads from after the company name to the client tile, with an always-on ripple.
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- trust: testimonials cycle; a line leads from the quote to its client ----------
     The line is one cubic curve (flat out of the dot, flat into the tile), drawn on a canvas that
     sits under the columns, so it passes beneath any tiles in its way. It takes the same cursor
     ripple as the hero. On each change it runs off into the old tile, then draws out to the new one. */
  (function(){
    var trust=document.getElementById("trust");
    var quotes=[].slice.call(document.querySelectorAll("#quotes .quote"));
    var logos=[].slice.call(document.querySelectorAll("#client-grid .logo"));
    var grid=document.getElementById("client-grid");
    var cvL=document.getElementById("lead-line"), cx=cvL.getContext("2d");
    var cur=0, timer=null, Wd=0, Hd=0, dprL=1, geo=null;
    var phase="hold", t0=0, next=-1;          /* hold | out (run off into tile) | in (draw out) */
    var DRAW_MS=800, OUT_MS=320, CYCLE_MS=5000, N=220;
    var hov={x:0,y:0,tx:0,ty:0,s:1,ts:1,seen:false,over:false,cx:0,cy:0};
    var R=56, A=7, K=Math.PI*2/44, WV=7;

    function logoFor(n){ for(var i=0;i<logos.length;i++){ if(logos[i].dataset.q!==undefined && Number(logos[i].dataset.q)===n) return logos[i]; } return null; }
    function ease(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }

    function size(){
      var r=trust.getBoundingClientRect();
      dprL=Math.min(2, window.devicePixelRatio||1); Wd=r.width; Hd=r.height;
      cvL.width=Math.round(Wd*dprL); cvL.height=Math.round(Hd*dprL);
      geo=geometry(cur);
    }
    /* starts just after the company name, ends mid-way down the client tile's left edge */
    function geometry(n){
      var T=trust.getBoundingClientRect();
      var role=quotes[n].querySelector(".role").getBoundingClientRect();
      var lg=grid.getBoundingClientRect();   /* the focus slot is always the first circle in the row */
      var x0=role.right-T.left+24, y0=role.top-T.top+role.height/2;
      var x3=lg.left-T.left, y3=lg.top-T.top+72;
      var dx=x3-x0;
      return {x0:x0,y0:y0, x1:x0+dx*0.45,y1:y0, x2:x3-dx*0.45,y2:y3, x3:x3,y3:y3};
    }
    function bez(g,t,o){
      var u=1-t, a=u*u*u, b=3*u*u*t, c=3*u*t*t, d=t*t*t;
      o.x=a*g.x0+b*g.x1+c*g.x2+d*g.x3; o.y=a*g.y0+b*g.y1+c*g.y2+d*g.y3;
      var da=-3*u*u, db=3*u*u-6*u*t, dc=6*u*t-3*t*t, dd=3*t*t;
      o.tx=da*g.x0+db*g.x1+dc*g.x2+dd*g.x3; o.ty=da*g.y0+db*g.y1+dc*g.y2+dd*g.y3;
    }
    function ripple(X,Y,time){
      if(hov.s<0.005) return 0;
      var ddx=X-hov.x, ddy=Y-hov.y, d2=ddx*ddx+ddy*ddy, r2=d2/(R*R);
      if(r2>9) return 0;
      return hov.s*A*Math.exp(-r2)*Math.sin(Math.sqrt(d2)*K - time*WV);
    }
    var P={x:0,y:0,tx:0,ty:0};
    function draw(now){
      var time = reduce ? 0 : now*0.001;
      /* the ripple is always on: it rests on the curve, drifting slowly along it, and follows the cursor while it is over the section */
      if(geo){
        var tt;
        if(hov.over){
          /* nearest point on the curve to the cursor, kept off the two ends */
          var best=1e12, bt=0.5;
          for(var si=0;si<=48;si++){ var st=si/48; bez(geo,st,P); var ddx=P.x-hov.cx, ddy=P.y-hov.cy, dd=ddx*ddx+ddy*ddy; if(dd<best){ best=dd; bt=st; } }
          tt=Math.max(0.12,Math.min(0.88,bt));
        } else tt=0.48 + 0.12*Math.sin(time*0.35);
        bez(geo, tt, P); hov.tx=P.x; hov.ty=P.y;
        if(!hov.seen){ hov.x=hov.tx; hov.y=hov.ty; hov.seen=true; }
      }
      var follow = hov.over ? 0.14 : 0.05;
      hov.x+=(hov.tx-hov.x)*follow; hov.y+=(hov.ty-hov.y)*follow;
      var a=0, b=1, k=(now-t0);
      if(phase==="out"){ a=ease(Math.min(1,k/OUT_MS)); if(k>=OUT_MS){ cur=next; geo=geometry(cur); phase="in"; t0=now; a=1; b=0; } }
      else if(phase==="in"){ b=ease(Math.min(1,k/DRAW_MS)); if(k>=DRAW_MS){ phase="hold"; b=1; } }
      if(phase==="in"){ a=0; }
      cx.setTransform(dprL,0,0,dprL,0,0); cx.clearRect(0,0,Wd,Hd);
      if(!geo || b<=a) { dot(); return; }
      cx.beginPath(); cx.lineWidth=1; cx.strokeStyle="#000"; cx.lineJoin="round"; cx.lineCap="round";
      var i0=Math.floor(a*N), i1=Math.ceil(b*N);
      for(var i=i0;i<=i1;i++){
        var t=Math.max(a,Math.min(b,i/N)); bez(geo,t,P);
        var L=Math.sqrt(P.tx*P.tx+P.ty*P.ty)||1, off=ripple(P.x,P.y,time)*Math.min(1,t*6)*Math.min(1,(1-t)*6);
        var x=P.x+(-P.ty/L)*off, y=P.y+(P.tx/L)*off;
        if(i===i0) cx.moveTo(x,y); else cx.lineTo(x,y);
      }
      cx.stroke();
      dot();
    }
    function dot(){ if(!geo) return; cx.fillStyle="#000"; cx.beginPath(); cx.arc(geo.x0,geo.y0,2.5,0,Math.PI*2); cx.fill(); }

    /* queue: client j sits in slot (j - focus) mod count. Slot 0 is the focus circle (144px);
       the next three wait beside it, getting smaller (124, 96, 48 — Figma), the rest are hidden.
       On a change every circle moves up the queue and grows; the one leaving focus slides left,
       shrinks away, and rejoins invisibly at the back. */
    var SLOTS=[ {x:0,  d:144}, {x:160,d:124}, {x:300,d:96}, {x:412,d:48} ];   /* left edge, diameter */
    var BACK={cx:476, d:0}, NL=logos.length, slotOf=[];
    function tf(s){
      var sl = s<SLOTS.length ? {cx:SLOTS[s].x+SLOTS[s].d/2, d:SLOTS[s].d} : BACK;
      return "translateX("+(sl.cx-72)+"px) scale("+(sl.d/144).toFixed(4)+")";
    }
    function snap(l, t){ l.classList.add("no-tr"); l.style.transform=t; void l.offsetWidth; l.classList.remove("no-tr"); }
    function place(n, animate){
      logos.forEach(function(l){
        var j=Number(l.dataset.q), s=(j-n+NL)%NL, old=slotOf[j];
        l._tok=(l._tok||0)+1; var tok=l._tok;
        l.tabIndex = s<SLOTS.length ? 0 : -1;
        if(!animate || old===undefined){ snap(l, tf(s)); }
        else if(s>old){
          /* leaving the front: out to the left, then back of the queue */
          l.style.transform="translateX(-60px) scale(0)";
          setTimeout(function(){
            if(l._tok!==tok) return;
            snap(l, tf(SLOTS.length));
            requestAnimationFrame(function(){ if(l._tok===tok) l.style.transform=tf(slotOf[j]); });
          }, 740);
        } else {
          l.style.transform=tf(s);
        }
        slotOf[j]=s;
      });
    }
    place(0,false);

    function show(n){
      if(n===cur && phase!=="out") return;
      place(n,true);
      quotes.forEach(function(q,i){ q.classList.toggle("is-on", i===n); });
      logos.forEach(function(l){ l.classList.toggle("is-focus", l.dataset.q!==undefined && Number(l.dataset.q)===n); });
      next=n; phase="out"; t0=performance.now();
    }
    function start(){ stop(); timer=setInterval(function(){ if(!document.hidden && inView) show(((phase==="out"?next:cur)+1)%quotes.length); }, CYCLE_MS); }
    function stop(){ if(timer){ clearInterval(timer); timer=null; } }

    logos.forEach(function(l){
      if(l.dataset.q===undefined) return;
      var n=Number(l.dataset.q);
      l.addEventListener("focus", function(){ stop(); show(n); });
      l.addEventListener("click", function(){ show(n); });
      l.addEventListener("blur", start);
    });
    /* pause the cycle while the pointer is over the client grid, resume when it leaves */
    grid.addEventListener("mouseenter", stop);
    grid.addEventListener("mouseleave", start);

    trust.addEventListener("pointermove", function(e){
      if(e.pointerType && e.pointerType!=="mouse") return;
      var r=trust.getBoundingClientRect(); hov.cx=e.clientX-r.left; hov.cy=e.clientY-r.top; hov.over=true;
    });
    trust.addEventListener("pointerleave", function(){ hov.over=false; });

    var inView=false;
    function loop(now){
      var r=trust.getBoundingClientRect();
      inView = r.bottom>0 && r.top<window.innerHeight;
      if(inView) draw(now);
      requestAnimationFrame(loop);
    }
    var rt2=null;
    window.addEventListener("resize", function(){ clearTimeout(rt2); rt2=setTimeout(size, 80); }, {passive:true});
    size();
    if(document.fonts && document.fonts.ready) document.fonts.ready.then(size);
    /* first arrival: draw the line out once the section comes into view */
    phase="in"; t0=-1e9;
    var firstSeen=false;
    (function watch(){
      var r=trust.getBoundingClientRect();
      if(!firstSeen && r.top < window.innerHeight*0.6){ firstSeen=true; phase="in"; t0=performance.now(); return; }
      if(!firstSeen) requestAnimationFrame(watch);
    })();
    requestAnimationFrame(loop);
    start();
  })();

})();
