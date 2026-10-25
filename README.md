# Pamina Journey Playlist

An illustrated train journey with live music visualization. Art by Judy.

**Live website:** https://bulujamjudy.github.io/Pamina-Journey-Playlist/

The website includes layered artwork, mouse parallax, looping scenery, a rotating vinyl cover, mirrored audio bars, cursor sparks, and adjustable color overlays. It starts with a demo visualization and the default “In my Journey” artwork.

## Run locally

Requires Node.js 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:5173/. Build the static website with `npm run build`; preview it with `npm run preview`.

## Visualize audio

Open the live website in desktop Chrome or Edge and click **Capture computer audio**. Choose the tab playing music and enable audio sharing in the browser picker. System audio availability depends on your browser and operating system. Capture is analyzed locally and is not recorded or uploaded.

## YouTube Music track information

The optional browser extension supplies track titles, artist names, artwork, progress, and direct tab audio capture.

```sh
npm ci
npm run build:extension
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked**, then choose this repository’s `extension/dist` folder.
3. Open https://music.youtube.com/ and start a song.
4. Open the live website; song information updates automatically.
5. For extension audio capture, click the extension’s toolbar icon while the YouTube Music tab is active. In the website settings, select **Real audio**.

The extension supports the deployed GitHub Pages domain and localhost on port 5173. Rebuild and reload it after extension updates. YouTube Music layout changes may require updates to the track extraction code. Lyrics are not included.

## Settings

Open the gear menu to adjust the waveform, text colors, artwork and progress visibility. Enable the color overlays to choose a custom color or use the album accent color. The opacity slider controls both the multiply layer behind the foreground art and the overlay layer above it. Settings are saved in your browser.

## Deployment

GitHub Actions builds the site with `npm ci` and `npm run build`, then publishes `dist/` to GitHub Pages on every push to `main`. The repository’s Pages source must be **GitHub Actions**. Relative asset paths support the repository subpath.

## Artwork

The original artwork and cover are by Judy. Publishing this source does not grant a license to reuse the artwork.
