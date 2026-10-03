/* =========================================================
   mixtape.js  →  save as  js/mixtape.js
   Loads pages/mixtape.html into <div id="mediaCardContainer"></div>
   then wires up the cassette player.
   ========================================================= */

/* ---------- SONGS ARE LOADED AUTOMATICALLY ----------
   Drop mp3 files into the "songs" folder, then either:
     • run  python build_playlist.py  (writes songs/songs.json), or
     • just refresh — on Live Server the folder listing is read directly.
   Name files like:  Artist - Song Title.mp3   (artist is optional) */
let MT_SONGS = [];

/* ids the player needs; if pages/mixtape.html lacks any, the built-in markup below is used */
const MT_NEEDED = ['mtBtn', 'mtBtnText', 'mtList', 'mtDeck', 'mtCassette', 'mtLblTitle', 'mtLblArtist',
                   'mtControls', 'mtPlay', 'mtIcoPlay', 'mtIcoPause', 'mtBar', 'mtBarFill', 'mtTime', 'mtEject'];

const MT_TEMPLATE = `
<div class="mt-card">
  <div class="mt-video">
    <div class="mt-video-ph">🎬<b>Your video goes here</b>Swap this block for a &lt;video id="giftVideo"&gt; tag.</div>
  </div>
  <div class="mt-tape-half">
    <div class="mt-head">
      <span class="mt-title">Side A · Our Mixtape</span>
      <button class="mt-btn" id="mtBtn" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="#ffc46b" stroke-width="1.8">
          <rect x="2" y="5" width="20" height="14" rx="3"/><circle cx="8.5" cy="12" r="2.2"/>
          <circle cx="15.5" cy="12" r="2.2"/><path d="M6 17h12"/>
        </svg>
        <span id="mtBtnText">Open mixtape</span>
      </button>
    </div>
    <div class="mt-list" id="mtList"></div>
    <div class="mt-deck" id="mtDeck">
      <div class="mt-cassette" id="mtCassette">
        <i class="mt-screw" style="left:8px;top:8px"></i><i class="mt-screw" style="right:8px;top:8px"></i>
        <i class="mt-screw" style="left:8px;bottom:8px"></i><i class="mt-screw" style="right:8px;bottom:8px"></i>
        <div class="mt-label"><div class="mt-l1" id="mtLblTitle">—</div><div class="mt-l2" id="mtLblArtist">—</div></div>
        <div class="mt-tape-line"></div>
        <div class="mt-window"><div class="mt-reel r1"></div><div class="mt-reel r2"></div></div>
        <div class="mt-bottom"><i></i><i></i><i></i></div>
      </div>
      <span class="mt-deck-label">Stereo Deck</span>
      <span class="mt-led"></span>
    </div>
    <div class="mt-controls" id="mtControls">
      <button class="mt-cbtn" id="mtPlay" aria-label="Play / pause">
        <svg id="mtIcoPlay" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <svg id="mtIcoPause" viewBox="0 0 24 24" style="display:none"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>
      </button>
      <div class="mt-bar" id="mtBar"><span id="mtBarFill"></span></div>
      <span class="mt-time" id="mtTime">0:00</span>
      <button class="mt-cbtn ghost" id="mtEject" aria-label="Eject">
        <svg viewBox="0 0 24 24"><path d="M5 17h14v2H5zm7-12 7 9H5z"/></svg>
      </button>
    </div>
  </div>
</div>`;

const MT_EXT = /\.(mp3|m4a|wav|ogg|aac|flac)$/i;

