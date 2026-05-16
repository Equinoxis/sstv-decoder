import DecoderWorker from "./worker/decoder.js?worker";

const audioInput = document.getElementById("audioInput");
const dropZone = document.getElementById("dropZone");
const audioFileNameDisplay = document.getElementById("audioFileNameDisplay");
const canvas = document.getElementById("sstvCanvas");
const ctx = canvas.getContext("2d");
const qualitySelect = document.getElementById("qualitySelect");
const decodeButton = document.getElementById("decodeButton");
const downloadImageButton = document.getElementById("downloadImageButton");
const feedbackCard = document.getElementById("feedbackCard");
const errorMessage = document.getElementById("errorMessage");
const decodeProgress = document.getElementById("decodeProgress");
const imageScrollHint = document.getElementById("imageScrollHint");
const imageScrollHintBtn = document.getElementById("imageScrollHintBtn");
const imageScrollHintProgress = imageScrollHint?.querySelector(
  ".scroll-hint__progress"
);

const HINT_VISIBLE_MS = 5500;
const HINT_EXIT_MS = 300;
const IMAGE_VISIBILITY_THRESHOLD = 0.7;

let currentSamples = null;
let currentSampleRate = null;
let lastDecodedImage = null;
const decoderWorker = new DecoderWorker();

decodeButton.disabled = true;
canvas.style.display = "none";

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function getImageVisibilityRatio(element) {
  const rect = element.getBoundingClientRect();
  const elementArea = rect.width * rect.height;
  if (elementArea <= 0) return 0;

  const visibleTop = Math.max(0, rect.top);
  const visibleBottom = Math.min(window.innerHeight, rect.bottom);
  const visibleLeft = Math.max(0, rect.left);
  const visibleRight = Math.min(window.innerWidth, rect.right);
  const visibleWidth = Math.max(0, visibleRight - visibleLeft);
  const visibleHeight = Math.max(0, visibleBottom - visibleTop);

  return (visibleWidth * visibleHeight) / elementArea;
}

function getScrollHintDirection(element) {
  const rect = element.getBoundingClientRect();
  const elementCenter = rect.top + rect.height / 2;
  return elementCenter < window.innerHeight / 2 ? "up" : "down";
}

function scrollToCenterElement(element, { duration = 800 } = {}) {
  const rect = element.getBoundingClientRect();
  const elementCenter = rect.top + rect.height / 2;
  const viewportCenter = window.innerHeight / 2;

  const maxScroll =
    document.documentElement.scrollHeight - window.innerHeight;
  const targetY = Math.max(
    0,
    Math.min(maxScroll, window.scrollY + elementCenter - viewportCenter)
  );

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.scrollTo(0, targetY);
    return;
  }

  const startY = window.scrollY;
  const delta = targetY - startY;
  if (delta === 0) return;

  const start = performance.now();

  function step(now) {
    const t = Math.min(1, (now - start) / duration);
    window.scrollTo(0, startY + delta * easeInOutCubic(t));
    if (t < 1) requestAnimationFrame(step);
  }

  requestAnimationFrame(step);
}

let hintDismissTimer = null;
let hintExitTimer = null;
let hintScrollTarget = null;
let hintIntersectionObserver = null;
let hintHideGeneration = 0;

function clearImageScrollHintTimers() {
  if (hintDismissTimer !== null) {
    clearTimeout(hintDismissTimer);
    hintDismissTimer = null;
  }
  if (hintExitTimer !== null) {
    clearTimeout(hintExitTimer);
    hintExitTimer = null;
  }
}

function disconnectImageScrollHintObserver() {
  if (hintIntersectionObserver) {
    hintIntersectionObserver.disconnect();
    hintIntersectionObserver = null;
  }
}

function restartHintProgressAnimation() {
  if (!imageScrollHintProgress) return;
  imageScrollHintProgress.style.animation = "none";
  void imageScrollHintProgress.offsetWidth;
  imageScrollHintProgress.style.animation = "";
}

function hideImageScrollHint({ immediate = false } = {}) {
  if (!imageScrollHint || imageScrollHint.hidden) return;

  const generation = ++hintHideGeneration;
  clearImageScrollHintTimers();
  disconnectImageScrollHintObserver();
  hintScrollTarget = null;

  const finishHide = () => {
    if (generation !== hintHideGeneration) return;
    imageScrollHint.classList.remove(
      "scroll-hint--leaving",
      "scroll-hint--visible",
      "scroll-hint--down"
    );
    imageScrollHint.hidden = true;
    imageScrollHintBtn?.setAttribute("tabindex", "-1");
  };

  if (immediate) {
    finishHide();
    return;
  }

  imageScrollHint.classList.remove("scroll-hint--visible");
  imageScrollHint.classList.add("scroll-hint--leaving");

  const onTransitionEnd = (event) => {
    if (event.target !== imageScrollHint || event.propertyName !== "opacity")
      return;
    imageScrollHint.removeEventListener("transitionend", onTransitionEnd);
    if (hintExitTimer !== null) {
      clearTimeout(hintExitTimer);
      hintExitTimer = null;
    }
    finishHide();
  };

  imageScrollHint.addEventListener("transitionend", onTransitionEnd);
  hintExitTimer = setTimeout(() => {
    imageScrollHint.removeEventListener("transitionend", onTransitionEnd);
    hintExitTimer = null;
    finishHide();
  }, HINT_EXIT_MS + 50);
}

