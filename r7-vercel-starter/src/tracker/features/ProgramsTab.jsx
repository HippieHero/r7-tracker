import React, { useMemo, useState } from "react";
import { cn } from "../core";
import { Badge } from "../ui/Primitives";

export default function ProgramsTab({ data, setData }) {
  // …весь ваш существующий код сверху без изменений…

  return (
    <div className="space-y-6">
      {data.plan.map((day, dayIdx) => (
        <div key={dayIdx} className="card">
          <div className="card-header">
            <div className="font-semibold">День {dayIdx + 1} — {day.name}</div>
            <div className="flex flex-wrap gap-2">
              <Badge>Объём {day.volume || 0} кг</Badge>
              <Badge>Эффективность {day.eff || 0}%</Badge>
            </div>
          </div>

          <div className="card-body space-y-5">
            {day.exercises.map((ex, exIdx) => (
              <div key={exIdx} className="rounded-2xl border border-zinc-200 p-4">
                <div className="flex items-center justify-between gap-4">
                  {/* инфо-«чипсы» по упражнению (повторы/время/RIR/разминка и т.д.) */}
                  <div className="flex flex-wrap items-center gap-2">
                    {/* …ваши текущие чипы без изменений… */}
                  </div>

                  {/* Блок +/– отделён вертикальной линией, в одном ряду */}
                  <div className="flex shrink-0 items-center gap-2 pl-2 ml-2 border-l border-zinc-300">
                    {/* ONLY +/- here now */}
                    <button
                      className="btn btn-circle btn-sm"
                      onClick={() => setSets(dayIdx, exIdx, +1)}
                      aria-label="Добавить подход"
                    >+</button>
                    <button
                      className="btn btn-circle btn-sm"
                      onClick={() => setSets(dayIdx, exIdx, -1)}
                      aria-label="Удалить подход"
                    >−</button>
                  </div>
                </div>

                {/* Таблица подходов */}
                <div className="mt-3 space-y-2">
                  {ex.sets.map((set, sIdx) => (
                    <div key={sIdx} className="flex items-center gap-2">
                      <div className="w-9 text-center text-sm text-zinc-500">{sIdx + 1}</div>

                      {/* ВВОДЫ: сделаны 16px, чтобы iOS не зумировал экран */}
                      <input
                        className="input w-16 text-center text-[16px]"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={set.reps ?? ""}
                        onChange={(e) => onChangeReps(dayIdx, exIdx, sIdx, e.target.value)}
                        placeholder="12–15"
                      />
                      <span className="text-sm text-zinc-500">кг</span>
                      <input
                        className="input w-20 text-center text-[16px]"
                        inputMode="decimal"
                        pattern="[0-9]*"
                        value={set.weight ?? ""}
                        onChange={(e) => onChangeWeight(dayIdx, exIdx, sIdx, e.target.value)}
                        placeholder="Вес"
                      />

                      {/* выбрать из истории как было в прошлый раз и т.п. — прежний код */}
                      {/* … */}
                    </div>
                  ))}
                </div>

                {/* КНОПКА «Следующее упражнение» — удалена по просьбе */}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* вспомогательные функции (ваши текущие) — без изменений */
