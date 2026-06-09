# 3D Christmas Tree Music Visualizer

An animated Christmas tree built with HTML5 Canvas and JavaScript. The tree glows, rotates, sparkles, plays music, and reacts to the audio with colorful garland, pulsing ornaments, falling snow, and a glowing star topper.

Live site: https://randall5429-gif.github.io/Christmas-Tree/

## Features

- 3D-style rotating Christmas tree rendered on a canvas
- Music playback with audio-reactive lights, ornaments, and garland
- Falling snow background and soft winter glow
- Responsive layout for desktop and mobile screens
- High-DPI canvas rendering for sharper visuals
- Firefox-safe fallback when audio analysis is blocked

## Project Files

```text
Christmas-Tree-main/
├── index.html        # Page structure, styles, audio element, and canvas
├── tree.js           # Tree animation, music visualizer, and interactions
├── music/
│   └── music.mp3     # Audio used by the visualizer
└── music.mp3         # Extra copy of the audio file
```

## How To Use

1. Open the page.
2. Click `Play Music`.
3. Watch the tree react to the music.
4. Click `Pause Music` to stop playback.

If the button says `Music Blocked`, your browser blocked local audio playback. Try refreshing, checking site permissions, or opening the project from a local server.

## Browser Notes

Modern browsers require a user click before playing audio, so music starts from the `Play Music` button. Firefox may block some Web Audio features on local files, but the project falls back so the music can still play without reactive effects.