function mtParseName(file) {
  const base = decodeURIComponent(file)
    .replace(MT_EXT, '')
    .replace(/\(?\b[\w-]+\.(pm|com|net|in|me|io|cc|to)\b\)?/gi, '')   // (mp3.pm), site.com
    .replace(/\b\d{2,3}\s*kbps\b/gi, '')                              // 320 Kbps
    .replace(/_+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
  const parts = base.split(' - ');
  if (parts.length >= 2) {
    return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  }
  return { artist: 'Our Mixtape', title: base.replace(/-/g, ' ') };
}

function mtToSong(file) {
  const clean = decodeURIComponent(file);
  return { ...mtParseName(clean), src: 'songs/' + encodeURIComponent(clean) };
}

async function mtLoadSongs() {
  // 1) songs/songs.json  (created by build_playlist.py) — works everywhere
  try {
    const r = await fetch('songs/songs.json?t=' + Date.now());
    if (r.ok) {
      const files = await r.json();
      if (Array.isArray(files) && files.length) return files.map(mtToSong);
    }
  } catch (e) {}

  // 2) Live Server folder listing — zero-setup fallback while developing
  try {
    const r = await fetch('songs/');
    if (r.ok) {
      const doc = new DOMParser().parseFromString(await r.text(), 'text/html');
      const files = [...doc.querySelectorAll('a')]
        .map(a => (a.getAttribute('href') || '').split('/').pop())
        .filter(h => MT_EXT.test(h));
      if (files.length) return files.sort((a, b) => a.localeCompare(b)).map(mtToSong);
    }
  } catch (e) {}

  return [];
}

(async function loadMixtape() {
  const host = document.getElementById('mediaCardContainer');
  if (!host) return console.warn('mixtape: #mediaCardContainer not found');

  try {
    const res = await fetch('pages/mixtape.html');
    if (!res.ok) throw new Error('HTTP ' + res.status);
    host.innerHTML = await res.text();
  } catch (e) {
    console.warn('mixtape: could not load pages/mixtape.html, using built-in markup', e);
    host.innerHTML = MT_TEMPLATE;
  }
  if (MT_NEEDED.some(id => !document.getElementById(id))) {
    console.warn('mixtape: pages/mixtape.html is incomplete, using built-in markup');
    host.innerHTML = MT_TEMPLATE;
  }
  MT_SONGS = await mtLoadSongs();
  initMixtape();
})();

function initMixtape() {
  const $ = id => document.getElementById(id);

  const needed = ['mtBtn', 'mtBtnText', 'mtList', 'mtDeck', 'mtCassette', 'mtLblTitle', 'mtLblArtist',
                  'mtControls', 'mtPlay', 'mtIcoPlay', 'mtIcoPause', 'mtBar', 'mtBarFill', 'mtTime', 'mtEject'];
  const missing = needed.filter(id => !$(id));
  if (missing.length) {
    console.error('mixtape: pages/mixtape.html is incomplete, missing ids: ' + missing.join(', ') +
                  ' — replace the whole file with the latest mixtape.html');
    return;
  }
  let audio = $('mtAudio');
  if (!audio) {                      // create it if the HTML fragment didn't include it
    audio = document.createElement('audio');
    audio.id = 'mtAudio';
    audio.preload = 'none';
    document.body.appendChild(audio);
  }
  const deck = $('mtDeck'), cassette = $('mtCassette'),
        list = $('mtList'), controls = $('mtControls');
  let current = -1, busy = false;

  /* build track list */
  if (!MT_SONGS.length) {
    list.innerHTML = '<p style="color:#b9a6d9;font-size:13px;margin:4px 2px">No songs found yet — add mp3 files to the songs folder.</p>';
  }
  MT_SONGS.forEach((s, i) => {
    const b = document.createElement('button');
    b.className = 'mt-track';
    b.innerHTML = `<span class="mt-num">${String(i + 1).padStart(2, '0')}</span>
                   <span class="mt-t"><b>${s.title}</b><small>${s.artist}</small></span>
                   <span class="mt-mini"></span>`;
    b.onclick = () => selectSong(i);
    list.appendChild(b);
  });

  /* open / close list */
  $('mtBtn').onclick = () => {
    const open = list.classList.toggle('open');
    $('mtBtn').setAttribute('aria-expanded', open);
    $('mtBtnText').textContent = open ? 'Close' : (current >= 0 ? 'Change tape' : 'Open mixtape');
  };

  /* mechanical clunk sound (no file needed) */
  let ac;
  function clunk(freq = 120, dur = .12) {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'square';
      o.frequency.setValueAtTime(freq, ac.currentTime);
      o.frequency.exponentialRampToValueAtTime(40, ac.currentTime + dur);
      g.gain.setValueAtTime(.18, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(.001, ac.currentTime + dur);
      o.connect(g).connect(ac.destination);
      o.start(); o.stop(ac.currentTime + dur);
    } catch (e) {}
  }
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function setPlaying(on) {
    cassette.classList.toggle('playing', on);
    deck.classList.toggle('playing', on);
    $('mtIcoPlay').style.display  = on ? 'none' : '';
    $('mtIcoPause').style.display = on ? '' : 'none';
  }

  async function ejectTape() {
    if (!cassette.classList.contains('in')) return;
    audio.pause(); setPlaying(false);
    clunk(160, .1);
    cassette.classList.remove('in');
    cassette.classList.add('out');
    await wait(750);
    cassette.classList.remove('out');
  }

  async function selectSong(i) {
    if (busy) return;
    busy = true;
    list.querySelectorAll('.mt-track').forEach((t, k) => t.classList.toggle('active', k === i));

    // 1) fold the list away so the deck is in view
    list.classList.remove('open');
    $('mtBtn').setAttribute('aria-expanded', false);
    $('mtBtnText').textContent = 'Change tape';
    deck.classList.add('show');
    controls.classList.add('show');
    await wait(550);
    deck.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    await wait(250);

    // 2) old cassette ejects (now visible)
    await ejectTape();
    await wait(200);

    // 3) swap label + load the new song
    current = i;
    const s = MT_SONGS[i];
    $('mtLblTitle').textContent  = s.title;
    $('mtLblArtist').textContent = s.artist;
    audio.src = s.src;
    await wait(150);

    cassette.classList.add('in');           // slides into the deck
    await wait(750);
    clunk(90, .16);                         // click as it seats
    await wait(250);

    try { await audio.play(); } catch (e) { console.warn('Audio could not play:', e); }
    setPlaying(!audio.paused);
    busy = false;
  }

  $('mtPlay').onclick = () => {
    if (current < 0 || busy) return;
    audio.paused ? audio.play() : audio.pause();
  };
  audio.addEventListener('play',  () => setPlaying(true));
  audio.addEventListener('pause', () => setPlaying(false));
  audio.addEventListener('ended', () => selectSong((current + 1) % MT_SONGS.length));

  $('mtEject').onclick = async () => {
    if (busy) return;
    busy = true;
    await ejectTape();
    deck.classList.remove('show');
    controls.classList.remove('show');
    list.querySelectorAll('.mt-track').forEach(t => t.classList.remove('active'));
    current = -1;
    $('mtBtnText').textContent = 'Open mixtape';
    busy = false;
  };

  /* progress bar */
  const fmt = t => isFinite(t) ? Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0') : '0:00';
  audio.addEventListener('timeupdate', () => {
    $('mtBarFill').style.width = (audio.currentTime / (audio.duration || 1) * 100) + '%';
    $('mtTime').textContent = fmt(audio.currentTime);
  });
  $('mtBar').onclick = e => {
    const r = $('mtBar').getBoundingClientRect();
    if (audio.duration) audio.currentTime = ((e.clientX - r.left) / r.width) * audio.duration;
  };

  /* video and tape never play together */
  const vid = document.getElementById('giftVideo');
  if (vid) {
    vid.addEventListener('play', () => audio.pause());
    audio.addEventListener('play', () => vid.pause());
  }
}