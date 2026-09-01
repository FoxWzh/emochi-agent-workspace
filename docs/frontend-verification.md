# Frontend verification — 2026-08-27

## Command checks

- `npm run build` — passed (Vite production build).
- Local dev server — loaded at `http://127.0.0.1:5175/`.

## Browser interaction checks

- **Unbound Session:** shows a choice component, does not imply Bot creation or binding, and offers compact candidate Bot choices inside the work-object popover.
- **Single-Bot Session:** switching to `完善「林夜」的关系线` shows a single current work object and two Session artifacts.
- **Popover → Viewer:** opening “工作对象与产物”, then choosing the Bot, closes the popover and opens the only right-side Viewer.
- **Viewer allocation:** the layout uses two columns by default; the right Viewer column is added only when a Viewer is open, so the conversation no longer leaves unused space on the right.
- **Three Viewer areas:** basic information is a GUI form; content settings is a free-text editor; advanced settings is a GUI form.
- **Manual save:** “保存并生成确认” adds a visible pending-confirmation message; it does not silently write Bot data.
- **Artifact confirmation:** `确定采用` changes the Artifact to `已采用 · 待写入` and explains that this does not write to the Bot.

## Boundary checks

- UI fixtures, bot retrieval methods, and Artifact retrieval methods are isolated under `src/mock/`.
- No real database/API/transport is used.
- The UI keeps a single optional popover and a single right Viewer; selecting an item replaces Viewer content.
