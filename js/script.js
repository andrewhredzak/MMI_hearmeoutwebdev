document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const wheel = document.getElementById("wheel");
  const tableRows = document.querySelectorAll("#song-table tr");
  const centerButton = document.getElementById("center-button");
  let currentIndex = 0;
  let audio = null;
  let isPlaying = false;

  // Song file paths in the same order as the table rows
  const songFiles = [
    "designassets/aslongasyouacknowledgethedisconnect/10 Track 10.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/02 Track 2.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/03 Track 3.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/04 Track 4.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/06 Track 6.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/07 Track 7.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/09 Track 9.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/11 Track 11.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/guys i just dont think this song is us.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/jam 8.mp3",
    "designassets/aslongasyouacknowledgethedisconnect/silly hats only.mp3"
  ];

  function highlight(index) {
    tableRows.forEach((row, i) => {
      row.classList.toggle("selected", i === index);
    });
  }

  highlight(currentIndex);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Only allow drawing inside the wheel
  function isInsideWheel(x, y) {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const r = rect.width / 2;
    const dx = x - cx;
    const dy = y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  let drawing = false;

  canvas.addEventListener("mousedown", (e) => {
    if (!isInsideWheel(e.clientX, e.clientY)) return;
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    if (!isInsideWheel(e.clientX, e.clientY)) return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  canvas.addEventListener("mouseup", () => {
    if (drawing) ctx.closePath();
    drawing = false;
  });

  window.addEventListener("resize", () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });

  // Wheel scroll functionality
  let lastAngle = null;
  let scrollDelta = 0;

  function getAngle(x, y, cx, cy) {
    return Math.atan2(y - cy, x - cx);
  }

  wheel.addEventListener("mousedown", (e) => {
    const rect = wheel.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    function onMove(eMove) {
      const angle = getAngle(eMove.clientX, eMove.clientY, cx, cy);
      if (lastAngle !== null) {
        let delta = angle - lastAngle;
        if (delta > Math.PI) delta -= 2 * Math.PI;
        if (delta < -Math.PI) delta += 2 * Math.PI;
        scrollDelta += delta * 10;
        if (Math.abs(scrollDelta) >= 1) {
          const direction = scrollDelta > 0 ? -1 : 1;
          currentIndex = (currentIndex + direction + tableRows.length) % tableRows.length;
          highlight(currentIndex);
          scrollDelta = 0;
        }
      }
      lastAngle = angle;
    }
    function onUp() {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      lastAngle = null;
      scrollDelta = 0;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  });

  if (centerButton) {
    centerButton.addEventListener("click", function () {
      // Play/pause the currently highlighted song
      if (songFiles[currentIndex]) {
        if (!audio || audio.src !== window.location.origin + "/" + songFiles[currentIndex].replace(/\\/g, '/')) {
          if (audio) {
            audio.pause();
            audio.currentTime = 0;
          }
          audio = new Audio(songFiles[currentIndex]);
          audio.play();
          isPlaying = true;
          centerButton.textContent = "Pause";
          audio.onended = function() {
            isPlaying = false;
            centerButton.textContent = "Play";
          };
        } else if (isPlaying) {
          audio.pause();
          isPlaying = false;
          centerButton.textContent = "Play";
        } else {
          audio.play();
          isPlaying = true;
          centerButton.textContent = "Pause";
        }
      }
    });
  }
});
