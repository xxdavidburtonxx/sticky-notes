import { useEffect, useState, useRef } from 'react';

const STICKY_BG = '#fdf57a';
const STICKY_INK = '#2b2410';

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

const TASK_INNER =
  '<span class="checkbox" contenteditable="false"></span><span class="task-text"></span>';

function makeTaskHtml(text: string, done = false): string {
  return `<div class="task" data-done="${done}"><span class="checkbox" contenteditable="false"></span><span class="task-text">${escapeHtml(text)}</span></div>`;
}

export default function App() {
  const recordId = window.app.recordId;
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [loaded, setLoaded] = useState<boolean>(false);
  const skipNextSave = useRef(true);
  const editorRef = useRef<HTMLDivElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!recordId) return;
    void window.app.records.read().then((rec) => {
      setTitle(rec?.title ?? '');
      setBody(rec?.body ?? '');
      setLoaded(true);
    });
  }, [recordId]);

  // Hydrate the editor's content once after load. Legacy notes are plain text
  // (no `<` chars); newer notes are HTML stored as a string.
  useEffect(() => {
    if (!loaded || initializedRef.current || !editorRef.current) return;
    const looksLikeHtml = body.includes('<');
    editorRef.current.innerHTML = looksLikeHtml
      ? body
      : escapeHtml(body).replace(/\n/g, '<br>');
    initializedRef.current = true;
  }, [loaded, body]);

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

  const captureBody = () => {
    if (editorRef.current) setBody(editorRef.current.innerHTML);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      // Use non-breaking spaces so Chromium's contentEditable preserves them.
      document.execCommand('insertText', false, '    ');
      return;
    }

    if (e.key === 'Enter') {
      const sel = window.getSelection();
      const anchor = sel?.anchorNode ?? null;
      const taskText =
        anchor && (anchor.nodeType === 1
          ? (anchor as HTMLElement).closest('.task-text')
          : (anchor.parentElement?.closest('.task-text') ?? null));
      if (!taskText) return;

      e.preventDefault();
      const task = taskText.closest('.task') as HTMLElement;
      const newTask = document.createElement('div');
      newTask.className = 'task';
      newTask.setAttribute('data-done', 'false');
      newTask.innerHTML = TASK_INNER;
      task.parentNode?.insertBefore(newTask, task.nextSibling);

      const newTextSpan = newTask.querySelector('.task-text') as HTMLElement;
      const range = document.createRange();
      range.setStart(newTextSpan, 0);
      range.collapse(true);
      sel?.removeAllRanges();
      sel?.addRange(range);
      captureBody();
    }
  };

  const onClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (!target.classList.contains('checkbox')) return;
    const task = target.closest('.task') as HTMLElement | null;
    if (!task) return;
    const done = task.getAttribute('data-done') === 'true';
    task.setAttribute('data-done', done ? 'false' : 'true');
    captureBody();
  };

  // Lines starting with `-`, `*`, `•`, `1.`, or `1)` look like list items and
  // get turned into checkboxes. Everything else stays as plain text.
  const LIST_PREFIX_RE = /^\s*(?:[-*•]|\d+[.)])\s+(.+)$/;

  const toggleChecklist = () => {
    const ed = editorRef.current;
    if (!ed) return;
    const isChecklist = ed.querySelector('.task') !== null;

    if (isChecklist) {
      // Tasks → plain text. Replace each .task with a <div> containing its text.
      // Non-task content is left alone.
      ed.querySelectorAll('.task').forEach((t) => {
        const text = t.querySelector('.task-text')?.textContent ?? '';
        const div = document.createElement('div');
        div.textContent = text;
        t.replaceWith(div);
      });
    } else {
      // Plain → mixed: each line is examined; only list-shaped lines become tasks.
      // The list prefix (`- `, `1. `, etc.) is stripped on conversion.
      const lines = ed.innerText.replace(/\n+$/, '').split('\n');
      ed.innerHTML = lines
        .map((line) => {
          const m = line.match(LIST_PREFIX_RE);
          if (m) return makeTaskHtml(m[1]);
          const escaped = escapeHtml(line);
          return `<div>${escaped || '<br>'}</div>`;
        })
        .join('');
    }
    captureBody();
    ed.focus();
  };

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
      <style>{`
        .task {
          padding: 2px 0;
        }
        .task .checkbox {
          display: inline-block;
          vertical-align: middle;
          width: 14px;
          height: 14px;
          margin-right: 10px;
          margin-bottom: 2px;
          background: transparent;
          border: 1.5px solid rgba(43, 36, 16, 0.55);
          border-radius: 3px;
          cursor: pointer;
          user-select: none;
          position: relative;
          transition: border-color 180ms ease;
        }
        .task[data-done="true"] .checkbox {
          border-color: rgba(43, 36, 16, 0.85);
        }
        .task[data-done="true"] .checkbox::after {
          content: '';
          position: absolute;
          left: 3px;
          top: 0;
          width: 4px;
          height: 8px;
          border: solid rgba(43, 36, 16, 0.85);
          border-width: 0 2px 2px 0;
          transform: rotate(45deg);
        }
        .task .task-text {
          position: relative;
          transition: opacity 280ms ease;
        }
        .task[data-done="true"] .task-text {
          opacity: 0.55;
        }
        .task .task-text::after {
          content: '';
          position: absolute;
          left: 0;
          top: 50%;
          height: 1.5px;
          width: 0;
          background: currentColor;
          transition: width 320ms cubic-bezier(0.4, 0, 0.2, 1);
          pointer-events: none;
        }
        .task[data-done="true"] .task-text::after {
          width: 100%;
        }
      `}</style>

      {/* Title bar — draggable, holds the editable title (centered) and the checklist toggle (right). */}
      <div
        style={{
          // @ts-expect-error -- Electron-only CSS property
          WebkitAppRegion: 'drag',
          flex: '0 0 auto',
          position: 'relative',
          height: 36,
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
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: '60%',
            maxWidth: 280,
            textAlign: 'center',
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
        <button
          onClick={toggleChecklist}
          aria-label="Toggle checklist"
          title="Toggle checklist"
          style={{
            // @ts-expect-error -- Electron-only CSS property
            WebkitAppRegion: 'no-drag',
            position: 'absolute',
            right: 12,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 14,
            height: 14,
            background: STICKY_INK,
            border: 'none',
            borderRadius: 2,
            cursor: 'pointer',
            opacity: 0.65,
            padding: 0,
            transition: 'opacity 150ms ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.65';
          }}
        />
      </div>

      {/* Body — rich-ish editor: plain text by default, checkboxes via the toggle. */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={captureBody}
        onKeyDown={onKeyDown}
        onClick={onClick}
        spellCheck={false}
        style={{
          flex: '1 1 auto',
          width: '100%',
          margin: 0,
          padding: '4px 16px 16px 16px',
          boxSizing: 'border-box',
          border: 'none',
          outline: 'none',
          background: 'transparent',
          color: STICKY_INK,
          fontFamily:
            "ui-rounded, -apple-system, 'SF Pro Rounded', system-ui, sans-serif",
          fontSize: 14,
          lineHeight: 1.5,
          overflowY: 'auto',
        }}
      />
    </div>
  );
}
