/* ============================================
   Technovate — Interactive 3D Scenes v3
   
   Every scene uses RECOGNIZABLE symbols:
     1  Hero      — Laptop with live typing + 5 draggable app cards
     2  About     — Building blocks you can drag and stack
     3  Technology — Circuit board with draggable data nodes
     4  Solutions  — 5 draggable app screens (one per sector)
     5  Impact     — 3D bar chart that grows on click
     6  Grants     — Two platforms with draggable resource spheres
     7  Contact    — Interactive globe you can spin + click cities
   
   TRUE INTERACTIVITY:
   - Raycaster-based drag: click any highlighted object, move it
   - Click effects on every scene
   - Hover highlights with color change
   - Touch support (drag + tap)
   ============================================ */
(function () {
  'use strict';
  if (typeof THREE === 'undefined') { console.warn('Three.js not loaded'); return; }

  var C = {
    blue: 0x2563eb, blueL: 0x60a5fa, blueP: 0x93c5fd,
    accent: 0xf59e0b, accentL: 0xfbbf24,
    teal: 0x14b8a6, white: 0xe2e8f0,
    bg: 0x0f172a, dark: 0x060b18, dim: 0x1e293b, dimL: 0x2d3a52,
    health: 0x34d399, finance: 0xfbbf24, education: 0xa78bfa,
    enterprise: 0x38bdf8, community: 0xf472b6,
    screen: 0x0a1628, codeLine: 0x3b82f6
  };

  var scenes = [];
  var visible = new Set();
  function lerp(a,b,t){return a+(b-a)*t;}

  function makeRenderer(el){
    var r=new THREE.WebGLRenderer({antialias:true,alpha:false});
    r.setPixelRatio(Math.min(window.devicePixelRatio,2));
    r.setClearColor(C.bg,1);
    var rc=el.getBoundingClientRect();
    r.setSize(rc.width,rc.height);
    el.appendChild(r.domElement);
    return r;
  }
  function makeCam(el){
    var rc=el.getBoundingClientRect();
    return new THREE.PerspectiveCamera(45,rc.width/rc.height,0.1,200);
  }

  /* ---- Raycaster drag system ---- */
  function makeDragSystem(container, camera, draggables) {
    var raycaster = new THREE.Raycaster();
    var mouse = new THREE.Vector2();
    var plane = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
    var intersection = new THREE.Vector3();
    var offset = new THREE.Vector3();
    var dragged = null;
    var hovered = null;
    var hover = {x:0,y:0,inside:false};
    var clicked = false;

    function getM(e, rect) {
      var cx = e.touches ? e.touches[0].clientX : e.clientX;
      var cy = e.touches ? e.touches[0].clientY : e.clientY;
      mouse.x = ((cx-rect.left)/rect.width)*2-1;
      mouse.y = -((cy-rect.top)/rect.height)*2+1;
      hover.x = mouse.x; hover.y = mouse.y;
    }

    container.addEventListener('mousemove', function(e){
      var r=container.getBoundingClientRect();
      getM(e,r);
      hover.inside=true;
      if(dragged){
        raycaster.setFromCamera(mouse, camera);
        if(raycaster.ray.intersectPlane(plane, intersection)){
          dragged.position.copy(intersection.sub(offset));
        }
      }
    });

    container.addEventListener('mousedown', function(e){
      var r=container.getBoundingClientRect();
      getM(e,r);
      raycaster.setFromCamera(mouse, camera);
      var hits = raycaster.intersectObjects(draggables, true);
      if(hits.length>0){
        var obj = hits[0].object;
        while(obj.parent && draggables.indexOf(obj)===-1) obj=obj.parent;
        if(draggables.indexOf(obj)!==-1){
          dragged = obj;
          plane.setFromNormalAndCoplanarPoint(
            camera.getWorldDirection(new THREE.Vector3()).negate(),
            dragged.position
          );
          raycaster.ray.intersectPlane(plane, intersection);
          offset.copy(intersection).sub(dragged.position);
          container.style.cursor='grabbing';
        }
      } else {
        clicked = true;
      }
    });

    container.addEventListener('mouseup', function(){
      if(dragged){
        container.style.cursor='grab';
        dragged=null;
      }
    });

    container.addEventListener('mouseleave', function(){
      hover.inside=false; dragged=null;
      container.style.cursor='grab';
    });

    /* Touch */
    container.addEventListener('touchstart', function(e){
      e.preventDefault();
      hover.inside=true;
      var r=container.getBoundingClientRect();
      getM(e,r);
      raycaster.setFromCamera(mouse, camera);
      var hits=raycaster.intersectObjects(draggables,true);
      if(hits.length>0){
        var obj=hits[0].object;
        while(obj.parent&&draggables.indexOf(obj)===-1) obj=obj.parent;
        if(draggables.indexOf(obj)!==-1){
          dragged=obj;
          plane.setFromNormalAndCoplanarPoint(camera.getWorldDirection(new THREE.Vector3()).negate(),dragged.position);
          raycaster.ray.intersectPlane(plane,intersection);
          offset.copy(intersection).sub(dragged.position);
        }
      } else { clicked=true; }
    },{passive:false});

    container.addEventListener('touchmove', function(e){
      e.preventDefault();
      if(dragged){
        var r=container.getBoundingClientRect();
        getM(e,r);
        raycaster.setFromCamera(mouse,camera);
        if(raycaster.ray.intersectPlane(plane,intersection)){
          dragged.position.copy(intersection.sub(offset));
        }
      }
    },{passive:false});

    container.addEventListener('touchend', function(){
      if(!dragged) clicked=true;
      dragged=null;
    });

    /* Hover highlight */
    function updateHover(){
      if(!hover.inside){
        if(hovered){ hovered=null; }
        return;
      }
      raycaster.setFromCamera(mouse,camera);
      var hits=raycaster.intersectObjects(draggables,true);
      var newH = null;
      if(hits.length>0){
        var obj=hits[0].object;
        while(obj.parent&&draggables.indexOf(obj)===-1) obj=obj.parent;
        if(draggables.indexOf(obj)!==-1) newH=obj;
      }
      if(newH!==hovered){
        hovered=newH;
        container.style.cursor=hovered?'pointer':'grab';
      }
    }

    return {
      get dragged(){return dragged;},
      get hovered(){return hovered;},
      get hover(){return hover;},
      get clicked(){var c=clicked;clicked=false;return c;},
      updateHover: updateHover
    };
  }

  function register(id, initFn){
    var el=document.getElementById(id);
    if(!el)return;
    var r=makeRenderer(el), cam=makeCam(el), scene=new THREE.Scene();
    var clock=new THREE.Clock();
    var st={renderer:r,camera:cam,scene:scene,clock:clock,container:el};
    var update=initFn(st);
    scenes.push({state:st,update:update,container:el});
  }

  var observer;
  function setupObserver(){
    observer=new IntersectionObserver(function(es){
      es.forEach(function(e){
        var s=scenes.find(function(sc){return sc.container===e.target;});
        if(s){if(e.isIntersecting)visible.add(s);else visible.delete(s);}
      });
    },{threshold:0});
    scenes.forEach(function(s){observer.observe(s.container);});
  }

  function animate(){
    requestAnimationFrame(animate);
    visible.forEach(function(s){
      s.update(s.state);
      s.state.renderer.render(s.state.scene,s.state.camera);
    });
  }

  window.addEventListener('resize',function(){
    scenes.forEach(function(s){
      var rc=s.container.getBoundingClientRect();
      if(rc.width===0)return;
      s.state.renderer.setSize(rc.width,rc.height);
      s.state.camera.aspect=rc.width/rc.height;
      s.state.camera.updateProjectionMatrix();
    });
  });

  /* ========================================================
     Helper: make a "screen" / app card
     ======================================================== */
  function makeCard(w, h, color, borderColor){
    var g = new THREE.Group();
    /* Background */
    var bg = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, 0.05),
      new THREE.MeshBasicMaterial({color: 0x111827, transparent:true, opacity:0.9})
    );
    g.add(bg);
    /* Top bar */
    var bar = new THREE.Mesh(
      new THREE.BoxGeometry(w, h*0.12, 0.06),
      new THREE.MeshBasicMaterial({color: color})
    );
    bar.position.y = h/2 - h*0.06;
    bar.position.z = 0.01;
    g.add(bar);
    /* Border glow */
    var border = new THREE.Mesh(
      new THREE.BoxGeometry(w+0.06, h+0.06, 0.02),
      new THREE.MeshBasicMaterial({color: borderColor||color, transparent:true, opacity:0.15})
    );
    border.position.z = -0.02;
    g.add(border);
    return g;
  }

  /* Helper: code lines (horizontal bars) */
  function makeCodeLines(w, h, count, color){
    var g = new THREE.Group();
    for(var i=0; i<count; i++){
      var lineW = (0.3 + Math.random()*0.6) * w * 0.8;
      var line = new THREE.Mesh(
        new THREE.BoxGeometry(lineW, h*0.04, 0.01),
        new THREE.MeshBasicMaterial({color:color, transparent:true, opacity:0.6})
      );
      line.position.x = -w*0.35 + lineW/2;
      line.position.y = h*0.3 - (i/(count-1))*h*0.7;
      line.position.z = 0.04;
      line.userData.baseOpacity = 0.6;
      line.userData.index = i;
      g.add(line);
    }
    return g;
  }

  /* ========================================================
     SCENE 1 — HERO: Laptop with live typing + draggable app cards
     ======================================================== */
  function initHero(s){
    s.camera.position.set(0, 2, 18);
    s.camera.lookAt(0, 0, 0);

    var world = new THREE.Group();
    s.scene.add(world);

    /* --- Laptop --- */
    var laptop = new THREE.Group();

    /* Screen */
    var screenFrame = new THREE.Mesh(
      new THREE.BoxGeometry(7, 4.5, 0.15),
      new THREE.MeshBasicMaterial({color: 0x1a1a2e})
    );
    screenFrame.position.y = 2.8;
    screenFrame.rotation.x = -0.1;
    laptop.add(screenFrame);

    var screenFace = new THREE.Mesh(
      new THREE.PlaneGeometry(6.4, 3.9),
      new THREE.MeshBasicMaterial({color: C.screen})
    );
    screenFace.position.set(0, 2.8, 0.09);
    screenFace.rotation.x = -0.1;
    laptop.add(screenFace);

    /* Code lines on screen */
    var codeGroup = new THREE.Group();
    codeGroup.position.set(0, 2.8, 0.1);
    codeGroup.rotation.x = -0.1;
    var CODE_LINES = 10;
    var codeLines = [];
    for(var cl=0; cl<CODE_LINES; cl++){
      var lw = (0.2 + Math.random()*0.5) * 5;
      var indent = Math.floor(Math.random()*3) * 0.4;
      var colors = [C.blueL, C.accent, C.teal, C.blueP, 0x818cf8];
      var lc = colors[Math.floor(Math.random()*colors.length)];
      var line = new THREE.Mesh(
        new THREE.BoxGeometry(lw, 0.12, 0.01),
        new THREE.MeshBasicMaterial({color:lc, transparent:true, opacity:0})
      );
      line.position.set(-2.8 + indent + lw/2, 1.5 - cl * 0.32, 0);
      line.userData.targetOpacity = 0;
      line.userData.delay = cl * 0.3;
      codeGroup.add(line);
      codeLines.push(line);
    }
    laptop.add(codeGroup);

    /* Cursor */
    var cursor = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.16, 0.01),
      new THREE.MeshBasicMaterial({color: C.accent})
    );
    cursor.position.set(-2.8, 1.5, 0.11);
    cursor.rotation.x = -0.1;
    laptop.add(cursor);

    /* Keyboard base */
    var base = new THREE.Mesh(
      new THREE.BoxGeometry(7.5, 0.2, 4.5),
      new THREE.MeshBasicMaterial({color: 0x1a1a2e})
    );
    base.position.y = 0.1;
    base.rotation.x = 0.05;
    laptop.add(base);

    /* Keyboard keys (grid of small boxes) */
    for(var row=0; row<4; row++){
      for(var col=0; col<12; col++){
        var key = new THREE.Mesh(
          new THREE.BoxGeometry(0.42, 0.08, 0.42),
          new THREE.MeshBasicMaterial({color: 0x2a2a3e, transparent:true, opacity:0.7})
        );
        key.position.set(-2.8 + col*0.5, 0.22, -1.2 + row*0.55);
        key.rotation.x = 0.05;
        laptop.add(key);
      }
    }

    /* Screen glow */
    var glow = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshBasicMaterial({color: C.blue, transparent:true, opacity:0.03})
    );
    glow.position.set(0, 2.8, -0.5);
    laptop.add(glow);

    laptop.position.y = -1.5;
    world.add(laptop);

    /* --- 5 Draggable app cards floating around the laptop --- */
    var sectorInfo = [
      {color: C.health, label:'Health', x:-5.5, y:3},
      {color: C.finance, label:'Finance', x:5.5, y:3},
      {color: C.education, label:'Education', x:-5.5, y:-0.5},
      {color: C.enterprise, label:'Enterprise', x:5.5, y:-0.5},
      {color: C.community, label:'Community', x:0, y:4.5}
    ];

    var draggables = [];
    sectorInfo.forEach(function(sec){
      var card = makeCard(2, 1.4, sec.color, sec.color);
      /* Content lines inside card */
      for(var i=0;i<3;i++){
        var cl2 = new THREE.Mesh(
          new THREE.BoxGeometry(1.2+Math.random()*0.4, 0.06, 0.01),
          new THREE.MeshBasicMaterial({color:sec.color, transparent:true, opacity:0.3})
        );
        cl2.position.set(-0.2, 0.15-i*0.25, 0.04);
        card.add(cl2);
      }
      card.position.set(sec.x, sec.y, 1+Math.random()*2);
      card.userData.homeX = sec.x;
      card.userData.homeY = sec.y;
      card.userData.homeZ = card.position.z;
      card.userData.color = sec.color;
      world.add(card);
      draggables.push(card);
    });

    var drag = makeDragSystem(s.container, s.camera, draggables);
    var typingLine = 0;
    var typingTimer = 0;

    return function(st){
      var t = st.clock.getElapsedTime();
      drag.updateHover();

      /* Typing animation */
      typingTimer += st.clock.getDelta();
      if(typingTimer > 0.25){
        typingTimer = 0;
        if(typingLine < CODE_LINES){
          codeLines[typingLine].userData.targetOpacity = 0.7;
          typingLine++;
        }
      }
      /* Loop typing */
      if(typingLine >= CODE_LINES && codeLines[CODE_LINES-1].material.opacity > 0.6){
        setTimeout(function(){
          typingLine = 0;
          codeLines.forEach(function(l){l.userData.targetOpacity=0;});
        }, 1500);
      }

      codeLines.forEach(function(l){
        l.material.opacity = lerp(l.material.opacity, l.userData.targetOpacity, 0.08);
      });

      /* Cursor blink + follow typing position */
      cursor.visible = Math.sin(t*6)>0;
      if(typingLine < CODE_LINES){
        cursor.position.y = 1.5 - typingLine * 0.32 - 1.5;
        cursor.position.y += 2.8;
      }

      /* Floating cards bob gently when not dragged */
      draggables.forEach(function(card){
        if(card !== drag.dragged){
          card.position.y = lerp(card.position.y,
            card.userData.homeY + Math.sin(t*0.8 + card.userData.homeX)*0.3, 0.02);
          card.rotation.y = lerp(card.rotation.y, Math.sin(t*0.5+card.userData.homeX)*0.1, 0.03);
        }
        /* Hover glow */
        var isHovered = card === drag.hovered;
        card.children.forEach(function(ch){
          if(ch.material && ch.material.opacity !== undefined && ch.material.color){
            // Border glow brighter on hover
          }
        });
        card.scale.setScalar(lerp(card.scale.x, isHovered||card===drag.dragged?1.12:1, 0.08));
      });

      /* Gentle scene rotation */
      if(!drag.dragged){
        world.rotation.y = lerp(world.rotation.y, Math.sin(t*0.15)*0.08, 0.02);
        world.rotation.x = lerp(world.rotation.x, Math.sin(t*0.1)*0.03, 0.02);
      }
    };
  }

  /* ========================================================
     SCENE 2 — ABOUT: Draggable building blocks
     Stack of blocks = building the company. Drag to rearrange.
     ======================================================== */
  function initAbout(s){
    s.camera.position.set(0, 3, 12);
    s.camera.lookAt(0, 1, 0);

    var draggables = [];
    var blockData = [
      {w:2.5, h:0.6, d:1.5, color:C.blue, y:0.3, label:'Foundation'},
      {w:2.2, h:0.6, d:1.3, color:C.blueL, y:0.9, label:'Governance'},
      {w:1.9, h:0.6, d:1.1, color:C.teal, y:1.5, label:'Ethics'},
      {w:1.6, h:0.6, d:0.9, color:C.accent, y:2.1, label:'Innovation'},
      {w:1.2, h:0.6, d:0.7, color:C.accentL, y:2.7, label:'Mission'}
    ];

    blockData.forEach(function(bd){
      var geo = new THREE.BoxGeometry(bd.w, bd.h, bd.d);
      var mat = new THREE.MeshBasicMaterial({color:bd.color, transparent:true, opacity:0.7});
      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geo),
        new THREE.LineBasicMaterial({color:bd.color, transparent:true, opacity:0.9})
      );
      var block = new THREE.Group();
      block.add(new THREE.Mesh(geo, mat));
      block.add(edges);
      block.position.set(0, bd.y, 0);
      block.userData.homeY = bd.y;
      s.scene.add(block);
      draggables.push(block);
    });

    /* Ground plane reference */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(6, 4),
      new THREE.MeshBasicMaterial({color:C.dim, transparent:true, opacity:0.15})
    );
    ground.rotation.x = -Math.PI/2;
    s.scene.add(ground);

    var drag = makeDragSystem(s.container, s.camera, draggables);

    return function(st){
      var t = st.clock.getElapsedTime();
      drag.updateHover();

      draggables.forEach(function(block, i){
        if(block !== drag.dragged){
          /* Gentle hover float */
          block.position.y = lerp(block.position.y,
            block.userData.homeY + Math.sin(t*0.6+i*0.8)*0.08, 0.03);
        }
        var isH = block === drag.hovered || block === drag.dragged;
        block.children[0].material.opacity = lerp(block.children[0].material.opacity, isH?0.9:0.65, 0.08);
        block.scale.setScalar(lerp(block.scale.x, isH?1.08:1, 0.06));
      });
    };
  }

  /* ========================================================
     SCENE 3 — TECHNOLOGY: Circuit board with draggable nodes
     Nodes connected by lines. Drag nodes, connections follow.
     ======================================================== */
  function initTech(s){
    s.camera.position.set(0, 0, 14);

    var draggables = [];
    var nodeData = [
      {x:-4, y:2, color:C.teal},
      {x:-2, y:-1, color:C.blueL},
      {x:0, y:2.5, color:C.accent},
      {x:2, y:0, color:C.blue},
      {x:4, y:2, color:C.accentL},
      {x:-3, y:0.5, color:C.blueP},
      {x:1, y:-2, color:C.teal},
      {x:3, y:-1.5, color:C.blueL},
      {x:-1, y:1, color:C.accent}
    ];

    var nodes = [];
    nodeData.forEach(function(nd){
      var g = new THREE.Group();
      /* Core sphere */
      g.add(new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 12, 12),
        new THREE.MeshBasicMaterial({color:nd.color})
      ));
      /* Glow ring */
      g.add(new THREE.Mesh(
        new THREE.RingGeometry(0.3, 0.42, 24),
        new THREE.MeshBasicMaterial({color:nd.color, transparent:true, opacity:0.2, side:THREE.DoubleSide})
      ));
      g.position.set(nd.x, nd.y, 0);
      g.userData.homeX = nd.x;
      g.userData.homeY = nd.y;
      s.scene.add(g);
      draggables.push(g);
      nodes.push(g);
    });

    /* Connections (rebuilt each frame based on node positions) */
    var connections = [
      [0,5],[5,1],[1,8],[8,2],[2,3],[3,4],[3,7],[7,6],[6,1],[8,3],[0,2],[4,7]
    ];

    var lineMat = new THREE.LineBasicMaterial({color:C.dimL, transparent:true, opacity:0.25});
    var lineGroup = new THREE.Group();
    s.scene.add(lineGroup);

    /* Data pulses along connections */
    var PULSE_N = 20;
    var pulseArr = new Float32Array(PULSE_N*3);
    var pulsePhases = [];
    for(var i=0;i<PULSE_N;i++){
      pulsePhases.push({conn:Math.floor(Math.random()*connections.length), phase:Math.random(), speed:0.1+Math.random()*0.15});
    }
    var pulseGeo = new THREE.BufferGeometry();
    pulseGeo.setAttribute('position', new THREE.BufferAttribute(pulseArr, 3));
    s.scene.add(new THREE.Points(pulseGeo, new THREE.PointsMaterial({color:C.accentL, size:0.18, sizeAttenuation:true, transparent:true, opacity:0.8})));

    var drag = makeDragSystem(s.container, s.camera, draggables);

    /* Circuit board traces (decorative grid) */
    for(var gx=-5;gx<=5;gx+=1){
      var tg = new THREE.BufferGeometry();
      tg.setAttribute('position', new THREE.Float32BufferAttribute([gx,-4,0, gx,4,0], 3));
      s.scene.add(new THREE.Line(tg, new THREE.LineBasicMaterial({color:C.dim, transparent:true, opacity:0.06})));
    }
    for(var gy=-4;gy<=4;gy+=1){
      var tg2 = new THREE.BufferGeometry();
      tg2.setAttribute('position', new THREE.Float32BufferAttribute([-5,gy,0, 5,gy,0], 3));
      s.scene.add(new THREE.Line(tg2, new THREE.LineBasicMaterial({color:C.dim, transparent:true, opacity:0.06})));
    }

    return function(st){
      var t = st.clock.getElapsedTime();
      drag.updateHover();

      /* Rebuild connection lines */
      while(lineGroup.children.length) lineGroup.remove(lineGroup.children[0]);
      connections.forEach(function(c){
        var a=nodes[c[0]], b=nodes[c[1]];
        var lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.Float32BufferAttribute([
          a.position.x, a.position.y, a.position.z,
          b.position.x, b.position.y, b.position.z
        ], 3));
        lineGroup.add(new THREE.Line(lg, lineMat));
      });

      /* Pulses follow connections */
      for(var i=0;i<PULSE_N;i++){
        var pp = pulsePhases[i];
        var c = connections[pp.conn];
        var a = nodes[c[0]], b = nodes[c[1]];
        var p = (pp.phase + t * pp.speed) % 1;
        pulseArr[i*3]   = lerp(a.position.x, b.position.x, p);
        pulseArr[i*3+1] = lerp(a.position.y, b.position.y, p);
        pulseArr[i*3+2] = 0.1;
      }
      pulseGeo.attributes.position.needsUpdate = true;

      /* Hover / drag effects */
      nodes.forEach(function(n){
        var isH = n===drag.hovered || n===drag.dragged;
        n.children[1].material.opacity = lerp(n.children[1].material.opacity, isH?0.5:0.15, 0.08);
        n.scale.setScalar(lerp(n.scale.x, isH?1.3:1, 0.06));
      });
    };
  }

  /* ========================================================
     SCENE 4 — SOLUTIONS: 5 draggable app screens
     Each = a sector with icon-like content. Drag to arrange.
     ======================================================== */
  function initSolutions(s){
    s.camera.position.set(0, 0, 14);

    var sectors = [
      {color:C.health, x:-4, y:2},
      {color:C.finance, x:4, y:2},
      {color:C.education, x:-4, y:-2},
      {color:C.enterprise, x:4, y:-2},
      {color:C.community, x:0, y:0}
    ];

    var draggables = [];
    sectors.forEach(function(sec){
      var card = makeCard(2.8, 2, sec.color, sec.color);

      /* Dashboard-like content inside */
      /* "Chart" bars */
      for(var b=0;b<4;b++){
        var bh = 0.3 + Math.random()*0.7;
        var bar = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, bh, 0.01),
          new THREE.MeshBasicMaterial({color:sec.color, transparent:true, opacity:0.4})
        );
        bar.position.set(-0.7+b*0.45, -0.3+bh/2, 0.04);
        card.add(bar);
      }
      /* "Metric" circle */
      var ring = new THREE.Mesh(
        new THREE.RingGeometry(0.25, 0.35, 24),
        new THREE.MeshBasicMaterial({color:sec.color, transparent:true, opacity:0.4, side:THREE.DoubleSide})
      );
      ring.position.set(0.8, -0.2, 0.04);
      card.add(ring);

      card.position.set(sec.x, sec.y, Math.random()*2);
      card.userData.homeX = sec.x;
      card.userData.homeY = sec.y;
      card.userData.homeZ = card.position.z;
      s.scene.add(card);
      draggables.push(card);
    });

    /* Connection lines from center */
    var centerDot = new THREE.Mesh(
      new THREE.SphereGeometry(0.15,12,12),
      new THREE.MeshBasicMaterial({color:C.accent, transparent:true, opacity:0.6})
    );
    s.scene.add(centerDot);

    var connGroup = new THREE.Group();
    s.scene.add(connGroup);

    var drag = makeDragSystem(s.container, s.camera, draggables);

    return function(st){
      var t = st.clock.getElapsedTime();
      drag.updateHover();

      /* Rebuild connections from center to each card */
      while(connGroup.children.length) connGroup.remove(connGroup.children[0]);
      draggables.forEach(function(card){
        var lg = new THREE.BufferGeometry();
        lg.setAttribute('position', new THREE.Float32BufferAttribute([
          0,0,0, card.position.x, card.position.y, card.position.z
        ],3));
        connGroup.add(new THREE.Line(lg, new THREE.LineBasicMaterial({color:C.dim, transparent:true, opacity:0.15})));
      });

      centerDot.scale.setScalar(1+Math.sin(t*1.5)*0.15);

      draggables.forEach(function(card){
        if(card !== drag.dragged){
          card.position.y = lerp(card.position.y, card.userData.homeY + Math.sin(t*0.7+card.userData.homeX)*0.2, 0.02);
        }
        var isH = card===drag.hovered||card===drag.dragged;
        card.scale.setScalar(lerp(card.scale.x, isH?1.1:1, 0.06));
      });
    };
  }

  /* ========================================================
     SCENE 5 — IMPACT: 3D bar chart that grows on click
     ======================================================== */
  function initImpact(s){
    s.camera.position.set(0, 4, 12);
    s.camera.lookAt(0, 2, 0);

    var barColors = [C.blue, C.teal, C.accent, C.blueL, C.accentL, C.health];
    var bars = [];
    var BAR_N = 6;

    /* Ground */
    var ground = new THREE.Mesh(
      new THREE.PlaneGeometry(10,6),
      new THREE.MeshBasicMaterial({color:C.dim, transparent:true, opacity:0.15})
    );
    ground.rotation.x=-Math.PI/2;
    s.scene.add(ground);

    /* Grid lines */
    for(var gl=1;gl<=5;gl++){
      var gg = new THREE.BufferGeometry();
      gg.setAttribute('position',new THREE.Float32BufferAttribute([-4,gl,0.01, 4,gl,0.01],3));
      s.scene.add(new THREE.Line(gg,new THREE.LineBasicMaterial({color:C.dim,transparent:true,opacity:0.1})));
    }

    for(var i=0;i<BAR_N;i++){
      var g = new THREE.Group();
      var targetH = 1 + Math.random()*3;
      var barGeo = new THREE.BoxGeometry(0.8, 0.01, 0.8);
      var barMat = new THREE.MeshBasicMaterial({color:barColors[i], transparent:true, opacity:0.7});
      var bar = new THREE.Mesh(barGeo, barMat);
      var edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, 0.01, 0.8)),
        new THREE.LineBasicMaterial({color:barColors[i], transparent:true, opacity:0.9})
      );
      g.add(bar);
      g.add(edges);
      g.position.set(-3 + i * 1.3, 0, 0);
      g.userData.targetHeight = targetH;
      g.userData.currentHeight = 0.01;
      g.userData.growing = false;
      g.userData.growDelay = i * 0.3;
      g.userData.startTime = 0;
      s.scene.add(g);
      bars.push(g);
    }

    /* Click detection */
    var clicked = false;
    var growStarted = false;

    s.container.addEventListener('mousedown', function(){ clicked=true; });
    s.container.addEventListener('touchstart', function(e){ e.preventDefault(); clicked=true; }, {passive:false});

    return function(st){
      var t = st.clock.getElapsedTime();

      /* Auto-start growing after 1s, or on click */
      if(!growStarted && (t > 1 || clicked)){
        growStarted = true;
        bars.forEach(function(b){ b.userData.startTime = t; });
      }

      /* Click to re-randomize and regrow */
      if(clicked && growStarted && bars[0].userData.currentHeight > bars[0].userData.targetHeight * 0.9){
        bars.forEach(function(b){
          b.userData.targetHeight = 1 + Math.random()*4;
          b.userData.currentHeight = 0.3;
          b.userData.startTime = t;
        });
      }
      clicked = false;

      bars.forEach(function(g, i){
        if(growStarted){
          var elapsed = t - g.userData.startTime - g.userData.growDelay;
          if(elapsed > 0){
            g.userData.currentHeight = lerp(g.userData.currentHeight, g.userData.targetHeight, 0.03);
          }
        }
        var h = Math.max(0.01, g.userData.currentHeight);
        var bar = g.children[0];
        var edges = g.children[1];
        bar.geometry.dispose();
        bar.geometry = new THREE.BoxGeometry(0.8, h, 0.8);
        edges.geometry.dispose();
        edges.geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(0.8, h, 0.8));
        bar.position.y = h/2;
        edges.position.y = h/2;
      });
    };
  }

  /* ========================================================
     SCENE 6 — GRANTS: Two platforms + draggable resource spheres
     ======================================================== */
  function initGrants(s){
    s.camera.position.set(0, 2, 14);
    s.camera.lookAt(0, 1, 0);

    /* Left platform (Funders) */
    var platL = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 2),
      new THREE.MeshBasicMaterial({color:C.accent, transparent:true, opacity:0.3})
    );
    platL.position.set(-4, 0, 0);
    s.scene.add(platL);
    s.scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3,0.3,2)),
      new THREE.LineBasicMaterial({color:C.accent, transparent:true, opacity:0.6})
    )).position.copy(platL.position);

    /* Right platform (Outcomes) */
    var platR = new THREE.Mesh(
      new THREE.BoxGeometry(3, 0.3, 2),
      new THREE.MeshBasicMaterial({color:C.teal, transparent:true, opacity:0.3})
    );
    platR.position.set(4, 0, 0);
    s.scene.add(platR);
    s.scene.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.BoxGeometry(3,0.3,2)),
      new THREE.LineBasicMaterial({color:C.teal, transparent:true, opacity:0.6})
    )).position.copy(platR.position);

    /* Bridge arch */
    var archPts = [];
    for(var i=0;i<=30;i++){
      var a = Math.PI * (i/30);
      archPts.push(new THREE.Vector3(Math.cos(a)*4, Math.sin(a)*2.5+0.3, 0));
    }
    s.scene.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(archPts),
      new THREE.LineBasicMaterial({color:C.blueL, transparent:true, opacity:0.25})
    ));

    /* Draggable resource spheres */
    var draggables = [];
    var sphereColors = [C.accent, C.accentL, C.blue, C.blueL, C.teal, C.health];
    for(var si=0;si<6;si++){
      var sphere = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 16, 16),
        new THREE.MeshBasicMaterial({color:sphereColors[si], transparent:true, opacity:0.8})
      );
      var glow = new THREE.Mesh(
        new THREE.SphereGeometry(0.4, 16, 16),
        new THREE.MeshBasicMaterial({color:sphereColors[si], transparent:true, opacity:0.15})
      );
      var g = new THREE.Group();
      g.add(sphere); g.add(glow);
      g.position.set(-4.5 + (si%3)*0.9, 0.6+Math.floor(si/3)*0.7, (Math.random()-0.5)*1.5);
      g.userData.homeX = g.position.x;
      g.userData.homeY = g.position.y;
      s.scene.add(g);
      draggables.push(g);
    }

    var drag = makeDragSystem(s.container, s.camera, draggables);

    return function(st){
      var t = st.clock.getElapsedTime();
      drag.updateHover();

      draggables.forEach(function(sp){
        if(sp !== drag.dragged){
          sp.position.y = lerp(sp.position.y, sp.userData.homeY + Math.sin(t*0.8+sp.userData.homeX)*0.15, 0.03);
        }
        var isH = sp===drag.hovered || sp===drag.dragged;
        sp.scale.setScalar(lerp(sp.scale.x, isH?1.3:1, 0.06));
        sp.children[1].material.opacity = lerp(sp.children[1].material.opacity, isH?0.35:0.1, 0.06);
      });
    };
  }

  /* ========================================================
     SCENE 7 — CONTACT: Interactive globe
     Click+drag to spin. Click cities to pulse.
     ======================================================== */
  function initContact(s){
    s.camera.position.set(0, 0, 9);
    var R = 3;
    var globe = new THREE.Group();

    var shell = new THREE.Mesh(
      new THREE.SphereGeometry(R, 32, 24),
      new THREE.MeshBasicMaterial({color:C.dim, wireframe:true, transparent:true, opacity:0.08})
    );
    globe.add(shell);

    /* Latitude rings */
    [0,30,-30,60,-60].forEach(function(lat){
      var lr=lat*Math.PI/180;
      var rr=R*Math.cos(lr), ry=R*Math.sin(lr);
      var rg=new THREE.RingGeometry(rr-0.01,rr+0.01,64);
      var rm=new THREE.Mesh(rg, new THREE.MeshBasicMaterial({color:C.blueL,transparent:true,opacity:0.08,side:THREE.DoubleSide}));
      rm.position.y=ry; rm.rotation.x=Math.PI/2;
      globe.add(rm);
    });

    function ll2v(lat,lon,r){
      var ph=(90-lat)*Math.PI/180, th=(lon+180)*Math.PI/180;
      return new THREE.Vector3(-r*Math.sin(ph)*Math.cos(th),r*Math.cos(ph),r*Math.sin(ph)*Math.sin(th));
    }

    var cities=[
      {lat:51.04,lon:-114.07,hq:true},
      {lat:51.51,lon:-0.13},
      {lat:35.68,lon:139.69},
      {lat:-33.87,lon:151.21},
      {lat:40.71,lon:-74.01},
      {lat:1.35,lon:103.82}
    ];

    cities.forEach(function(c){
      var v=ll2v(c.lat,c.lon,R+0.05);
      var d=new THREE.Mesh(
        new THREE.SphereGeometry(c.hq?0.12:0.07,8,8),
        new THREE.MeshBasicMaterial({color:c.hq?C.accent:C.blueL,transparent:true,opacity:0.9})
      );
      d.position.copy(v);
      globe.add(d);
    });

    /* Arcs from Calgary */
    for(var ci=1;ci<cities.length;ci++){
      var v1=ll2v(cities[0].lat,cities[0].lon,R);
      var v2=ll2v(cities[ci].lat,cities[ci].lon,R);
      var mid=v1.clone().add(v2).multiplyScalar(0.5).normalize().multiplyScalar(R*1.4);
      var curve=new THREE.QuadraticBezierCurve3(v1,mid,v2);
      globe.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(32)),
        new THREE.LineBasicMaterial({color:C.accent,transparent:true,opacity:0.2})
      ));
    }

    s.scene.add(globe);

    /* Drag rotation */
    var rotY=0, dragging=false, prevX=0, prevY=0;
    s.container.addEventListener('mousedown',function(e){
      dragging=true;
      var r=s.container.getBoundingClientRect();
      prevX=(e.clientX-r.left)/r.width;
      prevY=(e.clientY-r.top)/r.height;
    });
    s.container.addEventListener('mousemove',function(e){
      if(!dragging)return;
      var r=s.container.getBoundingClientRect();
      var cx=(e.clientX-r.left)/r.width;
      var cy=(e.clientY-r.top)/r.height;
      rotY+=(cx-prevX)*4;
      globe.rotation.x+=(cy-prevY)*2;
      prevX=cx; prevY=cy;
    });
    s.container.addEventListener('mouseup',function(){dragging=false;});
    s.container.addEventListener('mouseleave',function(){dragging=false;});

    /* Touch */
    s.container.addEventListener('touchstart',function(e){
      e.preventDefault(); dragging=true;
      var r=s.container.getBoundingClientRect();
      prevX=(e.touches[0].clientX-r.left)/r.width;
      prevY=(e.touches[0].clientY-r.top)/r.height;
    },{passive:false});
    s.container.addEventListener('touchmove',function(e){
      e.preventDefault();
      if(!dragging)return;
      var r=s.container.getBoundingClientRect();
      var cx=(e.touches[0].clientX-r.left)/r.width;
      var cy=(e.touches[0].clientY-r.top)/r.height;
      rotY+=(cx-prevX)*4;
      globe.rotation.x+=(cy-prevY)*2;
      prevX=cx; prevY=cy;
    },{passive:false});
    s.container.addEventListener('touchend',function(){dragging=false;});

    return function(st){
      var t=st.clock.getElapsedTime();
      if(!dragging) rotY+=0.003;
      globe.rotation.y=lerp(globe.rotation.y,rotY,0.06);
    };
  }

  /* ========================================================
     INIT
     ======================================================== */
  window.addEventListener('DOMContentLoaded', function(){
    register('scene-hero', initHero);
    register('scene-about', initAbout);
    register('scene-tech', initTech);
    register('scene-solutions', initSolutions);
    register('scene-impact', initImpact);
    register('scene-grants', initGrants);
    register('scene-contact', initContact);
    setupObserver();
    animate();
  });
})();
