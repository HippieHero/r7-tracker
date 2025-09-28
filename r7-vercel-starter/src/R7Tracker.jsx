// src/R7Tracker.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";

// ВАЖНО: всё из корневого ядра трекера
import {
  STORAGE_KEY,
  usePersistedState,
  makeInitialData,
  applyParamsToData,
  usePwaInstall,
  isTelegramWebView,
  N,
  buildPersonalLink,
    ensurePlanEntryDefaults,
  createEmptySummary,
} from "./tracker/core";

// Базовые UI-примитивы страницы
import { Section, Pill, ActionsMenu } from "./tracker/ui/Primitives";

// Вкладки (features)
import ProgramsTab from "./tracker/features/ProgramsTab.jsx";
import MeasuresTab from "./tracker/features/MeasuresTab.jsx";

const PROGRAM_LEVEL_LABELS = {
  S: "Start",
  M: "Medium",
  P: "Pro",
};

export default function R7Tracker() {
  const [data, setData] = usePersistedState(STORAGE_KEY, makeInitialData());
  const [tab, setTab] = useState("programs");
  const { supported: canInstall } = usePwaInstall(); // оставил, если есть кнопка установки
  const inTG = isTelegramWebView();
  const [showOB, setShowOB] = useState(false);

 useEffect(() => {
    setData((prev) => {
      if (!prev || !Array.isArray(prev.plan)) return prev;
      let changed = false;
      const normalized = prev.plan.map((item, idx) => {
        let next = ensurePlanEntryDefaults(item, idx);
        if (next !== item) changed = true;

        if (next.status && !next.completedAt) {
          const hasDate = typeof next.date === "string" && next.date.length >= 8;
          let fallback = new Date().toISOString();
          if (hasDate) {
            const parsed = new Date(`${next.date}T00:00:00`);
            if (!Number.isNaN(parsed.getTime())) {
              fallback = parsed.toISOString();
            }
          }
          next = { ...next, completedAt: fallback, status: true };
          changed = true;
        } else if (next.status !== Boolean(next.completedAt)) {
          next = { ...next, status: Boolean(next.completedAt) };
          changed = true;
        }

        return next;
      });
      return changed ? { ...prev, plan: normalized } : prev;
    });
  }, [setData]);

  // подхватываем параметры из URL один раз
  useEffect(() => {
    setData((prev) => applyParamsToData(prev));
  }, []);

  // если профиль не заполнен — показываем онбординг
  useEffect(() => {
    if (!data?.profile?.mode || !data?.profile?.level || !data?.profile?.start) {
      setShowOB(true);
    }
  }, [data?.profile?.mode, data?.profile?.level, data?.profile?.start]);

  const completedDays = useMemo(
     () => data.plan.filter((d) => d.completedAt || d.status).length,
    [data.plan]
  );
  const adherence = useMemo(
    () =>
      Math.round((completedDays / (data.plan.length || 1)) * 100) || 0,
    [completedDays, data.plan.length]
  );

  const last7 = data.plan.slice(0, 7);
  const streakRow = (
    <div className="inline-flex items-center gap-1 align-middle">
      {last7.map((d, i) => (
        <span
          key={i}
          className={`inline-block h-3 w-3 rounded-full ${
             d.completedAt ? "bg-emerald-500" : "bg-zinc-300"
          }`}
          title={`День ${d.day}: ${d.completedAt ? "✓" : "—"}`}
        />
      ))}
    </div>
  );

  const personalLink = buildPersonalLink({ profile: data.profile });
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalLink);
      alert("Ссылка скопирована");
    } catch {
      // fallback для iOS/вебвью
      prompt("Скопируйте ссылку:", personalLink);
    }
  };

  // дельты по замерам
  const measuresArr = Array.isArray(data?.measures) ? data.measures : [];
  const baseM = measuresArr.length > 0 ? measuresArr[0] || {} : {};
  const lastM =
    measuresArr.length > 0 ? measuresArr[measuresArr.length - 1] || {} : {};

  const deltaText = (curr, base, unit) => {
    const a = N(curr),
      b = N(base);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return `— ${unit}`;
    const d = a - b;
    if (d === 0) return `0 ${unit}`;
    const sign = d > 0 ? "+" : "";
    return `${sign}${d.toFixed(1)} ${unit}`;
  };

  const deltaClass = (curr, base) => {
    const a = N(curr),
      b = N(base);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "text-zinc-600";
    const d = a - b;
    if (d === 0) return "text-zinc-600";
    return d > 0 ? "text-rose-600" : "text-emerald-600";
  };

