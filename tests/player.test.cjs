const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const appRoot = process.env.IPOD_APP_ROOT || (fs.existsSync(path.join(__dirname, '../js/script.js')) ? path.join(__dirname, '..') : __dirname);
const scriptPath = fs.existsSync(path.join(appRoot, 'js/script.js')) ? path.join(appRoot, 'js/script.js') : path.join(appRoot, 'script.js');

// Exercise the player state machine without fetching audio or depending on a browser.
function player(saved = {}) {
  class Element {
    constructor(tagName = 'DIV') {
      this.tagName = tagName.toUpperCase();
      this.children = [];
      this.listeners = {};
      this.attributes = {};
      this.className = '';
      this.hidden = false;
      this.scrollTop = 0;
      this.offsetTop = 0;
      this.offsetHeight = 25;
      this.clientHeight = 150;
      this.style = { setProperty() {} };
      this.classList = {
        toggle: (name, on) => {
          const names = new Set(this.className.split(' ').filter(Boolean));
          if (on ?? !names.has(name)) names.add(name); else names.delete(name);
          this.className = [...names].join(' ');
        },
        add: name => this.classList.toggle(name, true),
        remove: name => this.classList.toggle(name, false),
      };
    }
    addEventListener(name, listener) { (this.listeners[name] ||= []).push(listener); }
    emit(name, event = {}) { for (const listener of this.listeners[name] || []) listener(event); }
    setAttribute(name, value) { this.attributes[name] = value; }
    append(...nodes) { for (const node of nodes) { node.parent = this; this.children.push(node); } }
    replaceChildren(...nodes) { this.children = []; this.append(...nodes); }
    contains(node) { return node === this || this.children.some(child => child.contains(node)); }
    querySelectorAll(selector) {
      const results = [];
      for (const child of this.children) {
        if (selector === 'button' ? child.tagName === 'BUTTON' : child.className.split(' ').includes(selector.slice(1))) results.push(child);
        results.push(...child.querySelectorAll(selector));
      }
      return results;
    }
    querySelector(selector) { return this.querySelectorAll(selector)[0]; }
    closest(selector) {
      if (selector.split(',').some(part => part.trim() === this.tagName.toLowerCase() || part.trim() === `#${this.id}`)) return this;
      return this.parent?.closest(selector) || null;
    }
    focus() { document.activeElement = this; this.emit('focus'); }
    hasPointerCapture() { return false; }
    releasePointerCapture() {}
    setPointerCapture() {}
    getBoundingClientRect() { return { top: 0, left: 0, width: 220, height: 220 }; }
  }
  const html = fs.readFileSync(path.join(appRoot, 'index.html'), 'utf8');
  const elements = new Map();
  for (const [, tag, id] of html.matchAll(/<([a-z]+)[^>]*\bid="([^"]+)"/g)) {
    const element = new Element(tag);
    element.id = id;
    elements.set(id, element);
  }
  const document = new Element();
  document.activeElement = document;
  document.getElementById = id => elements.get(id);
  document.createElement = tag => new Element(tag);
  const window = new Element();
  const audio = elements.get('audio');
  Object.assign(audio, { paused: true, currentTime: 0, duration: 180, volume: 0.7, error: null });
  audio.load = () => { audio.currentTime = 0; audio.paused = true; };
  audio.play = () => { audio.paused = false; audio.emit('play'); audio.emit('playing'); return Promise.resolve(); };
  audio.pause = () => { audio.paused = true; audio.emit('pause'); };
  const localStorage = {
    value: JSON.stringify(saved),
    getItem() { return this.value; },
    setItem(_key, value) { this.value = value; },
  };
  const timers = new Map();
  let nextTimer = 0;
  const context = vm.createContext({ document, window, navigator: {}, localStorage, location: { href: 'http://localhost/' },
    URL, performance: { now: () => 0 },
    setTimeout: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearTimeout: id => timers.delete(id),
    setInterval: callback => { timers.set(++nextTimer, callback); return nextTimer; },
    clearInterval: id => timers.delete(id),
  });
  const source = fs.readFileSync(scriptPath, 'utf8');
  vm.runInContext(source.replace(/\}\)\(\);\s*$/, `globalThis.player = { startTrack, select, skip, push, back, togglePlayback,
    snapshot: () => ({ seeking, sleeping, songIndex, cursor, finished, failure, view: current().view, index: current().index }) };\n})();`), context);
  function key(key) {
    document.emit('keydown', { key, target: document, repeat: false, preventDefault() {} });
  }
  function pointerClick(id) {
    const wheel = elements.get('wheel');
    const button = elements.get(id);
    wheel.emit('pointerdown', { button: 0, pointerId: 1, target: button, clientX: 200, clientY: 110 });
    wheel.emit('pointerup', { pointerId: 1 });
    button.emit('click', { detail: 1 });
  }
  return { ...context.player, audio, key, pointerClick, document, elements, localStorage, timers };
}

