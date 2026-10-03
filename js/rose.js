(function(){
  let scene, camera, renderer, rosesGroup, pmremGenerator;
  let isDragging = false, prevX = 0, prevY = 0;
  let rotY = 0.4, rotX = 0.3;
  let initialized = false;

  // Same procedural studio-environment approach as bangles.js, so the
  // model's materials (metal ring, glossy chocolate wrap, etc.) get
  // something to reflect instead of rendering flat.
  function createEnvironment(){
    pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();

    const envScene = new THREE.Scene();

    const canvas = document.createElement('canvas');
    canvas.width = 4;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#fff6e9');
    grad.addColorStop(0.35, '#f4b942');
    grad.addColorStop(0.65, '#3a2456');
    grad.addColorStop(1, '#140b24');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 4, 256);

    const tex = new THREE.CanvasTexture(canvas);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;

    const envGeo = new THREE.SphereGeometry(50, 32, 32);
    const envMat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide });
    envScene.add(new THREE.Mesh(envGeo, envMat));

    function addHighlight(x, y, z, w, h, color, intensity){
      const panel = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ color: color })
      );
      panel.position.set(x, y, z);
      panel.lookAt(0, 0, 0);
      panel.material.color.multiplyScalar(intensity);
      envScene.add(panel);
    }
    addHighlight(-10, 8, 10, 14, 20, '#fff6e9', 2.2);
    addHighlight(12, -4, 8, 10, 16, '#ffd97d', 1.6);
    addHighlight(0, 12, -14, 18, 10, '#ff6b9d', 1.0);

    const renderTarget = pmremGenerator.fromScene(envScene, 0.04);
    scene.environment = renderTarget.texture;
    pmremGenerator.dispose();
  }

  function init(){
    const holder = document.getElementById('rosesCanvasHolder');
    const w = holder.clientWidth || 340;
    const h = holder.clientHeight || 340;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 0.8, 6.5);
    camera.lookAt(0, 0.3, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    holder.appendChild(renderer.domElement);

    createEnvironment();

    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9fb8ff, 0.5);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xff9dc4, 0.7);
    rimLight.position.set(-2, -3, -5);
    scene.add(rimLight);

    rosesGroup = new THREE.Group();
    rosesGroup.scale.set(0.01, 0.01, 0.01); // start tiny, pop in like bangles

    // ----------------------------------------------------------------
    // Update this path once you export the Tripo model. It resolves
    // relative to Birthday.html (the page), not this .js file's folder
    // in /js/. If you place the .glb next to Birthday.html, keep this
    // as-is; if it goes in a subfolder, update the path to match.
    // ----------------------------------------------------------------
    const loader = new THREE.GLTFLoader();

    loader.load(
      'roses.glb', 
      function(gltf){
        const importedRoses = gltf.scene;
        importedRoses.scale.set(4, 4, 4); // tweak once you see it at real size
        importedRoses.position.set(0, -1.6, 0);
        rosesGroup.add(importedRoses);
      },
      function(xhr){
        if(xhr.total){
          console.log('Loading roses.glb: ' + Math.round((xhr.loaded / xhr.total) * 100) + '%');
        }
      },
      function(error){
        console.error('Error loading roses.glb.');
        console.error('Check the filename/path is correct relative to Birthday.html.');
        console.error(error);
      }
    );

    rosesGroup.rotation.x = rotX;
    rosesGroup.rotation.y = rotY;
    scene.add(rosesGroup);

    const holderEl = document.getElementById('rosesCanvasHolder');
    holderEl.addEventListener('pointerdown', onPointerDown);
    holderEl.addEventListener('pointermove', onPointerMove);
    holderEl.addEventListener('pointerup', onPointerUp);
    holderEl.addEventListener('pointerleave', onPointerUp);

    initialized = true;
    popIn();
    animate();
  }

  function popIn(){
    let progress = 0;
    function step(){
      progress += 0.04;
      const t = Math.min(progress, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = 0.01 + eased * 0.99;
      rosesGroup.scale.set(scale, scale, scale);
      if(t < 1) requestAnimationFrame(step);
    }
    step();
  }

  function onPointerDown(e){
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerMove(e){
    if(!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    rotY += dx * 0.01;
    rotX += dy * 0.008;
    rotX = Math.min(Math.max(rotX, 0.05), 0.9);
    prevX = e.clientX;
    prevY = e.clientY;
  }

  function onPointerUp(){
    isDragging = false;
  }

  function animate(){
    requestAnimationFrame(animate);
    const overlay = document.getElementById('rosesOverlay');
    if(!overlay || !overlay.classList.contains('active')) return;

    if(!isDragging){
      rotY += 0.002; // gentle idle spin
    }
    rosesGroup.rotation.y = rotY;
    rosesGroup.rotation.x = rotX;

    renderer.render(scene, camera);
  }

  window.showRosesModal = function(){
    const overlay = document.getElementById('rosesOverlay');
    if(!overlay) return;
    overlay.classList.add('active');
    if(!initialized) init();
    else rosesGroup.scale.set(0.01, 0.01, 0.01);
    if(initialized) popIn();
  };
})();