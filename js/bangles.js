(function(){
  let scene, camera, renderer, banglesGroup, pmremGenerator;
  let isDragging = false, prevX = 0, prevY = 0;
  let rotY = 0.4, rotX = 0.45; // start with more tilt so tube depth reads immediately
  let lastRotY = 0, lastMoveTime = 0;
  let audioCtx = null;
  let initialized = false;

  const COLORS = ['#8a0f0f', '#0b4d0b', '#8a0f0f', '#0b4d0b', '#8a0f0f'];

  // ---------- Sound ----------
  // Layered glass clink: a bright high partial (the "ting"), a shorter lower
  // body tone (the "clunk" of glass on glass), and a thin noise burst for
  // the attack transient. Strength scales pitch spread + volume + how many
  // bangles "collide" in the same swipe.
  function playClink(strength){
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const s = Math.min(Math.max(strength, 0.15), 1);

    // Fire a small cascade of 2-4 clinks with tiny offsets, like several
    // bangles knocking together rather than one clean tone.
    const hits = 2 + Math.floor(s * 3);
    for(let i = 0; i < hits; i++){
      const delay = i * (0.02 + Math.random() * 0.03);
      const t0 = now + delay;
      const baseFreq = 2200 + Math.random() * 1400 - i * 120;

      // Bright partial
      const osc1 = audioCtx.createOscillator();
      const gain1 = audioCtx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, t0);
      osc1.frequency.exponentialRampToValueAtTime(baseFreq * 0.55, t0 + 0.18);
      const vol1 = Math.min(s * 0.35, 0.4) * (1 - i * 0.15);
      gain1.gain.setValueAtTime(0.0001, t0);
      gain1.gain.exponentialRampToValueAtTime(Math.max(vol1, 0.02), t0 + 0.004);
      gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.22);
      osc1.connect(gain1);
      gain1.connect(audioCtx.destination);
      osc1.start(t0);
      osc1.stop(t0 + 0.24);

      // Lower body tone, slightly detuned for a metallic/glass beat
      const osc2 = audioCtx.createOscillator();
      const gain2 = audioCtx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 0.5, t0);
      osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.3, t0 + 0.12);
      const vol2 = Math.min(s * 0.18, 0.2) * (1 - i * 0.15);
      gain2.gain.setValueAtTime(0.0001, t0);
      gain2.gain.exponentialRampToValueAtTime(Math.max(vol2, 0.01), t0 + 0.003);
      gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.16);
      osc2.connect(gain2);
      gain2.connect(audioCtx.destination);
      osc2.start(t0);
      osc2.stop(t0 + 0.18);

      // Thin noise "tick" for the attack
      const bufferSize = audioCtx.sampleRate * 0.02;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for(let j = 0; j < bufferSize; j++){
        data[j] = (Math.random() * 2 - 1) * (1 - j / bufferSize);
      }
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const noiseFilter = audioCtx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 4000;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(Math.min(s * 0.12, 0.15), t0);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.03);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(audioCtx.destination);
      noise.start(t0);
    }
  }

  function buildBangle(radius, tubeRadius, color, yOffset, zOffset){
    const geo = new THREE.TorusGeometry(radius, tubeRadius, 48, 160);
    const mat = new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.08,
      metalness: 0.15,
      transmission: 0.35,
      thickness: 0.6,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.4,
      ior: 1.5,
      reflectivity: 0.6
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.rotation.x = Math.PI / 2;
    mesh.position.set(0, yOffset, zOffset);
    return mesh;
  }

  // Procedural studio-style environment so the transmission/clearcoat
  // material has bright edges + reflections to bounce, instead of
  // rendering as flat matte color against nothing.
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

    // A couple of bright "window" panels floating in the env scene give
    // the glass distinct specular streaks instead of a uniform glow.
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
    const holder = document.getElementById('banglesCanvasHolder');
    const w = holder.clientWidth || 340;
    const h = holder.clientHeight || 340;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, w / h, 0.1, 100);
    camera.position.set(0, 0.6, 6.2);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    holder.appendChild(renderer.domElement);

    createEnvironment();

    scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 1.6);
    keyLight.position.set(4, 6, 5);
    scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0x9fb8ff, 0.5);
    fillLight.position.set(-5, 1, 3);
    scene.add(fillLight);
    const rimLight = new THREE.DirectionalLight(0xff9dc4, 0.7);
    rimLight.position.set(-2, -3, -5);
    scene.add(rimLight);
    const specPoint = new THREE.PointLight(0xffffff, 0.8, 20);
    specPoint.position.set(1, 2, 4);
    scene.add(specPoint);

    banglesGroup = new THREE.Group();
    banglesGroup.scale.set(0.01, 0.01, 0.01); // start tiny, will pop up

    // ----------------------------------------------------------------
    // FIX: your explorer shows the exported file is named "bangles.glb"
    // (sitting next to Birthday.html), but this was requesting
    // "bangles_set.glb" — a name that doesn't exist, causing the load
    // to fail with a network/404-style ProgressEvent error.
    //
    // loader.load() resolves this path relative to the HTML PAGE's URL
    // (e.g. http://127.0.0.1:5500/Birthday.html), NOT relative to this
    // .js file's location in /js/. So if you ever move the .glb into a
    // subfolder (e.g. /models/bangles.glb), update the path below to
    // match, using the path relative to Birthday.html.
    // ----------------------------------------------------------------
    const loader = new THREE.GLTFLoader();

    loader.load(
      'bangles.glb', // <-- corrected filename
      function(gltf){
        const importedBangles = gltf.scene;

        // Tweak this scale depending on how big they were in Blender.
        importedBangles.scale.set(1.5, 1.5, 1.5);

        // Center them perfectly.
        importedBangles.position.set(0, 0, 0);

        // Add to the group so dragging/spinning physics still work.
        banglesGroup.add(importedBangles);
      },
      function(xhr){
        // Optional: load progress, useful while debugging large files.
        if(xhr.total){
          console.log('Loading bangles.glb: ' + Math.round((xhr.loaded / xhr.total) * 100) + '%');
        }
      },
      function(error){
        // More diagnostic detail than a bare console.error(error):
        // this tells you whether it's a 404, a parse error, or CORS.
        console.error('Error loading bangles.glb.');
        console.error('Check that the file sits at the path shown below,');
        console.error('relative to Birthday.html (not relative to bangles.js).');
        console.error(error);
      }
    );

    banglesGroup.rotation.x = rotX;
    banglesGroup.rotation.y = rotY;
    scene.add(banglesGroup);

    const holderEl = document.getElementById('banglesCanvasHolder');
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
      banglesGroup.scale.set(scale, scale, scale);
      if(t < 1) requestAnimationFrame(step);
    }
    step();
  }

  function onPointerDown(e){
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
    lastRotY = rotY;
    lastMoveTime = performance.now();
  }

  function onPointerMove(e){
    if(!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;

    rotY += dx * 0.01;
    rotX += dy * 0.008;
    // Keep the stack in a 3/4-view band. Past this range the rings go
    // edge-on to the camera: their 0.4-unit gaps get hidden behind each
    // ring's own 2.0-unit diameter (everything collapses into one flat
    // blob), and the grazing angle also maxes out Fresnel reflectance so
    // the true green/red color gets washed out by the environment tint.
    rotX = Math.min(Math.max(rotX, 0.2), 0.95);

    prevX = e.clientX;
    prevY = e.clientY;

    const now = performance.now();
    const dt = now - lastMoveTime;
    if(dt > 60){
      const angularVelocity = Math.abs(rotY - lastRotY) / dt;
      const SPEED_THRESHOLD = 0.004;
      if(angularVelocity > SPEED_THRESHOLD){
        playClink(Math.min(angularVelocity * 40, 1));
      }
      lastRotY = rotY;
      lastMoveTime = now;
    }
  }

  function onPointerUp(){
    isDragging = false;
  }

  function animate(){
    requestAnimationFrame(animate);
    const overlay = document.getElementById('banglesOverlay');
    if(!overlay || !overlay.classList.contains('active')) return;

    if(!isDragging){
      rotY += 0.002; // gentle idle spin
    }
    banglesGroup.rotation.y = rotY;
    banglesGroup.rotation.x = rotX;

    renderer.render(scene, camera);
  }

  window.showBanglesModal = function(){
    const overlay = document.getElementById('banglesOverlay');
    if(!overlay) return;
    overlay.classList.add('active');
    if(!initialized) init();
    else banglesGroup.scale.set(0.01, 0.01, 0.01);
    if(initialized) popIn(); // re-pop each time it's reopened
  };
})();