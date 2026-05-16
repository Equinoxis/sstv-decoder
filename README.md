# SSTV Decoder

## Overview

**SSTV Decoder** is a browser-based tool that decodes Slow Scan Television (SSTV) audio signals into images. It supports popular ham radio SSTV formats such as Robot36, Scottie1, Martin1, and more.

### Key Features

- Upload an SSTV audio file (MP3, WAV, etc.)
- Automatic mode detection via VIS code
- Multiple SSTV modes: Robot36, Scottie1, Martin1, ScottieDX, etc.
- Visual decoding progress and canvas rendering
- Configurable FFT resolution (quality vs speed)
- Fully client-side - no server upload

## Live Demo

[sstv-decoder.mathieurenaud.fr](https://sstv-decoder.mathieurenaud.fr)

Sample audio: [test.mp3](https://sstv-decoder.mathieurenaud.fr/assets/test.mp3)

## Technologies

- **Vite** - dev server and production build
- **Tailwind CSS v4** - layout and design tokens (htaccess-generator style system)
- **JavaScript** - decoding logic and UI
- **Web Audio API** - audio analysis
- **FFT + barycentric interpolation** - frequency detection
- **HTML5 Canvas** - image output
- **Web Workers** - decode off the main thread

## Development

```bash
git clone https://github.com/Equinoxis/sstv-decoder.git
cd sstv-decoder
npm install
npm run dev
```

Open the URL shown in the terminal (typically `http://localhost:5173`).

## Production build

```bash
npm run build
npm run preview   # optional: local check of dist/
```

Deploy the contents of **`dist/`** to your static host (site root at `sstv-decoder.mathieurenaud.fr`).

## How to Use

1. Open the live decoder or run `npm run dev` locally.
2. Upload an SSTV audio recording (WAV, MP3, OGG, etc.).
3. Choose FFT quality if needed (higher = slower, more accurate).
4. Click **Decode SSTV** and wait for the image.
5. Use **Download image** to save the result.

## Supported Modes

- Robot36, Robot72
- Scottie1, Scottie2, ScottieDX, ScottieSDX
- Martin1, Martin2

## License

MIT - see [LICENSE](https://github.com/Equinoxis/sstv-decoder/blob/main/LICENSE).

## Author

**Mathieu Renaud** - [Website](https://mathieurenaud.fr) · [GitHub](https://github.com/Equinoxis) · [LinkedIn](https://www.linkedin.com/in/mathieu-renaud-inge)

Repository: [github.com/Equinoxis/sstv-decoder](https://github.com/Equinoxis/sstv-decoder)
