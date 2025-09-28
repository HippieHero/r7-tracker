// src/R7Tracker.jsx
import React, { useEffect, useMemo, useState } from "react";

// ядро
import {
  STORAGE_KEY,
  usePersistedState,
  makeInitialData,
  applyParamsToData,
  usePwaInstall,
  isTelegramWebView,
  N,
  buildPersonalLink,
} from "./tracker/core";

// UI
import { Section, Pill, ActionsMenu } from "./tracker/ui/Primitives";

// фичи
import ProgramsTab from "./tracker/features/ProgramsTab.jsx";
import MeasuresTab from "./tracker/features/MeasuresTab.jsx";

export default function R7Tracker() {
  const [data, setData] = usePersistedState(STORAGE_KEY, makeInitialData());
  const [tab, setTab] = useState("programs");
  usePwaInstall(); // оставил на будущее
  const inTG = isTelegramWebView();
  const [showOB, setShowOB] = useState(false);

  useEffect(() => {
    setData((prev) => applyParamsToData(prev));
  }, []);

  useEffect(() => {
    if (!data?.profile?.mode || !data?.profile?.level || !data?.profile?.start) {
      setShowOB(true);
    }
  }, [data?.profile?.mode, data?.profile?.level, data?.profile?.start]);

  const completedDays = useMemo(
    () => data.plan.filter((d) => d.status).length,
    [data.plan]
  );
  const adherence = useMemo(
    () => Math.round((completedDays / (data.plan.length || 1)) * 100) || 0,
    [completedDays, data.plan.length]
  );

  const last7 = data.plan.slice(0, 7);

  const personalLink = buildPersonalLink({ profile: data.profile });
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(personalLink);
      alert("Ссылка скопирована");
    } catch {
      prompt("Скопируйте ссылку:", personalLink);
    }
  };

  // дельты по замерам (вернул в шапку)
  const measuresArr = Array.isArray(data?.measures) ? data.measures : [];
  const baseM = measuresArr.length > 0 ? measuresArr[0] || {} : {};
  const lastM = measuresArr.length > 0 ? measuresArr[measuresArr.length - 1] || {} : {};

  const deltaText = (curr, base, unit) => {
    const a = N(curr), b = N(base);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return `— ${unit}`;
    const d = a - b;
    if (d === 0) return `0 ${unit}`;
    const sign = d > 0 ? "+" : "";
    return `${sign}${d.toFixed(1)} ${unit}`;
  };
  const deltaClass = (curr, base) => {
    const a = N(curr), b = N(base);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return "text-zinc-600";
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
            onShare={() =>
              navigator.share?.({ title: "R7 Tracker", url: personalLink }).catch(() => {})
            }
            onExport={() => {
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
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
                try { setData(JSON.parse(e.target?.result)); }
                catch { alert("Не удалось импортировать JSON"); }
              };
              reader.readAsText(file);
            }}
            onReset={() => { if (confirm("Сбросить трекер?")) setData(makeInitialData()); }}
          />
        </div>

        {/* бейджи профиля */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          {data.profile?.name && <Pill className="bg-white/70">👤 {data.profile.name}</Pill>}
          {data.profile?.mode && (
            <Pill className="bg-white/70">🏠/🏋️‍♀️ {data.profile.mode === "home" ? "Дом" : "Зал"}</Pill>
          )}
          {data.profile?.level && (
            <Pill className="bg-white/70">Уровень: {data.profile.level === "S" ? "Start" : data.profile.level}</Pill>
          )}
          {data.profile?.start && <Pill className="bg-white/70">Старт: {data.profile.start}</Pill>}
          {data.profile?.days && <Pill className="bg-white/70">Длительность: {data.profile.days} дн.</Pill>}
        </div>

        {/* приверженность + стрик */}
        <div className="flex flex-wrap items-center gap-3">
          <Pill className="bg-white/70">Приверженность: <b className="ml-1">{adherence}%</b></Pill>
          <div className="rounded-full border border-zinc-300 bg-white/70 px-2 py-1 text-xs text-zinc-600">
            Streak:&nbsp;
            <span className="inline-flex items-center gap-1 align-middle">
              {last7.map((d, i) => (
                <span
                  key={i}
                  className={`inline-block h-3 w-3 rounded-full ${d.status ? "bg-emerald-500" : "bg-zinc-300"}`}
                  title={`День ${d.day}: ${d.status ? "✓" : "—"}`}
                />
              ))}
            </span>
          </div>
        </div>

        {/* Δ тало-замеры — вернул */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Pill className={`bg-white/70 ${deltaClass(lastM.waist, baseM.waist)}`}>
            Δ талия: {deltaText(lastM.waist, baseM.waist, "см")}
          </Pill>
          <Pill className={`bg-white/70 ${deltaClass(lastM.hips, baseM.hips)}`}>
            Δ бёдра: {deltaText(lastM.hips, baseM.hips, "см")}
          </Pill>
          <Pill className={`bg-white/70 ${deltaClass(lastM.weight, baseM.weight)}`}>
            Δ вес: {deltaText(lastM.weight, baseM.weight, "кг")}
          </Pill>
        </div>

        {/* навигация вкладок */}
        <nav className="mt-2 flex flex-wrap gap-2">
          {[
            ["programs", "Программы"],
            ["plan", "План"],
            ["measures", "Замеры"],
          ].map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-full px-4 py-2 text-sm ${tab === k ? "bg-black text-white" : "border border-zinc-300"}`}
            >
              {label}
            </button>
          ))}
        </nav>
      </header>

      {tab === "programs" && <ProgramsTab />}

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

/** Укороченный онбординг */
function Onboarding({ initial, onClose }) {
  const [name, setName] = useState(initial?.name || "");
  const [mode, setMode] = useState(initial?.mode || "home");
  const [level, setLevel] = useState(initial?.level || "S");
  const [start, setStart] = useState(initial?.start || new Date().toISOString().slice(0, 10));
  const [days, setDays] = useState(initial?.days || 30);

  function save() {
    onClose({ name, mode, level, start, days: Number(days) || 30 });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-lg">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Быстрая настройка</h3>
          <button onClick={() => onClose(null)} className="rounded-md px-2 py-1 text-sm text-zinc-600 hover:bg-zinc-100">×</button>
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
            <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="home">Дом</option>
              <option value="gym">Зал</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Уровень
            <select className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="S">Start</option>
              <option value="M" disabled>Medium (скоро)</option>
              <option value="P" disabled>Pro (скоро)</option>
            </select>
          </label>

          <label className="text-sm font-medium">
            Старт
            <input type="date" className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" value={start} onChange={(e) => setStart(e.target.value)} />
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
          <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm" onClick={() => onClose(null)}>Отмена</button>
          <button className="rounded-md bg-black px-3 py-2 text-sm text-white" onClick={save}>Сохранить</button>
        </div>
      </div>
    </div>
  );
}
