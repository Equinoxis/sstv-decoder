import DecoderWorker from "./worker/decoder.js?worker";
import { openDecodeGallery } from "./decode-gallery.js";

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
const decodeProgressSlot = document.getElementById("decodeProgressSlot");
const decodeProgress = document.getElementById("decodeProgress");
const decodeProgressFill = decodeProgress?.querySelector(".decode-progress__fill");
const sstvCanvasWrap = document.getElementById("sstvCanvasWrap");
const sstvCanvasOpen = document.getElementById("sstvCanvasOpen");
const decodeGallery = document.getElementById("decodeGallery");
const decodeGalleryList = document.getElementById("decodeGalleryList");
const decodeProgressPercent = decodeProgress?.querySelector(
  ".decode-progress__percent"
);
const imageScrollHint = document.getElementById("imageScrollHint");
const imageScrollHintBtn = document.getElementById("imageScrollHintBtn");
const imageScrollHintProgress = imageScrollHint?.querySelector(
  ".scroll-hint__progress"
);

const HINT_VISIBLE_MS = 5500;
const HINT_EXIT_MS = 300;
const DECODE_PROGRESS_EXIT_MS = 550;
const IMAGE_VISIBILITY_THRESHOLD = 0.7;

const prefersReducedMotion = window.matchMedia(
  "(prefers-reduced-motion: reduce)"
);

let displayedDecodeProgress = 0;
let targetDecodeProgress = 0;
let decodeProgressRafId = null;
let decodeProgressHideTimer = null;
let decodeProgressHideGeneration = 0;

let currentSamples = null;
let currentSampleRate = null;
let currentSourceFileName = null;
let lastDecodedImage = null;

/** @type {{ imageData: ImageData, width: number, height: number, sourceFileName: string | null, objectUrl: string }[]} */
const decodedImages = [];

function getDecodedImageDownloadName(sourceFileName) {
  const name = sourceFileName.split(/[/\\]/).pop() || "audio";
  const baseName = name.replace(/\.[^/.]+$/, "") || name;
  return `${baseName} - SSTV decoded.png`;
}
const decoderWorker = new DecoderWorker();

decodeButton.disabled = true;

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function clampDecodeProgress(percent) {
  return Math.max(0, Math.min(100, percent));
}

function applyDecodeProgressDisplay(percent) {
  if (!decodeProgress || !decodeProgressFill) return;

  const clamped = clampDecodeProgress(percent);
  decodeProgressFill.style.setProperty(
    "--decode-progress",
    String(clamped / 100)
  );
  decodeProgress.setAttribute("aria-valuenow", String(Math.round(clamped)));
  if (decodeProgressPercent) {
    decodeProgressPercent.textContent = `${Math.round(clamped)}%`;
  }
}

function stopDecodeProgressAnimation() {
  if (decodeProgressRafId !== null) {
    cancelAnimationFrame(decodeProgressRafId);
    decodeProgressRafId = null;
  }
}

function tickDecodeProgress() {
  const delta = targetDecodeProgress - displayedDecodeProgress;

  if (Math.abs(delta) < 0.5) {
    displayedDecodeProgress = targetDecodeProgress;
    applyDecodeProgressDisplay(displayedDecodeProgress);
    decodeProgressRafId = null;
    return;
  }

  displayedDecodeProgress += delta * 0.12;
  applyDecodeProgressDisplay(displayedDecodeProgress);
  decodeProgressRafId = requestAnimationFrame(tickDecodeProgress);
}

function setDecodeProgressTarget(percent) {
  targetDecodeProgress = clampDecodeProgress(percent);

  if (prefersReducedMotion.matches) {
    stopDecodeProgressAnimation();
    displayedDecodeProgress = targetDecodeProgress;
    applyDecodeProgressDisplay(displayedDecodeProgress);
    return;
  }

  if (decodeProgressRafId === null) {
    decodeProgressRafId = requestAnimationFrame(tickDecodeProgress);
  }
}

