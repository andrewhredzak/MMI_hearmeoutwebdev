document.addEventListener('DOMContentLoaded', function () {
  const canvas = document.getElementById("canvas");
  const ctx = canvas.getContext("2d");
  const wheel = document.getElementById("wheel");
  const tableRows = document.querySelectorAll("#song-table tr");
  const centerButton = document.getElementById("center-button");
  let currentIndex = 0;
  let audio = null;
  let isPlaying = false;

  function highlight(index) {
    tableRows.forEach((row, i) => {
      row.classList.toggle("selected", i === index);
    });
  }

  highlight(currentIndex);

  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  let drawing = false;

  canvas.addEventListener("mousedown", (e) => {
    drawing = true;
    ctx.beginPath();
    ctx.moveTo(e.clientX, e.clientY);
  });

  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    ctx.lineTo(e.clientX, e.clientY);
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.stroke();
  });

  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.closePath();
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
      // Only play/pause if the highlighted song is the first one ("sleep")
      if (currentIndex === 0) {
        if (!audio) {
          audio = new Audio("designassets/aslongasyouacknowledgethedisconnect/10 Track 10.mp3");
        }
        if (isPlaying) {
          audio.pause();
          centerButton.textContent = "Play";
        } else {
          audio.play();
          centerButton.textContent = "Pause";
        }
        isPlaying = !isPlaying;
        // Reset button if song ends
        audio.onended = function() {
          isPlaying = false;
          centerButton.textContent = "Play";
        };
      }
    });
  }
});
