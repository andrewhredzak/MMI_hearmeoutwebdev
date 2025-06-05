// -----------------------------------------------------------
// iPod Classic – Interaction Logic
// -----------------------------------------------------------
(() => {
  // Restructured music library
  const library = [
    {
      artistName: "Hear Me Out",
      albums: [
        {
          albumTitle: "As Long As You Acknowledge the Dissconnect.",
          songs: [
            {
              title: "silly hats only",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/silly hats only.mp3",
            },
            {
              title: "I Regret to Inform You",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/Iregrettoinformyou.mp3",
            },
            {
              title: "The Annexation of Puerto Rico",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/The Annexation of Puerto Rico.mp3",
            },
            {
              title: "Track 4",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/04 Track 4.mp3",
            },
            {
              title: "Bleeker",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/Bleeker.mp3",
            },
            {
              title: "Track 7",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/07 Track 7.mp3",
            },
            {
              title: "Track 9",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/09 Track 9.mp3",
            },
            {
              title: "Track 10",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/10 Track 10.mp3",
            },
            {
              title: "Track 11",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/11 Track 11.mp3",
            },
            {
              title: "guys i just dont think this song is us",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/guys i just dont think this song is us.mp3",
            },
            {
              title: "jam 8",
              artist: "Hear Me Out", // Corrected artist
              src: "designassets/aslongasyouacknowledgethedisconnect/jam 8.mp3",
            },
          ],
        },
      ],
    },
  ];

  /* --- DOM refs --- */
  const listEl = document.getElementById("list");
  const npTitle = document.getElementById("np-title");
  const npArtist = document.getElementById("np-artist");
  const npAlbumArt = document.getElementById("np-album-art");
  const nowplaying = document.getElementById("nowplaying");
  const header = document.getElementById("screen-header");
  const audio = document.getElementById("audio");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const currentTimeEl = document.getElementById("current-time");
  const remainingTimeEl = document.getElementById("remaining-time");

  /* --- state --- */
  let currentView = "artists"; // artists, albums, songs, nowplaying
  let selectedArtistIndex = 0;
  let selectedAlbumIndex = 0;
  let selectedSongIndex = 0;
  let listScrollIndex = 0; // General purpose index for current list selection

  let dragging = false,
    lastAngle = null,
    accum = 0;

  /* --- rendering helpers --- */
  function renderList() {
    listEl.innerHTML = "";
    let currentListItems = [];
    let currentHeader = "Music";

    nowplaying.style.display = "none";
    listEl.style.display = "block";

    if (currentView === "artists") {
      currentHeader = "Artists";
      currentListItems = library.map((artist) => artist.artistName);
    } else if (currentView === "albums") {
      currentHeader = library[selectedArtistIndex].artistName;
      currentListItems = library[selectedArtistIndex].albums.map((album) => album.albumTitle);
    } else if (currentView === "songs") {
      currentHeader = library[selectedArtistIndex].albums[selectedAlbumIndex].albumTitle;
      currentListItems = library[selectedArtistIndex].albums[selectedAlbumIndex].songs.map((song) => song.title);
    }

    currentListItems.forEach((itemText, i) => {
      const li = document.createElement("li");
      li.textContent = itemText;
      if (i === listScrollIndex) li.classList.add("active");
      listEl.appendChild(li);
    });

    header.textContent = currentHeader;

    // Scroll the list to keep the active item in view
    const activeLi = listEl.querySelector("li.active");
    if (activeLi) {
      const listHeight = listEl.clientHeight;
      const itemHeight = activeLi.offsetHeight; // Assuming all items have same height
      const itemTop = activeLi.offsetTop;
      const currentScroll = listEl.scrollTop;

      if (itemTop < currentScroll) {
        listEl.scrollTop = itemTop;
      } else if (itemTop + itemHeight > currentScroll + listHeight) {
        listEl.scrollTop = itemTop + itemHeight - listHeight;
      }
    }
  }

  function showNowPlaying() {
    const song = library[selectedArtistIndex].albums[selectedAlbumIndex].songs[selectedSongIndex];
    npTitle.textContent = song.title;
    npArtist.textContent = song.artist;
    npAlbumArt.src = "designassets/images/heremeout_pilot_redyellow.png";
    listEl.style.display = "none";
    nowplaying.style.display = "flex";
    header.textContent = "Now Playing";
    currentView = "nowplaying";
  }

  function loadAndPlaySong() {
    const song = library[selectedArtistIndex].albums[selectedAlbumIndex].songs[selectedSongIndex];
    audio.src = song.src;
    audio.play();
    showNowPlaying();
  }
  
  renderList(); // Initial render

  /* --- Time formatting helper --- */
  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  }

  /* --- Audio event listeners --- */
  audio.addEventListener("loadedmetadata", () => {
    if (audio.duration) {
      remainingTimeEl.textContent = "-" + formatTime(audio.duration);
    }
  });

  audio.addEventListener("timeupdate", () => {
    if (audio.duration) {
      const progress = (audio.currentTime / audio.duration) * 100;
      progressBarFill.style.width = `${progress}%`;
      currentTimeEl.textContent = formatTime(audio.currentTime);
      remainingTimeEl.textContent = "-" + formatTime(audio.duration - audio.currentTime);
    }
  });

  /* --- wheel rotation --- */
  const wheelElement = document.getElementById("wheel");
  wheelElement.addEventListener("mousedown", (e) => {
    if (e.target !== document.getElementById("button-center") && currentView !== "nowplaying") {
      dragging = true;
      lastAngle = getAngle(e);
      wheelElement.style.cursor = "grabbing";
    }
  });
  window.addEventListener("mouseup", () => {
    if (dragging) {
      dragging = false;
      lastAngle = null;
      accum = 0;
      wheelElement.style.cursor = "grab";
    }
  });
  window.addEventListener("mousemove", (e) => {
    if (!dragging || currentView === "nowplaying") return;
    const ang = getAngle(e);
    if (lastAngle !== null) {
      let delta = ang - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      accum += delta;

      let currentListLength = 0;
      if (currentView === "artists") {
        currentListLength = library.length;
      } else if (currentView === "albums") {
        currentListLength = library[selectedArtistIndex].albums.length;
      } else if (currentView === "songs") {
        currentListLength = library[selectedArtistIndex].albums[selectedAlbumIndex].songs.length;
      }

      if (Math.abs(accum) > 25) { // Sensitivity for scroll
        if (currentListLength > 0) {
            // Reversed scroll direction: clockwise (accum > 0) now scrolls up (decrements index)
            listScrollIndex = accum > 0 ? (listScrollIndex - 1 + currentListLength) % currentListLength : (listScrollIndex + 1) % currentListLength;
        }
        accum = 0;
        renderList();
      }
    }
    lastAngle = ang;
  });
  function getAngle(e) {
    const r = wheelElement.getBoundingClientRect();
    const cx = r.left + r.width / 2,
      cy = r.top + r.height / 2;
    // Ensure angle is normalized between 0 and 360 degrees.
    return ((Math.atan2(cy - e.clientY, e.clientX - cx) * 180) / Math.PI + 360) % 360;
  }

  /* --- playback helpers --- */
  function nextSong() {
    const songsList = library[selectedArtistIndex].albums[selectedAlbumIndex].songs;
    selectedSongIndex = (selectedSongIndex + 1) % songsList.length;
    loadAndPlaySong();
  }
  function prevSong() {
    const songsList = library[selectedArtistIndex].albums[selectedAlbumIndex].songs;
    selectedSongIndex = (selectedSongIndex - 1 + songsList.length) % songsList.length;
    loadAndPlaySong();
  }

  /* --- button events --- */
  document.getElementById("button-center").addEventListener("click", () => {
    if (currentView === "artists") {
      selectedArtistIndex = listScrollIndex;
      currentView = "albums";
      listScrollIndex = 0; // Reset index for the new list
    } else if (currentView === "albums") {
      selectedAlbumIndex = listScrollIndex;
      currentView = "songs";
      listScrollIndex = 0; // Reset index for the new list
    } else if (currentView === "songs") {
      selectedSongIndex = listScrollIndex;
      loadAndPlaySong();
    } else if (currentView === "nowplaying") {
      // In Now Playing, center button can be play/pause
      audio.paused ? audio.play() : audio.pause();
    }
    if (currentView !== "nowplaying") { // Avoid re-rendering if already in nowplaying from song selection
        renderList();
    }
  });

  document.getElementById("hot-menu").addEventListener("click", () => {
    if (currentView === "nowplaying") {
      currentView = "songs"; // Go back to song list from now playing
      listScrollIndex = selectedSongIndex; // Highlight the current song
    } else if (currentView === "songs") {
      currentView = "albums";
      listScrollIndex = selectedAlbumIndex; // Highlight the current album
    } else if (currentView === "albums") {
      currentView = "artists";
      listScrollIndex = selectedArtistIndex; // Highlight the current artist
    }
    // If already at artists view, menu button does nothing more for now
    renderList();
  });

  document.getElementById("hot-next").addEventListener("click", () => {
    if (currentView === "nowplaying") {
      nextSong();
    } else {
      let currentListLength = 0;
      if (currentView === "artists") {
        currentListLength = library.length;
      } else if (currentView === "albums") {
        currentListLength = library[selectedArtistIndex].albums.length;
      } else if (currentView === "songs") {
        currentListLength = library[selectedArtistIndex].albums[selectedAlbumIndex].songs.length;
      }
      if (currentListLength > 0) {
        listScrollIndex = (listScrollIndex + 1) % currentListLength;
      }
      renderList();
    }
  });

  document.getElementById("hot-prev").addEventListener("click", () => {
    if (currentView === "nowplaying") {
      prevSong();
    } else {
      let currentListLength = 0;
      if (currentView === "artists") {
        currentListLength = library.length;
      } else if (currentView === "albums") {
        currentListLength = library[selectedArtistIndex].albums.length;
      } else if (currentView === "songs") {
        currentListLength = library[selectedArtistIndex].albums[selectedAlbumIndex].songs.length;
      }
       if (currentListLength > 0) {
        listScrollIndex = (listScrollIndex - 1 + currentListLength) % currentListLength;
       }
      renderList();
    }
  });

  document.getElementById("hot-play").addEventListener("click", () => {
    if (currentView === "nowplaying") {
      audio.paused ? audio.play() : audio.pause();
    }
    // Play/pause button might not have a function in list views, or could select
  });
})();
