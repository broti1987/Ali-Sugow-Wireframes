/* Ali & Sugow — About Us hero canvas
   One pinned canvas behind the five About folds. A single drawing changes with scroll:
     fold 1  a reverse prism: three S-curves come in from the left and meet on a straight vertical line;
             only one line leaves it on the right, carrying a travelling wave. The vertical line follows
             the cursor left/right within a small range, staying straight. On scroll the incoming curves
             close onto the black one and the vertical line draws in to the crossing, leaving one line
     then    that single line is reeled in, from its right-hand end, into a scribbled triangle (the knot)
     (folds 3 and 4 sit on a dark ground the canvas paints: a dark circle opens from the triangles' centre,
      a light one from the logomark's centre on the way out; lines are drawn dark on light and light on dark)
     fold 2  the knot untangles into six overlapping triangles - one bold - with a dot on the inner one
     fold 3  those spread into seven clean triangles turning about one point
     fold 4  each triangle edge swings out into a long, broken construction line (0 / 60 / 120 deg)
     fold 5  the construction lines trim down onto the logomark outline
   Each fold holds still while its copy is on screen; the copy fades fold to fold, tied to the same
   scroll progress (js/text-animations/about-copy.js reads AS.state.aboutP and AS.aboutFade).
   Shape data: js/animations/about-geometry.js. Depends on js/core.js (window.AS). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, G=AS.aboutGeom;
  var hero=document.getElementById("ab-hero"), cv=document.getElementById("ab-canvas");
  if(!hero || !cv || !G) return;
  var ctx=cv.getContext("2d");

  /* ---------- scroll timeline, in screen heights: holds and the turns between them ---------- */
  var SEG=[["h1",.35],["merge",.5],["h1b",.1],["knot",.65],["hk",.12],["untangle",.6],["h2",.4],["tri",.75],["h3",.4],["cons",.75],["h4",.4],["logo",.75],["h5",.45]];
  var TOTAL=0, AT={};
  SEG.forEach(function(s){ AT[s[0]]={a:TOTAL,len:s[1]}; TOTAL+=s[1]; });
  /* copy fades, by progress: [fade-in start, end, fade-out start, end], keyed by data-ab-copy
     (about-copy.js reads this). A fold's copy fades out over the first 40% of the turn after it.
     Fold 2 arrives in two steps: its overline, heading and first paragraph come in with the scribble
     (fold 1.5); its last paragraph ("actual rather than perceived challenges") once the scribble has
     untangled into the triangles. "2b" sits inside "2", so it only needs its own fade-in. */
  function at(n,f){ return AT[n].a+AT[n].len*f; }
  /* dark ground for folds 3 and 4: a circle of dark opens out from the triangles' centre halfway through
     the turn into fold 3, and a circle of light opens out from the logomark's centre halfway through the
     turn into fold 5. Both happen while no copy is on screen. */
  var DARK_IN=[at("tri",.35), at("tri",.65)], DARK_OUT=[at("logo",.35), at("logo",.65)];
  AS.aboutFade={
    "1":  [-2,-1, at("knot",0), at("knot",.4)],
    "2":  [at("knot",.6), at("knot",1), at("tri",0), at("tri",.35)],
    "2b": [at("untangle",.6), at("untangle",1), 98, 99],
    "3":  [at("tri",.65), at("tri",1), at("cons",0), at("cons",.4)],
    "4":  [at("cons",.6), at("cons",1), at("logo",0), at("logo",.35)],
    "5":  [at("logo",.65), at("logo",1), 98, 99]
  };
  AS.state.aboutP=0;
  hero.style.setProperty("--ab-total", TOTAL.toFixed(2));

  /* ---------- look ---------- */
  var INK="#111111", GREY="#787878";
  var INK_L="#111111", INK_D="#f2f2f2", GROUND_D="#1a1a1a";   /* lines on the light / dark ground; the dark ground */
  var KNOT_W=1.8, LOGO_W=1.8, LINE_W=1.1;
  var TRI_A=[1,.9,.7,.55,.42,.3,.2], TRI_W=[1.6,1.4,1.15,1,.9,.8,.7];
  /* fold 2 layered triangles (G.lay order: bold, medium, four thin - the last carries the dot) */
  var LAY_A=[1,.85,.75,.75,.75,.8], LAY_W=[2.4,1.2,.85,.85,.85,.9], DOT_R=2.6, DOT_GAP=9;
  var NT=180;   /* samples per triangle when drawn on its own */
  /* fold 1: how far the vertical line follows the cursor; the wave on the outgoing line */
  var REACH=88, FOLLOW=0.07, WAVE_A=8, WAVE_L=150, WAVE_SPEED=0.35, WAVE_RAMP=260;
  /* sample counts */
  var NC=220, NK=760, NL=120, NP=96;

  function ease(t){ return t<.5 ? 4*t*t*t : 1-Math.pow(-2*t+2,3)/2; }
  function eo(t){ return 1-Math.pow(1-t,3); }
  function rnd(s){ var x=Math.sin(s*127.1+311.7)*43758.5453; return x-Math.floor(x); }
  function lerp(a,b,t){ return a+(b-a)*t; }

  /* resample a polyline [[x,y],...] to n points evenly by length */
  function resample(P,n,closed){
    var pts=P.slice(); if(closed) pts.push(P[0]);
    var cum=[0], i;
    for(i=1;i<pts.length;i++) cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0], pts[i][1]-pts[i-1][1]));
    var L=cum[cum.length-1], xs=new Float32Array(n), ys=new Float32Array(n), j=1;
    for(i=0;i<n;i++){
      var s=L*i/(n-1);
      while(j<cum.length-1 && cum[j]<s) j++;
      var f=(s-cum[j-1])/((cum[j]-cum[j-1])||1);
      xs[i]=lerp(pts[j-1][0],pts[j][0],f); ys[i]=lerp(pts[j-1][1],pts[j][1],f);
    }
    return {x:xs,y:ys,n:n,len:L};
  }

  /* add, per sample: signed distance from the crossing (positive on the outgoing side) and a normal */
  function withS(r, side){
    var n=r.n, i, s=new Float32Array(n), nx=new Float32Array(n), ny=new Float32Array(n), acc=0, step=r.len/(n-1);
    var ci=0, bd=1e9;
    for(i=0;i<n;i++){ var d=Math.hypot(r.x[i]-LX, r.y[i]-CYC); if(d<bd){ bd=d; ci=i; } }
    for(i=0;i<n;i++){
      s[i]=(i-ci)*step;
      var a=i>0?i-1:i, b=i<n-1?i+1:i, tx=r.x[b]-r.x[a], ty=r.y[b]-r.y[a], l=Math.sqrt(tx*tx+ty*ty)||1;
      nx[i]=-ty/l; ny[i]=tx/l; if(ny[i]<0){ nx[i]=-nx[i]; ny[i]=-ny[i]; }
    }
    if(side===-1) for(i=0;i<n;i++) s[i]=-(n-1-i)*step;          /* incoming half ends at the crossing */
    if(side===0){ /* whole line, drawn from the right end: outgoing side is before the crossing */
      for(i=0;i<n;i++) s[i]=(ci-i)*step;
    }
    r.s=s; r.nx=nx; r.ny=ny; return r;
  }

  /* ---------- screen mapping ---------- */
  var W=0,H=0,dpr=1,KS=1,LX=0,CYC=0;
  function fx(x){ return W/2+(x-720)*W/1440; }            /* fold 1 lines run edge to edge */
  function fy(y){ return H/2+(y-450)*H/900; }
  function sx(x){ return W/2+(x-720)*KS; }                 /* the shapes keep their proportions */
  function sy(y){ return H/2+(y-450)*KS; }

  var curves=[], inL=[], outR=null, single=null, knot=null, kX, kY, chunks=[], lay=[], dotP=null, triB=[], triP={}, lines=[], pieces=[];

  function build(){
    dpr=Math.min(2, window.devicePixelRatio||1);
    var r=cv.getBoundingClientRect(); W=r.width; H=r.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    KS=Math.min(W/1440, H/900);
    LX=fx(720); CYC=fy(528.5);                               /* the curves cross the line here */

    /* fold 1: the incoming halves (left of the crossing) and the one outgoing half (right) */
    curves=G.curves.map(function(c){ return c.map(function(p){ return [fx(p[0]),fy(p[1])]; }); });
    function split(P){
      var best=0, bd=1e9, i;
      for(i=0;i<P.length;i++){ var d=Math.abs(P[i][0]-LX)+Math.abs(P[i][1]-CYC)*0.5; if(d<bd){ bd=d; best=i; } }
      var L=P.slice(0,best); L.push([LX,CYC]);
      var R=[[LX,CYC]].concat(P.slice(best+1));
      return {L:L, R:R};
    }
    var sp=curves.map(split);
    inL=sp.map(function(h){ return withS(resample(h.L, NC, false), -1); });      /* 0 = black, 1-2 = grey */
    outR=withS(resample(sp[0].R, NC, false), 1);
    /* the whole black line as one, for the reel into the knot: starts at its right-hand end */
    var whole=sp[0].R.slice().reverse().concat(sp[0].L.slice().reverse().slice(1));
    single=withS(resample(whole, NK, false), 0);
    /* fold 2 knot: start at the end nearest the top so the line reels in from its top */
    var kp=G.knot.map(function(p){ return [sx(p[0]),sy(p[1])]; });
    if(kp[0][1]>kp[kp.length-1][1]) kp.reverse();
    knot=resample(kp, NK, false);
    kX=new Float32Array(NK); kY=new Float32Array(NK);

    /* fold 3 triangles: base shape about the pivot, plus how the knot splits between them */
    var T0=G.tris[0], piv=[0,0], i, k;
    /* pivot = centre of the spiral the triangles were fitted to (same for all) */
    piv=solvePivot(G.tris[0], G.tris[1]);
    triP={x:sx(piv[0]), y:sy(piv[1]), v:T0.map(function(p){ return [(p[0]-piv[0])*KS, (p[1]-piv[1])*KS]; })};
    triB=G.tris.map(function(t,k){
      var s0=Math.hypot(G.tris[k][0][0]-piv[0], G.tris[k][0][1]-piv[1])/Math.hypot(T0[0][0]-piv[0], T0[0][1]-piv[1]);
      return {s:s0, a:k*Math.PI/18};
    });
    /* fold 2 layered triangles (screen), and the dot with its break in the inner triangle's left edge */
    lay=G.lay.map(function(T){ return T.map(function(p){ return [sx(p[0]),sy(p[1])]; }); });
    dotP=[sx(G.dot[0]), sy(G.dot[1])];
    (function(){
      var V=lay[5], L0=Math.hypot(V[1][0]-V[0][0],V[1][1]-V[0][1]), L1=Math.hypot(V[2][0]-V[1][0],V[2][1]-V[1][1]), L2=Math.hypot(V[0][0]-V[2][0],V[0][1]-V[2][1]);
      var P=L0+L1+L2, d=Math.hypot(dotP[0]-V[0][0], dotP[1]-V[0][1]);
      lay.gap={u:d/P, w:2*DOT_GAP*KS/P, sp:0};
    })();
    /* how the knot splits between the six (by perimeter), and where each loop starts so the untangle is short */
    var per=lay.map(function(V){ return Math.hypot(V[1][0]-V[0][0],V[1][1]-V[0][1])+Math.hypot(V[2][0]-V[1][0],V[2][1]-V[1][1])+Math.hypot(V[0][0]-V[2][0],V[0][1]-V[2][1]); });
    var sum=per.reduce(function(a,b){ return a+b; },0), at=0, NL6=lay.length;
    chunks=[];
    for(k=0;k<NL6;k++){
      var n=(k===NL6-1) ? (NK-1-at) : Math.round((NK-1)*per[k]/sum);
      chunks.push({s:at, n:n, off:0, dir:1}); at+=n;
    }
    for(k=0;k<NL6;k++){
      var c=chunks[k], bestE=1e18, V=lay[k];
      for(var o=0;o<24;o++) for(var dir=-1;dir<=1;dir+=2){
        var e=0;
        for(i=0;i<=c.n;i+=6){
          var q=triAt(V,(o/24 + dir*i/c.n + 2)%1);
          e+=Math.hypot(q[0]-knot.x[c.s+i], q[1]-knot.y[c.s+i]);
        }
        if(e<bestE){ bestE=e; c.off=o/24; c.dir=dir; }
      }
    }

    /* fold 4 lines (screen), with a broken-stroke pattern each; and fold 5 pieces */
    lines=G.lines.map(function(l,j){
      var x1=sx(l[0]), y1=sy(l[1]), x2=sx(l[2]), y2=sy(l[3]);
      var horiz=Math.abs(y2-y1)<1, ng=(horiz?3:1)+Math.floor(rnd(j*7+3)*(horiz?3:2)), gaps=[];
      for(var g=0;g<ng;g++) gaps.push({u:0.06+0.88*rnd(j*31+g*17+5), w:(horiz?0.02:0.008)+rnd(j*13+g*29+9)*(horiz?0.07:0.03), sp:(rnd(j*3+g)-.5)*0.02});
      return {x1:x1,y1:y1,x2:x2,y2:y2, a:Math.atan2(y2-y1,x2-x1), len:Math.hypot(x2-x1,y2-y1), mx:(x1+x2)/2, my:(y1+y2)/2,
              alpha:0.55+0.4*rnd(j*5+1), gaps:gaps};
    });
    pieces=G.pieces.map(function(P){ return resample(P.map(function(p){ return [sx(p[0]),sy(p[1])]; }), NP, false); });
    lines.forEach(function(l,j){
      var p=pieces[G.line2piece[j]];
      var dx=p.x[NP-1]-p.x[0], dy=p.y[NP-1]-p.y[0];
      l.rev = (dx*Math.cos(l.a)+dy*Math.sin(l.a))<0;      /* walk the piece the same way as the line */
      l.d = 0.28*rnd(j*11+4);
    });

  }

  /* pivot of the spiral similarity that maps triangle 0 onto triangle 1 (10deg, scale s) */
  function solvePivot(A,B){
    /* z1 = c + m(z0 - c)  =>  c = (z1 - m z0)/(1 - m), with complex m from the first edge */
    var ax=A[1][0]-A[0][0], ay=A[1][1]-A[0][1], bx=B[1][0]-B[0][0], by=B[1][1]-B[0][1];
    var d=ax*ax+ay*ay, mr=(bx*ax+by*ay)/d, mi=(by*ax-bx*ay)/d;
    var nx=B[0][0]-(mr*A[0][0]-mi*A[0][1]), ny=B[0][1]-(mr*A[0][1]+mi*A[0][0]);
    var dr=1-mr, di=-mi, dd=dr*dr+di*di;
    return [(nx*dr+ny*di)/dd, (ny*dr-nx*di)/dd];
  }

  /* ---------- idle motion (off with reduced motion) ---------- */
  var tNow=0;
  function triVerts(k,t){
    var b=triB[k], spread=reduce?1:1+0.07*Math.sin(t*0.45), turn=reduce?0:0.03*Math.sin(t*0.3);
    var a=b.a*spread+turn, ca=Math.cos(a), sa=Math.sin(a), s=b.s;
    return triP.v.map(function(v){ return [triP.x+s*(v[0]*ca-v[1]*sa), triP.y+s*(v[0]*sa+v[1]*ca)]; });
  }
  function triAt(V,u){
    var L0=Math.hypot(V[1][0]-V[0][0],V[1][1]-V[0][1]), L1=Math.hypot(V[2][0]-V[1][0],V[2][1]-V[1][1]), L2=Math.hypot(V[0][0]-V[2][0],V[0][1]-V[2][1]);
    var s=u*(L0+L1+L2);
    if(s<=L0) return [lerp(V[0][0],V[1][0],s/L0), lerp(V[0][1],V[1][1],s/L0)];
    s-=L0; if(s<=L1) return [lerp(V[1][0],V[2][0],s/L1), lerp(V[1][1],V[2][1],s/L1)];
    s-=L1; return [lerp(V[2][0],V[0][0],s/L2), lerp(V[2][1],V[0][1],s/L2)];
  }
  function knotIdle(t){
    for(var i=0;i<NK;i++){
      kX[i]=knot.x[i]+(reduce?0:1.3*Math.sin(t*0.9+i*0.05));
      kY[i]=knot.y[i]+(reduce?0:1.3*Math.cos(t*0.7+i*0.043));
    }
  }

  /* ---------- fold 1: straight line follows the cursor; the outgoing line carries a wave ---------- */
  var OFF=0;
  var HOV={x:0,y:0,tx:0,ty:0,s:0,ts:0,seen:false};
  function stepFollow(){
    var target = (!reduce && HOV.ts) ? REACH*Math.tanh((HOV.tx-LX)/REACH) : 0;
    OFF+=(target-OFF)*FOLLOW;
  }
  /* how much of the follow a point takes: all of it at the crossing, none at the screen edges */
  function follow(sd){ var f=clamp01(1-Math.abs(sd)/(W*0.5)); return f*f*(3-2*f); }
  function wave(sd,t){
    if(sd<=0 || reduce) return 0;
    var r=clamp01(sd/WAVE_RAMP); r=r*r*(3-2*r);
    return WAVE_A*r*Math.sin(Math.PI*2*(sd/WAVE_L - t*WAVE_SPEED));
  }
  /* point i of a fold 1 line (with follow + wave) into PX/PY[j] */
  function f1pt(L,i,j,t){
    var sd=L.s[i], w=wave(sd,t), o=OFF*follow(sd);
    PX[j]=L.x[i]+o+L.nx[i]*w; PY[j]=L.y[i]+L.ny[i]*w;
  }

  /* ---------- cursor ripple (same as the homepage hero) ---------- */
  var WARP_R=56, WARP_A=7, WARP_K=Math.PI*2/44, WARP_W=7;
  function warp(X,Y,t){
    var dx=X-HOV.x, dy=Y-HOV.y, d2=dx*dx+dy*dy, r2=d2/(WARP_R*WARP_R);
    if(r2>9) return 0;
    return HOV.s*WARP_A*Math.exp(-r2)*Math.sin(Math.sqrt(d2)*WARP_K - t*WARP_W);
  }
  window.addEventListener("pointermove", function(e){
    if(e.pointerType && e.pointerType!=="mouse") return;
    var r=cv.getBoundingClientRect();
    HOV.tx=e.clientX-r.left; HOV.ty=e.clientY-r.top;
    HOV.ts=(HOV.tx>=0 && HOV.tx<=r.width && HOV.ty>=0 && HOV.ty<=r.height) ? 1 : 0;
    if(!HOV.seen){ HOV.x=HOV.tx; HOV.y=HOV.ty; HOV.seen=true; }
  }, {passive:true});
  document.addEventListener("pointerleave", function(){ HOV.ts=0; });
  window.addEventListener("blur", function(){ HOV.ts=0; });

  /* ---------- drawing ---------- */
  var PX=new Float32Array(NK+2), PY=new Float32Array(NK+2), WX=new Float32Array(NK+2), WY=new Float32Array(NK+2);
  /* stroke PX/PY[0..n); gaps (fractions along the line) open by gAmt */
  function stroke(n, col, alpha, width, gaps, gAmt, drift){
    if(alpha<=0.004 || n<2) return;
    var i, warpOn = !reduce && HOV.s>0.005;
    if(warpOn){
      var mxX=HOV.x, mxY=HOV.y, R3=WARP_R*3;
      /* displacements from the undisturbed line first, then applied, so neighbours don't feed back */
      for(i=0;i<n;i++){
        WX[i]=0; WY[i]=0;
        if(Math.abs(PX[i]-mxX)>R3 || Math.abs(PY[i]-mxY)>R3) continue;
        var a=i>0?i-1:i, b=i<n-1?i+1:i, tx=PX[b]-PX[a], ty=PY[b]-PY[a], l=Math.sqrt(tx*tx+ty*ty)||1;
        var d=warp(PX[i],PY[i],tNow), nx=-ty/l, ny=tx/l;
        if(nx<0 || (nx===0 && ny<0)){ nx=-nx; ny=-ny; }   /* same side whichever way a line was drawn, so overlapping lines ripple together */
        WX[i]=nx*d; WY[i]=ny*d;
      }
      for(i=0;i<n;i++){ PX[i]+=WX[i]; PY[i]+=WY[i]; }
    }
    ctx.globalAlpha=alpha; ctx.strokeStyle=col; ctx.lineWidth=width;
    ctx.beginPath();
    var pen=false, hasG = gaps && gAmt>0.002;
    for(i=0;i<n;i++){
      var vis=true;
      if(hasG){
        var u=i/(n-1);
        for(var g=0;g<gaps.length;g++){
          var gu=gaps[g].u+(drift||0)*gaps[g].sp*40; gu-=Math.floor(gu);
          if(Math.abs(u-gu) < gaps[g].w*gAmt*0.5){ vis=false; break; }
        }
      }
      if(vis){ if(pen) ctx.lineTo(PX[i],PY[i]); else { ctx.moveTo(PX[i],PY[i]); pen=true; } }
      else pen=false;
    }
    ctx.stroke();
  }

  function drawFold1(m,t){
    /* m: 0 = three lines in, one out, vertical line full height; 1 = only the single black line left */
    var i, k;
    /* grey incoming curves close onto the black one, the far ends last */
    if(m<1) for(k=1;k<=2;k++){
      var L=inL[k], B=inL[0];
      for(i=0;i<NC;i++){
        var u=i/(NC-1), e=ease(clamp01((m-0.45*(1-u))/0.55));
        f1pt(L,i,i,t); var x0=PX[i], y0=PY[i];
        f1pt(B,i,i,t);
        PX[i]=lerp(x0,PX[i],e); PY[i]=lerp(y0,PY[i],e);
      }
      stroke(NC, GREY, 1, 1);
    }
    for(i=0;i<NC;i++) f1pt(inL[0],i,i,t);
    stroke(NC, INK, 1, 1);
    for(i=0;i<NC;i++) f1pt(outR,i,i,t);
    stroke(NC, INK, 1, 1);
    /* the vertical line: straight, draws in to the crossing as the curves close */
    if(m<1){
      var g=ease(m), top=lerp(-40, CYC, g), bot=lerp(H+40, CYC, g), x=LX+OFF;
      for(i=0;i<NC;i++){ PX[i]=x; PY[i]=lerp(top,bot,i/(NC-1)); }
      stroke(NC, INK, 1-g*g, 1);
    }
  }

  function drawKnot(q,t){
    knotIdle(t);
    var i, BOW=46;
    for(i=0;i<NK;i++){
      var d=0.45*i/(NK-1), e=ease(clamp01((q-d)/0.55));
      f1pt(single,i,i,t); var lx=PX[i], ly=PY[i];
      var tx=kX[i]-lx, ty=kY[i]-ly, l=Math.sqrt(tx*tx+ty*ty)||1, b=Math.sin(Math.PI*e)*BOW*Math.min(1,l/300);
      PX[i]=lerp(lx,kX[i],e)+(-ty/l)*b; PY[i]=lerp(ly,kY[i],e)+(tx/l)*b;
    }
    stroke(NK, INK, 1, lerp(1, KNOT_W, eo(clamp01(q*1.4))));
  }

  /* fold 2 triangles, with a slow drift of their own so the layering feels hand-placed */
  function layVerts(k,t){
    var V=lay[k];
    if(reduce) return V;
    var cx=(V[0][0]+V[1][0]+V[2][0])/3, cy=(V[0][1]+V[1][1]+V[2][1])/3, a=0.011*Math.sin(t*0.4+k*1.7), ca=Math.cos(a), sa=Math.sin(a);
    var ox=1.6*Math.sin(t*0.33+k*2.3), oy=1.2*Math.cos(t*0.29+k*1.1);
    return V.map(function(p){ var x=p[0]-cx, y=p[1]-cy; return [cx+x*ca-y*sa+ox, cy+x*sa+y*ca+oy]; });
  }
  /* a triangle drawn from its apex round (NT samples), optional break */
  function triangle(V, col, alpha, w, gaps, gAmt){
    for(var i=0;i<NT;i++){ var p=triAt(V, i/(NT-1)); PX[i]=p[0]; PY[i]=p[1]; }
    stroke(NT, col, alpha, w, gaps, gAmt);
  }
  function dot(x,y,r,alpha){
    if(alpha<=0.01 || r<0.2) return;
    ctx.globalAlpha=alpha; ctx.fillStyle=INK; ctx.beginPath(); ctx.arc(x,y,r,0,Math.PI*2); ctx.fill();
  }

  /* knot -> six layered triangles */
  function drawUntangle(q,t){
    knotIdle(t);
    for(var k=0;k<lay.length;k++){
      var c=chunks[k], V=layVerts(k,t), e=ease(clamp01((q-0.07*k)/(1-0.35))), n=c.n+1;
      for(var i=0;i<n;i++){
        var p=triAt(V, (c.off + c.dir*i/c.n + 2)%1);
        PX[i]=lerp(kX[c.s+i], p[0], e); PY[i]=lerp(kY[c.s+i], p[1], e);
      }
      /* pin the corners onto samples so they stay sharp */
      var L0=Math.hypot(V[1][0]-V[0][0],V[1][1]-V[0][1]), L1=Math.hypot(V[2][0]-V[1][0],V[2][1]-V[1][1]), L2=Math.hypot(V[0][0]-V[2][0],V[0][1]-V[2][1]), Pm=L0+L1+L2;
      var uv=[0, L0/Pm, (L0+L1)/Pm];
      for(var v=0;v<3;v++){
        var f=((uv[v]-c.off)*c.dir%1+1)%1, iv=Math.round(f*c.n);
        var ii=[iv%(c.n)]; if(iv%c.n===0) ii.push(c.n);
        for(var q2=0;q2<ii.length;q2++){ var j=ii[q2]; PX[j]=lerp(kX[c.s+j], V[v][0], e); PY[j]=lerp(kY[c.s+j], V[v][1], e); }
      }
      var gp=null;
      if(k===lay.length-1){ var gu=((lay.gap.u-c.off)*c.dir%1+1)%1; gp=[{u:gu, w:lay.gap.w, sp:0}]; }
      stroke(n, INK, lerp(1, LAY_A[k], e), lerp(KNOT_W, LAY_W[k], e), gp, e*e);
    }
    var de=clamp01((q-0.7)/0.3); de=de*de*(3-2*de);
    var Vd=layVerts(lay.length-1,t), od=dotOff(Vd);
    dot(dotP[0]+od[0], dotP[1]+od[1], DOT_R*KS*de, de);
  }
  /* the dot rides with the inner triangle's drift */
  function dotOff(Vd){ var V=lay[lay.length-1]; return [(Vd[0][0]+Vd[1][0]+Vd[2][0]-V[0][0]-V[1][0]-V[2][0])/3, (Vd[0][1]+Vd[1][1]+Vd[2][1]-V[0][1]-V[1][1]-V[2][1])/3]; }

  /* six layered triangles -> seven turning triangles (the seventh grows out of the inner one) */
  function drawTri(q,t){
    for(var k=0;k<7;k++){
      var src=layVerts(Math.min(k,lay.length-1),t), dst=triVerts(k,t);
      var e=ease(clamp01((q-0.05*k)/(1-0.3)));
      var V=[0,1,2].map(function(v){ return [lerp(src[v][0],dst[v][0],e), lerp(src[v][1],dst[v][1],e)]; });
      var a0 = k<lay.length ? LAY_A[k] : 0, w0 = k<lay.length ? LAY_W[k] : LAY_W[lay.length-1];
      var last = k===lay.length-1;
      triangle(V, INK, lerp(a0, TRI_A[k], e), lerp(w0, TRI_W[k], e), last?[lay.gap]:null, last?1-e:0);
    }
    /* the dot slides to the centre the triangles turn about, and goes */
    var de=ease(clamp01(q/0.6)), Vd=layVerts(lay.length-1,t), od=dotOff(Vd);
    dot(lerp(dotP[0]+od[0], triP.x, de), lerp(dotP[1]+od[1], triP.y, de), DOT_R*KS*(1-de), 1-de);
  }

  function drawCons(q,t){
    var drift = reduce ? 0 : t*0.05;
    for(var k=0;k<7;k++){
      var V=triVerts(k,t);
      for(var ed=0;ed<3;ed++){
        var l=lines[G.edge2line[k*3+ed]], A=V[ed], B=V[(ed+1)%3];
        var e=ease(clamp01((q-0.04*k-0.03*ed)/(1-0.3)));
        var ea=Math.atan2(B[1]-A[1],B[0]-A[0]), la=l.a;
        var da=la-ea; da=Math.atan2(Math.sin(da),Math.cos(da));
        if(Math.abs(da)>Math.PI/2){ da=da>0?da-Math.PI:da+Math.PI; }   /* lines have no direction: take the short turn */
        var a=ea+da*e, len=lerp(Math.hypot(B[0]-A[0],B[1]-A[1]), l.len, e);
        var mx=lerp((A[0]+B[0])/2, l.mx, e), my=lerp((A[1]+B[1])/2, l.my, e);
        var ca=Math.cos(a)*len/2, sa=Math.sin(a)*len/2;
        for(var i=0;i<NL;i++){ var u=i/(NL-1)*2-1; PX[i]=mx+ca*u; PY[i]=my+sa*u; }
        stroke(NL, INK, lerp(TRI_A[k], l.alpha, e), lerp(TRI_W[k], LINE_W, e), l.gaps, e, drift);
      }
    }
  }

  function drawLogo(q,t){
    var drift = reduce ? 0 : t*0.05;
    for(var j=0;j<lines.length;j++){
      var l=lines[j], p=pieces[G.line2piece[j]], e=ease(clamp01((q-l.d)/(1-0.28)));
      var i0=l.rev?NP-1:0, i1=l.rev?0:NP-1;
      var P0x=p.x[i0], P0y=p.y[i0], P1x=p.x[i1], P1y=p.y[i1];
      /* chord: swing the line onto the piece's end-to-end chord, then let the piece's own shape in */
      var la=l.a, pa=Math.atan2(P1y-P0y, P1x-P0x), da=Math.atan2(Math.sin(pa-la),Math.cos(pa-la));
      var a=la+da*e, len=lerp(l.len, Math.hypot(P1x-P0x,P1y-P0y), e);
      var mx=lerp(l.mx,(P0x+P1x)/2,e), my=lerp(l.my,(P0y+P1y)/2,e);
      var ca=Math.cos(a)*len, sa=Math.sin(a)*len, ox=mx-ca/2, oy=my-sa/2, sh=e*e;
      for(var i=0;i<NP;i++){
        var u=i/(NP-1), pi=l.rev?NP-1-i:i;
        var devx=p.x[pi]-(P0x+(P1x-P0x)*u), devy=p.y[pi]-(P0y+(P1y-P0y)*u);
        PX[i]=ox+ca*u+devx*sh; PY[i]=oy+sa*u+devy*sh;
      }
      stroke(NP, INK, lerp(l.alpha, 1, e), lerp(LINE_W, LOGO_W, e), l.gaps, 1-e, drift);
    }
  }

  function scene(p,t){
    var name="h5", q=1;
    for(var i=0;i<SEG.length;i++){
      var s=AT[SEG[i][0]];
      if(p < s.a+s.len || i===SEG.length-1){ name=SEG[i][0]; q=clamp01((p-s.a)/s.len); break; }
    }
    switch(name){
      case "h1":    drawFold1(0,t); break;
      case "merge": drawFold1(q,t); break;
      case "h1b":   drawFold1(1,t); break;
      case "knot":  drawKnot(q,t); break;
      case "hk":    drawKnot(1,t); break;
      case "untangle": drawUntangle(q,t); break;
      case "h2":    drawUntangle(1,t); break;
      case "tri":   drawTri(q,t); break;
      case "h3":    drawTri(1,t); break;
      case "cons":  drawCons(q,t); break;
      case "h4":    drawCons(1,t); break;
      case "logo":  drawLogo(q,t); break;
      default:      drawLogo(1,t);
    }
    ctx.globalAlpha=1;
  }

  /* ---------- ground: the dark circle (in) and the light circle (out) ---------- */
  var WIPE={rin:0, rout:0, cx:0, cy:0, ox:0, oy:0};
  function far(x,y){ return Math.max(Math.hypot(x,y), Math.hypot(W-x,y), Math.hypot(x,H-y), Math.hypot(W-x,H-y)) + 4; }
  function wipe(p){
    var kin=ease(clamp01((p-DARK_IN[0])/(DARK_IN[1]-DARK_IN[0]))), kout=ease(clamp01((p-DARK_OUT[0])/(DARK_OUT[1]-DARK_OUT[0])));
    WIPE.cx=triP.x; WIPE.cy=triP.y;                         /* the triangles' centre */
    WIPE.ox=sx(720); WIPE.oy=sy(423);                       /* the logomark's centre */
    WIPE.rin=far(WIPE.cx,WIPE.cy)*kin; WIPE.rout=far(WIPE.ox,WIPE.oy)*kout;
    return {dark: WIPE.rin>0.5 && !(WIPE.rout>=far(WIPE.ox,WIPE.oy)-1), full: kin>=1 && kout<=0, none: kin<=0 || kout>=1};
  }
  function darkPath(){
    ctx.moveTo(WIPE.cx+WIPE.rin, WIPE.cy); ctx.arc(WIPE.cx, WIPE.cy, WIPE.rin, 0, Math.PI*2);
    if(WIPE.rout>0.5){ ctx.moveTo(WIPE.ox+WIPE.rout, WIPE.oy); ctx.arc(WIPE.ox, WIPE.oy, WIPE.rout, 0, Math.PI*2); }
  }

  function draw(p, t){
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);
    ctx.lineJoin="round"; ctx.lineCap="round";
    var g=wipe(p);
    if(g.none){ INK=INK_L; scene(p,t); return; }
    /* dark ground */
    ctx.fillStyle=GROUND_D; ctx.beginPath(); darkPath(); ctx.fill("evenodd");
    if(g.full){ INK=INK_D; scene(p,t); return; }
    /* part dark, part light: draw the lines twice, each clipped to its own ground */
    ctx.save(); ctx.beginPath(); ctx.rect(0,0,W,H); darkPath(); ctx.clip("evenodd");
    INK=INK_L; scene(p,t); ctx.restore();
    ctx.save(); ctx.beginPath(); darkPath(); ctx.clip("evenodd");
    INK=INK_D; scene(p,t); ctx.restore();
  }

  /* ---------- copy colour and header follow the ground (switched while no copy is showing) ---------- */
  var lastD=-1;
  function grey(a,b,k){ var v=Math.round(a+(b-a)*k); return "rgb("+v+","+v+","+v+")"; }
  function ground(p){
    var sm=AS.smooth;
    var d=sm(clamp01((p-DARK_IN[0])/(DARK_IN[1]-DARK_IN[0]))) * (1-sm(clamp01((p-DARK_OUT[0])/(DARK_OUT[1]-DARK_OUT[0]))));
    var dq=Math.round(d*200)/200;
    if(dq!==lastD){
      lastD=dq;
      hero.style.setProperty("--ab-fg",  grey(26,255,dq));            /* text/primary -> text/inverse */
      hero.style.setProperty("--ab-fg2", grey(92,176,dq));            /* text/secondary -> a light grey */
    }
    /* the header sits over the top of the stage: dark once the ground under it is */
    var hx=W/2, hy=40;
    var inDark = Math.hypot(hx-WIPE.cx, hy-WIPE.cy) < WIPE.rin && !(Math.hypot(hx-WIPE.ox, hy-WIPE.oy) < WIPE.rout);
    AS.state.groundDark = inDark && hero.getBoundingClientRect().top <= 0 && hero.getBoundingClientRect().bottom > 80;
  }

  function frame(now){
    var vh=window.innerHeight, r=hero.getBoundingClientRect();
    var p=clamp01(-r.top/Math.max(1, r.height-vh))*TOTAL;
    AS.state.aboutP=p;
    if(r.bottom>0 && r.top<vh){
      tNow=now*0.001;
      HOV.x+=(HOV.tx-HOV.x)*0.18; HOV.y+=(HOV.ty-HOV.y)*0.18; HOV.s+=(HOV.ts-HOV.s)*0.07;
      stepFollow();
      draw(p, tNow);
      ground(p);
    } else AS.state.groundDark=false;
    requestAnimationFrame(frame);
  }

  var rt=null;
  window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(build, 60); }, {passive:true});
  build();
  requestAnimationFrame(frame);
})();
