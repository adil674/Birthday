(() => {
  const STORAGE_KEY = 'girlIMetOnline_story_v2';
  const TITLES_KEY = 'girlIMetOnline_titles_v1';
  const OLD_STORAGE_KEY = 'girlIMetOnline_pages_v1'; // v1 format, migrated below
  const MIN_LEAVES = 10; // book always shows at least this many leaves (20 pages)

  const stack = document.getElementById('stack');
  const cover = document.getElementById('cover');
  const coverFront = document.getElementById('coverFront');
  const openBtn = document.getElementById('openBtn');
  const controls = document.getElementById('controls');
  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const addBtn = document.getElementById('addBtn');
  const progress = document.getElementById('progress');
  const saveToast = document.getElementById('saveToast');

  // ---------- State ----------
  let storyText = loadStory();
  let titles = loadTitles();
  let minLeaves = MIN_LEAVES;
  let leafEls = [];      // persistent DOM leaf elements: { el, frontEditable, backEditable }
  let flipped = 0;
  let opened = false;
  let toastTimer = null;
  let inputDebounce = null;

  function loadStory(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(raw != null) return raw;
    }catch(e){ /* ignore */ }
    try{
      const oldRaw = localStorage.getItem(OLD_STORAGE_KEY);
      if(oldRaw){
        const oldLeaves = JSON.parse(oldRaw);
        if(Array.isArray(oldLeaves)){
          const stripTags = (html) => {
            const tmp = document.createElement('div');
            tmp.innerHTML = html || '';
            return tmp.textContent || '';
          };
          return oldLeaves.map(l => stripTags(l.front) + stripTags(l.back)).join('');
        }
      }
    }catch(e){ /* ignore corrupt old data */ }
    return '';
  }

  function persist(){
    try{ localStorage.setItem(STORAGE_KEY, storyText); }catch(e){ /* storage unavailable */ }
    showToast();
  }

  function loadTitles(){
    try{
      const raw = localStorage.getItem(TITLES_KEY);
      if(raw) return JSON.parse(raw);
    }catch(e){ /* ignore corrupt data */ }
    return {};
  }

  let titlesDebounce = null;
  function persistTitles(){
    clearTimeout(titlesDebounce);
    titlesDebounce = setTimeout(() => {
      try{ localStorage.setItem(TITLES_KEY, JSON.stringify(titles)); }catch(e){ /* storage unavailable */ }
      showToast();
    }, 500);
  }

  function showToast(){
    saveToast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => saveToast.classList.remove('show'), 1200);
  }

  // ---------- Cover image detection ----------
  const candidates = ['images/cover/cover.jpg', 'images/cover/cover.jpeg', 'images/cover/cover.png'];
  (function findCover(i = 0){
    if(i >= candidates.length) return;
    const img = new Image();
    img.onload = () => {
      coverFront.style.backgroundImage =
        `linear-gradient(0deg, rgba(20,10,14,0.35), rgba(20,10,14,0.05)), url("${candidates[i]}")`;
      coverFront.style.backgroundSize = 'cover';
      coverFront.style.backgroundPosition = 'center';
    };
    img.onerror = () => findCover(i + 1);
    img.src = candidates[i];
  })();

  // ---------- Leaf DOM (created once, reused, grows on demand) ----------
  function pageLabel(n){ return `Page ${n}`; }

  function createLeafEl(i){
    const el = document.createElement('div');
    el.className = 'leaf';
    el.dataset.index = i;
    el.innerHTML = `
      <div class="face front page-face front">
        <div class="page-title" contenteditable="true" spellcheck="true"
             data-placeholder="Chapter title…" data-title-leaf="${i}" data-title-side="front"></div>
        <p class="page-number"></p>
        <div class="page-content" contenteditable="true" spellcheck="true"
             data-placeholder="This page is still blank. Write something here…"
             data-leaf="${i}" data-side="front"></div>
      </div>
      <div class="face back page-face back">
        <div class="page-title" contenteditable="true" spellcheck="true"
             data-placeholder="Chapter title…" data-title-leaf="${i}" data-title-side="back"></div>
        <p class="page-number"></p>
        <div class="page-content" contenteditable="true" spellcheck="true"
             data-placeholder="This page is still blank. Write something here…"
             data-leaf="${i}" data-side="back"></div>
      </div>
    `;
    stack.appendChild(el);

    el.querySelector('.front .page-number').textContent = pageLabel(i * 2 + 1);
    el.querySelector('.back .page-number').textContent = pageLabel(i * 2 + 2);

    const frontEditable = el.querySelector('[data-side="front"]');
    const backEditable = el.querySelector('[data-side="back"]');
    const frontTitle = el.querySelector('[data-title-side="front"]');
    const backTitle = el.querySelector('[data-title-side="back"]');

    frontTitle.textContent = titles[i * 2] || '';
    backTitle.textContent = titles[i * 2 + 1] || '';

    [frontEditable, backEditable].forEach(editable => {
      editable.addEventListener('keydown', onEditableKeydown);
      editable.addEventListener('paste', onEditablePaste);
      editable.addEventListener('input', onEditableInput);
    });

    [frontTitle, backTitle].forEach(titleEl => {
      titleEl.addEventListener('keydown', onTitleKeydown);
      titleEl.addEventListener('paste', onTitlePaste);
      titleEl.addEventListener('input', onTitleInput);
    });

    el.addEventListener('click', (e) => {
      if(e.target.closest('.page-content, .page-title')) return;
      const isFlipped = el.classList.contains('flipped');
      if(!isFlipped && i === flipped) goNext();
      else if(isFlipped && i === flipped - 1) goPrev();
    });

    return { el, frontEditable, backEditable, frontTitle, backTitle };
  }

  function ensureLeafCount(n){
    while(leafEls.length < n){
      leafEls.push(createLeafEl(leafEls.length));
    }
  }

  // ---------- Plain-text editing ----------
  function onEditableKeydown(e){
    if(e.key === 'Enter'){
      e.preventDefault();
      document.execCommand('insertText', false, '\n');
    }
  }

  function onEditablePaste(e){
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
  }

  function onTitleKeydown(e){
    if(e.key === 'Enter'){
      e.preventDefault();
      e.target.blur();
    }
  }

  function onTitlePaste(e){
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain').replace(/\s+/g, ' ');
    document.execCommand('insertText', false, text);
  }

  function onTitleInput(e){
    const el = e.target;
    const leaf = Number(el.dataset.titleLeaf);
    const side = el.dataset.titleSide;
    const pageIdx = leaf * 2 + (side === 'back' ? 1 : 0);
    titles[pageIdx] = el.textContent;
    persistTitles();
  }

  // ---------- Caret <-> offset helpers ----------
  function getCaretOffset(el){
    const sel = window.getSelection();
    if(!sel.rangeCount) return el.textContent.length;
    const range = sel.getRangeAt(0);
    const pre = range.cloneRange();
    pre.selectNodeContents(el);
    pre.setEnd(range.endContainer, range.endOffset);
    return pre.toString().length;
  }

  function setCaretOffset(el, offset){
    const range = document.createRange();
    const sel = window.getSelection();
    let remaining = offset;
    let node = null;

    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null);
    let n;
    while((n = walker.nextNode())){
      const len = n.textContent.length;
      if(remaining <= len){ node = n; break; }
      remaining -= len;
    }

    if(node){
      range.setStart(node, remaining);
    } else {
      range.selectNodeContents(el);
      range.collapse(false);
    }
    range.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range);
    el.focus();
  }

  // ---------- Page access ----------
  function getPageEl(pageIdx, noCreate){
    const leaf = Math.floor(pageIdx / 2);
    if(leaf >= leafEls.length){
      if(noCreate) return null;
      ensureLeafCount(leaf + 1);
    }
    const side = pageIdx % 2 === 0 ? 'front' : 'back';
    return side === 'front' ? leafEls[leaf].frontEditable : leafEls[leaf].backEditable;
  }

  function tokenize(text){
    return text.match(/\S+\s*|\s+/g) || [];
  }

  // Push trailing text off an overflowing page onto the next page(s), cascading as needed.
  // Measures the REAL element's scrollHeight vs clientHeight, so it always matches what's on screen.
  function pushOverflowFrom(startIdx, caret){
    let idx = startIdx;
    let touchedAny = false;
    while(true){
      const el = getPageEl(idx);
      let movedAny = false;
      let guard = 0;
      while(el.scrollHeight > el.clientHeight + 1 && guard < 2000){
        guard++;
        const tokens = tokenize(el.textContent);
        if(tokens.length <= 1) break; // single unbreakable token; let it overflow rather than loop forever
        const last = tokens.pop();
        const newText = tokens.join('');
        el.textContent = newText;
        const nextEl = getPageEl(idx + 1);
        nextEl.textContent = last + nextEl.textContent;
        movedAny = true;
        touchedAny = true;

        if(caret && caret.pageIdx === idx && caret.offset > newText.length){
          caret.offset -= newText.length;
          caret.pageIdx = idx + 1;
        }
      }
      if(!movedAny) break;
      idx++;
    }
    return touchedAny;
  }

  // Pull leading text from the next page(s) back into a page that has room, cascading as needed.
  function pullUnderflowFrom(startIdx, caret){
    let idx = startIdx;
    let touchedAny = false;
    while(true){
      const el = getPageEl(idx);
      const nextEl = getPageEl(idx + 1, true);
      if(!nextEl || nextEl.textContent === '') break;

      let pulledAnyHere = false;
      let guard = 0;
      while(guard < 2000){
        guard++;
        const nextText = nextEl.textContent;
        const tokens = tokenize(nextText);
        if(tokens.length === 0) break;
        const first = tokens[0];
        const original = el.textContent;
        el.textContent = original + first;
        const fits = el.scrollHeight <= el.clientHeight + 1;
        if(fits){
          nextEl.textContent = nextText.slice(first.length);
          pulledAnyHere = true;
          touchedAny = true;

          if(caret && caret.pageIdx === idx + 1){
            if(caret.offset <= first.length){
              caret.pageIdx = idx;
              caret.offset = original.length + caret.offset;
            } else {
              caret.offset -= first.length;
            }
          }
        } else {
          el.textContent = original;
          break;
        }
      }
      if(!pulledAnyHere) break;
      idx++;
    }
    return touchedAny;
  }

  function collectStoryText(){
    let s = '';
    for(let i = 0; i < leafEls.length; i++){
      s += leafEls[i].frontEditable.textContent;
      s += leafEls[i].backEditable.textContent;
    }
    return s;
  }

  function clearAllPages(){
    for(let i = 0; i < leafEls.length; i++){
      leafEls[i].frontEditable.textContent = '';
      leafEls[i].backEditable.textContent = '';
    }
  }

  // Full rebuild: used on first load, window resize, and "Add pages"
  function normalizeAll(seedText){
    const text = seedText !== undefined ? seedText : collectStoryText();
    clearAllPages();
    ensureLeafCount(1);
    getPageEl(0).textContent = text;
    pushOverflowFrom(0, null);
    ensureLeafCount(minLeaves);
    applyZIndex();
    updateProgress();
  }

  // ---------- Render / flip mechanics ----------
  function applyZIndex(disableAnim){
    const total = leafEls.length;
    leafEls.forEach(({ el }, i) => {
      if(disableAnim) el.classList.add('no-anim');
      const isFlipped = i < flipped;
      el.classList.toggle('flipped', isFlipped);
      el.style.zIndex = isFlipped ? (i + 1) : (total - i + 1);
      if(disableAnim) requestAnimationFrame(() => requestAnimationFrame(() => el.classList.remove('no-anim')));
    });
  }

  function updateProgress(){
    const total = leafEls.length * 2;
    if(!opened){
      progress.textContent = 'Cover';
      prevBtn.disabled = true;
      nextBtn.disabled = total === 0;
      return;
    }
    if(flipped >= leafEls.length){
      progress.textContent = 'The back cover';
    } else {
      const left = flipped * 2 + 1;
      progress.textContent = `Pages ${left}–${left + 1} of ${total}`;
    }
    prevBtn.disabled = flipped === 0;
    nextBtn.disabled = flipped >= leafEls.length;
  }

  function ensureVisiblePage(pageIdx){
    const leaf = Math.floor(pageIdx / 2);
    const side = pageIdx % 2 === 0 ? 'front' : 'back';
    const desired = side === 'front' ? leaf : leaf + 1;

    if(!opened){
      opened = true;
      cover.classList.add('flipped');
      cover.style.zIndex = leafEls.length + 5;
      openBtn.hidden = true;
      controls.hidden = false;
    }
    if(desired !== flipped){
      flipped = Math.max(0, Math.min(leafEls.length, desired));
      applyZIndex(true); // instant while typing, no cinematic delay
    }
  }

  // ---------- Input handling ----------
  function onEditableInput(e){
    const el = e.target;
    const leaf = Number(el.dataset.leaf);
    const side = el.dataset.side;
    const pageIdx = leaf * 2 + (side === 'back' ? 1 : 0);
    const caret = { pageIdx, offset: getCaretOffset(el) };

    const pushed = pushOverflowFrom(pageIdx, caret);
    const pulled = pullUnderflowFrom(pageIdx, caret);

    if(pushed || pulled){
      ensureVisiblePage(caret.pageIdx);
      const targetEl = getPageEl(caret.pageIdx);
      setCaretOffset(targetEl, caret.offset);
    }

    updateProgress();

    clearTimeout(inputDebounce);
    inputDebounce = setTimeout(() => {
      storyText = collectStoryText();
      persist();
    }, 500);
  }

  // ---------- Manual navigation ----------
  function goNext(){
    if(!opened) return openBook();
    if(flipped < leafEls.length){
      flipped++;
      applyZIndex();
      updateProgress();
    }
  }

  function goPrev(){
    if(flipped > 0){
      flipped--;
      applyZIndex();
      updateProgress();
    } else if(opened){
      closeBook();
    }
  }

  function openBook(){
    opened = true;
    cover.classList.add('flipped');
    cover.style.zIndex = leafEls.length + 5;
    openBtn.hidden = true;
    controls.hidden = false;
    updateProgress();
  }

  function closeBook(){
    opened = false;
    cover.classList.remove('flipped');
    openBtn.hidden = false;
    controls.hidden = true;
    updateProgress();
  }

  function addLeaves(count = 4){
    minLeaves += count / 2;
    normalizeAll();
  }

  // ---------- Wire up controls ----------
  openBtn.addEventListener('click', openBook);
  coverFront.addEventListener('click', () => { if(!opened) openBook(); });
  nextBtn.addEventListener('click', goNext);
  prevBtn.addEventListener('click', goPrev);
  addBtn.addEventListener('click', () => addLeaves(4));

  document.addEventListener('keydown', (e) => {
    const active = document.activeElement;
    if(active && active.isContentEditable) return;
    if(e.key === 'ArrowRight') goNext();
    if(e.key === 'ArrowLeft') goPrev();
  });

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => normalizeAll(), 250);
  });

  // ---------- Init ----------
  ensureLeafCount(minLeaves);
  normalizeAll(storyText);
})();