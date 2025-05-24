// -----------------------------------------------------------
// iPod Classic – Interaction Logic
// -----------------------------------------------------------
(() => {
  // Royalty‑free sample tracks – replace with your own MP3s.
  const songs = [
    {
      title: "Track 2",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/Iregrettoinformyou.mp3",
    },
    {
      title: "Track 3",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/03 Track 3.mp3",
    },
    {
      title: "Track 4",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/04 Track 4.mp3",
    },
    {
      title: "Bleeker",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/Bleeker.mp3",
    },
    {
      title: "Track 7",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/07 Track 7.mp3",
    },
    {
      title: "Track 9",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/09 Track 9.mp3",
    },
    {
      title: "Track 10",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/10 Track 10.mp3",
    },
    {
      title: "Track 11",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/11 Track 11.mp3",
    },
    {
      title: "guys i just dont think this song is us",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/guys i just dont think this song is us.mp3",
    },
    {
      title: "jam 8",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/jam 8.mp3",
    },
    {
      title: "silly hats only",
      artist: "aslongasyouacknowledgethedisconnect",
      src: "designassets/aslongasyouacknowledgethedisconnect/silly hats only.mp3",
    },
  ];
  /* --- DOM refs --- */
  const listEl = document.getElementById("list");
  const npTitle = document.getElementById("np-title");
  const npArtist = document.getElementById("np-artist");
  const nowplaying = document.getElementById("nowplaying");
  const header = document.getElementById("screen-header");
  const audio = document.getElementById("audio");

  /* --- state --- */
  let index = 0; // highlighted row in menu
  let depth = 0; // 0 = list, 1 = now‑playing
  let dragging = false,
    lastAngle = null,
    accum = 0;

  /* --- rendering helpers --- */
  function renderList() {
    listEl.innerHTML = "";
    songs.forEach((s, i) => {
      const li = document.createElement("li");
      li.textContent = s.title;
      if (i === index) li.classList.add("active");
      listEl.appendChild(li);
    });
    header.textContent = "Music";
  }
  function showNowPlaying() {
    const s = songs[index];
    npTitle.textContent = s.title;
    npArtist.textContent = s.artist;
    listEl.style.display = "none";
    nowplaying.style.display = "block";
    header.textContent = "Now Playing";
    depth = 1;
  }
  function showMenu() {
    nowplaying.style.display = "none";
    listEl.style.display = "block";
    depth = 0;
    header.textContent = "Music";
  }
  renderList();

  /* --- wheel rotation --- */
  const wheel = document.getElementById("wheel-overlay");
  wheel.addEventListener("mousedown", (e) => {
    dragging = true;
    lastAngle = getAngle(e);
    wheel.style.cursor = "grabbing";
  });
  window.addEventListener("mouseup", () => {
    dragging = false;
    lastAngle = null;
    accum = 0;
    wheel.style.cursor = "grab";
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging || depth !== 0) return; // scroll only in menu
    const ang = getAngle(e);
    if (lastAngle !== null) {
      let delta = ang - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      accum += delta;
      if (Math.abs(accum) > 25) {
        index = accum > 0 ? (index + 1) % songs.length : (index - 1 + songs.length) % songs.length;
        accum = 0;
        renderList();
      }
    }
    lastAngle = ang;
  });
  function getAngle(e) {
    const r = wheel.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    return (Math.atan2(cy - e.clientY, e.clientX - cx) * 180) / Math.PI + 360 % 360;
  }

  /* --- playback helpers --- */
  function loadAndPlay(idx) {
    const s = songs[idx];
    audio.src = s.src;
    audio.play();
    showNowPlaying();
  }
  function nextSong() {
    index = (index + 1) % songs.length;
    loadAndPlay(index);
  }
  function prevSong() {
    index = (index - 1 + songs.length) % songs.length;
    loadAndPlay(index);
  }

  /* --- button events --- */
  // center button
  document.getElementById("button-center").addEventListener("click", () => {
    if (depth === 0) {
      loadAndPlay(index);
    } else {
      // future: play/pause via center when in Now‑Playing
    }
  });
  // menu hot‑zone
  document.getElementById("hot-menu").addEventListener("click", showMenu);
  // next / prev hot‑zones
  document.getElementById("hot-next").addEventListener("click", () => {
    if (depth === 0) {
      index = (index + 1) % songs.length;
      renderList();
    } else {
      nextSong();
    }
  });
  document.getElementById("hot-prev").addEventListener("click", () => {
    if (depth === 0) {
      index = (index - 1 + songs.length) % songs.length;
      renderList();
    } else {
      prevSong();
    }
  });
  // play/pause hot‑zone
  document.getElementById("hot-play").addEventListener("click", () => {
    if (depth === 1) {
      audio.paused ? audio.play() : audio.pause();
    }
  });
})();