test('album sequence places jam 8 before Track 9', () => {
  const p = player();
  p.startTrack(6);
  p.skip(1);
  assert.match(p.audio.src, /jam 8\.mp3$/);
  p.skip(1);
  assert.match(p.audio.src, /09 Track 9\.mp3$/);
});

test('browsing menus does not change the playback queue', () => {
  const p = player();
  p.startTrack(4);
  p.back();
  p.push('songs');
  p.key('ArrowDown');
  p.skip(1);
  assert.equal(p.snapshot().songIndex, 5);
  assert.equal(p.snapshot().view, 'songs');
});

test('manual next preserves paused playback', () => {
  const p = player();
  p.startTrack(2);
  p.audio.pause();
  p.skip(1);
  assert.equal(p.snapshot().songIndex, 3);
  assert.equal(p.audio.paused, true);
});

test('natural end stops at the final track with repeat off', () => {
  const p = player();
  p.startTrack(10);
  p.audio.emit('ended');
  assert.equal(p.snapshot().songIndex, 10);
  assert.equal(p.snapshot().finished, true);
  assert.equal(p.audio.paused, true);
  p.togglePlayback();
  assert.equal(p.snapshot().songIndex, 0);
  assert.equal(p.audio.paused, false);
});

test('Home leaves seek mode and restores playing playback', () => {
  const p = player();
  p.startTrack(3);
  p.audio.currentTime = 30;
  p.select();
  assert.equal(p.snapshot().seeking, true);
  p.key('Home');
  assert.equal(p.snapshot().view, 'main');
  assert.equal(p.snapshot().seeking, false);
  assert.equal(p.audio.paused, false);
});

test('Previous restarts and restores playback when leaving seek mode', () => {
  const p = player();
  p.startTrack(3);
  p.audio.currentTime = 30;
  p.select();
  p.skip(-1);
  assert.equal(p.snapshot().songIndex, 3);
  assert.equal(p.audio.currentTime, 0);
  assert.equal(p.snapshot().seeking, false);
  assert.equal(p.audio.paused, false);
});

test('saved playback restores paused at its position after metadata loads', () => {
  const p = player({ track: 7, time: 42, volume: 0.4 });
  p.audio.emit('loadedmetadata');
  assert.equal(p.snapshot().songIndex, 7);
  assert.equal(p.audio.currentTime, 42);
  assert.equal(p.audio.volume, 0.4);
  assert.equal(p.audio.paused, true);
});

test('long-press scan continues an existing seek and restores its play intent', () => {
  const p = player();
  p.startTrack(3);
  p.audio.currentTime = 30;
  p.select();
  p.key('ArrowDown'); // Seek preview moves to 35 seconds.
  const wheel = p.elements.get('wheel');
  wheel.emit('pointerdown', { button: 0, pointerId: 1, target: p.elements.get('hot-next'), clientX: 200, clientY: 110 });
  [...p.timers.values()].at(-1)(); // Begin the long-press scan: another 3 seconds.
  wheel.emit('pointerup', { pointerId: 1 });
  assert.equal(p.audio.currentTime, 38);
  assert.equal(p.audio.paused, false);
});

