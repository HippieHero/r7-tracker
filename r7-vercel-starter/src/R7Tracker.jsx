import React, { useEffect, useMemo, useState } from "react";

// ---------- Helpers ----------
const STORAGE_KEY = "r7_tracker_v3"; // 30‑day defaults
const DEFAULT_DAYS = 30;

function usePersistedState(key, initial) {
  const [state, setState] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initial;
    } catch (_) {
      return initial;
    }
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(state));
  }, [key, state]);
  return [state, setState];
}

const dayTemplate = [
  { name: "Тренировка A (низ/ягодицы)", focus: "Низ", duration: "35–50", prep: "5–8 мин разогрев/мобилити" },
  { name: "Отдых / мобилити", focus: "Восстановление", duration: "15–25", prep: "Прогулка, растяжка" },
  { name: "Тренировка B (верх/спина+грудь)", focus: "Верх", duration: "35–50", prep: "5–8 мин разогрев/мобилити" },
  { name: "Отдых", focus: "Восстановление", duration: "-", prep: "Сон 7–9 ч" },
  { name: "Тренировка C (смешанная/кор)", focus: "Смешанная", duration: "35–45", prep: "Мобилити + разогрев" },
  { name: "Зона‑2 / прогулка", focus: "Кардио", duration: "20–30", prep: "Пульс зона‑2" },
  { name: "Отдых", focus: "Восстановление", duration: "-", prep: "Сон 7–9 ч" },
];

function makePlan(len = DEFAULT_DAYS) {
  return Array.from({ length: len }).map((_, i) => {
    const t = dayTemplate[i % dayTemplate.length];
    return {
      day: i + 1,
      date: "",
      title: t.name,
      focus: t.focus,
      duration: t.duration,
      prep: t.prep,
      status: false,
      note: "",
    };
  });
}

function makeInitialData() {
  return {
    plan: makePlan(DEFAULT_DAYS),
    sessions: [],
    measures: [{ date: "", weight: "", waist: "", hips: "", photo: "", sleep: "", energy: "", stress: "" }],
    nutrition: Array.from({ length: DEFAULT_DAYS }).map(() => ({ date: "", kcalGoal: "", kcalFact: "", protein: "", fat: "", carbs: "", water: "", steps: "" })),
    wellbeing: Array.from({ length: DEFAULT_DAYS }).map(() => ({ date: "", sleep: "", sleepQ: "", energy: "", doms: "", motivation: "", stress: "", pain: "", notes: "" })),
    profile: { name: "", mode: "", level: "", start: "", days: DEFAULT_DAYS },
    _appliedFromQuery: false,
  };
}

function getQuery() {
  try {
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(p.entries());
  } catch { return {}; }
}

