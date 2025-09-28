import React from "react";
import { Section, Pill } from "../ui/Primitives";
import { iso, N } from "../core";

export default function MeasuresTab({ data, setData }) {
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
      <p className="mb-3 text-sm text-zinc-600">Добавляйте 3 ключевые точки: старт → середина → финиш. Разница (Δ) считается относительно самой первой записи.</p>

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
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" inputMode="decimal"
                  value={r.weight || ""} onChange={(e)=>setRow(i,{weight:e.target.value})}/>
              </label>
              <label className="text-sm font-medium">
                Талия, см <span className="ml-1 text-xs text-zinc-500">· <Delta v={r.waist} baseV={base.waist} unit=" см" /></span>
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" inputMode="decimal"
                  value={r.waist || ""} onChange={(e)=>setRow(i,{waist:e.target.value})}/>
              </label>
              <label className="text-sm font-medium">
                Бёдра, см <span className="ml-1 text-xs text-zinc-500">· <Delta v={r.hips} baseV={base.hips} unit=" см" /></span>
                <input className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm" inputMode="decimal"
                  value={r.hips || ""} onChange={(e)=>setRow(i,{hips:e.target.value})}/>
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
                placeholder="https://..." value={r.photo || ""} onChange={(e)=>setRow(i,{photo:e.target.value})}/>
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
