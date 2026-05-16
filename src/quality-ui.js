const QUALITY_HINTS = {
  64: "Fastest decode. Use only for quick tests — detail will be poor.",
  128: "Very fast, low accuracy. Noisy or weak signals may fail.",
  256: "Good when you need speed more than fine detail.",
  512: "Balanced — good speed and accuracy for most recordings.",
  1024: "Slower decode with sharper lines and cleaner colors.",
  2048: "Slowest option. Best for difficult or noisy signals.",
};

const qualitySelect = document.getElementById("qualitySelect");
const qualityHint = document.getElementById("qualityHint");

function syncHint() {
  const value = Number(qualitySelect.value);
  qualityHint.textContent =
    QUALITY_HINTS[value] ?? `FFT ${value} — custom size.`;
}

qualitySelect.addEventListener("change", syncHint);
syncHint();
