import { execFileSync } from 'node:child_process';
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
    icon: 'build/icon', // Forge picks .icns on macOS, .ico on Windows
    // === electron-publisher: signing config (managed; do not edit) ===
    osxSign: {
      identity: process.env.APPLE_SIGNING_IDENTITY,
      optionsForFile: () => ({
        entitlements: 'build/entitlements.mac.plist',
        hardenedRuntime: true,
      }),
    },
    osxNotarize: {
      appleApiKey: process.env.APPLE_API_KEY!,
      appleApiKeyId: process.env.APPLE_API_KEY_ID!,
      appleApiIssuer: process.env.APPLE_API_ISSUER!,
    },
    // === /electron-publisher: signing config ===
  },
  rebuildConfig: {},
  makers: [
    new MakerDMG({ icon: 'build/icon.icns' }, ['darwin']),
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
  // === electron-publisher: dmg signing hook (managed; do not edit) ===
  hooks: {
    postMake: async (_forgeConfig, makeResults) => {
      const identity = process.env.APPLE_SIGNING_IDENTITY;
      const apiKey = process.env.APPLE_API_KEY;
      const apiKeyId = process.env.APPLE_API_KEY_ID;
      const apiIssuer = process.env.APPLE_API_ISSUER;
      if (!identity || !apiKey || !apiKeyId || !apiIssuer) return makeResults;

      for (const result of makeResults) {
        if (result.platform !== 'darwin') continue;
        for (const dmg of result.artifacts.filter((a) => a.endsWith('.dmg'))) {
          console.log(`[postMake] signing ${dmg}`);
          execFileSync('codesign', ['--sign', identity, '--timestamp', dmg], { stdio: 'inherit' });
          console.log(`[postMake] notarizing ${dmg} (this can take 1–5 min)`);
          execFileSync(
            'xcrun',
            ['notarytool', 'submit', dmg, '--key', apiKey, '--key-id', apiKeyId, '--issuer', apiIssuer, '--wait'],
            { stdio: 'inherit' },
          );
          console.log(`[postMake] stapling ${dmg}`);
          execFileSync('xcrun', ['stapler', 'staple', dmg], { stdio: 'inherit' });
        }
      }
      return makeResults;
    },
  },
  // === /electron-publisher: dmg signing hook ===
};

export default config;
