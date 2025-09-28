import React from "react";
import { BORDER_LITE } from "../core";

// Карточный секшен
export const Section = ({ title, children, right, className = "", ...rest }) => (
  <section {...rest} className={`mb-8 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur ${className}`}>
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    {children}
  </section>
);

export const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border ${BORDER_LITE} px-2 py-1 text-xs text-zinc-600 ${className}`}>{children}</span>
);

export const TinyPill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border ${BORDER_LITE} bg-zinc-50 px-1.5 py-1 text-[11px] leading-none text-zinc-700 ${className}`}>{children}</span>
);

// Кнопка ⋯ + дно-лист
export function ActionsMenu({ onSettings, onCopy, onShare, onExport, onImport, onReset }) {
  const [open, setOpen] = React.useState(false);
  const [isMobile, setIsMobile] = React.useState(false);
  const fileRef = React.useRef(null);
  React.useEffect(() => {
    const update = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    update(); window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  const MenuButtons = (
    <>
      <button onClick={() => { setOpen(false); onSettings(); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50">⚙️ Настроить</button>
      <button onClick={() => { setOpen(false); onCopy(); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50">🔗 Скопировать ссылку</button>
      {navigator?.share && <button onClick={() => { setOpen(false); onShare(); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50">📤 Поделиться</button>}
      <button onClick={() => { setOpen(false); onExport(); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50">⬇️ Экспорт JSON</button>
      <button onClick={() => { fileRef.current?.click(); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-zinc-50">⬆️ Импорт JSON</button>
      <button onClick={() => { setOpen(false); onReset(); }} className="block w-full px-4 py-3 text-left text-sm text-rose-600 hover:bg-rose-50">🗑 Сброс</button>
      <input ref={fileRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) { onImport(e.target.files[0]); e.target.value = ""; } }}/>
    </>
  );
  return (
    <div className="relative">
      <button onClick={() => setOpen(v => !v)} className={`rounded-full border ${BORDER_LITE} bg-white/0 px-3 py-2 text-sm`}>⋯</button>
      {open && !isMobile && <div className="absolute right-0 z-40 mt-2 w-60 overflow-hidden rounded-xl border bg-white shadow-lg">{MenuButtons}</div>}
      {open && isMobile && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl border border-b-0 bg-white shadow-xl">
            <div className="mx-auto h-1.5 w-10 translate-y-2 rounded-full bg-zinc-300" />
            <div className="max-h-[70vh] overflow-auto py-2">{MenuButtons}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// Липкая верхняя панель (прогресс + таймер отдыха)
export function StickyInfoBar({ doneSets, totalSets, leftContent, rightTimer }) {
  const pct = (doneSets/Math.max(1,totalSets))*100;
  return (
    <div className="sticky top-0 z-30 -mx-4 bg-white/85 px-4 pb-2 pt-2 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">{doneSets}/{totalSets} подходов</div>
          <div className="mt-1 h-1 w-full overflow-hidden rounded bg-zinc-200">
            <div className="h-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
          </div>
          {leftContent && <div className="mt-1 text-[11px] text-zinc-600">{leftContent}</div>}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="font-mono text-sm tabular-nums">{rightTimer.active ? `${rightTimer.mm}:${rightTimer.ss}` : "Отдых"}</span>
          {[60,90,120].map(s => (
            <button key={s} className="rounded-md border border-zinc-300 px-2 py-1 text-xs" onClick={()=>rightTimer.start(s)}>{s}s</button>
          ))}
          <button className="rounded-md border border-zinc-300 px-2 py-1 text-xs" onClick={()=>rightTimer.stop()}>Стоп</button>
        </div>
      </div>
    </div>
  );
}
