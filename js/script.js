(function(){
    var curtain = document.getElementById('curtain');
    var stage = document.getElementById('stage');
    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  
    function burstConfetti(){
      if(reduceMotion) return;
      var colors = ['#F4B942','#FF6B9D','#FFD97D','#FFF6E9'];
      var count = 60;
      for(var i=0;i<count;i++){
        var piece = document.createElement('div');
        piece.className = 'confetti-piece';
        var size = 6 + Math.random()*7;
        piece.style.width = size + 'px';
        piece.style.height = (size*0.4) + 'px';
        piece.style.left = Math.random()*100 + 'vw';
        piece.style.background = colors[Math.floor(Math.random()*colors.length)];
        piece.style.animationDuration = (2.4 + Math.random()*1.8) + 's';
        piece.style.animationDelay = (Math.random()*0.4) + 's';
        piece.style.transform = 'rotate(' + (Math.random()*360) + 'deg)';
        document.body.appendChild(piece);
        (function(p){
          setTimeout(function(){ p.remove(); }, 5000);
        })(piece);
      }
    }
  
    function openCurtain(){
      curtain.classList.add('open');
      curtain.classList.remove('locked');
      burstConfetti();
      stage.classList.add('visible');
      setTimeout(function(){ curtain.classList.add('hidden'); }, 1400);
    }
  
    // Curtain opens automatically 5 seconds after load
    window.addEventListener('load', function(){
      setTimeout(openCurtain, 5000);
    });
  
    // Allow skipping the wait by clicking the curtain
    curtain.addEventListener('click', function(){
      openCurtain();
    });
  
    // ---------- Safe binding helper ----------
    // Prevents one missing element from throwing and aborting every
    // listener registered after it in initModalEvents().
    function bind(id, event, handler){
      var el = document.getElementById(id);
      if(!el){
        console.warn('[initModalEvents] Element #' + id + ' not found — listener not attached.');
        return null;
      }
      el.addEventListener(event, handler);
      return el;
    }
  
    // ---------- Modal loading ----------
    async function loadModal(file, containerId){
      try{
        const res = await fetch(`pages/${file}`);
        if(!res.ok){
          console.warn(`[loadModal] Failed to fetch pages/${file}: ${res.status} ${res.statusText}`);
          return;
        }
    
        let html = await res.text();
    
        // Scrub out the Live Server injection that breaks SVGs
        html = html.replace(/<!-- Code injected by live-server -->[\s\S]*?<\/script>/gi, '');
    
        const container = document.getElementById(containerId);
        if(!container){
          console.warn(`[loadModal] Container #${containerId} not found in DOM.`);
          return;
        }
        container.innerHTML = html;
      }catch(err){
        console.warn(`[loadModal] Error loading pages/${file}:`, err);
      }
    }
  
    async function loadAllModals(){
      await Promise.all([
        loadModal('letter.html', 'letterModalContainer'),
        loadModal('gift.html', 'giftModalContainer'),
        loadModal('reasons.html', 'reasonsModalContainer'),
        loadModal('book.html', 'bookModalContainer'),
        loadModal('paint.html', 'paintModalContainer'),
        loadModal('swan.html', 'swanModalContainer'),
        loadModal('bangles.html', 'banglesModalContainer'),
        loadModal('roses.html', 'rosesModalContainer'),
      ]);
      initModalEvents(); // wire up open/close listeners AFTER modals exist in the DOM
    }
  
    function openModal(id){
      var el = document.getElementById(id);
      if(!el){
        console.warn('[openModal] Overlay #' + id + ' not found.');
        return;
      }
      el.classList.add('active');
    }
    function closeModal(id){
      var el = document.getElementById(id);
      if(!el){
        console.warn('[closeModal] Overlay #' + id + ' not found.');
        return;
      }
      el.classList.remove('active');
    }
  
    // ---------- Bird courier ----------
    var FLIGHT_DURATION = 4500; // must match .bird-courier.flying animation-duration in CSS
  
    function ensureBirdElement(){
      if(document.getElementById('birdCourier')) return;
      var bird = document.createElement('div');
      bird.id = 'birdCourier';
      bird.className = 'bird-courier';
      bird.innerHTML =
        '<div class="cloud-bubble" id="birdCloud">a little surprise for you 🎁</div>' +
        '<svg class="bird-svg" viewBox="-30 0 140 70" xmlns="http://www.w3.org/2000/svg">' +
          '<!-- Tail -->' +
          '<path d="M78 30 Q100 18 108 22 Q98 32 82 34 Z" fill="#F4B942"/>' +
          '<path d="M78 40 Q100 46 106 54 Q94 48 80 42 Z" fill="#E8A52E"/>' +
          '<!-- Wing -->' +
          '<g class="wing">' +
            '<path d="M60 30 Q78 6 96 12 Q84 26 66 34 Q62 32 60 30 Z" fill="#FFD35C" stroke="#E8A52E" stroke-width="1"/>' +
            '<path d="M63 24 Q75 12 88 14" stroke="#E8A52E" stroke-width="1" fill="none" opacity=".6"/>' +
          '</g>' +
          '<!-- Body -->' +
          '<ellipse cx="55" cy="38" rx="26" ry="18" fill="#4FB3E8"/>' +
          '<ellipse cx="48" cy="46" rx="16" ry="10" fill="#EAF6FD"/>' +
          '<!-- Feet -->' +
          '<path d="M50 56 L47 63 M50 56 L53 62" stroke="#F4B942" stroke-width="2" stroke-linecap="round"/>' +
          '<path d="M62 56 L59 63 M62 56 L65 62" stroke="#F4B942" stroke-width="2" stroke-linecap="round"/>' +
          '<!-- Head -->' +
          '<circle cx="27" cy="27" r="15" fill="#4FB3E8"/>' +
          '<path d="M22 13 Q26 4 31 12 Q27 14 22 13 Z" fill="#2D8FCB"/>' +
          '<!-- Cheek blush -->' +
          '<ellipse cx="16" cy="32" rx="4" ry="3" fill="#FF9EB8" opacity=".7"/>' +
          '<!-- Eye -->' +
          '<circle cx="21" cy="23" r="5.5" fill="#FFFFFF"/>' +
          '<circle cx="19.5" cy="24" r="2.6" fill="#2D1B4E"/>' +
          '<circle cx="20.5" cy="22.6" r="0.9" fill="#FFFFFF"/>' +
          '<!-- Beak -->' +
          '<path d="M12 26 L-2 24 L12 32 Z" fill="#F4924B"/>' +
          '<path d="M12 26 L-2 24 L4 28 Z" fill="#E87E36"/>' +
          '<!-- Envelope carried in the beak -->' +
          '<g class="beak-envelope">' +
            '<g transform="translate(-24,14) rotate(-8)">' +
              '<rect x="0" y="0" width="22" height="16" rx="1.5" fill="#FFF6E9" stroke="#F4B942" stroke-width="1.5"/>' +
              '<path d="M0 0 L11 9 L22 0" fill="none" stroke="#FF6B9D" stroke-width="1.5" stroke-linejoin="round"/>' +
              '<path d="M8 12 L11 9 L14 12 L11 15 Z" fill="#FF6B9D"/>' +
            '</g>' +
          '</g>' +
        '</svg>';
      document.body.appendChild(bird);
    }
  
    // Creates a temporary envelope that visually falls out of the bird's beak
    // and settles into the letter card's envelope slot.
    function dropEnvelopeFromBird(){
      var bird = document.getElementById('birdCourier');
      var target = document.getElementById('envelopeLanded');
      if(!bird || !target) return;
  
      var birdRect = bird.getBoundingClientRect();
      var targetRect = target.getBoundingClientRect();
  
      // Hide the in-beak envelope right as the falling one takes over
      bird.classList.add('dropped');
  
      var falling = document.createElement('div');
      falling.className = 'envelope-falling';
      falling.innerHTML = '<div class="envelope-flap"></div><div class="envelope-face">💌</div>';
      // Spawn point roughly matches the beak-envelope's position within the bird graphic
      falling.style.left = (birdRect.left + birdRect.width * 0.12) + 'px';
      falling.style.top = (birdRect.top + birdRect.height * 0.31) + 'px';
      falling.style.transform = 'rotate(-10deg) scale(.9)';
      falling.style.opacity = '0';
      document.body.appendChild(falling);
  
      // Fade in at the drop point, then animate to the target slot
      requestAnimationFrame(function(){
        falling.style.opacity = '1';
        requestAnimationFrame(function(){
          falling.style.left = targetRect.left + 'px';
          falling.style.top = targetRect.top + 'px';
          falling.style.transform = 'rotate(6deg) scale(1)';
        });
      });
  
      falling.addEventListener('transitionend', function handler(e){
        if(e.propertyName !== 'top') return;
        falling.removeEventListener('transitionend', handler);
        falling.remove();
        target.classList.add('landed');
      });
    }
  
    function triggerBirdDelivery(){
      ensureBirdElement();
      var bird = document.getElementById('birdCourier');
      var envelope = document.getElementById('envelopeLanded');
      if(!bird) return;
  
      var cloud = document.getElementById('birdCloud');
  
      // Reset state in case the letter is reopened
      bird.classList.remove('flying');
      bird.classList.remove('dropped');
      if(cloud) cloud.classList.remove('show');
      if(envelope) envelope.classList.remove('landed');
      void bird.offsetWidth; // restart animation
      bird.classList.add('flying');
  
      // Cloud bubble appears shortly after takeoff, fades before the bird exits
      setTimeout(function(){
        if(cloud) cloud.classList.add('show');
      }, 800);
      setTimeout(function(){
        if(cloud) cloud.classList.remove('show');
      }, FLIGHT_DURATION - 900);
  
      // Envelope drops from the beak roughly mid-flight, over the letter card
      setTimeout(dropEnvelopeFromBird, 2500);
  
      // Clean up the flying class once the bird is off-screen
      setTimeout(function(){
        bird.classList.remove('flying');
      }, FLIGHT_DURATION);
    }
  
    // ---------- Voice note envelope ----------
    function initVoiceNote(){
      bind('envelopeLanded', 'click', function(){
        var env = document.getElementById('mailDelivery');
        if(env) env.classList.toggle('open');
      });
      bind('envelopeLanded', 'keydown', function(e){
        if(e.key === 'Enter' || e.key === ' '){
          e.preventDefault();
          var env = document.getElementById('envelopeLanded');
          if(env) env.click();
        }
      });
  
      var vnAudio = document.getElementById('vnAudio');
      var vnPlayBtn = bind('vnPlayBtn', 'click', function(){
        if(!vnAudio) return;
        if(vnAudio.paused){ vnAudio.play(); vnPlayBtn.textContent = '⏸'; }
        else{ vnAudio.pause(); vnPlayBtn.textContent = '▶'; }
      });
  
      if(vnAudio){
        vnAudio.addEventListener('timeupdate', function(){
          var progress = document.getElementById('vnProgress');
          var timeEl = document.getElementById('vnTime');
          if(vnAudio.duration && progress) progress.style.width = (vnAudio.currentTime / vnAudio.duration * 100) + '%';
          if(timeEl){
            var mins = Math.floor(vnAudio.currentTime / 60);
            var secs = Math.floor(vnAudio.currentTime % 60);
            timeEl.textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
          }
        });
        vnAudio.addEventListener('ended', function(){
          if(vnPlayBtn) vnPlayBtn.textContent = '▶';
        });
      }
    }
  
    function initModalEvents(){
      bind('letterBtn', 'click', function(){
        openModal('letterOverlay');
        triggerBirdDelivery();
      });
      bind('giftBtn', 'click', function(){
        openModal('giftOverlay');
      });
      bind('reasonsBtn', 'click', function(){
        openModal('reasonsOverlay');
      });
      bind('bookBtn', 'click', function(){
        openModal('bookOverlay');
      });
      bind('paintGiftBtn', 'click', function(){
        closeModal('giftOverlay');
        openModal('paintOverlay');
        if(typeof initPaintCanvas === 'function'){
          initPaintCanvas();
        }
      });
      bind('swanGiftBtn', 'click', function(){
        closeModal('giftOverlay');
        openModal('swanOverlay');
        if(typeof initSwanFold === 'function'){
          initSwanFold();
        }
      });
      bind('banglesGiftBtn', 'click', function(){
        closeModal('giftOverlay');
        if(typeof showBanglesModal === 'function'){
          showBanglesModal();
        }else{
          openModal('banglesOverlay');
        }
      });
      bind('rosesGiftBtn', 'click', function(){
        closeModal('giftOverlay');
        if(typeof showRosesModal === 'function'){
          showRosesModal();
        }else{
          openModal('rosesOverlay');
        }
      });
      bind('bookReadBtn', 'click', function(){
  window.open('pages/book/index.html', '_blank');
});
  
      // Close buttons (event delegation so it works no matter when modals were injected)
      document.body.addEventListener('click', function(e){
        var closeBtn = e.target.closest('[data-close]');
        if(closeBtn){
          closeModal(closeBtn.getAttribute('data-close'));
          return;
        }
        // Click on the overlay backdrop itself (not its inner card) closes it
        if(e.target.classList.contains('modal-overlay')){
          e.target.classList.remove('active');
        }
      });
  
      document.addEventListener('keydown', function(e){
        if(e.key === 'Escape'){
          document.querySelectorAll('.modal-overlay.active').forEach(function(o){
            o.classList.remove('active');
          });
        }
      });
  
      // Wire up the voice-note envelope once modals (and #vnPlayBtn etc.) are in the DOM
      initVoiceNote();
    }
  
    loadAllModals();
  })();