test('restoring playback does not erase the saved position before metadata arrives', () => {
  const p = player({ track: 7, time: 42, volume: 0.4 });
  assert.equal(JSON.parse(p.localStorage.value).time, 42);
});

test('a rapid transport tap then Select neither double-skips nor suppresses Select', () => {
  const p = player();
  p.startTrack(3);
  p.pointerClick('hot-next');
  assert.equal(p.snapshot().songIndex, 4);
  p.pointerClick('button-center');
  assert.equal(p.snapshot().seeking, true);
  p.pointerClick('button-center');
  assert.equal(p.snapshot().seeking, false);
  assert.equal(p.audio.paused, false);
});

test('Repeat All continues from the final track to the first', () => {
  const p = player({ repeat: 'All' });
  p.startTrack(10);
  p.audio.emit('ended');
  assert.equal(p.snapshot().songIndex, 0);
  assert.equal(p.snapshot().finished, false);
  assert.equal(p.audio.paused, false);
});

test('Repeat One repeats natural completion but still allows manual next', () => {
  const p = player({ repeat: 'One' });
  p.startTrack(4);
  p.audio.currentTime = p.audio.duration;
  p.audio.emit('ended');
  assert.equal(p.snapshot().songIndex, 4);
  assert.equal(p.audio.currentTime, 0);
  assert.equal(p.audio.paused, false);
  p.skip(1);
  assert.equal(p.snapshot().songIndex, 5);
});

test('shuffle plays each of the eleven loaded tracks exactly once', () => {
  const p = player({ shuffle: true });
  p.startTrack(4);
  const played = [];
  for (let i = 0; i < 11; i++) {
    played.push(p.audio.src);
    p.audio.emit('ended');
  }
  const expected = [
    'silly hats only.mp3', 'Iregrettoinformyou.mp3', 'The Annexation of Puerto Rico.mp3',
    '04 Track 4.mp3', 'guys i just dont think this song is us.mp3', 'Bleeker.mp3',
    '07 Track 7.mp3', 'jam 8.mp3', '09 Track 9.mp3', '10 Track 10.mp3', '11 Track 11.mp3',
  ].map(file => `designassets/aslongasyouacknowledgethedisconnect/${file}`);
  assert.deepEqual(played.slice().sort(), expected.sort());
  assert.equal(new Set(played).size, 11);
  assert.equal(p.snapshot().finished, true);
  assert.equal(p.audio.paused, true);
});

test('a playback rejection presents recovery feedback and Play retries successfully', async () => {
  const p = player();
  const successfulPlay = p.audio.play;
  p.audio.play = () => Promise.reject(Object.assign(new Error('Playback requires a user gesture'), { name: 'NotAllowedError' }));
  p.startTrack(0);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(p.audio.paused, true);
  assert.equal(p.elements.get('playback-state').textContent, 'Press Play to listen');
  p.audio.play = successfulPlay;
  p.togglePlayback();
  assert.equal(p.audio.paused, false);
  assert.equal(p.snapshot().failure, '');
});

test('a rejected play request for an old track cannot replace current playback state', async () => {
  const p = player();
  const successfulPlay = p.audio.play;
  let rejectPrevious;
  p.audio.play = () => new Promise((_resolve, reject) => { rejectPrevious = reject; });
  p.startTrack(0);
  p.audio.play = successfulPlay;
  p.startTrack(1);
  rejectPrevious(new Error('Old source unavailable'));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(p.snapshot().songIndex, 1);
  assert.equal(p.audio.paused, false);
  assert.equal(p.snapshot().failure, '');
});
