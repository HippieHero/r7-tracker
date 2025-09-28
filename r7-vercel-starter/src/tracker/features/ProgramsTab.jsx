// src/tracker/features/ProgramsTab.jsx
import React from "react";
import {
  PROGRAMS,
  useProgramsState,
  keyFor,
  exId,
  saveDayHistory,
} from "../core";
import { Section, Pill } from "../ui/Primitives";

function useSets(progress, setProgress, k, initial = 3) {
  const rows = progress[k]?.sets || Array.from({ length: initial }).map(() => ({ reps: "", weight: "", rir: "" }));
  const update = (next) => setProgress((p) => ({ ...p, [k]: { ...(p[k] || {}), sets: next } }));
  const add = () => update([...rows, { reps: "", weight: "", rir: "" }]);
  const remove = () => update(rows.length > 1 ? rows.slice(0, -1) : rows);
  const setCell = (i, field, val) => {
    const next = rows.slice();
    next[i] = { ...next[i], [field]: val };
    update(next);
  };
  return { rows, add, remove, setCell };
}

export default function ProgramsTab() {
  const [state, setState] = useProgramsState();
  const level = state.level || "S";
  const week = state.week || 0;
  const day = state.day || 0;

  const program = PROGRAMS[level] || PROGRAMS.S;
  const weeks = program.weeks || [];
  const days = weeks[week]?.days || [];
  const dayObj = days[day] || days[0] || { exercises: [] };

  const setLevel = (v) => setState((s) => ({ ...s, level: v, week: 0, day: 0 }));
  const setWeek = (i) => setState((s) => ({ ...s, week: i, day: 0 }));
  const setDay = (i) => setState((s) => ({ ...s, day: i }));

  // сохраняем "прошлый раз"
  const persistPrev = () => saveDayHistory(level, week, day, dayObj, state.progress);

  return (
    <Section
      title="Программы тренировок"
      right={<span className="text-sm text-zinc-500">Выберите уровень / неделю / день</span>}
    >
      {/* селекторы */}
      <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select className="rounded-lg border border-zinc-300 px-3 py-2" value={level} onChange={(e) => setLevel(e.target.value)}>
          {Object.entries(PROGRAMS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}
        </select>
        <select className="rounded-lg border border-zinc-300 px-3 py-2" value={week} onChange={(e) => setWeek(Number(e.target.value))}>
          {(weeks.length ? weeks : [{ name: "Неделя 1" }]).map((w, i) => <option key={i} value={i}>{w.name || `Неделя ${i + 1}`}</option>)}
        </select>
        <select className="rounded-lg border border-zinc-300 px-3 py-2" value={day} onChange={(e) => setDay(Number(e.target.value))}>
          {(days.length ? days : [{ title: "День 1" }]).map((d, i) => <option key={i} value={i}>{d.title || `День ${i + 1}`}</option>)}
        </select>
      </div>

      {/* список упражнений */}
      <div className="space-y-4">
        {dayObj.exercises.map((ex, exIdx) => {
          const k = keyFor(level, week, day, exIdx);
          const { rows, add, remove, setCell } = useSets(state.progress, (p) => setState((s) => ({ ...s, progress: typeof p === "function" ? p(s.progress) : p })), k, ex.workSets || 3);

          // восстановить как в прошлый раз
          const loadPrev = () => {
            try {
              const raw = localStorage.getItem("r7:last:" + exId(level, week, day, ex));
              const parsed = raw ? JSON.parse(raw) : null;
              if (parsed && Array.isArray(parsed)) {
                setState((s) => ({ ...s, progress: { ...s.progress, [k]: { sets: parsed } } }));
              }
            } catch {}
          };

          return (
            <div key={exIdx} className="rounded-xl border border-zinc-300 bg-white p-3">
              {/* шапка упражнения */}
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs text-zinc-500">{ex.muscle}</div>
                  <div className="text-lg font-semibold">{ex.name}</div>

                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-700">
                    <Pill>🗂 {ex.workSets}×{ex.reps}</Pill>
                    <Pill>⏱ {ex.rest}</Pill>
                    {ex.warmup && <Pill>🔥 Разминка</Pill>}
                    {ex.intensity && <Pill>⚡ {ex.intensity.replace("Вблизи отказа", "RIR 1–2")}</Pill>}
                    {Array.isArray(ex.equipment) && ex.equipment.length > 0 && (
                      <Pill>🎒 {ex.equipment.join(", ")}</Pill>
                    )}
                  </div>
                </div>

                {/* Add/Remove — отделено бордером */}
                <div className="shrink-0 border-l border-zinc-200 pl-3">
                  <div className="flex items-center gap-2">
                    <button onClick={add} className="h-9 w-9 rounded-full border border-zinc-300 text-xl leading-9">＋</button>
                    <button onClick={remove} className="h-9 w-9 rounded-full border border-zinc-300 text-xl leading-9">－</button>
                  </div>
                </div>
              </div>

              {/* примечания автора, если есть */}
              {ex.notes && <details className="mt-2 text-sm text-zinc-600"><summary className="cursor-pointer select-none">Примечания</summary><div className="pt-2">{ex.notes}</div></details>}

              {/* подходы */}
              <div className="mt-3 space-y-2">
                {rows.map((row, i) => (
                  <div key={i} className="grid grid-cols-[56px,1fr,1fr,56px] items-center gap-2">
                    <div className="flex h-11 items-center justify-center rounded-lg border border-zinc-300 text-sm"> {i + 1} </div>

                    {/* репы — ставлю 16px чтобы iOS не зумил */}
                    <input
                      inputMode="numeric"
                      pattern="[0-9.,\- ]*"
                      className="h-11 rounded-lg border border-zinc-300 px-3 text-[16px]"
                      placeholder="повт."
                      value={row.reps || ""}
                      onChange={(e) => setCell(i, "reps", e.target.value)}
                    />

                    {/* вес — тоже 16px */}
                    <div className="flex h-11 items-center gap-2">
                      <input
                        inputMode="decimal"
                        pattern="[0-9.,\- ]*"
                        className="h-11 w-full rounded-lg border border-zinc-300 px-3 text-[16px]"
                        placeholder="кг"
                        value={row.weight || ""}
                        onChange={(e) => setCell(i, "weight", e.target.value)}
                      />
                    </div>

                    {/* done */}
                    <button
                      className={`h-11 rounded-lg border ${row.done ? "border-emerald-500 bg-emerald-50 text-emerald-700" : "border-zinc-300"}`}
                      onClick={() => setCell(i, "done", !row.done)}
                      title="Отметить подход"
                    >
                      ✓
                    </button>
                  </div>
                ))}
              </div>

              {/* действия снизу — без кнопки «Следующее упражнение» */}
              <div className="mt-3 flex flex-wrap gap-8">
                <button onClick={loadPrev} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm">
                  Как в прошлый раз
                </button>
                <button onClick={persistPrev} className="rounded-xl border border-zinc-300 px-3 py-2 text-sm">
                  Сохранить «прошлый раз»
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
