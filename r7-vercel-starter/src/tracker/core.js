// Константы
export const STORAGE_KEY = "r7_tracker_v4";
export const PROG_KEY    = "r7_programs_v2";
export const BORDER_LITE = "border-zinc-300";
export const DEFAULT_DAYS = 30;

// Вибрация
export const vibrate = (ms = 15) => { try { window.navigator.vibrate?.(ms); } catch {} };

// Безопасный парс числа
export const N = (v) => {
  const x = parseFloat(String(v).replace(",", "."));
  return Number.isFinite(x) ? x : 0;
};

// Дата YYYY-MM-DD
export const iso = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
};

// localStorage state
import React, { useEffect } from "react";
export function usePersistedState(key, initial) {
  const [state, setState] = React.useState(() => {
    try { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(state)); } catch {} }, [key, state]);
  return [state, setState];
}

// query → объект
export function getQuery() {
  try {
    const p = new URLSearchParams(window.location.search);
    return Object.fromEntries(p.entries());
  } catch { return {}; }
}

// Персональная ссылка
export function buildPersonalLink({ base = null, profile }) {
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

// PWA
export function usePwaInstall() {
  const [deferred, setDeferred] = React.useState(null);
  const [supported, setSupported] = React.useState(false);
  React.useEffect(() => {
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

export const isTelegramWebView = () =>
  typeof navigator !== "undefined" && /Telegram/i.test(navigator.userAgent || "");

// ===================== Программы / Данные =====================
export const VK_CRUNCH = "https://vkvideo.ru/video-226154718_456239154";

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
  { title: "День 2 — Верх", place: "Дом",
    exercises: [
      { muscle: "Спина", name: "Вертикальная тяга на одну руку", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Фиксация ленты выше головы…", videos: [] },
      { muscle: "Грудь", name: "Жим лёжа", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантели (по желанию)"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Локти ~45°…", videos: [] },
      { muscle: "Спина", name: "Горизонтальная тяга", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Длинная петля","Плоская лента"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Тянем к корпусу…", videos: [] },
      { muscle: "Грудь", name: "Сведение лёжа на грудь", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантели"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Слегка согнутые локти…", videos: [] },
      { muscle: "Пресс", name: "Скручивания", warmup: false, workSets: 3, reps: "15–30", rest: "60–120 сек",
        equipment: ["Масса тела"], intensity: "До жжения", notes: "Без рывков…",
        videos: [{ label: "Скручивания — техника", href: VK_CRUNCH }] },
    ]
  },
  { title: "День 3 — Ноги/Ягодицы", place: "Дом",
    exercises: [
      { muscle: "Ягодицы", name: "Ягодичный мостик", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Гантель на таз","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)",
        notes: "Колени ~90°, фиксация 1–2 сек…", videos: [] },
      { muscle: "Бицепс бедра", name: "Сгибания ног стоя", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Опора рукой…", videos: [] },
      { muscle: "Ягодицы", name: "Отведение ноги в сторону (на четвереньках)", warmup: true, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Лента выше колен…", videos: [] },
      { muscle: "Ягодицы", name: "Жим ногой на четвереньках", warmup: false, workSets: 3, reps: "12–15", rest: "60–120 сек",
        equipment: ["Плоская лента","Мини-бэнд"], intensity: "Вблизи отказа (1–2 повт.)", notes: "Выпрямляем назад/вверх…", videos: [] },
      { muscle: "Пресс", name: "Скручивания", warmup: false, workSets: 1, reps: "15–30", rest: "60–120 сек",
        equipment: ["Масса тела"], intensity: "До жжения", notes: "До жжения…",
        videos: [{ label: "Скручивания — техника", href: VK_CRUNCH }] },
    ]
  }
];

export const PROGRAMS = {
  S: { name: "Start",  weeks: [{ name: "Неделя 1", days: WEEK1_DAYS }, { name: "Неделя 2", days: WEEK1_DAYS }, { name: "Неделя 3", days: WEEK1_DAYS }, { name: "Неделя 4", days: WEEK1_DAYS }]},
  M: { name: "Medium", weeks: [] },
  P: { name: "Pro",    weeks: [] },
};

// План 30д
const PLAN_TEMPLATE = [
  { type: "workout", level: "S", dayIndex: 0 },
  { type: "rest", title: "Отдых / мобилити" },
  { type: "workout", level: "S", dayIndex: 1 },
  { type: "rest", title: "Отдых" },
  { type: "workout", level: "S", dayIndex: 2 },
  { type: "rest", title: "Зона-2 / прогулка" },
  { type: "rest", title: "Отдых" },
];
const SUMMARY_TEMPLATE = { volume: 0, effectiveness: null, duration: 0, exercises: 0 };
export const createEmptySummary = () => ({ ...SUMMARY_TEMPLATE });

export function ensurePlanEntryDefaults(entry = {}, index = 0) {
  const original = entry || {};
  let next = original;
  const ensureClone = () => {
    if (next === original) next = { ...original };
  };

if (next.programLevel === undefined) {
    ensureClone();
    next.programLevel = null;
  }

  if (next.programLevel != null && typeof next.programLevel !== "string") {
    ensureClone();
    next.programLevel = String(next.programLevel);
  }

  if (next.programLevelName == null) {
    ensureClone();
    next.programLevelName = "";
  }

  if (next.programWeekIndex === undefined) {
    ensureClone();
    next.programWeekIndex = null;
  }

  if (next.programWeekIndex != null && !Number.isFinite(next.programWeekIndex)) {
    const parsed = Number(next.programWeekIndex);
    ensureClone();
    next.programWeekIndex = Number.isFinite(parsed) ? parsed : null;
  }

  if (next.programWeekName == null) {
    ensureClone();
    next.programWeekName = "";
  }

  if (next.programDayIndex === undefined) {
    ensureClone();
    next.programDayIndex = null;
  }

  if (next.programDayIndex != null && !Number.isFinite(next.programDayIndex)) {
    const parsed = Number(next.programDayIndex);
    ensureClone();
    next.programDayIndex = Number.isFinite(parsed) ? parsed : null;
  }

  if (next.programDayName == null) {
    ensureClone();
    next.programDayName = "";
  }

  
  if (next.day == null) {
    ensureClone();
    next.day = index + 1;
  }
  if (next.date == null) {
    ensureClone();
    next.date = "";
  }
  if (next.title == null) {
    ensureClone();
    next.title = "";
  }
  if (next.focus !== "") {
    ensureClone();
    next.focus = "";
  }
 if (next.duration !== "") {
    ensureClone();
    next.duration = "";
  }
 if (next.prep !== "") {
    ensureClone();
    next.prep = "";
  }
  if (next.note == null) {
    ensureClone();
    next.note = "";
  }

const levelKey = typeof next.programLevel === "string" && next.programLevel ? next.programLevel : null;
  const program = levelKey ? PROGRAMS[levelKey] : null;
  const weeks = Array.isArray(program?.weeks) ? program.weeks : [];
  if (program && (!next.programLevelName || next.programLevelName === "")) {
    ensureClone();
    next.programLevelName = program.name || levelKey;
  }

  const weekIndex = Number.isFinite(next.programWeekIndex) ? next.programWeekIndex : null;
  if (program && weekIndex != null && weeks[weekIndex]) {
    const week = weeks[weekIndex];
    if (!next.programWeekName) {
      ensureClone();
      next.programWeekName = week?.name || next.programWeekName || "";
    }

    const dayIndex = Number.isFinite(next.programDayIndex) ? next.programDayIndex : null;
    const days = Array.isArray(week?.days) ? week.days : [];
    if (dayIndex != null && days[dayIndex]) {
      const day = days[dayIndex];
      if (!next.programDayName) {
        ensureClone();
        next.programDayName = day?.title || next.programDayName || "";
      }
      if (!next.title) {
        ensureClone();
        next.title = day?.title || next.title || "";
      }
    }
  }
  
  const summarySource = next.summary;
  if (!summarySource || typeof summarySource !== "object") {
    ensureClone();
    next.summary = createEmptySummary();
  } else {
    const merged = { ...createEmptySummary(), ...summarySource };
    const keys = Object.keys(SUMMARY_TEMPLATE);
    const same = keys.every((k) => merged[k] === summarySource[k]);
    if (!same) {
      ensureClone();
      next.summary = merged;
    }
  }

  if (!Array.isArray(next.workoutSets)) {
    ensureClone();
    next.workoutSets = [];
  }

  if (next.completedAt === undefined) {
    ensureClone();
    next.completedAt = null;
  }

  if (next.status === undefined) {
    ensureClone();
    next.status = Boolean(next.completedAt);
  } else if (next.completedAt && !next.status) {
    ensureClone();
    next.status = true;
  }

  return next;
}
export const makePlan = (len = DEFAULT_DAYS) =>
  Array.from({ length: len }).map((_, i) => {
    const template = PLAN_TEMPLATE[i % PLAN_TEMPLATE.length] || {};
    const cycleIndex = Math.floor(i / PLAN_TEMPLATE.length);
    const base = {
      day: i + 1,
      date: "",
      status: false,
      note: "",
      completedAt: null,
      summary: createEmptySummary(),
      workoutSets: [],
       };

    if (template.type === "workout") {
      const levelKey = template.level || "S";
      const program = PROGRAMS[levelKey] || {};
      const weeks = Array.isArray(program.weeks) ? program.weeks : [];
      const levelName = program?.name || levelKey;
      let weekIndex = null;
      let weekName = "";
      const hasWeekIndexOverride = Number.isFinite(template.weekIndex);
      const rawWeekIndex = hasWeekIndexOverride
        ? template.weekIndex
        : cycleIndex;
      if (weeks.length > 0) {
        const normalized = ((rawWeekIndex % weeks.length) + weeks.length) % weeks.length;
        weekIndex = normalized;
        weekName = weeks[normalized]?.name || "";
      }

      const dayIndex = Number.isFinite(template.dayIndex) ? template.dayIndex : null;
      let dayName = template.title || "";
      if (weekIndex != null) {
        const week = weeks[weekIndex] || {};
        const days = Array.isArray(week?.days) ? week.days : [];
        if (dayIndex != null && days[dayIndex]) {
          dayName = days[dayIndex]?.title || dayName;
        }
      }

      return ensurePlanEntryDefaults(
        {
          ...base,
          title: dayName,
          programLevel: levelKey,
          programLevelName: levelName,
          programWeekIndex: weekIndex,
          programWeekName: weekName,
          programDayIndex: dayIndex,
          programDayName: dayName || "",
        },
        i,
      );
    }

    return ensurePlanEntryDefaults(
      {
        ...base,
        title: template.title || "",
        programLevel: null,
        programLevelName: "",
        programWeekIndex: null,
        programWeekName: "",
        programDayIndex: null,
        programDayName: "",
      },
      i,
    );
  });

export function makeInitialData() {
  return {
    plan: makePlan(DEFAULT_DAYS),
    measures: [{ date: iso(new Date()), weight: "", waist: "", hips: "", notes: "", photo: "" }],
    profile: { name: "", mode: "", level: "S", start: iso(new Date()), days: DEFAULT_DAYS },
    _appliedFromQuery: false,
  };
}

export function applyParamsToData(data) {
  const q = getQuery();
  if (!q || data._appliedFromQuery) return data;
  const next = { ...data, profile: { ...data.profile } };
  const days = Math.max(1, Math.min(60, parseInt(q.days || DEFAULT_DAYS))) || DEFAULT_DAYS;
  if (q.name) next.profile.name = decodeURIComponent(q.name);
  if (q.mode && (q.mode === "home" || q.mode === "gym")) next.profile.mode = q.mode;
  if (q.level && ["S","M","P"].includes(q.level)) next.profile.level = q.level;
  next.profile.days = days;
  if (!Array.isArray(next.plan)) next.plan = makePlan(days);
  if (next.plan.length !== days) next.plan = makePlan(days);
  next.plan = next.plan.map((item, idx) => ensurePlanEntryDefaults(item, idx));
  next._appliedFromQuery = true;
  if (q.start) next.profile.start = q.start;
  return next;
}

// Состояние программ/прогресса
export function useProgramsState() {
  return usePersistedState(PROG_KEY, { level: "S", week: 0, day: 0, progress: {}, goals: {} , session: {} });
}
export const keyFor = (level, week, day, exIdx) => `${level}.${week}.${day}.${exIdx}`;
export const exId = (level, week, day, ex) => `${level}.${week}.${day}.${(ex?.name || "ex").toLowerCase().replace(/\s+/g,"_")}`;

export function saveDayHistory(level, week, day, dayObj, progress) {
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