function resetDecodeProgress() {
  stopDecodeProgressAnimation();
  displayedDecodeProgress = 0;
  targetDecodeProgress = 0;
  applyDecodeProgressDisplay(0);
}

function clearDecodeProgressHideTimer() {
  if (decodeProgressHideTimer !== null) {
    clearTimeout(decodeProgressHideTimer);
    decodeProgressHideTimer = null;
  }
}

function showDecodeProgress({ reset = false } = {}) {
  if (!decodeProgress || !decodeProgressSlot) return;

  clearDecodeProgressHideTimer();
  decodeProgressHideGeneration += 1;

  if (reset) resetDecodeProgress();

  decodeProgress.classList.remove("decode-progress--leaving");
  decodeProgressSlot.classList.add("decode-progress-slot--open");
  decodeProgressSlot.setAttribute("aria-hidden", "false");
  requestAnimationFrame(() => {
    decodeProgress.classList.add("decode-progress--visible");
  });
}

function hideDecodeProgress({ onComplete } = {}) {
  if (!decodeProgress || !decodeProgressSlot) return;
  if (!decodeProgressSlot.classList.contains("decode-progress-slot--open")) {
    onComplete?.();
    return;
  }

  const generation = ++decodeProgressHideGeneration;
  stopDecodeProgressAnimation();
  clearDecodeProgressHideTimer();
  decodeProgress.classList.remove("decode-progress--visible");
  decodeProgress.classList.add("decode-progress--leaving");
  decodeProgressSlot.classList.remove("decode-progress-slot--open");
  decodeProgressSlot.setAttribute("aria-hidden", "true");

  const finishHide = () => {
    if (generation !== decodeProgressHideGeneration) return;
    decodeProgress.classList.remove("decode-progress--leaving");
    resetDecodeProgress();
    onComplete?.();
  };

  const onTransitionEnd = (event) => {
    if (event.target !== decodeProgressSlot) return;
    if (event.propertyName !== "grid-template-rows") return;
    decodeProgressSlot.removeEventListener("transitionend", onTransitionEnd);
    if (decodeProgressHideTimer !== null) {
      clearTimeout(decodeProgressHideTimer);
      decodeProgressHideTimer = null;
    }
    finishHide();
  };

  decodeProgressSlot.addEventListener("transitionend", onTransitionEnd);
  decodeProgressHideTimer = setTimeout(() => {
    decodeProgressSlot.removeEventListener("transitionend", onTransitionEnd);
    decodeProgressHideTimer = null;
    finishHide();
  }, DECODE_PROGRESS_EXIT_MS + 50);
}

function hideDecodedCanvas() {
  if (!sstvCanvasWrap || decodedImages.length > 0) return;
  sstvCanvasWrap.classList.remove(
    "sstv-canvas-wrap--open",
    "sstv-canvas-wrap--entering"
  );
}

function imageDataToObjectUrl(imageData) {
  const offscreen = new OffscreenCanvas(imageData.width, imageData.height);
  const offCtx = offscreen.getContext("2d");
  offCtx.putImageData(imageData, 0, 0);
  return offscreen.convertToBlob({ type: "image/png" }).then((blob) => {
    if (!blob) throw new Error("Failed to create image blob");
    return URL.createObjectURL(blob);
  });
}

function revokeDecodedImageUrls() {
  for (const item of decodedImages) {
    URL.revokeObjectURL(item.objectUrl);
  }
}

