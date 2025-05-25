import SSTVDecoder from "../sstv/decoder.js";

self.onmessage = async (event) => {
  const { samples, sampleRate, fftSize } = event.data;

  const decoder = new SSTVDecoder(samples, sampleRate, fftSize, (percent) => {
    self.postMessage({ progress: percent });
  });

  try {
    const { buffer, width, height } = await decoder.decode();

    self.postMessage({
      imageData: buffer.buffer,
      width,
      height,
    });
  } catch (err) {
    self.postMessage({ error: err.message });
  }
};
