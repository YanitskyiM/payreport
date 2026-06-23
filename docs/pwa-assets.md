# PWA assets

The PWA image source is `public/pwa/source-icon.png`, copied from the existing 512x512 app icon at `public/icons/android-chrome-512x512.png`.

Regenerate icons and iOS/iPadOS splash screens with:

```bash
npm run generate:pwa-assets
```

Generated assets live under `public/pwa/`, with iOS/iPadOS startup images in `public/pwa/splash/`.

iOS aggressively caches Home Screen launch images. Delete and reinstall the Home Screen app after changing generated splash assets or startup-image metadata.
