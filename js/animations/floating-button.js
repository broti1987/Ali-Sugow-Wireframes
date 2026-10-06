/* Ali & Sugow — floating button + leading line
   "Start a conversation" floats, follows the cursor anywhere in the Get in Touch section, and a canvas
   line leads from under the copy to the button, re-routed every frame.
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  /* ---------- floating button + leading line ----------
     The button floats at its home spot, follows the cursor anywhere in the section (on a soft spring,
     kept inside it) and springs home when the cursor leaves. A line leads from a dot under the copy
     to whichever side of the button faces it, re-routed every frame as the button moves, with the
     same always-on ripple as the client line. */
  (function(){
    var mag=document.getElementById("mag"), label=mag.querySelector(".mag-label"), sec=document.getElementById("contact");
    var body=document.getElementById("touch-body"), cvT=document.getElementById("touch-line"), g=cvT.getContext("2d");
    var cx=0, cy=0, tx=0, ty=0, lx=0, ly=0, sc=1, tsc=1, inside=false, px=0, py=0;
    var Wt=0, Ht=0, dprT=1, N=200;
    var rp={x:0,y:0,seen:false}, R=56, A=7, K=Math.PI*2/44, WV=7;
    document.addEventListener("pointermove", function(e){
      if(e.pointerType && e.pointerType!=="mouse"){ inside=false; return; }
      px=e.clientX; py=e.clientY;
      var r=sec.getBoundingClientRect();
      inside = px>=r.left && px<=r.right && py>=r.top && py<=r.bottom;
    }, {passive:true});
    document.addEventListener("pointerleave", function(){ inside=false; });
    window.addEventListener("scroll", function(){ var r=sec.getBoundingClientRect(); inside = inside && py>=r.top && py<=r.bottom; }, {passive:true});
    function size(){ var r=sec.getBoundingClientRect(); dprT=Math.min(2,window.devicePixelRatio||1); Wt=r.width; Ht=r.height; cvT.width=Math.round(Wt*dprT); cvT.height=Math.round(Ht*dprT); }
    window.addEventListener("resize", size, {passive:true}); size();

    var G={}, P={x:0,y:0,tx:0,ty:0};
    function bez(t,o){
      var u=1-t, a=u*u*u, b=3*u*u*t, c=3*u*t*t, d=t*t*t;
      o.x=a*G.x0+b*G.x1+c*G.x2+d*G.x3; o.y=a*G.y0+b*G.y1+c*G.y2+d*G.y3;
      var da=-3*u*u, db=3*u*u-6*u*t, dc=6*u*t-3*t*t, dd=3*t*t;
      o.tx=da*G.x0+db*G.x1+dc*G.x2+dd*G.x3; o.ty=da*G.y0+db*G.y1+dc*G.y2+dd*G.y3;
    }
    function ripple(X,Y,time){
      var ddx=X-rp.x, ddy=Y-rp.y, d2=ddx*ddx+ddy*ddy, r2=d2/(R*R);
      if(r2>9) return 0;
      return A*Math.exp(-r2)*Math.sin(Math.sqrt(d2)*K - time*WV);
    }

    function tick(now){
      var sr=sec.getBoundingClientRect();
      if(sr.bottom>0 && sr.top<window.innerHeight){
        var t=now*0.001, home=mag.parentNode.getBoundingClientRect();
        var hx=home.left+home.width/2, hy=home.top+home.height/2, hw=home.width/2, hh=home.height/2;
        if(inside){
          var gx=Math.max(sr.left+hw+16, Math.min(sr.right-hw-16, px));
          var gy=Math.max(sr.top+hh+16, Math.min(sr.bottom-hh-16, py));
          tx=gx-hx; ty=gy-hy; tsc=1;
        } else {
          tx = reduce?0:Math.sin(t*0.9)*5; ty = reduce?0:Math.sin(t*1.3+1)*7; tsc=1;
        }
        var k = inside ? 0.12 : 0.06;
        cx+=(tx-cx)*k; cy+=(ty-cy)*k; sc+=(tsc-sc)*0.12;
        var vx=tx-cx, vy=ty-cy;
        lx+=(Math.max(-14,Math.min(14,vx*0.12))-lx)*0.2; ly+=(Math.max(-14,Math.min(14,vy*0.12))-ly)*0.2;
        mag.style.transform="translate3d("+cx.toFixed(2)+"px,"+cy.toFixed(2)+"px,0) scale("+sc.toFixed(3)+")";
        label.style.transform="translate3d("+(-lx).toFixed(2)+"px,"+(-ly).toFixed(2)+"px,0)";

        /* line: dot 40px under the paragraph's centre, out downward, flat into the button's near side */
        var br=body.getBoundingClientRect();
        var x0=br.left+br.width/2-sr.left, y0=br.bottom+40-sr.top;
        var bcx=hx+cx-sr.left, bcy=hy+cy-sr.top, side = bcx>=x0 ? -1 : 1;
        var x3=bcx+side*hw*sc, y3=bcy;
        var dx=Math.abs(x3-x0), dy=y3-y0;
        G.x0=x0; G.y0=y0;
        G.x1=x0; G.y1=y0+Math.max(60, Math.abs(dy)*0.5+40);
        G.x2=x3+side*Math.max(60, dx*0.45); G.y2=y3;
        G.x3=x3; G.y3=y3;

        /* ripple rests mid-curve and drifts; with the cursor in the section it slides to the nearest point */
        var tt;
        if(inside){
          var best=1e12, bt=0.5, mx=px-sr.left, my=py-sr.top;
          for(var si=0;si<=40;si++){ var st=si/40; bez(st,P); var ex=P.x-mx, ey=P.y-my, dd=ex*ex+ey*ey; if(dd<best){best=dd; bt=st;} }
          tt=Math.max(0.12,Math.min(0.85,bt));
        } else tt=0.5+0.14*Math.sin(t*0.35);
        bez(tt,P);
        if(!rp.seen){ rp.x=P.x; rp.y=P.y; rp.seen=true; }
        rp.x+=(P.x-rp.x)*0.08; rp.y+=(P.y-rp.y)*0.08;

        var tm = reduce ? 0 : t;
        g.setTransform(dprT,0,0,dprT,0,0); g.clearRect(0,0,Wt,Ht);
        g.beginPath(); g.lineWidth=1; g.strokeStyle="#000"; g.lineJoin="round"; g.lineCap="round";
        for(var i=0;i<=N;i++){
          var tq=i/N; bez(tq,P);
          var L=Math.sqrt(P.tx*P.tx+P.ty*P.ty)||1, off=ripple(P.x,P.y,tm)*Math.min(1,tq*6)*Math.min(1,(1-tq)*6);
          var X=P.x+(-P.ty/L)*off, Y=P.y+(P.tx/L)*off;
          if(i===0) g.moveTo(X,Y); else g.lineTo(X,Y);
        }
        g.stroke();
        g.fillStyle="#000"; g.beginPath(); g.arc(x0,y0,2.5,0,Math.PI*2); g.fill();
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  })();

})();
