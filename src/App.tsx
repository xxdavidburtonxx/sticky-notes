import { useEffect, useState, useRef } from 'react';

const STICKY_BG = '#fdf57a';
const STICKY_INK = '#2b2410';

export default function App() {
  const recordId = window.app.recordId;
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loaded, setLoaded] = useState<boolean>(false);
  const skipNextSave = useRef(true); // skip the save tick that fires from the load.

  // Load on mount.
  useEffect(() => {
    if (!recordId) return;
    void window.app.records.read().then((rec) => {
      setTitle(rec?.title ?? '');
      setBody(rec?.body ?? '');
      setLoaded(true);
    });
  }, [recordId]);

  // Debounced save — both fields share the same debounce so we don't double-write.
  useEffect(() => {
    if (!recordId || !loaded) return;
    if (skipNextSave.current) {
      skipNextSave.current = false;
      return;
    }
    const t = setTimeout(() => {
      void window.app.records.update({ title, body });
    }, 400);
    return () => clearTimeout(t);
  }, [recordId, title, body, loaded]);

  if (!recordId) {
    return (
      <main style={{ fontFamily: 'system-ui', padding: 24 }}>
        No record bound to this window.
      </main>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100vw',
        height: '100vh',
        background: STICKY_BG,
        color: STICKY_INK,
      }}
    >
      {/* Title bar — draggable, holds the editable title and reserves room for traffic lights on macOS. */}
      <div
        style={{
          // @ts-expect-error -- Electron-only CSS property
          WebkitAppRegion: 'drag',
          flex: '0 0 auto',
          height: 36,
          paddingLeft: 76, // clear the macOS traffic lights
          paddingRight: 12,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Untitled"
          spellCheck={false}
          style={{
            // @ts-expect-error -- Electron-only CSS property
            WebkitAppRegion: 'no-drag',
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            font: 'inherit',
            fontSize: 13,
            fontWeight: 600,
            color: STICKY_INK,
            opacity: 0.85,
            padding: 0,
          }}
        />
      </div>

      {/* Body */}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Write something…"
        spellCheck={false}
        style={{
          flex: '1 1 auto',
          width: '100%',
          margin: 0,
          padding: '4px 16px 16px 16px',
          boxSizing: 'border-box',
          border: 'none',
          outline: 'none',
          resize: 'none',
          background: 'transparent',
          color: STICKY_INK,
          fontFamily:
            "ui-rounded, -apple-system, 'SF Pro Rounded', system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      />
    </div>
  );
}
