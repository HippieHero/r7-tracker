
import React, { useEffect, useMemo, useState } from "react";

/* ===================== Helpers / Constants ===================== */
const STORAGE_KEY = "r7_tracker_v4";
const PROG_KEY    = "r7_programs_v2";
const BORDER_LITE = "border-zinc-300";
const DEFAULT_DAYS = 30;

// haptics
const vibrate = (ms = 15) => { try { window.navigator.vibrate?.(ms); } catch {} };

// safe parse number
const N = (v) => {
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

// формат даты YYYY-MM-DD
const iso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

// localStorage state
function usePersistedState(key, initial) {
  const [state, setState] = React.useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

function getQuery() {
  try {
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(p.entries());
  } catch { return {}; }
}

function buildPersonalLink({ base = null, profile }) {
  try {
    const url = new URL(base || (window.location.origin + window.location.pathname));
    const p = new URLSearchParams();
    if (profile?.mode)  p.set("mode",  profile.mode);
    if (profile?.level) p.set("level", profile.level);
    if (profile?.start) p.set("start", profile.start);
    if (profile?.name)  p.set("name",  encodeURIComponent(profile.name));
    if (profile?.days)  p.set("days",  String(profile.days));
    url.search = p.toString();
    return url.toString();
  } catch { return window.location.href; }
}

/* ===================== Demo Data (Start • Дом) ===================== */
const VK_CRUNCH = "https://vkvideo.ru/video-226154718_456239154";

const WEEK1_DAYS = [
  {
    title: "День 1 — Ноги",
    place: "Дом",
    exercises: [
      { muscle: "Ягодицы", name: "Плие", warmup: true,  workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента", "Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Спина прямая, ноги шире плеч, носки слегка наружу. Плавно, без рывков.", videos: [] },
      { muscle: "Квадрицепсы", name: "Разгибания", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Лёжа на спине, резинка на стопах. Фиксация вверху 1–2 сек, медленный негатив.", videos: [] },
      { muscle: "Бицепс бедра", name: "Сгибания лёжа", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Лёжа на животе, сгибаем ноги к ягодицам, удерживаем 1–2 сек.", videos: [] },
      { muscle: "Ягодицы", name: "Разведения ног сидя", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента", "Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Резинка выше колен, спина прямая, пик-сокращение 1–2 сек.", videos: [] },
      { muscle: "Пресс", name: "Скручивания", warmup: false, workSets: 2, reps: "15–30", rest: "60–120 сек",
        equipment: ["Масса тела"], intensity: "До жжения",
        notes: "Без рывков, внизу — растяжение, работаем до жжения.",
        videos: [{ label: "Скручивания — техника", href: VK_CRUNCH }] },
    ]
  },
  {
    title: "День 2 — Верх",
    place: "Дом",
    exercises: [
      { muscle: "Спина", name: "Вертикальная тяга на одну руку", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Фиксация ленты выше головы, тянем к верху груди, фиксация 1–2 сек.", videos: [] },
      { muscle: "Грудь", name: "Жим лёжа", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантели (по желанию)"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Локти ~45° к корпусу, без полного выпрямления, 1–2 сек вверху.", videos: [] },
      { muscle: "Спина", name: "Горизонтальная тяга", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Длинная петля","Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Тянем к корпусу, лопатки сводим, 1–2 сек фиксация.", videos: [] },
      { muscle: "Грудь", name: "Сведение лёжа на грудь", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантели"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Слегка согнутые локти, пик-сокращение 1–2 сек.", videos: [] },
      { muscle: "Пресс", name: "Скручивания", warmup: false, workSets: 3, reps: "15–30", rest: "60–120 сек",
        equipment: ["Масса тела"], intensity: "До жжения",
        notes: "Без рывков, до жжения.", videos: [{ label: "Скручивания — техника", href: VK_CRUNCH }] },
    ]
  },
  {
    title: "День 3 — Ноги/Ягодицы",
    place: "Дом",
    exercises: [
      { muscle: "Ягодицы", name: "Ягодичный мостик", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантель на таз","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Колени ~90°, фиксация 1–2 сек вверху, контролируемый негатив.", videos: [] },
      { muscle: "Бицепс бедра", name: "Сгибания ног стоя", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Опора рукой, сгибаем к ягодице, фиксация 1–2 сек.", videos: [] },
      { muscle: "Ягодицы", name: "Отведение ноги в сторону (на четвереньках)", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Лента выше колен, корпус стабилен, фиксация 1–2 сек.", videos: [] },
      { muscle: "Ягодицы", name: "Жим ногой на четвереньках", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Выпрямляем назад/вверх, фиксация 1–2 сек.", videos: [] },
      { muscle: "Пресс", name: "Скручивания", warmup: false, workSets: 1, reps: "15–30", rest: "60–120 сек",
        equipment: ["Масса тела"], intensity: "До жжения",
        notes: "До жжения, без рывков.", videos: [{ label: "Скручивания — техника", href: VK_CRUNCH }] },
    ]
  }
];

const PROGRAMS = {
  S: { name: "Start",  weeks: [{ name: "Неделя 1", days: WEEK1_DAYS }, { name: "Неделя 2", days: WEEK1_DAYS }, { name: "Неделя 3", days: WEEK1_DAYS }, { name: "Неделя 4", days: WEEK1_DAYS }]},
  M: { name: "Medium", weeks: [] },
  P: { name: "Pro",    weeks: [] },
};

/* ===================== UI primitives ===================== */
const Section = ({ title, children, right, className = "", ...rest }) => (
  <section {...rest} className={`mb-8 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur ${className}`}>
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="flex items-center gap-2">{right}</div>
    </div>
    {children}
  </section>
);

const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border ${BORDER_LITE} px-2 py-1 text-xs text-zinc-600 ${className}`}>{children}</span>
);

/* --- NEW: ultra-compact pills & helpers for the meta-bar --- */
const TinyPill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center gap-1 rounded-md border ${BORDER_LITE} bg-zinc-50 px-1.5 py-1 text-[11px] leading-none text-zinc-700 ${className}`}>{children}</span>
);

function shortRest(rest) {
  if (!rest) return "";
  return String(rest).replace(/\s*сек(унд[ыы]?)?/gi, "с").replace(/\s+/g, " ").trim();
}
function shortIntensity(intensity) {
  if (!intensity) return "";
  const m = String(intensity).match(/\((\d+)[–\-—](\d+)\s*повт\.?\)/i);
  if (m) return `RIR ${m[1]}–${m[2]}`;
  const m2 = String(intensity).match(/RIR\s*\d+(?:[–\-—]\d+)?/i);
  if (m2) return m2[0].toUpperCase();
  return String(intensity).replace("Вблизи отказа", "RIR").replace(/повт\.?/gi,"").trim();
}

/* --- NEW: compact meta-bar for exercise header (the blue highlighted area) --- */

function MetaBar({ ex, exIdx, addSet, removeLastSet }) {
  const setsReps = `${ex.workSets}×${ex.reps}`;
  const rest = shortRest(ex.rest);
  const intensity = shortIntensity(ex.intensity);
  const eq = Array.isArray(ex.equipment) ? ex.equipment.join(", ") : "";

  return (
    <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-zinc-200 bg-white/60 px-2 py-1.5">
      <div className="min-w-0 flex flex-wrap items-center gap-1.5">
        <TinyPill>🔁 {setsReps}</TinyPill>
        {rest && <TinyPill>⏱ {rest}</TinyPill>}
        {intensity && <TinyPill>⚡ {intensity}</TinyPill>}
        {ex.warmup && <TinyPill>🔥 Разминка</TinyPill>}
        {eq && (
          <TinyPill className="max-w-[80vw] sm:max-w-[560px]">
            🎒 <span className="truncate" title={eq}>{eq}</span>
          </TinyPill>
        )}
      </div>
      {/* ONLY +/- here now */}
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => addSet(exIdx)}
          className="h-7 w-7 rounded-full border border-zinc-300 text-sm leading-none"
          title="+ подход"
          aria-label="+ подход"
        >+</button>
        <button
          onClick={() => removeLastSet(exIdx)}
          className="h-7 w-7 rounded-full border border-zinc-300 text-sm leading-none"
          title="– убрать"
          aria-label="– убрать"
        >–</button>
      </div>
    </div>
  );
}

const InputMini = React.forwardRef(function InputMini(
  { className = "", onEnter, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      inputMode="decimal"
      pattern="[0-9.,]*"
      className={[
        "h-8 w-full rounded-md border border-zinc-300 px-2 text-center text-xs",
        className,
      ].join(" ")}
      onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
      {...props}
    />
  );
});

// RIR селектор + цвета
const RIR_OPTIONS = [
  { value: "",  label: "Выбрать" },
  { value: "4", label: "4" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "1", label: "1" },
  { value: "0", label: "Отказ" },
];
const rirColor = (v) => v === "0" ? "border-rose-300 bg-rose-50"
  : (v === "1" || v === "2") ? "border-amber-300 bg-amber-50"
  : "border-zinc-300 bg-white";

const RirSelect = React.forwardRef(function RirSelect({ value, onChange, onEnter }, ref) {
  return (
    <div className={["h-8 rounded-md", rirColor(value || ""), "border"].join(" ")}>
      <select
        ref={ref}
        className="h-full w-full rounded-md bg-transparent pl-2 pr-6 text-xs"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onEnter?.(); }}
      >
        {RIR_OPTIONS.map(o => (
          <option key={o.value} value={o.value} disabled={o.value === ""}>{o.label}</option>
        ))}
      </select>
    </div>
  );
});

/* ===================== PWA bits ===================== */
function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setSupported(true); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(() => {});
  };
  return { supported, install };
}
const isTelegramWebView = () => typeof navigator !== "undefined" && /Telegram/i.test(navigator.userAgent || "");

/* ===================== Actions (⋯) ===================== */
function ActionsMenu({ onSettings, onCopy, onShare, onExport, onImport, onReset }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const fileRef = React.useRef(null);
  useEffect(() => {
    const update = () => setIsMobile(window.matchMedia("(max-width: 640px)").matches);
    update();
    window.addEventListener("resize", update);
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

/* ===================== Programs helpers ===================== */
function useProgramsState() {
  return usePersistedState(PROG_KEY, { level: "S", week: 0, day: 0, progress: {}, goals: {} , session: {} });
}
const keyFor = (level, week, day, exIdx) => `${level}.${week}.${day}.${exIdx}`;
const exId = (level, week, day, ex) => `${level}.${week}.${day}.${(ex?.name || "ex").toLowerCase().replace(/\s+/g,"_")}`;

function saveDayHistory(level, week, day, dayObj, progress) {
  dayObj.exercises.forEach((ex, exIdx) => {
    const k = keyFor(level, week, day, exIdx);
    const rows = progress[k]?.sets || [];
    const payload = rows.map(r => ({ reps: r?.reps || "", weight: r?.weight || "", rir: r?.rir || "" }));
    try { localStorage.setItem("r7:last:" + exId(level, week, day, ex), JSON.stringify(payload)); } catch {}
    if (ex?.videos?.[0]?.href) {
      try { localStorage.setItem("r7:video:" + exId(level, week, day, ex), ex.videos[0].href); } catch {}
    }
  });
}


/* ===================== Stats row (объём / эффективность / время) ===================== */
function StatsRow({ volume, effectiveness, timeText, started, paused, onStart, onPause, onResume, onReset }) {
  const Card = ({ children, className = "" }) => (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm ${className}`}>
      {children}
    </div>
  );

  return (
    <div className="mt-2">
      {/* 1) Объём и эффективность в одну линию */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-sm text-zinc-600">Объём</div>
          <div className="mt-0.5 text-xl font-semibold">
            {volume} <span className="text-base font-normal text-zinc-600">кг</span>
          </div>
        </Card>

        {/* ВТОРАЯ КОЛОНКА должна быть внутри Card */}
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm text-zinc-600">Эффективность</div>
            <button
              className="ml-2 h-5 w-5 rounded-full border border-zinc-300 text-xs text-zinc-600"
              onClick={() =>
                alert(
                  "Эффективность учитывает, сколько подходов выполнено и насколько они были тяжёлыми. Рассчитывается как (выполнение × средняя интенсивность) × 100 %."
                )
              }
              aria-label="Что такое эффективность?"
            >
              ?
            </button>
          </div>
          <div className="mt-0.5 text-xl font-semibold">
            {effectiveness != null ? `${effectiveness} %` : "—"}
          </div>
        </Card>
      </div>

      {/* 2) Ниже — время тренировки + кнопки */}
      <div className="mt-3">
        <Card>
          <div className="text-sm text-zinc-600">Время</div>
          <div className="mt-0.5 font-mono text-xl tabular-nums">{timeText || "—"}</div>

          {!started && (
            <button className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onStart}>
              Старт тренировки
            </button>
          )}

          {started && !paused && (
            <div className="mt-2 flex gap-2">
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onPause}>
                Пауза
              </button>
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onReset}>
                Сброс
              </button>
            </div>
          )}

          {started && paused && (
            <div className="mt-2 flex gap-2">
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onResume}>
                Продолжить
              </button>
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onReset}>
                Сброс
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}


/* ===================== Controls ===================== */
function Controls({ level, setLevel, prog, weekIdx, setWeek, dayIdx, setDay }) {
  const week = prog.weeks[weekIdx] || { days: [] };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={level} onChange={(e) => setLevel(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
        <option value="S">Start</option>
        <option value="M" disabled>Medium (скоро)</option>
        <option value="P" disabled>Pro (скоро)</option>
      </select>
      <select value={weekIdx} onChange={(e) => setWeek(Number(e.target.value))} className="rounded-md border px-3 py-2 text-sm">
        {prog.weeks.map((w, i) => (<option key={i} value={i}>{w.name}</option>))}
      </select>
      <select value={dayIdx} onChange={(e) => setDay(Number(e.target.value))} className="rounded-md border px-3 py-2 text-sm">
        {week.days?.map((d, i) => (<option key={i} value={i}>{d.title}</option>))}
      </select>
    </div>
  );
}

/* ===================== Programs tab ===================== */
function ProgramsTab({ data, setData }) {
  const [ps, setPs] = useProgramsState();
  const level = ps.level;
  const prog = PROGRAMS[level] || { weeks: [] };
  const week = prog.weeks[ps.week] || { days: [] };
  const day = week.days[ps.day];

  const setLevel = (l) => setPs({ ...ps, level: l, week: 0, day: 0 });
  const setWeek  = (i) => setPs({ ...ps, week: i, day: 0 });
  const setDay   = (i) => setPs({ ...ps, day: i });

  // progress numbers
  const totalSets = useMemo(() => {
    if (!day) return 0;
    return day.exercises.reduce((a, ex) => a + (ex.workSets || 0), 0);
  }, [day]);

  const doneSets = useMemo(() => {
    if (!day) return 0;
    return day.exercises.reduce((a, ex, exIdx) => {
      const k = keyFor(level, ps.week, ps.day, exIdx);
      const rows = ps.progress[k]?.sets || [];
      return a + rows.filter(r => r?.done).length;
    }, 0);
  }, [day, ps.progress, level, ps.week, ps.day]);

  /* ---------- Таймер отдыха (липкая нижняя панель) ---------- */
  const restKey = `${level}.${ps.week}.${ps.day}.rest`;
  const [restEnd, setRestEnd] = useState(() => {
    try { return Number(localStorage.getItem(restKey) || 0); } catch { return 0; }
  });
  useEffect(() => { try { localStorage.setItem(restKey, String(restEnd)); } catch {} }, [restKey, restEnd]);
  const [, forceTick] = useState(0);
  useEffect(() => {
    if (!restEnd) return;
    const t = setInterval(() => {
      if (Date.now() >= restEnd) { clearInterval(t); setRestEnd(0); vibrate(35); }
      else forceTick(x => x + 1);
    }, 300);
    return () => clearInterval(t);
  }, [restEnd]);
  const leftMs = Math.max(0, restEnd - Date.now());
  const mm = String(Math.floor(leftMs / 1000 / 60)).padStart(2, "0");
  const ss = String(Math.floor((leftMs / 1000) % 60)).padStart(2, "0");

  /* ---------- Таймер всей тренировки (старт/пауза/возобновить/сброс) ---------- */
  const dayKey = `${level}.${ps.week}.${ps.day}`;
  const wKeyStart = "r7:wstart:" + dayKey;
  const wKeyAccum = "r7:waccum:" + dayKey;
  const [wStart, setWStart] = useState(() => { try { return Number(localStorage.getItem(wKeyStart) || 0); } catch { return 0; } });
  const [wAccum, setWAccum] = useState(() => { try { return Number(localStorage.getItem(wKeyAccum) || 0); } catch { return 0; } });

  useEffect(() => {
    try {
      setWStart(Number(localStorage.getItem("r7:wstart:" + dayKey) || 0));
      setWAccum(Number(localStorage.getItem("r7:waccum:" + dayKey) || 0));
    } catch {
      setWStart(0); setWAccum(0);
    }
  }, [dayKey]);

  useEffect(() => { try { wStart ? localStorage.setItem(wKeyStart, String(wStart)) : localStorage.removeItem(wKeyStart); } catch {} }, [wStart, wKeyStart]);
  useEffect(() => { try { wAccum ? localStorage.setItem(wKeyAccum, String(wAccum)) : localStorage.removeItem(wKeyAccum); } catch {} }, [wAccum, wKeyAccum]);

  const [, tickW] = useState(0);
  useEffect(() => {
    if (!wStart) return;
    const t = setInterval(() => tickW((x) => x + 1), 1000);
    return () => clearInterval(t);
  }, [wStart]);

  const elapsed = Math.max(0, wAccum + (wStart ? Date.now() - wStart : 0));
  const eh = Math.floor(elapsed / 3600000);
  const em = Math.floor((elapsed % 3600000) / 60000);
  const es = Math.floor((elapsed % 60000) / 1000);
  const timeText = (eh > 0 ? `${String(eh).padStart(2,"0")}:` : "") + `${String(em).padStart(2,"0")}:${String(es).padStart(2,"0")}`;

  const startWorkout = () => { setWStart(Date.now()); setWAccum(0); };
  const pauseWorkout = () => { if (wStart) { setWAccum(wAccum + (Date.now() - wStart)); setWStart(0); } };
  const resumeWorkout = () => { if (!wStart) setWStart(Date.now()); };
  const resetWorkout = () => { setWStart(0); setWAccum(0); };

  const paused = !wStart && wAccum > 0;
  const started = !!(wStart || wAccum);

  // апдейтер ячейки (функциональный)
  function setCell(exIdx, setIdx, field, value) {
    const k = keyFor(level, ps.week, ps.day, exIdx);
    setPs(prev => {
      const cur = prev.progress[k] || { sets: [] };
      const sets = [...(cur.sets || [])];
      sets[setIdx] = { ...(sets[setIdx] || {}), [field]: value };
      return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
    });
  }

  function toggleSet(exIdx, setIdx) {
    const k = keyFor(level, ps.week, ps.day, exIdx);
    setPs(prev => {
      const cur = prev.progress[k] || { sets: [] };
      const sets = [...(cur.sets || [])];
      const next = !sets[setIdx]?.done;
      sets[setIdx] = { ...(sets[setIdx] || {}), done: next };
      return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
    });
    vibrate(12);
  }

  function isExerciseDone(exIdx, workSets) {
    const k = keyFor(level, ps.week, ps.day, exIdx);
    const cur = ps.progress[k];
    const done = (cur?.sets || []).filter((s) => s?.done).length;
    return done >= workSets;
  }

  function addSet(exIdx) {
    day.exercises[exIdx].workSets = (day.exercises[exIdx].workSets || 0) + 1;
    setPs({ ...ps });
  }
  function removeLastSet(exIdx) {
    if ((day.exercises[exIdx].workSets || 0) > 1) {
      day.exercises[exIdx].workSets -= 1;
      setPs({ ...ps });
    }
  }

  // «Как в прошлый раз»
  function copyLast(exIdx) {
    const ex = day.exercises[exIdx];
    const last = (() => {
      try { return JSON.parse(localStorage.getItem("r7:last:" + exId(level, ps.week, ps.day, ex)) || "null"); } catch { return null; }
    })();
    if (!last) return;
    const k = keyFor(level, ps.week, ps.day, exIdx);
    const need = Math.max(ex.workSets || 0, last.length);
    const sets = Array.from({ length: need }).map((_, i) => ({
      reps: last[i]?.reps || "",
      weight: last[i]?.weight || "",
      rir: last[i]?.rir || "",
      done: false,
    }));
    setPs(prev => ({ ...prev, progress: { ...prev.progress, [k]: { sets } } }));
  }

  // видео
  function getVideoHref(ex) {
    const alt = (() => { try { return localStorage.getItem("r7:video:" + exId(level, ps.week, ps.day, ex)) || ""; } catch { return ""; }})();
    return ex?.videos?.[0]?.href || alt || "";
  }
  function openVideo(ex) {
    const href = getVideoHref(ex);
    if (href) window.open(href, "_blank", "noopener");
  }
  function copyVideo(ex) {
    const href = getVideoHref(ex);
    if (!href) return;
    navigator.clipboard?.writeText(href).then(() => {
      alert("Ссылка на видео скопирована");
    }).catch(() => { prompt("Скопируйте ссылку вручную:", href); });
  }

  // микростаты дня (объём + эффективность)
  const dayStats = useMemo(() => {
    if (!day) return { volume: 0, effectiveness: undefined };
    let vol = 0; let scoreSum = 0, completed = 0;
    day.exercises.forEach((ex, exIdx) => {
      const k = keyFor(level, ps.week, ps.day, exIdx);
      const rows = ps.progress[k]?.sets || [];
      rows.forEach(r => {
        vol += N(r.weight) * N(r.reps);
        if (r?.done) {
          const rir = Number(r.rir ?? 4);
          const intensity = Math.max(0, (4 - rir) / 4);
          scoreSum += intensity;
          completed += 1;
        }
      });
    });
   const completion = totalSets ? completed / totalSets : 0;
    const avgIntensity = completed ? scoreSum / completed : 0;
    const effectiveness = Math.round(100 * completion * avgIntensity);
    return { volume: Math.round(vol), effectiveness };
  }, [day, ps.progress, level, ps.week, ps.day, totalSets]);

  if (!day) {
    return (
      <Section title="Программы тренировок" right={null}>
        <div className="mb-3">
          <Controls
            level={level} setLevel={setLevel}
            prog={prog} weekIdx={ps.week} setWeek={setWeek}
            dayIdx={ps.day} setDay={setDay}
          />
        </div>
        <StickyInfoBar doneSets={doneSets} totalSets={totalSets} leftContent={null}
          rightTimer={{ mm, ss, start: (s)=>setRestEnd(Date.now()+s*1000), stop: ()=>setRestEnd(0), active: !!restEnd }} />
        <div className="mt-3 text-sm text-zinc-600">Выберите Start → Неделя 1.</div>
      </Section>
    );
  }

  return (
    <>
    <Section title="Программы тренировок" right={null}>
      <div className="mb-3">
        <Controls
          level={level} setLevel={setLevel}
          prog={prog} weekIdx={ps.week} setWeek={setWeek}
          dayIdx={ps.day} setDay={setDay}
        />
      </div>

      <StatsRow
        volume={dayStats.volume}
        effectiveness={dayStats.effectiveness}
        timeText={timeText}
        started={started}
        paused={paused}
        onStart={startWorkout}
        onPause={pauseWorkout}
        onResume={resumeWorkout}
        onReset={resetWorkout}
      />
</Section>
    <StickyInfoBar
      doneSets={doneSets}
      totalSets={totalSets}
      leftContent={null}
      rightTimer={{ mm, ss, start: (s)=>setRestEnd(Date.now()+s*1000), stop: ()=>setRestEnd(0), active: !!restEnd }}
    />


   {day.exercises.map((ex, exIdx) => {
          const k = keyFor(level, ps.week, ps.day, exIdx);
          const progress = ps.progress[k]?.sets || [];
          const exDone = isExerciseDone(exIdx, ex.workSets);

          const [menuOpen, setMenuOpen] = React.useState(false);
          const holdRef = React.useRef(null);
          const onHoldStart = () => { holdRef.current = setTimeout(() => setMenuOpen(true), 500); };
          const onHoldEnd   = () => { if (holdRef.current) { clearTimeout(holdRef.current); holdRef.current = null; } };

          return (
            <Section key={exIdx} id={"ex-" + exIdx}
              title={(
                <div className="flex items-center gap-2">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${exDone ? "border-emerald-300 bg-emerald-500 text-white" : "border-zinc-300 text-zinc-500"}`} title={exDone ? "Упражнение выполнено" : "Есть невыполненные подходы"}>✓</div>
                  <div>
                    <div className="text-xs text-zinc-500">{ex.muscle}</div>
                    <div className="text-base font-semibold">{ex.name}</div>
                  </div>
                </div>
              )}
              right={(getVideoHref(ex) && (
                <button onClick={() => openVideo(ex)} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">▶︎ Видео</button>
              ))}
            >
<div className="flex flex-wrap items-start justify-between gap-2 pr-10">
                <div className="min-w-0">
                  <div
                    className="flex items-center gap-2"
                    onContextMenu={(e) => { e.preventDefault(); setMenuOpen(true); }}
                    onTouchStart={onHoldStart}
                    onTouchEnd={onHoldEnd}
                  >
                    
                  </div>

                  {menuOpen && (
                    <div className="z-10 mt-2 w-44 overflow-hidden rounded-xl border bg-white text-sm shadow-lg">
                      <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                        onClick={() => { setMenuOpen(false); openVideo(ex); }}>Открыть видео</button>
                      <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                        onClick={() => { setMenuOpen(false); copyVideo(ex); }}>Скопировать ссылку</button>
                      <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                        onClick={() => { setMenuOpen(false); copyLast(exIdx); }}>Как в прошлый раз</button>
                      <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50"
                        onClick={() => setMenuOpen(false)}>Закрыть</button>
                    </div>
                  )}

                  <MetaBar ex={ex} exIdx={exIdx} addSet={addSet} removeLastSet={removeLastSet} exDone={exDone} />
                </div>
              </div>

              {ex.notes && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm text-zinc-700">Примечания</summary>
                  <div className="mt-2 text-sm text-zinc-600">{ex.notes}</div>
                </details>
              )}

              <div className="mt-3">
                <div className="space-y-2 sm:hidden">
                  {Array.from({ length: ex.workSets }).map((_, si) => {
                    const row = progress[si] || {};
                    const idBase = `${exIdx}-${si}`;
                    return (
                      <div key={si} className="grid grid-cols-[auto_64px_64px_minmax(0,1fr)_40px] items-center gap-2 rounded-xl border border-zinc-200 p-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-xs">{si+1}</span>

                        <InputMini
                          aria-label="Повторы"
                          placeholder={ex.reps || "повт."}
                          value={row.reps || ""}
                          onChange={(e) => setCell(exIdx, si, "reps", e.target.value)}
                          onEnter={() => document.getElementById(`kg-${idBase}`)?.focus()}
                        />

                        <InputMini
                          id={`kg-${idBase}`}
                          aria-label="Вес, кг"
                          placeholder="кг"
                          value={row.weight || ""}
                          onChange={(e) => setCell(exIdx, si, "weight", e.target.value)}
                          onEnter={() => document.getElementById(`rir-${idBase}`)?.focus()}
                        />

                        <div id={`rir-${idBase}`}>
                          <RirSelect
                            value={row.rir ?? ""}
                            onChange={(val) => {
                              const key = keyFor(level, ps.week, ps.day, exIdx);
                              setPs(prev => {
                                const cur = prev.progress[key] || { sets: [] };
                                const sets = [...(cur.sets || [])];
                                sets[si] = { ...(sets[si] || {}), rir: val };
                                if (si === 0 && val) {
                                  for (let j = 1; j < (ex.workSets || 0); j++) {
                                    const r = sets[j] || {};
                                    if (!r.rir) sets[j] = { ...r, rir: val };
                                  }
                                }
                                return { ...prev, progress: { ...prev.progress, [key]: { ...cur, sets } } };
                              });
                            }}
                            onEnter={() => { toggleSet(exIdx, si); }}
                          />
                        </div>

                        <button
                          onClick={() => toggleSet(exIdx, si)}
                          className={`flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-lg transition-all duration-150 ${row.done ? "scale-105 bg-emerald-500 text-white" : "bg-white text-zinc-600"}`}
                          aria-label="Сделано"
                          title="Сделано"
                        >
                          ✓
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="hidden overflow-x-auto sm:block">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50">
                      <tr>
                        <th className="px-2 py-2 text-left">Подход</th>
                        <th className="px-2 py-2 text-left">Повт. факт</th>
                        <th className="px-2 py-2 text-left">Вес, кг</th>
                        <th className="px-2 py-2 text-left">RIR</th>
                        <th className="px-2 py-2 text-left">Сделано</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: ex.workSets }).map((_, si) => {
                        const row = progress[si] || {};
                        const idBase = `${exIdx}-desk-${si}`;
                        return (
                          <tr key={si} className="border-b">
                            <td className="px-2 py-1">{si+1}</td>
                            <td className="px-2 py-1">
                              <input
                                className="h-8 w-28 rounded border border-zinc-300 px-2 text-sm"
                                value={row.reps || ""}
                                onChange={(e) => setCell(exIdx, si, "reps", e.target.value)}
                                onKeyDown={(e)=>{ if(e.key==="Enter"){ document.getElementById(`kg-${idBase}`)?.focus(); }}}
                                placeholder={ex.reps}
                                inputMode="numeric"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <input
                                id={`kg-${idBase}`}
                                className="h-8 w-28 rounded border border-zinc-300 px-2 text-sm"
                                value={row.weight || ""}
                                onChange={(e) => setCell(exIdx, si, "weight", e.target.value)}
                                onKeyDown={(e)=>{ if(e.key==="Enter"){ document.getElementById(`rir-${idBase}`)?.focus(); }}}
                                placeholder="кг"
                                inputMode="decimal"
                              />
                            </td>
                            <td className="px-2 py-1">
                              <div id={`rir-${idBase}`} className="w-24">
                                <RirSelect
                                  value={row.rir ?? ""}
                                  onChange={(val) => {
                                    const key = keyFor(level, ps.week, ps.day, exIdx);
                                    setPs(prev => {
                                      const cur = prev.progress[key] || { sets: [] };
                                      const sets = [...(cur.sets || [])];
                                      sets[si] = { ...(sets[si] || {}), rir: val };
                                      if (si === 0 && val) {
                                        for (let j = 1; j < (ex.workSets || 0); j++) {
                                          const r = sets[j] || {};
                                          if (!r.rir) sets[j] = { ...r, rir: val };
                                        }
                                      }
                                      return { ...prev, progress: { ...prev.progress, [key]: { ...cur, sets } } };
                                    });
                                  }}
                                  onEnter={() => { toggleSet(exIdx, si); }}
                                />
                              </div>
                            </td>
                            <td className="px-2 py-1">
                              <input type="checkbox" checked={!!row.done} onChange={() => { toggleSet(exIdx, si); }} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {exIdx < day.exercises.length - 1 && (
                <button
                  className="mt-3 w-full rounded-md border border-zinc-300 py-2 text-sm"
                  onClick={() => {
                    document.getElementById(`ex-${exIdx + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                >
                  Следующее упражнение ↓
                </button>
              )}

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <button className={`rounded-md border ${BORDER_LITE} px-2 py-1`} onClick={() => copyLast(exIdx)}>Как в прошлый раз</button>
                <button className={`rounded-md border ${BORDER_LITE} px-2 py-1`} onClick={() => {
                  saveDayHistory(level, ps.week, ps.day, day, ps.progress);
                  alert("Значения сохранены как «прошлый раз».");
                }}>Сохранить «прошлый раз»</button>
              </div>
            </Section>
          );
        })}

      <WeekGoals ps={ps} setPs={setPs} level={level} weekIdx={ps.week} />
    </>
  );
}

/* ===================== StickyInfoBar (прогресс + отдых) ===================== */
function StickyInfoBar({ doneSets, totalSets, leftContent, rightTimer }) {
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

/* ===================== Week Goals ===================== */
function WeekGoals({ ps, setPs, level, weekIdx }) {
  const key = `${level}.${weekIdx}`;
  const goals = ps.goals?.[key] || [
    { text: "3 тренировки за неделю", done: false },
    { text: "Сон 7+ ч — 4 дня", done: false },
    { text: "Шаги 6–8к — 4 дня", done: false },
  ];
  function setGoal(i, next) {
    const arr = [...goals]; arr[i] = next;
    setPs({ ...ps, goals: { ...ps.goals, [key]: arr } });
  }
  return (
    <div className="mt-6 rounded-xl border border-zinc-300 bg-white p-3">
      <div className="mb-2 text-sm font-medium">Цели недели</div>
      <div className="space-y-2 text-sm">
        {goals.map((g, i) => (
          <label key={i} className="flex items-center gap-2">
            <input type="checkbox" checked={!!g.done} onChange={(e) => setGoal(i, { ...g, done: e.target.checked })}/>
            <input className="w-full rounded border border-zinc-300 px-2 py-1 text-sm" value={g.text} onChange={(e) => setGoal(i, { ...g, text: e.target.value })}/>
          </label>
        ))}
      </div>
    </div>
  );
}

/* ===================== Plan / Data ===================== */
const dayTemplate = [
  { name: "Тренировка A (низ/ягодицы)",     focus: "Низ",            duration: "35–50", prep: "5–8 мин разогрев/мобилити" },
  { name: "Отдых / мобилити",               focus: "Восстановление", duration: "15–25", prep: "Прогулка, растяжка" },
  { name: "Тренировка B (верх/спина+грудь)", focus: "Верх",           duration: "35–50", prep: "5–8 мин разогрев/мобилити" },
  { name: "Отдых",                           focus: "Восстановление", duration: "-",      prep: "Сон 7–9 ч" },
  { name: "Тренировка C (смешанная/кор)",    focus: "Смешанная",      duration: "35–45", prep: "Мобилити + разогрев" },
  { name: "Зона-2 / прогулка",               focus: "Кардио",         duration: "20–30", prep: "Пульс зона-2" },
  { name: "Отдых",                           focus: "Восстановление", duration: "-",      prep: "Сон 7–9 ч" },
];

const makePlan = (len = DEFAULT_DAYS) =>
  Array.from({ length: len }).map((_, i) => {
    const t = dayTemplate[i % dayTemplate.length];
    return { day: i + 1, date: "", title: t.name, focus: t.focus, duration: t.duration, prep: t.prep, status: false, note: "" };
  });

function makeInitialData() {
  return {
    plan: makePlan(DEFAULT_DAYS),
    measures: [{ date: iso(new Date()), weight: "", waist: "", hips: "", notes: "", photo: "" }],
    profile: { name: "", mode: "", level: "S", start: iso(new Date()), days: DEFAULT_DAYS },
    _appliedFromQuery: false,
  };
}

function applyParamsToData(data) {
  const q = getQuery();
  if (!q || data._appliedFromQuery) return data;
  const next = { ...data, profile: { ...data.profile } };
  const days = Math.max(1, Math.min(60, parseInt(q.days || DEFAULT_DAYS))) || DEFAULT_DAYS;
  if (q.name) next.profile.name = decodeURIComponent(q.name);
  if (q.mode && (q.mode === "home" || q.mode === "gym")) next.profile.mode = q.mode;
  if (q.level && ["S","M","P"].includes(q.level)) next.profile.level = q.level;
  next.profile.days = days;
  if (next.plan.length !== days) next.plan = makePlan(days);
  next._appliedFromQuery = true;
  if (q.start) next.profile.start = q.start;
  return next;
}

/* ===================== Measures (Замеры) ===================== */
function MeasuresTab({ data, setData }) {
  const rows = data.measures || [];
  function setRow(i, patch) {
    const next = [...rows]; next[i] = { ...(next[i] || {}), ...patch }; setData({ ...data, measures: next });
  }
  function addRow() { setData({ ...data, measures: [...rows, { date: iso(new Date()), weight: "", waist: "", hips: "", notes: "", photo: "" }] }); }
  function delRow(i) { const next = rows.slice(); next.splice(i,1); setData({ ...data, measures: next.length ? next : [{ date: iso(new Date()), weight: "", waist: "", hips: "", notes: "", photo: "" }] }); }
  const base = rows[0] || {};

  const Delta = ({ v, baseV, unit }) => {
    const a = N(v), b = N(baseV);
    if (!a || !b) return <span className="text-zinc-400">—</span>;
    const d = +(a - b).toFixed(1);
    const cls = d === 0 ? "text-zinc-500" : d > 0 ? "text-rose-600" : "text-emerald-600";
    return <span className={cls}>{d > 0 ? `+${d}` : d}{unit}</span>;
    };

  return (
    <Section title="Замеры и фото" right={<button onClick={addRow} className="rounded-md border border-zinc-300 px-3 py-2 text-sm">+ строка</button>}>
      <p className="mb-3 text-sm text-zinc-600">
        Добавляйте 3 ключевые точки: старт → середина → финиш. Разница (Δ) считается относительно самой первой записи.
      </p>

      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={i} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <label className="text-sm font-medium">
                Дата
                <input type="date" className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  value={r.date || ""} onChange={(e)=>setRow(i,{date:e.target.value})}/>
              </label>
              <button onClick={()=>delRow(i)} className="h-9 rounded-md border border-zinc-300 px-3 text-sm">Удалить</button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="text-sm font-medium">
                Вес, кг <span className="ml-1 text-xs text-zinc-500">· <Delta v={r.weight} baseV={base.weight} unit=" кг" /></span>
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  inputMode="decimal" value={r.weight || ""} onChange={(e)=>setRow(i,{weight:e.target.value})}/>
              </label>

              <label className="text-sm font-medium">
                Талия, см <span className="ml-1 text-xs text-zinc-500">· <Delta v={r.waist} baseV={base.waist} unit=" см" /></span>
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  inputMode="decimal" value={r.waist || ""} onChange={(e)=>setRow(i,{waist:e.target.value})}/>
              </label>

              <label className="text-sm font-medium">
                Бёдра, см <span className="ml-1 text-xs text-zinc-500">· <Delta v={r.hips}  baseV={base.hips}  unit=" см" /></span>
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                  inputMode="decimal" value={r.hips || ""} onChange={(e)=>setRow(i,{hips:e.target.value})}/>
              </label>
            </div>

            <label className="mt-3 block text-sm">
              Заметка
              <textarea rows={3} className="mt-1 w-full rounded-md border border-zinc-300 p-3 text-sm"
                placeholder="Самочувствие, фаза цикла, вода..." value={r.notes || ""}
                onChange={(e)=>setRow(i,{notes:e.target.value})}/>
            </label>

            <label className="mt-3 block text-sm">
              Фото (URL)
              <input className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                placeholder="https://..." value={r.photo || ""}
                onChange={(e)=>setRow(i,{photo:e.target.value})}/>
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm">
        <div>Δ талия: <Delta v={rows.at(-1)?.waist} baseV={base.waist} unit=" см" /></div>
        <div>Δ бёдра: <Delta v={rows.at(-1)?.hips}  baseV={base.hips}  unit=" см" /></div>
        <div>Δ вес: <Delta   v={rows.at(-1)?.weight} baseV={base.weight} unit=" кг" /></div>
      </div>
    </Section>
  );
}

/* ===================== Main ===================== */
export default function R7Tracker() {
  const [data, setData] = usePersistedState(STORAGE_KEY, makeInitialData());
  const [tab, setTab] = useState("programs");
  const { supported: canInstall, install } = usePwaInstall();
  const inTG = isTelegramWebView();
  const [showOB, setShowOB] = useState(false);

  useEffect(() => { setData((prev) => applyParamsToData(prev)); }, []);
  useEffect(() => {
    if (!data.profile?.mode || !data.profile?.level || !data.profile?.start) setShowOB(true);
  }, []);

  const completedDays = useMemo(() => data.plan.filter((d) => d.status).length, [data.plan]);
  const adherence = useMemo(() => Math.round((completedDays / data.plan.length) * 100) || 0, [completedDays, data.plan.length]);

  const last7 = data.plan.slice(0, 7);
  const streakRow = (
    <div className="flex items-center gap-1">
      {last7.map((d, i) => (
        <span key={i} className={`inline-block h-3 w-3 rounded-full ${d.status ? "bg-emerald-500" : "bg-zinc-300"}`} title={`День ${d.day}: ${d.status ? "✓" : "—"}`} />
      ))}
    </div>
  );

  const personalLink = buildPersonalLink({ profile: data.profile });
  const copyLink = async () => { try { await navigator.clipboard.writeText(personalLink); alert("Ссылка скопирована"); } catch { prompt("Скопируйте ссылку:", personalLink); } };

  const measuresArr = Array.isArray(data?.measures) ? data.measures : [];
  const baseM = measuresArr.length > 0 ? (measuresArr[0] || {}) : {};
  const lastM = measuresArr.length > 0 ? (measuresArr[measuresArr.length - 1] || {}) : {};

  const deltaText = (curr, base, unit) => {
    const a = N(curr);
    const b = N(base);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return `— ${unit}`;
    const d = a - b;
    if (d === 0) return `0 ${unit}`;
    const sign = d > 0 ? "+" : "";
    return `${sign}${d.toFixed(1)} ${unit}`;
  };

  const deltaClass = (curr, base) => {
    const a = N(curr), b = N(base);
    if (!a || !b) return "text-zinc-600";
    const d = a - b;
    if (d === 0) return "text-zinc-600";
    return d > 0 ? "text-rose-600" : "text-emerald-600";
  };

  return (
    <div className="mx-auto max-w-6xl p-4 text-zinc-800">
      <header className="mb-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-rose-100 to-indigo-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">R7 — трекер</h1>
          <ActionsMenu
            onSettings={() => setShowOB(true)}
            onCopy={copyLink}
            onShare={() => navigator.share?.({ title: "R7 Tracker", url: personalLink }).catch(() => {})}
            onExport={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
              const url = URL.createObjectURL(blob); const a = document.createElement("a");
              a.href = url; a.download = "R7_tracker_export.json"; a.click(); URL.revokeObjectURL(url);
            }}
            onImport={(file) => {
              const reader = new FileReader();
              reader.onload = (e) => { try { setData(JSON.parse(e.target?.result)); } catch { alert("Не удалось импортировать JSON"); } };
              reader.readAsText(file);
            }}
            onReset={() => { if (confirm("Сбросить трекер?")) setData(makeInitialData()); }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          {data.profile?.name && <Pill className="bg-white/70">👤 {data.profile.name}</Pill>}
          {data.profile?.mode && <Pill className="bg-white/70">🏠/🏋️‍♀️ {data.profile.mode === "home" ? "Дом" : "Зал"}</Pill>}
          {data.profile?.level && <Pill className="bg-white/70">Уровень: {data.profile.level === "S" ? "Start" : data.profile.level}</Pill>}
          {data.profile?.start && <Pill className="bg-white/70">Старт: {data.profile.start}</Pill>}
          {data.profile?.days && <Pill className="bg-white/70">Длительность: {data.profile.days} дн.</Pill>}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Pill className="bg-white/70">Приверженность: <b className="ml-1">{adherence}%</b></Pill>
          <div className="rounded-full border border-zinc-300 bg-white/70 px-2 py-1 text-xs text-zinc-600">Streak: {streakRow}</div>
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
          <Pill className="bg-white/70">
            Δ талия: <b className={`ml-1 ${deltaClass(lastM.waist, baseM.waist)}`}>{deltaText(lastM.waist, baseM.waist, "см")}</b>
          </Pill>
          <Pill className="bg-white/70">
            Δ бёдра: <b className={`ml-1 ${deltaClass(lastM.hips, baseM.hips)}`}>{deltaText(lastM.hips, baseM.hips, "см")}</b>
          </Pill>
          <Pill className="bg-white/70">
            Δ вес: <b className={`ml-1 ${deltaClass(lastM.weight, baseM.weight)}`}>{deltaText(lastM.weight, baseM.weight, "кг")}</b>
          </Pill>
        </div>

        <nav className="mt-2 flex flex-wrap gap-2">
          {[
            ["programs", "Программы"],
            ["plan", "План"],
            ["measures", "Замеры"],
          ].map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-2 text-sm ${tab === k ? "bg-black text-white" : `border ${BORDER_LITE}`}`}>{label}</button>
          ))}
        </nav>
      </header>

      {tab === "programs" && <ProgramsTab data={data} setData={setData} />}

      {tab === "plan" && (
        <Section title="План на 30 дней" right={<span className="text-sm text-zinc-500">Отмечайте выполненные дни</span>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.plan.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-zinc-300 bg-white p-3">
                <div className="min-w-0">
                  <div className="mb-1 text-sm text-zinc-500">День {d.day}</div>
                  <div className="truncate font-medium">{d.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <Pill>{d.focus}</Pill>
                    <Pill>⏱ {d.duration} мин</Pill>
                    <Pill>{d.prep}</Pill>
                  </div>
                  <textarea
                    className="mt-2 w-full rounded-md border border-zinc-300 p-2 text-sm"
                    rows={2}
                    placeholder="Заметка"
                    value={d.note}
                    onChange={(e) => {
                      const next = [...data.plan];
                      next[i].note = e.target.value;
                      setData({ ...data, plan: next });
                    }}
                  />
                </div>
                <div className="flex w-40 flex-col items-end gap-2">
                  <input
                    type="date"
                    className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                    value={d.date}
                    onChange={(e) => {
                      const next = [...data.plan];
                      next[i].date = e.target.value;
                      setData({ ...data, plan: next });
                    }}
                  />
                  <button
                    onClick={() => {
                      const next = [...data.plan];
                      next[i].status = !next[i].status;
                      setData({ ...data, plan: next });
                    }}
                    className={`w-full rounded-md px-3 py-2 text-sm ${d.status ? "bg-emerald-600 text-white" : "bg-zinc-100"}`}
                  >
                    {d.status ? "Выполнено ✅" : "Отметить"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Section>
      )}

      {tab === "measures" && <MeasuresTab data={data} setData={setData} />}

      <footer className="mt-8 text-center text-sm text-zinc-500">
        R7 • Данные хранятся локально (localStorage). Для переноса используйте Экспорт/Импорт.
      </footer>

      {showOB && (
        <Onboarding
          initial={data.profile}
          onClose={(payload) => {
            setShowOB(false);
            if (payload) setData({ ...data, profile: { ...data.profile, ...payload } });
          }}
        />
      )}
    </div>
  );
}

/* ===================== Onboarding ===================== */
function Onboarding({ initial, onClose }) {
  const [name, setName]   = useState(initial?.name || "");
  const [mode, setMode]   = useState(initial?.mode || "home");
  const [level, setLevel] = useState(initial?.level || "S");
  const [start, setStart] = useState(initial?.start || iso(new Date()));
  const [days, setDays]   = useState(initial?.days || DEFAULT_DAYS);

  function save() { onClose({ name, mode, level, start, days: Number(days) || DEFAULT_DAYS }); }
  const personalLink = buildPersonalLink({ profile: { name, mode, level, start, days } });

  async function copy() {
    try { await navigator.clipboard.writeText(personalLink); alert("Ссылка скопирована"); }
    catch { prompt("Скопируйте ссылку:", personalLink); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Быстрая настройка</h3>
          <button onClick={() => onClose(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">Имя
            <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" placeholder="Мария" />
          </label>
          <label className="text-sm">Дата старта
            <input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2" />
          </label>
          <label className="text-sm">Формат
            <select value={mode} onChange={(e) => setMode(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2">
              <option value="home">Дом</option>
              <option value="gym">Зал</option>
            </select>
          </label>
          <label className="text-sm">Уровень
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2">
              <option value="S">Start</option>
              <option value="M">Medium</option>
              <option value="P">Pro</option>
            </select>
          </label>
          <label className="text-sm">Длительность
            <select value={String(days)} onChange={(e) => setDays(e.target.value)} className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2">
              <option value="14">14 дней</option>
              <option value="30">30 дней</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="truncate text-xs text-zinc-500" title={personalLink}>{personalLink}</div>
          <div className="flex gap-2">
            <button onClick={copy} className={`rounded-md border ${BORDER_LITE} px-3 py-2 text-sm`}>Скопировать ссылку</button>
            {typeof navigator !== "undefined" && navigator.share && (
              <button onClick={() => navigator.share({ title: "R7 Tracker", url: personalLink }).catch(() => {})} className={`rounded-md border ${BORDER_LITE} px-3 py-2 text-sm`}>Поделиться</button>
            )}
            <button onClick={save} className="rounded-md bg-black px-4 py-2 text-sm text-white">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
}
