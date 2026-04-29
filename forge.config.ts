import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
// === electron-publisher: publisher import (managed; do not edit) ===
import { PublisherGithub } from '@electron-forge/publisher-github';
// === /electron-publisher: publisher import ===

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.davidburton.sticky-notes',
    name: 'Sticky Notes',
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG({}, ['darwin']),
    new MakerZIP({}, ['darwin']),
    new MakerSquirrel({ name: 'sticky-notes' }),
    new MakerDeb({}),
    new MakerRpm({}),
  ],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    new AutoUnpackNativesPlugin({}),
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  // === electron-publisher: publishers (managed; do not edit) ===
  publishers: [
    new PublisherGithub({
      repository: { owner: 'xxdavidburtonxx', name: 'sticky-notes' },
      prerelease: false,
      draft: true,
    }),
  ],
  // === /electron-publisher: publishers ===
};

export default config;
