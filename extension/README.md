# Still browser extension

Build from the project root with `npm run build:extension`; then load `extension/dist` as an unpacked extension in Chrome or Edge. The extension reads YouTube Music metadata, relays it only to the configured dashboard origin, and starts audio capture only after the user clicks the extension action while the YouTube Music tab is active.

Update the allowlisted origin in the manifest, `src/dashboardBridge.ts`, and `src/background.ts` before deploying the extension for a different GitHub Pages account or custom domain. See the root README for complete steps and browser limitations.
