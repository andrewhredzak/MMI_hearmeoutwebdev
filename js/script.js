// One record, one click wheel. Playback state comes from the audio element.
(() => {
  'use strict';
  const album = 'As Long as You Acknowledge the Disconnect';
  const artist = 'Hear Me Out';
  const tracks = [
    ['silly hats only', 'silly hats only.mp3'],
    ['I Regret to Inform You', 'Iregrettoinformyou.mp3'],
    ['The Annexation of Puerto Rico', 'The Annexation of Puerto Rico.mp3'],
    ['Track 4', '04 Track 4.mp3'],
    ['guys i just dont think this song is us', 'guys i just dont think this song is us.mp3'],
    ['Bleeker', 'Bleeker.mp3'],
    ['Track 7', '07 Track 7.mp3'],
    ['jam 8', 'jam 8.mp3'],
    ['Track 9', '09 Track 9.mp3'],
    ['Track 10', '10 Track 10.mp3'],
    ['Track 11', '11 Track 11.mp3'],
  ].map(([title, file]) => ({ title, src: `designassets/aslongasyouacknowledgethedisconnect/${file}` }));
  const $ = id => document.getElementById(id);
  const audio = $('audio');
  const wheel = $('wheel');
  const list = $('list');
  const storageKey = 'hearmeout-ipod-v2';
  const clamp = (n, min, max) => Math.min(max, Math.max(min, n));
  const sequence = () => tracks.map((_, i) => i);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch { /* Storage is optional. */ }
  let repeat = ['Off', 'All', 'One'].includes(saved.repeat) ? saved.repeat : 'Off';
  let shuffle = saved.shuffle === true;
  let clicker = saved.clicker !== false;
  let songIndex = -1;
  let queue = sequence();
  let cursor = 0;
  let stack = [{ view: 'main', index: 0 }];
  let sleeping = false;
  let seeking = false;
  let seekTime = 0;
  let seekWasPlaying = false;
  let loading = false;
  let failure = '';
  let finished = false;
  let loadVersion = 0;
  let resumeTime = null;
  let noticeTimer;
  let adjustmentTimer;
  let clickContext;
  let gesture = null;
  let suppressClickUntil = 0;
  let suppressClickButton = '';
  let saveAt = 0;
  audio.volume = Number.isFinite(saved.volume) ? clamp(saved.volume, 0, 1) : 0.7;
  const current = () => stack[stack.length - 1];
  const duration = () => Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
  const format = seconds => {
    const safe = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
  };

  function save() {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ volume: audio.volume, repeat, shuffle, clicker,
        track: songIndex, time: seeking ? seekTime : resumeTime ?? audio.currentTime }));
    } catch { /* Private browsing and disabled storage still support playback. */ }
  }
  function announce(message) { $('status').textContent = message; }
  function notice(message) {
    $('screen-message').textContent = message;
    $('screen-message').hidden = false;
    announce(message);
    clearTimeout(noticeTimer);
    noticeTimer = setTimeout(() => { $('screen-message').hidden = true; }, 1800);
  }
  function tick() {
    if (!clicker) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      clickContext ||= new AudioContext();
      if (clickContext.state === 'suspended') void clickContext.resume().catch(() => {});
      const oscillator = clickContext.createOscillator();
      const gain = clickContext.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = 1050;
      gain.gain.setValueAtTime(0.012, clickContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickContext.currentTime + 0.012);
      oscillator.connect(gain).connect(clickContext.destination);
      oscillator.start();
      oscillator.stop(clickContext.currentTime + 0.014);
    } catch { /* Click feedback must never prevent a control action. */ }
  }
  function menuItems(view = current().view) {
    switch (view) {
      case 'main': return [
        { label: 'Music', view: 'music' },
        { label: 'Shuffle Songs', action: 'shufflePlay' },
        { label: 'Settings', view: 'settings' },
        ...(songIndex >= 0 ? [{ label: 'Now Playing', view: 'nowplaying' }] : []),
      ];
      case 'music': return [
        { label: 'Artists', view: 'artists' },
        { label: 'Albums', view: 'albums' },
        { label: 'Songs', view: 'songs' },
      ];
      case 'artists': return [{ label: artist, view: 'albums' }];
      case 'albums': return [{ label: album, view: 'songs' }];
      case 'songs': return tracks.map((track, index) => ({ label: track.title, track: index }));
      case 'settings': return [
        { label: 'Shuffle', detail: shuffle ? 'Songs' : 'Off', action: 'shuffle' },
        { label: 'Repeat', detail: repeat, action: 'repeat' },
        { label: 'Clicker', detail: clicker ? 'On' : 'Off', action: 'clicker' },
      ];
      default: return [];
    }
  }
  function render() {
    const view = current().view;
    const nowPlaying = view === 'nowplaying';
    list.hidden = nowPlaying;
    $('nowplaying').hidden = !nowPlaying;
    $('adjustment').hidden = true;
    $('header-title-text').textContent = ({ main: 'iPod', music: 'Music', artists: 'Artists',
      albums: 'Albums', songs: 'Songs', settings: 'Settings', nowplaying: 'Now Playing' })[view];
    if (!nowPlaying) {
      const items = menuItems();
      current().index = clamp(current().index, 0, items.length - 1);
      list.replaceChildren();
      items.forEach((item, index) => {
        const li = document.createElement('li');
        li.setAttribute('role', 'none');
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `menu-item${index === current().index ? ' active' : ''}`;
        button.setAttribute('role', 'menuitem');
        button.tabIndex = index === current().index ? 0 : -1;
        button.title = item.label;
        if (item.track === songIndex) button.setAttribute('aria-current', 'true');
        const label = document.createElement('span');
        label.className = 'item-label';
        label.textContent = item.label;
        const detail = document.createElement('span');
        detail.className = 'item-detail';
        detail.textContent = item.detail || (item.track === songIndex ? (audio.paused ? 'Ⅱ' : '▶') : item.view ? '›' : '');
        button.append(label, detail);
        button.addEventListener('click', () => act(() => { current().index = index; select(); }));
        button.addEventListener('focus', () => {
          current().index = index;
          for (const sibling of list.querySelectorAll('.menu-item')) {
            sibling.classList.toggle('active', sibling === button);
            sibling.tabIndex = sibling === button ? 0 : -1;
          }
        });
        li.append(button);
        list.append(li);
      });
      const selected = list.children[current().index];
      if (selected) {
        const top = selected.offsetTop - list.offsetTop;
        if (top < list.scrollTop) list.scrollTop = top;
        else if (top + selected.offsetHeight > list.scrollTop + list.clientHeight)
          list.scrollTop = top + selected.offsetHeight - list.clientHeight;
      }
    } else if (songIndex >= 0) {
      $('np-title').textContent = tracks[songIndex].title;
      $('np-title').title = tracks[songIndex].title;
      $('np-artist').textContent = artist;
      $('np-album').textContent = album;
      $('track-count').textContent = `${cursor + 1} of ${tracks.length}`;
    }
    updatePlayback();
    updateProgress();
  }
  function updatePlayback() {
    const state = failure || (loading ? 'Loading…' : finished ? 'Album finished' : songIndex < 0 ? '' : seeking ? 'Seeking' : audio.paused ? 'Paused' : 'Playing');
    $('playback-state').textContent = state;
    $('playback-icon').textContent = songIndex < 0 ? '' : audio.paused ? 'Ⅱ' : '▶';
    $('playback-icon').setAttribute('aria-label', state || 'Stopped');
    $('hot-play').setAttribute('aria-label', audio.paused ? 'Play' : 'Pause');
    $('hot-play').setAttribute('aria-pressed', String(!audio.paused));
    $('ipod').classList.toggle('is-playing', !audio.paused);
    $('track-count').textContent = songIndex < 0 ? '' : `${cursor + 1} of ${tracks.length}${shuffle ? ' · ⇄' : ''}${repeat !== 'Off' ? ` · ↻${repeat === 'One' ? '1' : ''}` : ''}`;
  }
  function updateProgress() {
    const length = duration();
    const time = seeking ? seekTime : audio.currentTime;
    $('current-time').textContent = format(time);
    $('remaining-time').textContent = `−${format(length - time)}`;
    $('progress').value = length ? Math.round(time / length * 1000) : 0;
    $('progress').disabled = !length;
    $('progress').style.setProperty('--progress', `${length ? time / length * 100 : 0}%`);
    $('progress').setAttribute('aria-valuetext', `${format(time)} of ${format(length)}`);
    $('volume').value = Math.round(audio.volume * 100);
    $('volume').style.setProperty('--progress', `${audio.volume * 100}%`);
  }
  function push(view) {
    if (seeking) commitSeek();
    stack.push({ view, index: view === 'songs' && songIndex >= 0 ? songIndex : 0 });
    render();
  }
  function showNowPlaying() {
    if (current().view !== 'nowplaying') push('nowplaying');
    else render();
  }
  function makeQueue(first) {
    queue = sequence();
    if (shuffle) {
      queue.splice(first, 1);
      for (let i = queue.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [queue[i], queue[j]] = [queue[j], queue[i]];
      }
      queue.unshift(first);
    }
    cursor = queue.indexOf(first);
  }
  async function play() {
    const version = loadVersion;
    failure = '';
    if (audio.error) { audio.load(); loading = true; }
    try { await audio.play(); }
    catch (error) {
      if (version !== loadVersion || error.name === 'AbortError') return;
      loading = false;
      failure = error.name === 'NotAllowedError' ? 'Press Play to listen' : 'Unable to play · press Play to retry';
      notice(failure);
      updatePlayback();
    }
  }
  function loadTrack(index, shouldPlay = true, position = null) {
    seeking = false;
    loadVersion++;
    songIndex = index;
    cursor = queue.indexOf(index);
    failure = '';
    finished = false;
    loading = true;
    resumeTime = position;
    audio.src = tracks[index].src;
    audio.load();
    render();
    announce(`${tracks[index].title} — ${artist}`);
    if ('mediaSession' in navigator && 'MediaMetadata' in window) {
      navigator.mediaSession.metadata = new MediaMetadata({ title: tracks[index].title, artist, album,
        artwork: [{ src: new URL('designassets/images/heremeout_pilot_redyellow.png', location.href).href, type: 'image/png' }] });
    }
    if (shouldPlay) void play();
    save();
  }
  function startTrack(index) { makeQueue(index); loadTrack(index); showNowPlaying(); }
  function togglePlayback() {
    if (seeking) commitSeek(false);
    if (songIndex < 0) {
      const selected = menuItems()[current().index];
      startTrack(selected?.track ?? 0);
    } else if (audio.paused) {
      if (finished) { makeQueue(0); loadTrack(queue[0]); }
      else void play();
    } else audio.pause();
  }
  function skip(direction, automatic = false) {
    if (songIndex < 0) return;
    const shouldPlay = automatic || !audio.paused || (seeking && seekWasPlaying);
    cancelSeek();
    if (direction < 0 && audio.currentTime > 3) {
      audio.currentTime = 0;
      finished = false;
      if (shouldPlay && audio.paused) void play();
      updatePlayback(); updateProgress(); save(); return;
    }
    if (automatic && repeat === 'One') { loadTrack(songIndex, true); return; }
    const next = cursor + direction;
    if (next >= queue.length && repeat === 'Off') {
      audio.pause();
      finished = true;
      loading = false;
      updatePlayback();
      save();
      return;
    }
    if (next < 0 && repeat === 'Off') {
      audio.currentTime = 0;
      finished = false;
      if (shouldPlay && audio.paused) void play();
      updatePlayback(); updateProgress(); save(); return;
    }
    loadTrack(queue[(next + queue.length) % queue.length], shouldPlay);
  }
  function select() {
    tick();
    if (current().view === 'nowplaying') {
      if (seeking) { commitSeek(); render(); }
      else if (duration()) {
        seeking = true;
        seekTime = audio.currentTime;
        seekWasPlaying = !audio.paused;
        audio.pause();
        render();
      }
      return;
    }
    const item = menuItems()[current().index];
    if (!item) return;
    if (item.view) { push(item.view); return; }
    if (item.track !== undefined) { startTrack(item.track); return; }
    switch (item.action) {
      case 'shufflePlay': shuffle = true; startTrack(Math.floor(Math.random() * tracks.length)); break;
      case 'shuffle': shuffle = !shuffle; makeQueue(songIndex >= 0 ? songIndex : 0); break;
      case 'repeat': repeat = ['Off', 'All', 'One'][(['Off', 'All', 'One'].indexOf(repeat) + 1) % 3]; break;
      case 'clicker': clicker = !clicker; break;
    }
    save();
    render();
  }
  function back() {
    tick();
    if (seeking) { commitSeek(); render(); return; }
    if (stack.length > 1) stack.pop();
    render();
  }
  function commitSeek(resume = true) {
    if (!seeking) return;
    audio.currentTime = clamp(seekTime, 0, duration());
    seeking = false;
    finished = false;
    if (resume && seekWasPlaying) void play();
    updateProgress();
    updatePlayback();
    save();
  }
  function cancelSeek() {
    seeking = false;
  }
  function setVolume(value) {
    audio.volume = clamp(value, 0, 1);
    $('adjustment').hidden = false;
    $('adjustment-label').textContent = `Volume ${Math.round(audio.volume * 100)}%`;
    clearTimeout(adjustmentTimer);
    adjustmentTimer = setTimeout(() => { $('adjustment').hidden = true; }, 1400);
    updateProgress();
    save();
  }
  function turn(steps) {
    if (current().view === 'nowplaying') {
      if (seeking) { seekTime = clamp(seekTime + steps * 5, 0, duration()); updateProgress(); }
      else setVolume(audio.volume + steps * 0.04);
    } else {
      const wasFocused = list.contains(document.activeElement);
      current().index = clamp(current().index + steps, 0, menuItems().length - 1);
      render();
      if (wasFocused) list.querySelector('.active')?.focus({ preventScroll: true });
    }
    tick();
  }
  function act(action) {
    if (sleeping) {
      sleeping = false;
      $('ipod').classList.remove('is-sleeping');
      announce('iPod awake');
      return;
    }
    action();
  }
  function sleep() {
    if (seeking) commitSeek(false);
    audio.pause();
    sleeping = true;
    $('ipod').classList.add('is-sleeping');
    announce('iPod asleep. Press any wheel button to wake.');
    save();
  }
  const actions = { 'hot-menu': back, 'button-center': select, 'hot-prev': () => skip(-1),
    'hot-next': () => skip(1), 'hot-play': togglePlayback };
  for (const [id, action] of Object.entries(actions)) {
    $(id).addEventListener('click', event => {
      if (event.detail > 0 && id === suppressClickButton && performance.now() < suppressClickUntil) return;
      act(action);
    });
  }
  function angle(event) {
    const rect = wheel.getBoundingClientRect();
    return Math.atan2(event.clientY - rect.top - rect.height / 2, event.clientX - rect.left - rect.width / 2) * 180 / Math.PI;
  }
  function finishGesture(cancelled = false) {
    if (!gesture) return;
    const previous = gesture;
    gesture = null;
    clearTimeout(previous.timer);
    clearInterval(previous.scanTimer);
    suppressClickUntil = performance.now() + 500;
    suppressClickButton = previous.buttonId;
    if (wheel.hasPointerCapture(previous.id)) wheel.releasePointerCapture(previous.id);
    wheel.classList.remove('is-turning');
    if (previous.longPress && seeking) {
      if (cancelled) { cancelSeek(); if (seekWasPlaying) void play(); render(); }
      else { commitSeek(); render(); }
    }
    if (!cancelled && !previous.moved && !previous.longPress && actions[previous.buttonId]) act(actions[previous.buttonId]);
  }
  wheel.addEventListener('pointerdown', event => {
    if (event.button !== 0 || gesture) return;
    const button = event.target.closest('button');
    if (sleeping) {
      act(() => {});
      suppressClickUntil = performance.now() + 500;
      suppressClickButton = button?.id;
      return;
    }
    if (button?.id === 'button-center') return;
    gesture = { id: event.pointerId, angle: angle(event), sum: 0, moved: false, longPress: false,
      x: event.clientX, y: event.clientY, buttonId: button?.id };
    wheel.setPointerCapture(event.pointerId);
    if (['hot-prev', 'hot-next', 'hot-play'].includes(button?.id)) {
      gesture.timer = setTimeout(() => {
        if (!gesture || gesture.moved) return;
        gesture.longPress = true;
        if (button.id === 'hot-play') { sleep(); return; }
        if (!duration()) return;
        if (!seeking) {
          seekTime = audio.currentTime;
          seekWasPlaying = !audio.paused;
        }
        seeking = true;
        audio.pause();
        const scan = () => { seekTime = clamp(seekTime + (button.id === 'hot-next' ? 3 : -3), 0, duration()); updateProgress(); };
        scan();
        render();
        gesture.scanTimer = setInterval(scan, 120);
      }, button.id === 'hot-play' ? 900 : 450);
    }
  });
  wheel.addEventListener('pointermove', event => {
    if (!gesture || gesture.id !== event.pointerId || gesture.longPress) return;
    if (Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) > 7) {
      gesture.moved = true;
      clearTimeout(gesture.timer);
      wheel.classList.add('is-turning');
    }
    const nextAngle = angle(event);
    const delta = ((nextAngle - gesture.angle + 540) % 360) - 180;
    gesture.angle = nextAngle;
    gesture.sum += delta;
    if (gesture.moved && Math.abs(gesture.sum) >= 18) {
      const steps = Math.trunc(gesture.sum / 18);
      gesture.sum -= steps * 18;
      turn(steps);
    }
  });
  wheel.addEventListener('pointerup', event => { if (event.pointerId === gesture?.id) finishGesture(); });
  wheel.addEventListener('pointercancel', event => { if (event.pointerId === gesture?.id) finishGesture(true); });
  wheel.addEventListener('lostpointercapture', event => { if (event.pointerId === gesture?.id) finishGesture(true); });
  window.addEventListener('blur', () => finishGesture(true));
  wheel.addEventListener('wheel', event => {
    event.preventDefault();
    if (Math.abs(event.deltaY) < 2) return;
    act(() => turn(event.deltaY > 0 ? 1 : -1));
  }, { passive: false });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || /^(TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    const key = event.key;
    if (event.target.tagName === 'INPUT') {
      if (key !== 'Escape') return;
    }
    if ((key === 'Enter' || key === ' ') && event.target.closest('button, a')) return;
    const action = { ArrowDown: () => turn(1), ArrowUp: () => turn(-1), ArrowLeft: () => skip(-1),
      ArrowRight: () => skip(1), Enter: select, Escape: back, ' ': togglePlayback, Home: () => { if (seeking) commitSeek(); stack = [{ view: 'main', index: 0 }]; render(); } }[key];
    if (action) { event.preventDefault(); if (!event.repeat || key.startsWith('Arrow')) act(action); }
  });
  $('progress').addEventListener('input', () => act(() => {
    if (!duration()) return;
    const time = Number($('progress').value) / 1000 * duration();
    if (seeking) seekTime = time;
    else audio.currentTime = time;
    finished = false;
    updateProgress();
    updatePlayback();
    save();
  }));
  $('volume').addEventListener('input', () => act(() => setVolume(Number($('volume').value) / 100)));
  audio.addEventListener('loadedmetadata', () => {
    if (resumeTime !== null && duration()) { audio.currentTime = clamp(resumeTime, 0, Math.max(0, duration() - 0.1)); resumeTime = null; }
    loading = false;
    updateProgress();
    updatePlayback();
  });
  audio.addEventListener('timeupdate', () => {
    updateProgress();
    if (Date.now() - saveAt > 3000) { saveAt = Date.now(); save(); }
  });
  for (const event of ['play', 'pause', 'playing', 'canplay', 'volumechange']) {
    audio.addEventListener(event, () => {
      if (event === 'playing' || event === 'canplay') { loading = false; failure = ''; }
      if (event === 'play') finished = false;
      updatePlayback();
      if ('mediaSession' in navigator) navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
      if (event === 'pause' || event === 'volumechange') save();
    });
  }
  audio.addEventListener('waiting', () => { loading = true; updatePlayback(); });
  audio.addEventListener('error', () => {
    loading = false;
    failure = 'Unable to load · press Play to retry';
    updatePlayback();
    notice(failure);
  });
  audio.addEventListener('ended', () => skip(1, true));
  window.addEventListener('pagehide', save);
  if ('mediaSession' in navigator) {
    const handlers = { play: () => act(() => { if (audio.paused) togglePlayback(); }),
      pause: () => act(() => { if (!audio.paused) togglePlayback(); }),
      previoustrack: () => act(() => skip(-1)), nexttrack: () => act(() => skip(1)),
      seekto: details => act(() => { if (duration() && Number.isFinite(details.seekTime)) { audio.currentTime = clamp(details.seekTime, 0, duration()); updateProgress(); save(); } }) };
    for (const [action, handler] of Object.entries(handlers)) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* Some browsers expose only a subset. */ }
    }
  }
  if (Number.isInteger(saved.track) && saved.track >= 0 && saved.track < tracks.length) {
    makeQueue(saved.track);
    loadTrack(saved.track, false, Number.isFinite(saved.time) ? saved.time : 0);
  }
  render();
})();