function renderDecodeGallery() {
  if (!decodeGallery || !decodeGalleryList) return;

  const archived = decodedImages.slice(0, -1);
  decodeGallery.hidden = archived.length === 0;
  decodeGalleryList.replaceChildren();

  for (let i = archived.length - 1; i >= 0; i--) {
    const entry = archived[i];
    const decodeIndex = i;
    const decodeNumber = i + 1;

    const li = document.createElement("li");
    li.className = "decode-gallery__item";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "decode-gallery__btn";
    const label = entry.sourceFileName
      ? `Open ${entry.sourceFileName} in gallery`
      : `Open decode ${decodeNumber} in gallery`;
    btn.setAttribute("aria-label", label);
    if (entry.sourceFileName) btn.title = entry.sourceFileName;

    const thumb = document.createElement("canvas");
    thumb.width = entry.width;
    thumb.height = entry.height;
    thumb.className = "decode-gallery__thumb";
    thumb.getContext("2d").putImageData(entry.imageData, 0, 0);

    const srOnly = document.createElement("span");
    srOnly.className = "decode-gallery__sr-only";
    srOnly.textContent = label;

    btn.append(thumb, srOnly);
    btn.addEventListener("click", () => {
      openDecodeGallery(decodedImages, decodeIndex);
    });

    li.append(btn);
    decodeGalleryList.append(li);
  }

  decodeGalleryList.scrollLeft = 0;
}

window.addEventListener("beforeunload", revokeDecodedImageUrls);

sstvCanvasOpen?.addEventListener("click", () => {
  if (!decodedImages.length) return;
  openDecodeGallery(decodedImages, decodedImages.length - 1);
});

function revealDecodedCanvas() {
  if (!sstvCanvasWrap) return;
  if (sstvCanvasWrap.classList.contains("sstv-canvas-wrap--open")) return;

  sstvCanvasWrap.classList.add("sstv-canvas-wrap--entering", "sstv-canvas-wrap--open");
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      sstvCanvasWrap.classList.remove("sstv-canvas-wrap--entering");
    });
  });
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
  currentSourceFileName = file.name;
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
  errorMessage.style.display = "none";
  showDecodeProgress({ reset: true });

  const fftQuality = parseInt(qualitySelect.value, 10);

  decoderWorker.postMessage({
    samples: currentSamples,
    sampleRate: currentSampleRate,
    fftSize: fftQuality,
  });
});

decoderWorker.onmessage = (event) => {
  if (event.data.progress !== undefined) {
    showDecodeProgress();
    setDecodeProgressTarget(event.data.progress);
    return;
  }

  const { imageData, width, height, error } = event.data;

  if (error) {
    hideDecodeProgress({
      onComplete: () => {
        hideImageScrollHint({ immediate: true });

        errorMessage.textContent = `Error: ${error.message}`;
        errorMessage.style.display = "block";

        hideDecodedCanvas();
        if (decodedImages.length === 0) {
          downloadImageButton.style.display = "none";
          feedbackCard.style.display = "none";
        }
        decodeButton.disabled = false;
      },
    });
    return;
  }

  const imgData = new ImageData(
    new Uint8ClampedArray(imageData),
    width,
    height
  );

  hideDecodeProgress({
    onComplete: async () => {
      try {
        const objectUrl = await imageDataToObjectUrl(imgData);
        decodedImages.push({
          imageData: imgData,
          width,
          height,
          sourceFileName: currentSourceFileName,
          objectUrl,
        });
        lastDecodedImage = imgData;

        const isFirstReveal = !sstvCanvasWrap?.classList.contains(
          "sstv-canvas-wrap--open"
        );

        canvas.width = width;
        canvas.height = height;
        ctx.putImageData(imgData, 0, 0);

        if (isFirstReveal) {
          revealDecodedCanvas();
        }
        renderDecodeGallery();
        downloadImageButton.style.display = "inline-flex";
        feedbackCard.style.display = "block";

        requestAnimationFrame(() => {
          requestAnimationFrame(() => handlePostDecodeScroll(canvas));
        });
      } catch (err) {
        console.error("Failed to prepare decoded image:", err);
        errorMessage.textContent = "Error: Failed to display decoded image.";
        errorMessage.style.display = "block";
      }

      decodeButton.disabled = false;
    },
  });
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
    a.download = currentSourceFileName
      ? getDecodedImageDownloadName(currentSourceFileName)
      : "SSTV decoded.png";
    a.click();
    URL.revokeObjectURL(url);
  });
});
