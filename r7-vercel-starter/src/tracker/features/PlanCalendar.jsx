import React, { useEffect, useMemo, useState } from "react";

const formatDate = (ms) => {
  if (!Number.isFinite(ms)) return null;
  try {
    const date = new Date(ms);
    if (Number.isNaN(date.getTime())) return null;
    return date.toLocaleDateString("ru-RU");
  } catch {
    return null;
  }
};

const normalizeDayNumber = (value) => {
  const numeric = Math.round(Number(value));
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
};

const normalizeTimestamp = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

export default function PlanCalendar({ plan, profile, calendarMeta, onClose }) {
  const dayStatuses = useMemo(() => {
    const map = new Map();
    if (!Array.isArray(plan)) return map;

    plan.forEach((entry, index) => {
      const meta = Array.isArray(calendarMeta) ? calendarMeta[index] || {} : {};
      const calendarDay = normalizeDayNumber(meta.calendarDay) ?? normalizeDayNumber(meta.fallbackDay) ?? index + 1;
      if (!Number.isFinite(calendarDay)) return;

      const completed = Boolean(entry?.completedAt || entry?.status || meta.completed);
      const dateMs = normalizeTimestamp(meta.entryDateMs);
      const title = typeof meta.title === "string" && meta.title ? meta.title : typeof entry?.title === "string" ? entry.title : "";

      const prev = map.get(calendarDay);
      if (!prev || (!prev.completed && completed)) {
        map.set(calendarDay, { completed, dateMs, title });
      } else if (prev.completed === completed && dateMs && !prev.dateMs) {
        map.set(calendarDay, { ...prev, dateMs });
      }
    });

    return map;
  }, [plan, calendarMeta]);

  const totalDaysFromProfile = normalizeDayNumber(profile?.days);
  const maxMetaDay = useMemo(() => {
    if (!Array.isArray(calendarMeta)) return 0;
    return calendarMeta.reduce((acc, meta) => {
      const day = normalizeDayNumber(meta?.calendarDay) ?? normalizeDayNumber(meta?.fallbackDay) ?? 0;
      return Math.max(acc, day);
    }, 0);
  }, [calendarMeta]);

  const maxDays = Math.max(
    totalDaysFromProfile ?? 0,
    Array.isArray(plan) ? plan.length : 0,
    maxMetaDay
  );

  const options = useMemo(() => {
    const base = [30, 60, 90, totalDaysFromProfile, maxDays];
    const unique = new Set();
    base.forEach((value) => {
      const normalized = normalizeDayNumber(value);
      if (normalized && normalized <= maxDays) {
        unique.add(normalized);
      }
    });
    const list = Array.from(unique);
    list.sort((a, b) => a - b);
    return list;
  }, [totalDaysFromProfile, maxDays]);

  const defaultRange = useMemo(() => {
    if (options.length === 0) return maxDays;
    if (totalDaysFromProfile && options.includes(totalDaysFromProfile)) {
      return totalDaysFromProfile;
    }
    return options[options.length - 1];
  }, [options, totalDaysFromProfile, maxDays]);

  const [visibleDays, setVisibleDays] = useState(defaultRange);

  useEffect(() => {
    if (defaultRange) {
      setVisibleDays(defaultRange);
    }
  }, [defaultRange]);

  const daysArray = useMemo(() => {
    const limit = Math.min(visibleDays || maxDays, maxDays);
    if (!Number.isFinite(limit) || limit <= 0) return [];
    return Array.from({ length: limit }, (_, index) => index + 1);
  }, [visibleDays, maxDays]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="max-h-full w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-semibold">Календарь активности</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              {options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setVisibleDays(option)}
                  className={`rounded-full border px-3 py-1 text-sm transition ${
                    option === visibleDays
                      ? "border-black bg-black text-white"
                      : "border-zinc-300 text-zinc-600 hover:border-zinc-400 hover:text-zinc-800"
                  }`}
                >
                  {option} дн.
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-zinc-300 px-3 py-1 text-sm text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-800"
            >
              Закрыть
            </button>
          </div>
        </div>

        {daysArray.length === 0 ? (
          <div className="rounded-xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500">
            Пока нет дней для отображения
          </div>
        ) : (
          <div className="grid grid-cols-5 gap-2 sm:grid-cols-7">
            {daysArray.map((day) => {
              const status = dayStatuses.get(day) || {};
              const completed = Boolean(status.completed);
              const dateLabel = formatDate(status.dateMs);
              const titleParts = [];
              if (status.title) titleParts.push(status.title);
              if (dateLabel) titleParts.push(dateLabel);
              const title = titleParts.join(" • ");

              return (
                <div
                  key={day}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center text-xs transition ${
                    completed
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-zinc-200 bg-white text-zinc-500"
                  }`}
                  title={title || `День ${day}`}
                >
                  <div className="text-sm font-semibold">День {day}</div>
                  <span
                    className={`inline-block h-3 w-3 rounded-full ${
                      completed ? "bg-emerald-500" : "bg-zinc-300"
                    }`}
                  />
                  {dateLabel && <div className="text-[10px] text-zinc-500">{dateLabel}</div>}
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 text-xs text-zinc-500">
          Выполненные тренировки подсвечены зелёным цветом. Даты берутся из отметок выполнения
          или вручную выбранных дат.
        </div>
      </div>
    </div>
  );
}
