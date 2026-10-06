/* Ali & Sugow — hero canvas
   Scroll-driven canvas behind folds 1 and 2: strands converge into the dot (fold 1), the dot travels
   right and the burst grows out of it (fold 2). Cursor ripple bends nearby lines. Also slides the
   fold 1 copy out to the left on scroll.
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- hero animation (from the Ali & Sugow Hero Wireframe) ----------
     Full width now. Fold 1: the dot sits at the copy's left edge, between the two lines of
     copy, and runs straight out to a convergence point before fanning off the right edge.
     Fold 2: the dot has travelled right and the spokes grow out of it, unlabelled — the six
     disciplines are listed in the copy instead. */
  var LINE="#454545", DOT="#0A0A0A", TIP="#EFEFEF", DOT_R=3.4;
  /* fold 2: six main spokes (one per practice area) darkest and longest; the rest lighter and shorter */
  var MAIN="#1A1A1A", MAIN_W=1.1, MINOR="#666666", MINOR_W=0.75;
  var WIG_A=7;   /* wiggle amplitude (px) when a practice area is hovered */
  var SPIKES=12, SAMPLES=360, BREAK=900;
  var B_ENTRY=[-0.170,-0.100,-0.055,-0.020, 0.012, 0.048, 0.088, 0.130, 0.180, 0.238, 0.300, 0.365];
  var B_SWING=[ 0.052,-0.030, 0.020,-0.014, 0.030,-0.042, 0.018, 0.050,-0.028, 0.062,-0.048, 0.034];
  var B_EASE =[ 1.00, 1.32, 0.86, 1.12, 0.95, 1.26, 0.80, 1.16, 1.00, 0.90, 1.22, 1.05];
  var ROT=0.18, SHORT_LEN=[0.50,0.66,0.42,0.70,0.55,0.62];
  var SWAY=0.055, BREATH=0.038, RING=2.8;
  var SEC=[
    { n: 8, tone:"#9A9A9A", w:0.6, lo:0.30, hi:0.68, ring:2.0, list:[] },
    { n:12, tone:"#AEAEAE", w:0.55, lo:0.22, hi:0.60, ring:1.8, list:[] },
    { n:16, tone:"#C2C2C2", w:0.5, lo:0.15, hi:0.52, ring:1.5, list:[] }
  ];

  var hero=document.getElementById("hero"), fold1El=document.getElementById("fold-1");
  var heroL1=document.getElementById("hl-1"), heroL2=document.getElementById("roller"), firmLine=document.getElementById("firm-line");
  var outEls=[heroL1, heroL2, firmLine], outDist=[0,0,0], outLag=[0,0.08,0.16];
  var cv=document.getElementById("hero-canvas"), ctx=cv.getContext("2d");
  var W=0,H=0,dpr=1,wide=true,reach=0,YS=1,down=false;
  var h1x=0,h1y=0,h2x=0,h2y=0,convX=0,exitX=0,lastOut=-1;
  var spikes=[], tails=[];

  function rnd(s){ var x=Math.sin(s*127.1+311.7)*43758.5453; return x-Math.floor(x); }

  function build(){
    spikes.length=0; tails.length=0;
    var step=(Math.PI*2)/SPIKES, p;
    for(p=0;p<SPIKES;p++){
      tails.push({ entry:B_ENTRY[p], swing:B_SWING[p], eexp:B_EASE[p], ph:rnd(p+17)*Math.PI*2, stag:(1-Math.abs(B_ENTRY[p])/0.365)*0.22 });
      var major=(p%2===0), j=rnd(p*31+5);
      spikes.push({
        theta: ROT + p*step + (major?0:(j-0.5)*0.16),
        len: major ? 1.0 : SHORT_LEN[p>>1],
        spd: 0.78+0.52*rnd(p*7+139), ph: p*2.399963,
        start: major ? 0 : 0.12
      });
    }
    var gi=0, ti, q2, cfg, j2;
    for(ti=0;ti<SEC.length;ti++){
      cfg=SEC[ti]; cfg.list=[];
      for(q2=0;q2<cfg.n;q2++){
        gi++; j2=rnd(gi*13+77);
        cfg.list.push({ theta: ROT + gi*2.399963 + (j2-0.5)*0.22, len: cfg.lo + (cfg.hi-cfg.lo)*rnd(gi*5+31), spd: 0.72+0.66*rnd(gi*9+211), ph: gi*1.7, start: 0.04 + 0.22*rnd(gi*3+401) });
      }
    }
  }

  function resize(){
    dpr=Math.min(2, window.devicePixelRatio||1);
    var r=cv.getBoundingClientRect();
    W=r.width; H=r.height;
    cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
    wide=window.innerWidth>=BREAK;
    /* fold 1 hub: left edge of the copy, midway between the hero line and the firm line */
    outEls.forEach(function(el){ el.style.transform=""; }); lastOut=-1;
    var a1=heroL1.getBoundingClientRect(), a2=heroL2.getBoundingClientRect(), fl=firmLine.getBoundingClientRect();
    var w2=0; [].forEach.call(heroL2.children, function(sp){ w2=Math.max(w2, sp.getBoundingClientRect().width); });
    outDist=[a1.right+48, a2.left+w2+48, fl.right+48];
    /* fold 1 hub: left edge of the copy, in the 40px gap between its two lines */
    h1x = a1.left - r.left;
    h1y = (a1.bottom + a2.top)/2 - r.top;
    /* fold 2 hub: right of the copy on desktop, above it on phones */
    h2x = wide ? W*0.685 : W*0.5;
    h2y = wide ? H*0.5 : H*0.27;
    convX = wide ? W*0.64 : W*0.76;
    exitX = W*1.04;
    YS = wide ? 1 : 0.42;
    down = !wide;          /* on phones the strands fan downward only, clear of the copy */
    reach = wide ? Math.min(H*0.30, W*0.19) : Math.min(W*0.40, H*0.17);
  }

  function p1(s,u,out){
    var span=exitX-h1x, uc=(convX-h1x)/span;
    var w = u<=uc ? 0 : (u-uc)/(1-uc);
    var en = down ? Math.abs(s.entry)+0.03 : s.entry;
    out.x = span*u;
    out.y = H*YS*(en*Math.pow(smooth(w), s.eexp) + s.swing*Math.sin(Math.PI*w));
  }
  function env1(u){
    var span=exitX-h1x, uc=(convX-h1x)/span;
    if(u<=uc) return 0; var w=(u-uc)/(1-uc); return smooth(clamp01(w/0.40))*(1-0.25*w);
  }

  var A={x:0,y:0};
  var bx=new Float32Array(SAMPLES), by=new Float32Array(SAMPLES), px=new Float32Array(SAMPLES), py=new Float32Array(SAMPLES);
  var AMP=0.020, WAVES1=1.50, SPEED=0.30;

  /* hover warp: a small ripple that radiates from the cursor and bends whatever line passes through it */
  var HOV={x:0,y:0,tx:0,ty:0,s:0,ts:0,seen:false};
  var WARP_R=56, WARP_A=7, WARP_K=Math.PI*2/44, WARP_W=7;
  function warp(X,Y,t){
    if(HOV.s<0.005) return 0;
    var dx=X-HOV.x, dy=Y-HOV.y, d2=dx*dx+dy*dy, r2=d2/(WARP_R*WARP_R);
    if(r2>9) return 0;
    return HOV.s*WARP_A*Math.exp(-r2)*Math.sin(Math.sqrt(d2)*WARP_K - t*WARP_W);
  }
  /* a spoke from the hub at angle a, length r; drawn straight unless the cursor is near it,
     then sampled so the ripple can bend it. Leaves the (possibly displaced) tip in SX/SY. */
  var SX=0, SY=0, HUBX=0, HUBY=0, tW=0;
  var expLinks=[].slice.call(document.querySelectorAll(".expertise a")), HS=[], HT=[];
  /* practice areas map to the main spokes clockwise, starting from the top-most spoke */
  var LINK_FOR_SPOKE=[];
  (function(){
    var step=(Math.PI*2)/SPIKES, main=[], k, top=0, best=2;
    for(k=0;k<SPIKES/2;k++){ var th=ROT+2*k*step; main.push(th); if(Math.sin(th)<best){ best=Math.sin(th); top=k; } }
    var order=main.map(function(th,k){ return {k:k, d:((th-main[top])%(Math.PI*2)+Math.PI*2)%(Math.PI*2)}; })
                  .sort(function(a,b){ return a.d-b.d; });
    order.forEach(function(o,i){ LINK_FOR_SPOKE[o.k]=i; });
  })();
  expLinks.forEach(function(a,i){
    HS[i]=0; HT[i]=0;
    a.addEventListener("mouseenter", function(){ HT[i]=1; });
    a.addEventListener("mouseleave", function(){ HT[i]=0; });
    a.addEventListener("focus", function(){ HT[i]=1; });
    a.addEventListener("blur", function(){ HT[i]=0; });
  });

  function spokeW(a,r,wig){
    var ca=Math.cos(a), sa=Math.sin(a), ex=ca*r, ey=sa*r;
    ctx.moveTo(0,0);
    wig=wig||0;
    if(wig>0.005){
      /* hovered practice area: a travelling wave along the whole spoke, ends held, plus the cursor ripple */
      var n2=Math.max(24, Math.ceil(r/4)), nx2=-sa, ny2=ca, v2, x2, y2, o2;
      for(var k2=1;k2<=n2;k2++){
        v2=k2/n2; x2=ex*v2; y2=ey*v2;
        o2=wig*WIG_A*Math.sin(Math.PI*v2)*Math.sin(v2*r*WARP_K - tW*WARP_W)
           + (HOV.s>=0.005 ? warp(HUBX+x2, HUBY+y2, tW)*Math.min(1, v2*4) : 0);
        x2+=nx2*o2; y2+=ny2*o2; ctx.lineTo(x2,y2);
      }
      SX=x2; SY=y2; return;
    }
    if(HOV.s>=0.005){
      /* distance from the cursor to this segment, in screen space */
      var cx=HOV.x-HUBX, cy=HOV.y-HUBY, proj=Math.max(0,Math.min(r, cx*ca+cy*sa));
      var qx=cx-ca*proj, qy=cy-sa*proj;
      if(qx*qx+qy*qy < 9*WARP_R*WARP_R){
        var n=Math.max(16, Math.ceil(r/5)), nx=-sa, ny=ca, v, x, y, off;
        for(var k=1;k<=n;k++){
          v=k/n; x=ex*v; y=ey*v;
          off=warp(HUBX+x, HUBY+y, tW)*Math.min(1, v*4);   /* hub stays put */
          x+=nx*off; y+=ny*off; ctx.lineTo(x,y);
        }
        SX=x; SY=y; return;
      }
    }
    ctx.lineTo(ex,ey); SX=ex; SY=ey;
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

  function drawHero(t, T){
    var PA=clamp01(T/0.5), PB=clamp01((T-0.5)/0.5), m=smooth(PA);
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.clearRect(0,0,W,H);

    var hx=h1x+(h2x-h1x)*m, hy=h1y+(h2y-h1y)*m;  /* hub */
    ctx.save(); ctx.translate(hx,hy);
    ctx.lineWidth=0.8; ctx.lineJoin="round"; ctx.lineCap="round"; ctx.strokeStyle=LINE;

    var amp=AMP*Math.min(W,H), wt = reduce ? 0 : t*SPEED, tw = reduce ? 0 : t;
    var q,u,i,s,e,d,len,tx,ty,b1,b2;
    HOV.x+=(HOV.tx-HOV.x)*0.18; HOV.y+=(HOV.ty-HOV.y)*0.18; HOV.s+=(HOV.ts-HOV.s)*0.07;
    HUBX=hx; HUBY=hy; tW=tw;

    if(PA<1){
      for(i=0;i<tails.length;i++){
        s=tails[i];
        var L=1-smooth(clamp01((PA-s.stag)/(1-s.stag)));
        if(L<=0.001) continue;
        for(q=0;q<SAMPLES;q++){ u=(q/(SAMPLES-1))*L; p1(s,u,A); bx[q]=A.x; by[q]=A.y; px[q]=A.x; py[q]=A.y; }
        for(q=1;q<SAMPLES;q++){
          u=(q/(SAMPLES-1))*L; e=env1(u);
          d = (e>0 ? amp*e*Math.sin(Math.PI*2*(u*WAVES1 - wt) + s.ph) : 0) + warp(hx+bx[q], hy+by[q], tw);
          if(d===0) continue;
          b2=q<SAMPLES-1?q+1:q; b1=q-1; tx=bx[b2]-bx[b1]; ty=by[b2]-by[b1];
          len=Math.sqrt(tx*tx+ty*ty)||1; px[q]=bx[q]+(-ty/len)*d; py[q]=by[q]+(tx/len)*d;
        }
        ctx.beginPath(); ctx.moveTo(px[0],py[0]);
        for(q=1;q<SAMPLES;q++) ctx.lineTo(px[q],py[q]);
        ctx.stroke();
      }
    }

    if(PB>0){
      var ends=[], a, r, ti, cfg, k2, sec, secEnds, g, sw, br;
      for(ti=0;ti<SEC.length;ti++){
        cfg=SEC[ti]; secEnds=[];
        ctx.strokeStyle=cfg.tone; ctx.lineWidth=cfg.w; ctx.beginPath();
        for(k2=0;k2<cfg.list.length;k2++){
          sec=cfg.list[k2];
          g=smooth(clamp01((PB-sec.start)/0.80)); if(g<=0.001) continue;
          sw = reduce ? 0 : SWAY*(Math.sin(t*sec.spd*0.55 + sec.ph) + 0.5*Math.sin(t*sec.spd*0.31 + sec.ph*1.7))/1.5;
          br = reduce ? 1 : 1 + BREATH*Math.sin(t*sec.spd*0.42 + sec.ph*1.3);
          a=sec.theta+sw; r=reach*sec.len*g*br;
          spokeW(a,r);
          if(g>0.72) secEnds.push(SX, SY, clamp01((g-0.72)/0.28));
        }
        ctx.stroke();
        for(k2=0;k2<secEnds.length;k2+=3){
          var rrs=cfg.ring*smooth(secEnds[k2+2]); if(rrs<0.4) continue;
          ctx.beginPath(); ctx.arc(secEnds[k2],secEnds[k2+1],rrs,0,Math.PI*2);
          ctx.fillStyle=TIP; ctx.fill(); ctx.stroke();
        }
      }
      for(k2=0;k2<HS.length;k2++) HS[k2]+=(HT[k2]-HS[k2])*0.12;
      /* two passes: the six minor spokes (light), then the six main ones (dark) on top */
      for(var pass=0;pass<2;pass++){
        var major = pass===1;
        ends=[];
        ctx.strokeStyle = major ? MAIN : MINOR; ctx.lineWidth = major ? MAIN_W : MINOR_W;
        ctx.beginPath();
        for(i=0;i<spikes.length;i++){
          if((i%2===0)!==major) continue;     /* even index = main spoke, one per practice area */
          s=spikes[i];
          g=smooth(clamp01((PB-s.start)/0.88)); if(g<=0.001) continue;
          sw = reduce ? 0 : SWAY*(Math.sin(t*s.spd*0.55 + s.ph) + 0.5*Math.sin(t*s.spd*0.31 + s.ph*1.7))/1.5;
          br = reduce ? 1 : 1 + BREATH*Math.sin(t*s.spd*0.42 + s.ph*1.3);
          a=s.theta+sw; r=reach*s.len*g*br;
          spokeW(a, r, major ? (HS[LINK_FOR_SPOKE[i>>1]]||0) : 0);
          if(g>0.72) ends.push(SX, SY, clamp01((g-0.72)/0.28));
        }
        ctx.stroke();
        for(var e2=0;e2<ends.length;e2+=3){
          var rr=RING*smooth(ends[e2+2]); if(rr<0.5) continue;
          ctx.beginPath(); ctx.arc(ends[e2],ends[e2+1],rr,0,Math.PI*2);
          ctx.fillStyle=TIP; ctx.fill(); ctx.stroke();
        }
      }
    }

    ctx.fillStyle=DOT; ctx.beginPath(); ctx.arc(0,0,DOT_R,0,Math.PI*2); ctx.fill();
    ctx.restore();
  }


  /* fold 1 copy is pinned and slides out to the left as the hero scrolls; each line trails the one above by a beat */
  function frame(now){
    var vh=window.innerHeight, hr=hero.getBoundingClientRect();
    if(hr.bottom>0 && hr.top<vh){
      var T=clamp01(-hr.top/fold1El.offsetHeight);   /* done when fold 2 lands; holds through its pin */
      drawHero(now*0.001, T);
      var PA=clamp01(T/0.5), key=Math.round(PA*1000);
      if(key!==lastOut){
        lastOut=key;
        for(var oi=0;oi<outEls.length;oi++){
          var e=Math.pow(smooth(clamp01((PA-outLag[oi])/0.7)),1.4);
          outEls[oi].style.transform="translate3d("+(-e*outDist[oi]).toFixed(1)+"px,0,0)";
        }
      }
    }
    requestAnimationFrame(frame);
  }

  var rt=null;
  window.addEventListener("resize", function(){ clearTimeout(rt); rt=setTimeout(resize, 60); }, {passive:true});
  build(); resize();
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(resize);
  requestAnimationFrame(frame);
})();
