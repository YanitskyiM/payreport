import type {
  AppleDeviceSize,
  AssetType,
  ResolvedAssetSize
} from '@vite-pwa/assets-generator/config'
import {
  createAppleSplashScreens,
  defineConfig,
  minimal2023Preset
} from '@vite-pwa/assets-generator/config'

const launchBackground = '#f1f5f9'

function assetName(type: AssetType, size: ResolvedAssetSize) {
  switch (type) {
    case 'transparent':
      return `icon-${size.width}x${size.height}.png`
    case 'maskable':
      return `maskable-icon-${size.width}x${size.height}.png`
    case 'apple':
      return `apple-touch-icon-${size.width}x${size.height}.png`
  }
}

function appleSplashName(landscape: boolean, size: AppleDeviceSize) {
  return `splash/apple-splash-${landscape ? 'landscape' : 'portrait'}-${size.width}x${size.height}.png`
}

export default defineConfig({
  headLinkOptions: {
    preset: '2023',
    basePath: '/pwa/'
  },
  preset: {
    ...minimal2023Preset,
    assetName,
    transparent: {
      ...minimal2023Preset.transparent,
      favicons: []
    },
    appleSplashScreens: createAppleSplashScreens({
      padding: 0.3,
      resizeOptions: {
        fit: 'contain',
        background: launchBackground
      },
      name: appleSplashName
    })
  },
  images: ['public/pwa/source-icon.png']
})
