const audioInput = document.getElementById("audioInput");
const dropZone = document.getElementById("dropZone");
const audioFileNameDisplay = document.getElementById("audioFileNameDisplay");
const canvas = document.getElementById("sstvCanvas");
const ctx = canvas.getContext("2d");
const qualitySelect = document.getElementById("qualitySelect");
const decodeButton = document.getElementById("decodeButton");
const downloadImageButton = document.getElementById("downloadImageButton");
const feedbackCard = document.getElementById("feedbackCard");
const modeSelect = document.getElementById("modeSelect");

let currentSamples = null;
let currentSampleRate = null;
let lastDecodedImage = null;
let decoderWorker = new Worker("/scripts/worker/decoder.js", {
  type: "module",
});

decodeButton.disabled = true;
canvas.style.display = "none";

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
  audioFileNameDisplay.textContent = `Selected File: ${file.name}`;
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
  const fftQuality = parseInt(qualitySelect.value);
  const forcedMode = modeSelect.value === "auto" ? null : parseInt(modeSelect.value);

  decoderWorker.postMessage({
    samples: currentSamples,
    sampleRate: currentSampleRate,
    fftSize: fftQuality,
    forcedMode: forcedMode
  }); 
}); 

decoderWorker.onmessage = (event) => {
  if (event.data.progress !== undefined) {
    decodeProgress.style.display = "block";
    decodeProgress.value = event.data.progress;
    return;
  }

  const { imageData, width, height } = event.data;
  decodeProgress.style.display = "none";

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
  downloadImageButton.style.display = "block";
  feedbackCard.style.display = "block";

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