const formatDuration = (ms) => {
    const totalMs = Number(ms || 0);
    if (!Number.isFinite(totalMs) || totalMs <= 0) return "—";
    const totalSec = Math.round(totalMs / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const formatCompletedAt = (value) => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return null;
      return date.toLocaleDateString("ru-RU");
    } catch {
      return null;
    }
  };

  const handleCompleteDay = useCallback(
    (payload) => {
      if (!payload) return;
      setData((prev) => {
        if (!prev || !Array.isArray(prev.plan) || prev.plan.length === 0) return prev;
        const idx = Math.min(
          prev.plan.length - 1,
          Math.max(0, payload.planDayIndex ?? payload.dayIndex ?? 0)
        );
        if (!prev.plan[idx]) return prev;
        const plan = [...prev.plan];
        const entry = ensurePlanEntryDefaults(plan[idx], idx);
        const summaryDefaults = createEmptySummary();
        const summaryPayload =
          payload.summary && typeof payload.summary === "object" ? payload.summary : {};
        const summary = { ...summaryDefaults, ...summaryPayload };
        if (!summary.exercises && Array.isArray(payload.workoutSets)) {
          summary.exercises = payload.workoutSets.length;
        }
        const workoutSets = Array.isArray(payload.workoutSets) ? payload.workoutSets : [];
        const completedAt = payload.completedAt || new Date().toISOString();
        const level = payload.level ?? entry.programLevel ?? null;
        const levelName = payload.levelName ?? entry.programLevelName ?? "";
        const weekIndex = Number.isFinite(payload.weekIndex)
          ? payload.weekIndex
          : Number.isFinite(entry.programWeekIndex)
          ? entry.programWeekIndex
          : null;
        const weekName = payload.weekName ?? entry.programWeekName ?? "";
        const dayIndex = Number.isFinite(payload.dayIndex)
          ? payload.dayIndex
          : Number.isFinite(entry.programDayIndex)
          ? entry.programDayIndex
          : null;
        const dayName = payload.dayTitle ?? entry.programDayName ?? "";
        const planDate =
          entry.date && entry.date !== ""
            ? entry.date
            : completedAt.slice(0, 10);
        const title = dayName || entry.title;
        plan[idx] = {
          ...entry,
          status: true,
          completedAt,
          summary,
          workoutSets,
          date: planDate,
          title,
          programLevel: level,
          programLevelName: levelName,
          programWeekIndex: weekIndex,
          programWeekName: weekName,
          programDayIndex: dayIndex,
          programDayName: dayName,
        };
        return { ...prev, plan };
      });
    },
    [setData]
  );
  
  return (
    <div className="mx-auto max-w-6xl p-4 text-zinc-800">
      <header className="mb-6 flex flex-col gap-3 rounded-2xl bg-gradient-to-r from-rose-100 to-indigo-100 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">R7 — трекер</h1>

          <ActionsMenu
            onSettings={() => setShowOB(true)}
            onCopy={copyLink}
            onShare={() =>
              navigator
                .share?.({ title: "R7 Tracker", url: personalLink })
                .catch(() => {})
            }
            onExport={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], {
                type: "application/json",
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "R7_tracker_export.json";
              a.click();
              URL.revokeObjectURL(url);
            }}
            onImport={(file) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  setData(JSON.parse(e.target?.result));
                } catch {
                  alert("Не удалось импортировать JSON");
                }
              };
              reader.readAsText(file);
            }}
            onReset={() => {
              if (confirm("Сбросить трекер?")) setData(makeInitialData());
            }}
          />
        </div>

        {/* быстрые бейджи профиля */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {data.profile?.name && (
            <Pill className="bg-white/70">👤 {data.profile.name}</Pill>
          )}
          {data.profile?.mode && (
            <Pill className="bg-white/70">
              🏠/🏋️‍♀️ {data.profile.mode === "home" ? "Дом" : "Зал"}
            </Pill>
          )}
          {data.profile?.level && (
            <Pill className="bg-white/70">
              Уровень: {data.profile.level === "S" ? "Start" : data.profile.level}
            </Pill>
          )}
          {data.profile?.start && (
            <Pill className="bg-white/70">Старт: {data.profile.start}</Pill>
          )}
          {data.profile?.days && (
            <Pill className="bg-white/70">Длительность: {data.profile.days} дн.</Pill>
          )}
        </div>

        {/* прогресс/приверженность */}
        <div className="flex flex-wrap items-center gap-3">
          <Pill className="bg-white/70">
            Приверженность: <b className="ml-1">{adherence}%</b>
          </Pill>
                    <Pill className="bg-white/70">
            Δ талия:
            <span
              className={`ml-1 font-semibold ${deltaClass(
                lastM.waist,
                baseM.waist
              )}`}
            >
              {deltaText(lastM.waist, baseM.waist, "см")}
            </span>
          </Pill>
          <Pill className="bg-white/70">
            Δ бёдра:
            <span
              className={`ml-1 font-semibold ${deltaClass(
                lastM.hips,
                baseM.hips
              )}`}
            >
              {deltaText(lastM.hips, baseM.hips, "см")}
            </span>
          </Pill>
          <Pill className="bg-white/70">
            Δ вес:
            <span
              className={`ml-1 font-semibold ${deltaClass(
                lastM.weight,
                baseM.weight
              )}`}
            >
              {deltaText(lastM.weight, baseM.weight, "кг")}
            </span>
          </Pill>
          <div className="rounded-full border border-zinc-300 bg-white/70 px-2 py-1 text-xs text-zinc-600">
            Streak: {streakRow}
          </div>
        </div>

        {/* навигация по вкладкам */}
        <nav className="mt-2 flex flex-wrap gap-2">
          {[
            ["programs", "Программы"],
            ["plan", "План"],
            ["measures", "Замеры"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm ${
                tab === k ? "bg-black text-white" : "border border-zinc-300"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {/* Вкладка «Программы» */}
       {tab === "programs" && <ProgramsTab onCompleteDay={handleCompleteDay} />}

      {/* Вкладка «План» */}
      {tab === "plan" && (
        <Section
          title="План на 30 дней"
          right={<span className="text-sm text-zinc-500">Отмечайте выполненные дни</span>}
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.plan.map((d, i) => {
              const summary = { ...createEmptySummary(), ...(d.summary || {}) };
              const completedLabel = formatCompletedAt(d.completedAt);
              const isCompleted = Boolean(d.completedAt || d.status);
          const focusText = typeof d.focus === "string" ? d.focus.trim() : "";
              const durationText = typeof d.duration === "string" ? d.duration.trim() : "";
              const prepText = typeof d.prep === "string" ? d.prep.trim() : "";
              return (
                <div
                  key={i}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-300 bg-white p-3"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="mb-1 text-sm text-zinc-500">День {d.day}</div>
                        <div className="truncate font-medium">{d.title}</div>
                          {(focusText || durationText || prepText) && (
                          <div className="mt-1 flex flex-wrap gap-2 text-xs text-zinc-600">
                            {focusText && <Pill>{focusText}</Pill>}
                            {durationText && <Pill>⏱ {durationText} мин</Pill>}
                            {prepText && <Pill>{prepText}</Pill>}
                          </div>
                        )}
                      </div>
                      <div className="flex w-40 flex-col items-end gap-2">
                        <input
                          type="date"
                          className="w-full rounded-md border border-zinc-300 px-2 py-1 text-sm"
                          value={d.date}
                          onChange={(e) => {
                            const value = e.target.value;
                            setData((prev) => {
                              const plan = [...prev.plan];
                              plan[i] = { ...plan[i], date: value };
                              return { ...prev, plan };
                            });
                          }}
                        />
                        <button
                          onClick={() => {
                            setData((prev) => {
                              const plan = [...prev.plan];
                              const current = ensurePlanEntryDefaults(plan[i], i);
                              const nextCompleted = !(current.completedAt || current.status);
                              plan[i] = {
                                ...current,
                                status: nextCompleted,
                                completedAt: nextCompleted ? new Date().toISOString() : null,
                              };
                              return { ...prev, plan };
                            });
                          }}
                          className={`w-full rounded-md px-3 py-2 text-sm ${
                            isCompleted ? "bg-emerald-600 text-white" : "bg-zinc-100"
                          }`}
                        >
                          {isCompleted
                            ? completedLabel
                              ? `Выполнено ${completedLabel}`
                              : "Выполнено ✅"
                            : "Отметить"}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-zinc-600 sm:grid-cols-4">
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Объём
                        </div>
                        <div className="font-semibold text-zinc-800">
                          {summary.volume ? summary.volume : 0} кг
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Эффективность
                        </div>
                        <div className="font-semibold text-zinc-800">
                          {summary.effectiveness != null ? `${summary.effectiveness} %` : "—"}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Длительность
                        </div>
                        <div className="font-semibold text-zinc-800">
                          {formatDuration(summary.duration)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-2 py-1">
                        <div className="text-[11px] uppercase tracking-wide text-zinc-500">
                          Упражнений
                        </div>
                        <div className="font-semibold text-zinc-800">
                          {summary.exercises || (Array.isArray(d.workoutSets) ? d.workoutSets.length : 0)}
                        </div>
                      </div>
                    </div>

                    {Array.isArray(d.workoutSets) && d.workoutSets.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-sm text-zinc-700">
                          Упражнения и подходы
                        </summary>
                        <div className="mt-2 space-y-2 text-sm text-zinc-700">
                          {d.workoutSets.map((ex, exIdx) => (
                            <div key={ex?.id || exIdx} className="rounded-lg border border-zinc-200 p-2">
                              <div className="font-medium">
                                {ex?.name || `Упражнение ${exIdx + 1}`}
                              </div>
                              {ex?.muscle && (
                                <div className="text-xs text-zinc-500">{ex.muscle}</div>
                              )}
                              <ul className="mt-1 space-y-1 text-xs text-zinc-600">
                                {(ex?.sets || []).map((set, setIdx) => (
                                  <li key={setIdx} className="flex flex-wrap items-center gap-2">
                                    <span className="font-semibold text-zinc-700">#{setIdx + 1}</span>
                                    {set?.reps && <span>{set.reps} повт.</span>}
                                    {set?.weight && <span>{set.weight} кг</span>}
                                    {set?.rir !== undefined && set?.rir !== "" && (
                                      <span>RIR {set.rir}</span>
                                    )}
                                    {set?.done && (
                                      <span className="text-emerald-600">✓</span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                  <textarea
                     className="w-full rounded-md border border-zinc-300 p-2 text-sm"
                    rows={2}
                    placeholder="Заметка"
                    value={d.note || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      setData((prev) => {
                        const plan = [...prev.plan];
                        plan[i] = { ...plan[i], note: value };
                        return { ...prev, plan };
                      });
                    }}
                  />
                </div>
                    );
            })}
          </div>
        </Section>
      )}

      {/* Вкладка «Замеры» */}
      {tab === "measures" && (
        <MeasuresTab data={data} setData={setData} />
      )}

      {/* Онбординг */}
      {showOB && (
        <Onboarding
          initial={data.profile}
          onClose={(payload) => {
            setShowOB(false);
            if (payload) setData({ ...data, profile: { ...data.profile, ...payload } });
          }}
        />
      )}

      <footer className="mt-8 text-center text-sm text-zinc-500">
        R7 • Данные хранятся локально (localStorage). Для переноса используйте Экспорт/Импорт.
      </footer>
    </div>
  );
}

/** Укороченный онбординг (как в твоём файле) */
function Onboarding({ initial, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [mode, setMode] = useState(initial?.mode || "home");
  const [level, setLevel] = useState(initial?.level || "S");
  const [start, setStart] = useState(
    initial?.start || new Date().toISOString().slice(0, 10)
  );
  const [days, setDays] = useState(initial?.days || 30);

  function save() {
    onClose({ name, mode, level, start, days: Number(days) || 30 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Быстрая настройка</h3>
          <button
            onClick={() => onClose(null)}
            className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100"
          >
            ×
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium">
            Имя
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
               placeholder="Ваше имя"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

          <label className="text-sm font-medium">
            Режим
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="home">Дом</option>
              <option value="gym">Зал</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Уровень
            <select
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="S">Start</option>
              <option value="M" disabled>
                Medium (скоро)
              </option>
              <option value="P" disabled>
                Pro (скоро)
              </option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Старт
            <input
              type="date"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>

          <label className="text-sm font-medium">
            Дней
            <input
              inputMode="numeric"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={days}
              onChange={(e) => setDays(e.target.value)}
            />
          </label>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            className="rounded-md border border-zinc-300 px-3 py-2 text-sm"
            onClick={() => onClose(null)}
          >
            Отмена
          </button>
          <button
            className="rounded-md bg-black px-3 py-2 text-sm text-white"
            onClick={save}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}
