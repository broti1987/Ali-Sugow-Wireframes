/* Ali & Sugow — Our Work section
   As the section arrives the page ground fades to dark (and back as it leaves). While pinned, the
   matters inside the pill turn like a twisting cuboid — one face per matter, turning upward, with
   the left edge leading and the right edge trailing plus a gentle wave, so the content twists
   through as you scroll. The pill itself stays still. The year rolls with the matters.

   Rendering: WebGL. Each matter is drawn once into a texture (headline, tags, image placeholder)
   and mapped onto a finely divided surface that is twisted smoothly in the vertex shader — a
   continuous twist, no strips. If WebGL is unavailable it falls back to CSS strips.

   The markup in index.html (#track-l / #track-r) is the source content; this file rebuilds it.
   Depends on js/core.js (window.AS: reduce, clamp01, smooth). */
(function(){
  "use strict";
  var reduce=AS.reduce, clamp01=AS.clamp01, smooth=AS.smooth;

  var TWIST=0.34;     /* share of each turn by which the right edge trails the left edge */
  var WAVE=0.08;      /* extra wave across the width on top of the straight twist */
  var SHADE=0.32;     /* how dark a face gets as it turns away */
  var PERSP=1800;     /* perspective distance in px */
  var COLS=192;       /* columns in the WebGL surface (smoothness of the twist) */
  var FALLBACK_SLICES=32;

  var cases=document.getElementById("cases"), peopleEl=document.getElementById("people");
  var pill=document.querySelector(".reels");
  var yearTrack=document.getElementById("year-track");
  var root=document.documentElement;

  /* ---- read the source content ---- */
  var textPanels=[].slice.call(document.querySelectorAll("#track-l > .panel"));
  var imgPanels=[].slice.call(document.querySelectorAll("#track-r > .panel")).reverse();   /* track-r is stored bottom-up */
  var N=textPanels.length;
  var matters=textPanels.map(function(p,k){
    var tags=[].slice.call(p.querySelectorAll(".tag"));
    return {
      head: p.querySelector("h3").textContent.trim(),
      tags: tags.map(function(t){ return { text:t.textContent.trim().toUpperCase(), count:t.classList.contains("tag--count") }; }),
      img: getComputedStyle(imgPanels[k]).backgroundColor
    };
  });

  /* keep the real text for screen readers, out of sight */
  var sr=document.createElement("div"); sr.className="sr-only";
  textPanels.forEach(function(p){ var a=document.createElement("article"); a.innerHTML=p.innerHTML; sr.appendChild(a); });
  pill.parentNode.insertBefore(sr, pill);

  var srcHTML=textPanels.map(function(p){ return p.innerHTML; });
  var imgClass=imgPanels.map(function(p){ return p.className.replace("panel","").trim(); });
  pill.innerHTML=""; pill.classList.add("is-cuboid"); pill.setAttribute("aria-hidden","true");

  /* hold, turn, hold: position p along the matters → turn index i and progress q (0..1) */
  function split(p){
    p=Math.max(0,Math.min(N-1,p));
    var i=Math.min(Math.floor(p), N-2), f=p-i;
    return {i:i, q:clamp01((f-0.2)/0.6)};
  }

  var renderer = makeGL() || makeSlices();

  /* ---------------- shared scroll loop ---------------- */
  var lastBg=-1, lastKey=null;
  function mix(k){ var v=Math.round(237+(26-237)*k); return "rgb("+v+","+v+","+v+")"; }
  function update(){
    var vh=window.innerHeight, r=cases.getBoundingClientRect();
    var kin=clamp01((vh*0.7 - r.top)/(vh*0.55));
    /* the dark ground holds through the People section and lifts as People leaves */
    var pr=peopleEl ? peopleEl.getBoundingClientRect() : r;
    var kout=clamp01((pr.bottom - vh*0.3)/(vh*0.55));
    var kk=smooth(Math.min(kin,kout));
    var kq=Math.round(kk*200)/200;
    if(kq!==lastBg){ root.style.setProperty("--page", mix(kq)); lastBg=kq; }
    AS.state.groundDark = kk>0.5;   /* header.js turns the bar dark from this */

    if(r.bottom<0 || r.top>vh) return;
    var p=clamp01(-r.top/(r.height - vh))*(N-1);
    var key=Math.round(p*2000);
    if(key===lastKey && !renderer.dirty) return;
    lastKey=key; renderer.dirty=false;
    var sp=split(p);
    yearTrack.style.transform="translate3d(0,"+(-(sp.i+smooth(sp.q))*100/N)+"%,0)";
    renderer.draw(sp);
  }
  window.addEventListener("resize", function(){ renderer.resize(); }, {passive:true});
  function loop(){ update(); requestAnimationFrame(loop); }
  requestAnimationFrame(loop);

  /* ======================= WebGL renderer ======================= */
  function makeGL(){
    var cv=document.createElement("canvas"); cv.className="cuboid-gl";
    var gl=cv.getContext("webgl",{antialias:true, alpha:true, premultipliedAlpha:true});
    if(!gl) return null;
    pill.appendChild(cv);

    var VS=[
      "attribute vec3 aP;",                  /* x 0..1, y 0..1, face index */
      "uniform vec2 uSize; uniform float uI, uQ, uTwist, uWave, uSpan, uPersp;",
      "varying vec2 vUV; varying float vCos; varying float vK;",
      "float sm(float t){ return t*t*(3.0-2.0*t); }",
      "void main(){",
      "  float x=aP.x, y=aP.y, k=aP.z;",
      "  float lag = uTwist*x + uWave*(0.5+0.5*sin(x*6.2831853));",
      "  float qs = clamp((uQ-lag)/(1.0-uSpan), 0.0, 1.0);",
      "  float th = (uI + sm(qs) - k)*1.5707963;",        /* turn angle minus this face's offset */
      "  float c=cos(th), s=sin(th), h=uSize.y, hh=h*0.5;",
      "  float yl=(y-0.5)*h;",                            /* px, y down, on the face */
      "  float Y = yl*c - hh*s;",                         /* rotate about X (face sits hh in front of the axis) */
      "  float Z = yl*s + hh*c - hh;",                    /* then push back so the resting face is at z=0 */
      "  float X = (x-0.5)*uSize.x;",
      "  float w = (uPersp - Z)/uPersp;",
      "  gl_Position = vec4(X/(uSize.x*0.5), -Y/hh, (-Z/(2.0*h))*w, w);",
      "  vUV=vec2(x,y); vCos=c; vK=k;",
      "}"].join("\n");
    var FS=[
      "precision mediump float;",
      "uniform sampler2D uT0, uT1, uT2; uniform float uShade;",
      "varying vec2 vUV; varying float vCos; varying float vK;",
      "void main(){",
      "  if(vCos<0.0) discard;",                          /* faces turned away */
      "  vec4 col = vK<0.5 ? texture2D(uT0,vUV) : (vK<1.5 ? texture2D(uT1,vUV) : texture2D(uT2,vUV));",
      "  col.rgb *= 1.0 - uShade*(1.0-vCos);",
      "  gl_FragColor = col;",
      "}"].join("\n");
    function sh(type,src){ var s=gl.createShader(type); gl.shaderSource(s,src); gl.compileShader(s); if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw gl.getShaderInfoLog(s); return s; }
    var prog;
    try{
      prog=gl.createProgram();
      gl.attachShader(prog, sh(gl.VERTEX_SHADER,VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER,FS));
      gl.linkProgram(prog); if(!gl.getProgramParameter(prog,gl.LINK_STATUS)) throw gl.getProgramInfoLog(prog);
    }catch(e){ pill.removeChild(cv); return null; }
    gl.useProgram(prog);

    /* surface: per face, COLS columns, each column one quad spanning the face height
       (perspective-correct interpolation keeps the texture true along y) */
    var verts=[];
    for(var k=0;k<N;k++) for(var c=0;c<COLS;c++){
      var x0=c/COLS, x1=(c+1)/COLS;
      verts.push(x0,0,k, x1,0,k, x0,1,k,  x1,0,k, x1,1,k, x0,1,k);
    }
    var buf=gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER,buf);
    gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
    var aP=gl.getAttribLocation(prog,"aP"); gl.enableVertexAttribArray(aP); gl.vertexAttribPointer(aP,3,gl.FLOAT,false,0,0);
    var U={}; ["uSize","uI","uQ","uTwist","uWave","uSpan","uPersp","uShade","uT0","uT1","uT2"].forEach(function(n){ U[n]=gl.getUniformLocation(prog,n); });
    gl.uniform1i(U.uT0,0); gl.uniform1i(U.uT1,1); gl.uniform1i(U.uT2,2);
    gl.enable(gl.DEPTH_TEST);

    var texs=[]; for(var t=0;t<3;t++) texs.push(gl.createTexture());
    var W=0,H=0,dpr=1, R={dirty:true};

    /* draw one matter into a 2D canvas: white half with headline + tags, image half */
    function paint(k){
      var m=matters[k], c2=document.createElement("canvas");
      c2.width=Math.round(W*dpr); c2.height=Math.round(H*dpr);
      var g=c2.getContext("2d"); g.scale(dpr,dpr);
      var half=W/2;
      g.fillStyle="#ffffff"; g.fillRect(0,0,half,H);
      g.fillStyle=m.img; g.fillRect(half,0,W-half,H);
      /* headline: 32/40 SemiBold, padded 80 top, 128 sides */
      g.fillStyle="#1a1a1a"; g.font='600 32px Figtree, ui-sans-serif, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      try{ g.letterSpacing="-0.5px"; }catch(e){}
      g.textBaseline="middle";
      var maxW=half-256, words=m.head.split(/\s+/), line="", y=80+20;
      for(var i=0;i<words.length;i++){
        var test=line ? line+" "+words[i] : words[i];
        if(g.measureText(test).width>maxW && line){ g.fillText(line,128,y); line=words[i]; y+=40; }
        else line=test;
      }
      if(line) g.fillText(line,128,y);
      /* tags: 32px-tall outlined pills, 10px apart, sitting 80px off the bottom */
      g.font='600 12px Figtree, ui-sans-serif, -apple-system, "Segoe UI", Helvetica, Arial, sans-serif';
      try{ g.letterSpacing="0.6px"; }catch(e){}
      var tx=128, ty=H-80-32;
      m.tags.forEach(function(tg){
        var tw=g.measureText(tg.text).width+32;
        g.beginPath(); g.lineWidth=1; g.strokeStyle="#a3a3a3";
        if(g.roundRect) g.roundRect(tx+0.5,ty+0.5,tw-1,31,16); else g.rect(tx+0.5,ty+0.5,tw-1,31);
        g.stroke();
        g.fillStyle = tg.count ? "#737373" : "#5c5c5c";
        g.fillText(tg.text, tx+16, ty+16.5);
        tx+=tw+10;
      });
      gl.activeTexture(gl.TEXTURE0+k); gl.bindTexture(gl.TEXTURE_2D,texs[k]);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,true);
      gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,c2);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    }
    R.resize=function(){
      dpr=Math.min(2, window.devicePixelRatio||1);
      W=pill.clientWidth; H=pill.clientHeight;
      cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr);
      gl.viewport(0,0,cv.width,cv.height);
      for(var k=0;k<N && k<3;k++) paint(k);
      R.dirty=true;
    };
    R.draw=function(sp){
      gl.clearColor(0,0,0,0); gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
      gl.uniform2f(U.uSize,W,H);
      gl.uniform1f(U.uI,sp.i); gl.uniform1f(U.uQ,sp.q);
      gl.uniform1f(U.uTwist, reduce?0:TWIST); gl.uniform1f(U.uWave, reduce?0:WAVE);
      gl.uniform1f(U.uSpan, reduce?0:TWIST+WAVE); gl.uniform1f(U.uPersp,PERSP); gl.uniform1f(U.uShade,SHADE);
      gl.drawArrays(gl.TRIANGLES,0,verts.length/3);
    };
    R.resize();
    /* repaint once the web font is in, so the textures use Figtree */
    if(document.fonts && document.fonts.load){
      Promise.all([document.fonts.load('600 32px Figtree'), document.fonts.load('600 12px Figtree')]).then(function(){ R.resize(); });
    }
    return R;
  }

  /* ======================= CSS-strip fallback ======================= */
  function makeSlices(){
    var cubes=[], faces=[], R={dirty:true};
    for(var s=0;s<FALLBACK_SLICES;s++){
      var slice=document.createElement("div"); slice.className="cslice";
      var cube=document.createElement("div"); cube.className="ccube";
      var fs=[];
      for(var k=0;k<N;k++){
        var face=document.createElement("div"); face.className="cface"; face.style.setProperty("--k",k);
        var row=document.createElement("div"); row.className="crow";
        var txt=document.createElement("div"); txt.className="case"; txt.innerHTML=srcHTML[k];
        var img=document.createElement("div"); img.className=imgClass[k];
        row.appendChild(txt); row.appendChild(img); face.appendChild(row); cube.appendChild(face); fs.push(face);
      }
      slice.appendChild(cube); pill.appendChild(slice); cubes.push(cube); faces.push(fs);
    }
    R.resize=function(){
      var w=pill.clientWidth, h=pill.clientHeight, sw=w/FALLBACK_SLICES;
      pill.style.setProperty("--pw", w+"px"); pill.style.setProperty("--ph", h+"px");
      for(var s=0;s<FALLBACK_SLICES;s++){
        var sl=cubes[s].parentNode; sl.style.left=(s*sw)+"px"; sl.style.width=(sw+1)+"px";
        for(var k=0;k<N;k++) faces[s][k].firstElementChild.style.left=(-s*sw)+"px";
      }
      R.dirty=true;
    };
    R.draw=function(sp){
      var span=TWIST+WAVE;
      for(var s=0;s<FALLBACK_SLICES;s++){
        var u=s/(FALLBACK_SLICES-1);
        var lag = reduce ? 0 : TWIST*u + WAVE*(0.5+0.5*Math.sin(u*Math.PI*2));
        var qs = reduce ? sp.q : clamp01((sp.q-lag)/(1-span));
        var ang=(sp.i+smooth(qs))*90;
        cubes[s].style.transform="translateZ(calc(var(--ph) / -2)) rotateX("+ang.toFixed(2)+"deg)";
        for(var k=0;k<N;k++){
          var rel=(ang-90*k)*Math.PI/180;
          faces[s][k].style.setProperty("--shade", (SHADE*(1-Math.cos(rel))).toFixed(3));
        }
      }
    };
    R.resize();
    return R;
  }
})();