function iso(d){
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${y}-${m}-${dd}`;
}

function ensureLen(arr, len, factory){
  const out = arr.slice(0, len);
  while(out.length < len) out.push(factory());
  return out;
}

function planWithDates(plan, startISO){
  const d0 = new Date(startISO);
  if (isNaN(+d0)) return plan;
  return plan.map((row, i) => {
    const di = new Date(d0);
    di.setDate(d0.getDate() + i);
    return { ...row, date: iso(di) };
  });
}

function applyParamsToData(data) {
  const q = getQuery();
  if (!q || data._appliedFromQuery) return data;
  const next = { ...data, profile: { ...data.profile } };

  // Days
  const days = Math.max(1, Math.min(60, parseInt(q.days || DEFAULT_DAYS))) || DEFAULT_DAYS;

  if (q.name) next.profile.name = decodeURIComponent(q.name);
  if (q.mode && (q.mode === "home" || q.mode === "gym")) next.profile.mode = q.mode;
  if (q.level && ["S","M","P"].includes(q.level)) next.profile.level = q.level;
  next.profile.days = days;

  // Resize collections
  if (next.plan.length !== days) next.plan = makePlan(days);
  next.nutrition = ensureLen(next.nutrition, days, () => ({ date: "", kcalGoal: "", kcalFact: "", protein: "", fat: "", carbs: "", water: "", steps: "" }));
  next.wellbeing = ensureLen(next.wellbeing, days, () => ({ date: "", sleep: "", sleepQ: "", energy: "", doms: "", motivation: "", stress: "", pain: "", notes: "" }));

  if (q.start) {
    next.profile.start = q.start;
    next.plan = planWithDates(next.plan, q.start);
  }
  next._appliedFromQuery = true;
  return next;
}

function buildPersonalLink({ base = null, profile }){
  try {
    const url = new URL(base || (window.location.origin + window.location.pathname));
    const p = new URLSearchParams();
    if (profile?.mode) p.set('mode', profile.mode);
    if (profile?.level) p.set('level', profile.level);
    if (profile?.start) p.set('start', profile.start);
    if (profile?.name) p.set('name', encodeURIComponent(profile.name));
    if (profile?.days) p.set('days', String(profile.days));
    url.search = p.toString();
    return url.toString();
  } catch { return window.location.href; }
}

// ---------- UI Primitives ----------
const Section = ({ title, children, right }) => (
  <section className="mb-8 rounded-2xl border border-zinc-200 bg-white/70 p-4 shadow-sm backdrop-blur">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div>{right}</div>
    </div>
    {children}
  </section>
);

const Pill = ({ children, className = "" }) => (
  <span className={`inline-flex items-center rounded-full border px-2 py-1 text-xs ${className}`}>{children}</span>
);

function NumberCell({ value, setValue, min, max, step = 1 }) {
  return (
    <input
      type="number"
      value={value ?? ""}
      onChange={(e) => setValue(e.target.value)}
      min={min}
      max={max}
      step={step}
      className="w-20 rounded-md border border-zinc-300 px-2 py-1 text-sm"
    />
  );
}

// ---------- Install / Telegram helpers ----------
function usePwaInstall() {
  const [deferred, setDeferred] = useState(null);
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); setSupported(true); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    return () => window.removeEventListener('beforeinstallprompt', onPrompt);
  }, []);
  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice.catch(()=>{});
  };
  return { supported, install };
}

function isTelegramWebView(){
  return typeof navigator !== 'undefined' && /Telegram/i.test(navigator.userAgent || "");
}

// ---------- Onboarding Modal ----------
function Onboarding({ initial, onClose }){
  const [name, setName] = useState(initial?.name || "");
  const [mode, setMode] = useState(initial?.mode || "home");
  const [level, setLevel] = useState(initial?.level || "S");
  const [start, setStart] = useState(initial?.start || (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const dd = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${dd}`;
  })());
  const [days, setDays] = useState(initial?.days || DEFAULT_DAYS);

  function save(){
    onClose({ name, mode, level, start, days: Number(days) || DEFAULT_DAYS });
  }

  const personalLink = buildPersonalLink({ profile: { name, mode, level, start, days } });

  async function copy(){
    try { await navigator.clipboard.writeText(personalLink); alert('Ссылка скопирована'); }
    catch { prompt('Скопируйте ссылку вручную:', personalLink); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Быстрая настройка</h3>
          <button onClick={()=>onClose(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">✕</button>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm">Имя
            <input value={name} onChange={(e)=>setName(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2" placeholder="Мария"/>
          </label>
          <label className="text-sm">Дата старта
            <input type="date" value={start} onChange={(e)=>setStart(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2"/>
          </label>
          <label className="text-sm">Формат
            <select value={mode} onChange={(e)=>setMode(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
              <option value="home">Дом</option>
              <option value="gym">Зал</option>
            </select>
          </label>
          <label className="text-sm">Уровень
            <select value={level} onChange={(e)=>setLevel(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
              <option value="S">Start</option>
              <option value="M">Medium</option>
              <option value="P">Pro</option>
            </select>
          </label>
          <label className="text-sm">Длительность
            <select value={String(days)} onChange={(e)=>setDays(e.target.value)} className="mt-1 w-full rounded-md border px-3 py-2">
              <option value="14">14 дней</option>
              <option value="30">30 дней</option>
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs text-zinc-500 truncate" title={personalLink}>{personalLink}</div>
          <div className="flex gap-2">
            <button onClick={copy} className="rounded-md border px-3 py-2 text-sm">Скопировать ссылку</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={()=>navigator.share({ title: 'R7 Tracker', url: personalLink }).catch(()=>{})} className="rounded-md border px-3 py-2 text-sm">Поделиться</button>
            )}
            <button onClick={save} className="rounded-md bg-black px-4 py-2 text-sm text-white">Сохранить</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------- Main Component ----------
export default function R7Tracker() {
  const [data, setData] = usePersistedState(STORAGE_KEY, makeInitialData());
  const [tab, setTab] = useState("plan");
  const { supported: canInstall, install } = usePwaInstall();
  const inTG = isTelegramWebView();
  const [showOB, setShowOB] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  // Apply URL params once
  useEffect(() => {
    setData((prev) => applyParamsToData(prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open onboarding at first launch if profile empty
  useEffect(()=>{
    if (!data.profile?.mode || !data.profile?.level || !data.profile?.start) {
      setShowOB(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const completedDays = useMemo(() => data.plan.filter((d) => d.status).length, [data.plan]);
  const adherence = useMemo(() => Math.round((completedDays / data.plan.length) * 100) || 0, [completedDays]);

  const base = data.measures[0] || {};
  const last = data.measures[data.measures.length - 1] || {};
  const dWaist = base.waist && last.waist ? (parseFloat(last.waist) - parseFloat(base.waist)).toFixed(1) : "";
  const dHips = base.hips && last.hips ? (parseFloat(last.hips) - parseFloat(base.hips)).toFixed(1) : "";
  const dWeight = base.weight && last.weight ? (parseFloat(last.weight) - parseFloat(base.weight)).toFixed(1) : "";

  function addSession() {
    setData({ ...data, sessions: [...data.sessions, { date: "", day: "", place: "Дом", exercise: "", sets: "", reps: "", weight: "", rir: "", rpe: "", rest: "", notes: "" }] });
  }
  function removeSession(i) {
    const next = [...data.sessions];
    next.splice(i, 1);
    setData({ ...data, sessions: next });
  }

  function addMeasureRow() {
    setData({ ...data, measures: [...data.measures, { date: "", weight: "", waist: "", hips: "", photo: "", sleep: "", energy: "", stress: "" }] });
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "R7_tracker_export.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result);
        setData(parsed);
      } catch (err) {
        alert("Файл не удалось импортировать. Проверьте формат JSON.");
      }
    };
    reader.readAsText(file);
  }

  function resetAll() {
    if (confirm("Сбросить трекер? Данные будут удалены.")) setData(makeInitialData());
  }

  function labelLevel(l){
    return l === 'S' ? 'Start' : l === 'M' ? 'Medium' : l === 'P' ? 'Pro' : '';
  }

  function resizeAndApply(profile){
    const days = Math.max(1, Math.min(60, Number(profile.days) || DEFAULT_DAYS));
    let plan = makePlan(days);
    if (profile.start) plan = planWithDates(plan, profile.start);
    const nutrition = ensureLen([], days, () => ({ date: "", kcalGoal: "", kcalFact: "", protein: "", fat: "", carbs: "", water: "", steps: "" }));
    const wellbeing = ensureLen([], days, () => ({ date: "", sleep: "", sleepQ: "", energy: "", doms: "", motivation: "", stress: "", pain: "", notes: "" }));
    setData((prev)=> ({
      ...prev,
      plan,
      nutrition,
      wellbeing,
      profile: { ...prev.profile, ...profile },
    }));
  }

  const personalLink = buildPersonalLink({ profile: data.profile });

  async function copyLink(){
    try { await navigator.clipboard.writeText(personalLink); setJustCopied(true); setTimeout(()=>setJustCopied(false), 2000); }
    catch { prompt('Скопируйте ссылку вручную:', personalLink); }
  }

  return (
    <div className="mx-auto max-w-6xl p-4 text-zinc-800">
      <header className="mb-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-rose-100 to-indigo-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">R7 — 30‑дневный трекер (дом/зал)</h1>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={()=>setShowOB(true)} className="rounded-full border px-4 py-2 text-sm">Настроить</button>
            <button onClick={copyLink} className="rounded-full border px-4 py-2 text-sm">{justCopied ? 'Ссылка скопирована' : 'Скопировать ссылку'}</button>
            {typeof navigator !== 'undefined' && navigator.share && (
              <button onClick={()=>navigator.share({ title: 'R7 Tracker', url: personalLink }).catch(()=>{})} className="rounded-full border px-4 py-2 text-sm">Поделиться</button>
            )}
            <button onClick={exportJson} className="rounded-full bg-black px-4 py-2 text-sm text-white">Экспорт</button>
            <label className="cursor-pointer rounded-full border px-4 py-2 text-sm">
              Импорт
              <input type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
            </label>
            <button onClick={resetAll} className="rounded-full border px-4 py-2 text-sm">Сброс</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {data.profile?.name && <Pill className="bg-white/70">👤 {data.profile.name}</Pill>}
          {data.profile?.mode && <Pill className="bg-white/70">🏠/🏋️‍♀️ {data.profile.mode === 'home' ? 'Дом' : 'Зал'}</Pill>}
          {data.profile?.level && <Pill className="bg-white/70">Уровень: {labelLevel(data.profile.level)}</Pill>}
          {data.profile?.start && <Pill className="bg-white/70">Старт: {data.profile.start}</Pill>}
          {data.profile?.days && <Pill className="bg-white/70">Длительность: {data.profile.days} дн.</Pill>}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Pill className="bg-white/70">Приверженность: <b className="ml-1">{adherence}%</b></Pill>
          <Pill className="bg-white/70">Δ талия: <b className="ml-1">{dWaist || "—"} см</b></Pill>
          <Pill className="bg-white/70">Δ бёдра: <b className="ml-1">{dHips || "—"} см</b></Pill>
          <Pill className="bg-white/70">Δ вес: <b className="ml-1">{dWeight || "—"} кг</b></Pill>
        </div>
        {(inTG || canInstall) && (
          <div className="mt-2 rounded-xl border border-zinc-300 bg-white/80 p-3 text-sm">
            {inTG && (
              <div className="mb-1">Вы открыли трекер внутри Telegram. Чтобы установить как приложение, нажмите <b>⋯</b> → <b>Open in Safari/Chrome</b>, затем «Добавить на экран».</div>
            )}
            {canInstall && (
              <button onClick={install} className="mt-2 rounded-md bg-black px-3 py-2 text-white">Установить как приложение</button>
            )}
          </div>
        )}
        <nav className="mt-2 flex flex-wrap gap-2">
          {[
            ["plan", "План"],
            ["sessions", "Сессии"],
            ["measures", "Замеры"],
            ["nutrition", "Питание"],
            ["wellbeing", "Самочувствие"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm ${tab === k ? "bg-black text-white" : "border"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "plan" && (
        <Section title="План на 30 дней" right={<span className="text-sm text-zinc-500">Отмечайте выполненные дни</span>}>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.plan.map((d, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border p-3">
                <div className="min-w-0">
                  <div className="mb-1 text-sm text-zinc-500">День {d.day}</div>
                  <div className="truncate font-medium">{d.title}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                    <Pill>{d.focus}</Pill>
                    <Pill>⏱ {d.duration} мин</Pill>
                    <Pill>{d.prep}</Pill>
                  </div>
                  <textarea
                    className="mt-2 w-full rounded-md border p-2 text-sm"
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
                    className="w-full rounded-md border px-2 py-1 text-sm"
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

      {tab === "sessions" && (
        <Section title="Тренировочные сессии" right={<button onClick={addSession} className="rounded-md bg-black px-3 py-2 text-sm text-white">+ Добавить</button>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {[
                    "Дата",
                    "День",
                    "Место",
                    "Упражнение",
                    "Подх.",
                    "Повт.",
                    "Вес, кг",
                    "RIR",
                    "RPE",
                    "Отдых, с",
                    "Заметки",
                    "",
                  ].map((h) => (
                    <th key={h} className="whitespace-nowrap px-2 py-2 text-left font-medium text-zinc-600">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sessions.map((s, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1"><input type="date" value={s.date} onChange={(e)=>{const ns=[...data.sessions];ns[i].date=e.target.value;setData({...data,sessions:ns})}} className="rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1"><input value={s.day} onChange={(e)=>{const ns=[...data.sessions];ns[i].day=e.target.value;setData({...data,sessions:ns})}} className="w-16 rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1">
                      <select value={s.place} onChange={(e)=>{const ns=[...data.sessions];ns[i].place=e.target.value;setData({...data,sessions:ns})}} className="rounded border px-2 py-1">
                        <option>Дом</option>
                        <option>Зал</option>
                      </select>
                    </td>
                    <td className="px-2 py-1"><input value={s.exercise} onChange={(e)=>{const ns=[...data.sessions];ns[i].exercise=e.target.value;setData({...data,sessions:ns})}} className="w-56 rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1"><NumberCell value={s.sets} setValue={(v)=>{const ns=[...data.sessions];ns[i].sets=v;setData({...data,sessions:ns})}}/></td>
                    <td className="px-2 py-1"><NumberCell value={s.reps} setValue={(v)=>{const ns=[...data.sessions];ns[i].reps=v;setData({...data,sessions:ns})}}/></td>
                    <td className="px-2 py-1"><NumberCell value={s.weight} setValue={(v)=>{const ns=[...data.sessions];ns[i].weight=v;setData({...data,sessions:ns})}} step={0.5}/></td>
                    <td className="px-2 py-1"><NumberCell value={s.rir} setValue={(v)=>{const ns=[...data.sessions];ns[i].rir=v;setData({...data,sessions:ns})}}/></td>
                    <td className="px-2 py-1"><NumberCell value={s.rpe} setValue={(v)=>{const ns=[...data.sessions];ns[i].rpe=v;setData({...data,sessions:ns})}}/></td>
                    <td className="px-2 py-1"><NumberCell value={s.rest} setValue={(v)=>{const ns=[...data.sessions];ns[i].rest=v;setData({...data,sessions:ns})}}/></td>
                    <td className="px-2 py-1"><input value={s.notes} onChange={(e)=>{const ns=[...data.sessions];ns[i].notes=e.target.value;setData({...data,sessions:ns})}} className="w-64 rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1 text-right"><button onClick={()=>removeSession(i)} className="text-rose-600">Удалить</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === "measures" && (
        <Section title="Замеры и фото">
          <div className="mb-2 text-sm text-zinc-600">Добавляйте строки: старт → 15 день → 30 день. Δ считается относительно первой строки.</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {["Дата","Вес, кг","Талия, см","Бёдра, см","Фото (ссылка/метка)","Сон, ч","Энергия (1–5)","Стресс (1–5)"].map((h)=>(
                    <th key={h} className="px-2 py-2 text-left font-medium text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.measures.map((m, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1"><input type="date" value={m.date} onChange={(e)=>{const nm=[...data.measures];nm[i].date=e.target.value;setData({...data,measures:nm})}} className="rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1"><NumberCell value={m.weight} setValue={(v)=>{const nm=[...data.measures];nm[i].weight=v;setData({...data,measures:nm})}} step={0.1}/></td>
                    <td className="px-2 py-1"><NumberCell value={m.waist} setValue={(v)=>{const nm=[...data.measures];nm[i].waist=v;setData({...data,measures:nm})}} step={0.1}/></td>
                    <td className="px-2 py-1"><NumberCell value={m.hips} setValue={(v)=>{const nm=[...data.measures];nm[i].hips=v;setData({...data,measures:nm})}} step={0.1}/></td>
                    <td className="px-2 py-1"><input value={m.photo} onChange={(e)=>{const nm=[...data.measures];nm[i].photo=e.target.value;setData({...data,measures:nm})}} className="w-64 rounded border px-2 py-1"/></td>
                    <td className="px-2 py-1"><NumberCell value={m.sleep} setValue={(v)=>{const nm=[...data.measures];nm[i].sleep=v;setData({...data,measures:nm})}} step={0.1}/></td>
                    <td className="px-2 py-1"><NumberCell value={m.energy} setValue={(v)=>{const nm=[...data.measures];nm[i].energy=v;setData({...data,measures:nm})}}/></td>
                    <td className="px-2 py-1"><NumberCell value={m.stress} setValue={(v)=>{const nm=[...data.measures];nm[i].stress=v;setData({...data,measures:nm})}}/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-3">
            <button onClick={addMeasureRow} className="rounded-md border px-3 py-2 text-sm">+ Добавить строку</button>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-2 text-sm md:grid-cols-3">
            <div className="rounded-lg bg-emerald-50 p-3">Δ талия: <b>{dWaist || "—"} см</b></div>
            <div className="rounded-lg bg-emerald-50 p-3">Δ бёдра: <b>{dHips || "—"} см</b></div>
            <div className="rounded-lg bg-emerald-50 p-3">Δ вес: <b>{dWeight || "—"} кг</b></div>
          </div>
        </Section>
      )}

      {tab === "nutrition" && (
        <Section title="Питание (30 дней)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-зinc-50">
                <tr>
                  {["Дата","Цель, ккал","Факт, ккал","Белок, г","Жиры, г","Углев., г","Вода, л","Шаги"].map((h)=>(
                    <th key={h} className="px-2 py-2 text-left font-medium text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.nutrition.map((n, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1"><input type="date" value={n.date} onChange={(e)=>{const nn=[...data.nutrition];nn[i].date=e.target.value;setData({...data,nutrition:nn})}} className="rounded border px-2 py-1"/></td>
                    {["kcalGoal","kcalFact","protein","fat","carbs","water","steps"].map((k)=> (
                      <td key={k} className="px-2 py-1"><NumberCell value={n[k]} setValue={(v)=>{const nn=[...data.nutrition];nn[i][k]=v;setData({...data,nutrition:nn})}} step={k==="water"?0.1:1}/></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {tab === "wellbeing" && (
        <Section title="Самочувствие (ежедневно)">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  {["Дата","Сон, ч","Кач-во сна (1–5)","Энергия (1–5)","DOMS (0–10)","Мотивация (1–5)","Стресс (1–5)","Боль спина/колени (0–10)","Заметки"].map((h)=>(
                    <th key={h} className="px-2 py-2 text-left font-medium text-zinc-600">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.wellbeing.map((w, i) => (
                  <tr key={i} className="border-b">
                    <td className="px-2 py-1"><input type="date" value={w.date} onChange={(e)=>{const nw=[...data.wellbeing];nw[i].date=e.target.value;setData({...data,wellbeing:nw})}} className="rounded border px-2 py-1"/></td>
                    {["sleep","sleepQ","energy","doms","motivation","stress","pain"].map((k)=> (
                      <td key={k} className="px-2 py-1"><NumberCell value={w[k]} setValue={(v)=>{const nw=[...data.wellbeing];nw[i][k]=v;setData({...data,wellbeing:nw})}} step={k==="sleep"?0.1:1}/></td>
                    ))}
                    <td className="px-2 py-1"><input value={w.notes} onChange={(e)=>{const nw=[...data.wellbeing];nw[i].notes=e.target.value;setData({...data,wellbeing:nw})}} className="w-72 rounded border px-2 py-1"/></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <footer className="mt-8 text-center text-sm text-zinc-500">
        R7 • Локальное хранение данных в браузере (localStorage). Для переноса используйте Экспорт/Импорт.
      </footer>

      {showOB && (
        <Onboarding
          initial={data.profile}
          onClose={(payload)=>{
            if (!payload) return setShowOB(false);
            resizeAndApply(payload);
            setShowOB(false);
          }}
        />
      )}
    </div>
  );
}
