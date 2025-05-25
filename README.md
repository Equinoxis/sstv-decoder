# SSTV Decoder

## Overview

**SSTV Decoder** is a browser-based tool that allows users to decode Slow Scan Television (SSTV) audio signals into images directly in the browser. It supports popular ham radio SSTV formats such as Robot36, Scottie1, Martin1, and more.

### Key Features

- Upload an SSTV audio file (MP3, WAV, etc.)
- Detect and decode SSTV signals (automatic mode detection via VIS code)
- Supports multiple SSTV modes: Robot36, Scottie1, Martin1, ScottieDX, etc.
- Visual decoding progress and image rendering on canvas
- FFT resolution customization for quality/speed trade-offs
- Fully client-side, no server required

## Live Demo

Try it here: [sstv-decoder.mathieurenaud.fr](https://sstv-decoder.mathieurenaud.fr)

Or try a sample audio file:
🎧 [Download test.mp3](https://sstv-decoder.mathieurenaud.fr/assets/test.mp3)

## Technologies Used

- **JavaScript (Vanilla)** for decoding logic and UI
- **Web Audio API** for audio signal analysis
- **FFT + Barycentric Interpolation** for precise frequency detection
- **HTML5 Canvas** for real-time image generation
- **Modular SSTV mode specs** via VIS code interpretation

## How to Use

1. Open the [live SSTV decoder](https://sstv-decoder.mathieurenaud.fr) in your browser.
2. Upload an SSTV audio recording (WAV, MP3, etc.).
3. Select FFT quality if needed (higher = slower but more accurate).
4. Click **Decode SSTV** and wait for the image to appear.
5. Use the **Download Image** button to save the output.

## Supported Modes

- Robot36
- Robot72
- Scottie1
- Scottie2
- ScottieDX
- ScottieSDX
- Martin1
- Martin2

## Installation

No installation is needed. Just open the `index.html` file locally or use the hosted version online.

To run locally:

```bash
git clone https://github.com/Equinoxis/sstv-decoder.git
cd sstv-decoder
open index.html
```

## License

This project is licensed under the MIT License. See the [LICENSE](https://github.com/Equinoxis/sstv-decoder/blob/main/LICENSE) file for details.

## Author

**Mathieu Renaud**
[Website](https://resume.mathieurenaud.fr) · [GitHub](https://github.com/Equinoxis) · [LinkedIn](https://www.linkedin.com/in/mathieu-renaud-inge)

---

🔗 Project repository: [https://github.com/Equinoxis/sstv-decoder](https://github.com/Equinoxis/sstv-decoder)