function showImageScrollHint(target, direction) {
  if (!imageScrollHint || !imageScrollHintBtn) return;

  hintHideGeneration += 1;
  clearImageScrollHintTimers();
  disconnectImageScrollHintObserver();

  hintScrollTarget = target;
  imageScrollHint.hidden = false;
  imageScrollHint.classList.remove("scroll-hint--leaving");
  imageScrollHint.classList.toggle(
    "scroll-hint--down",
    direction === "down"
  );
  imageScrollHintBtn.setAttribute(
    "aria-label",
    direction === "down"
      ? "Scroll down to decoded image"
      : "Scroll up to decoded image"
  );
  imageScrollHintBtn.setAttribute("tabindex", "0");

  restartHintProgressAnimation();

  requestAnimationFrame(() => {
    imageScrollHint.classList.add("scroll-hint--visible");
    imageScrollHintBtn.focus({ preventScroll: true });
  });

  hintIntersectionObserver = new IntersectionObserver(
    (entries) => {
      if (
        entries.some(
          (entry) =>
            entry.intersectionRatio >= IMAGE_VISIBILITY_THRESHOLD
        )
      ) {
        hideImageScrollHint();
      }
    },
    { threshold: IMAGE_VISIBILITY_THRESHOLD }
  );
  hintIntersectionObserver.observe(target);

  hintDismissTimer = setTimeout(hideImageScrollHint, HINT_VISIBLE_MS);
}

function handlePostDecodeScroll(canvasEl) {
  if (getImageVisibilityRatio(canvasEl) >= IMAGE_VISIBILITY_THRESHOLD) return;
  showImageScrollHint(canvasEl, getScrollHintDirection(canvasEl));
}

imageScrollHintBtn?.addEventListener("click", () => {
  const target = hintScrollTarget;
  hideImageScrollHint({ immediate: true });
  if (target) scrollToCenterElement(target);
});

audioInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  if (file) handleAudioFile(file);
});

dropZone.addEventListener("click", () => audioInput.click());

dropZone.addEventListener("dragover", (event) => {
  event.preventDefault();
  dropZone.classList.add("active");
});

dropZone.addEventListener("dragleave", () =>
  dropZone.classList.remove("active")
);

dropZone.addEventListener("drop", (event) => {
  event.preventDefault();
  dropZone.classList.remove("active");
  const file = event.dataTransfer.files[0];
  if (file) handleAudioFile(file);
});

function handleAudioFile(file) {
  dropZone.classList.add("has-file");
  audioFileNameDisplay.innerHTML = `Selected file: <span class="font-medium text-app-accent">${file.name}</span>`;
  const reader = new FileReader();

  reader.onload = async () => {
    const arrayBuffer = reader.result;
    const audioCtx = new AudioContext();

    try {
      const decoded = await audioCtx.decodeAudioData(arrayBuffer);
      currentSamples = decoded.getChannelData(0).slice();
      currentSampleRate = decoded.sampleRate;

      decodeButton.disabled = false;
    } catch (err) {
      console.error("Error decoding audio file:", err);
      alert("Failed to decode the audio file.");
    }
  };

  reader.readAsArrayBuffer(file);
}

decodeButton.addEventListener("click", () => {
  if (!currentSamples || !currentSampleRate) return;

  decodeButton.disabled = true;

  const fftQuality = parseInt(qualitySelect.value, 10);

  decoderWorker.postMessage({
    samples: currentSamples,
    sampleRate: currentSampleRate,
    fftSize: fftQuality,
  });
});

decoderWorker.onmessage = (event) => {
  if (event.data.progress !== undefined) {
    decodeProgress.style.display = "block";
    errorMessage.style.display = "none";
    decodeProgress.value = event.data.progress;
    return;
  }

  const { imageData, width, height, error } = event.data;
  decodeProgress.style.display = "none";

  if (error) {
    hideImageScrollHint({ immediate: true });

    errorMessage.textContent = `Error: ${error.message}`;
    errorMessage.style.display = "block";

    canvas.style.display = "none";
    downloadImageButton.style.display = "none";
    feedbackCard.style.display = "none";
    decodeButton.disabled = false;
    return;
  }

  canvas.width = width;
  canvas.height = height;

  const imgData = new ImageData(
    new Uint8ClampedArray(imageData),
    width,
    height
  );
  lastDecodedImage = imgData;
  ctx.putImageData(imgData, 0, 0);
  canvas.style.display = "block";
  downloadImageButton.style.display = "inline-flex";
  feedbackCard.style.display = "block";

  requestAnimationFrame(() => {
    requestAnimationFrame(() => handlePostDecodeScroll(canvas));
  });

  decodeButton.disabled = false;
};

decoderWorker.onerror = (e) => {
  console.error("Worker error:", e.message, e);
};

downloadImageButton.addEventListener("click", () => {
  if (!lastDecodedImage) return;
  const offscreen = new OffscreenCanvas(
    lastDecodedImage.width,
    lastDecodedImage.height
  );
  const offCtx = offscreen.getContext("2d");
  offCtx.putImageData(lastDecodedImage, 0, 0);
  offscreen.convertToBlob().then((blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "decoded-image.png";
    a.click();
    URL.revokeObjectURL(url);
  });
});
