# Sticky Notes

Native Electron desktop application ported from `(greenfield — no source)` by [electron-importer](https://github.com/davidburton/electron-importer).

## Development

```
npm install
npm start
```

## Build installers

```
npm run make
```

Installers land in `out/make/`.

## Port metadata

Decisions made during the port — shape, window model, persistence, platform target, distribution — are recorded in [`.electron-port/decisions.md`](.electron-port/decisions.md). Re-running `/electron-port` from the source repo reads this file and resumes from where it left off.
