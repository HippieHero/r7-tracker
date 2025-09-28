import React, { useMemo, useState, useEffect } from "react";
import { Section, TinyPill } from "../ui/Primitives";
import { StickyInfoBar } from "../ui/Primitives";
import {
  N, useProgramsState, keyFor, exId, saveDayHistory, PROGRAMS,
  vibrate
} from "../core";

/* ===== Мелкие элементы мета-инфо по упражнению ===== */
function shortRest(rest){ if(!rest) return ""; return String(rest).replace(/\s*сек(унд[ыы]?)?/gi,"с").replace(/\s+/g," ").trim(); }
function shortIntensity(intensity){
  if(!intensity) return "";
  const m = String(intensity).match(/\((\d+)[–\-—](\d+)\s*повт\.?\)/i);
  if (m) return `RIR ${m[1]}–${m[2]}`;
  const m2 = String(intensity).match(/RIR\s*\d+(?:[–\-—]\d+)?/i);
  if (m2) return m2[0].toUpperCase();
  return String(intensity).replace("Вблизи отказа","RIR").replace(/повт\.?/gi,"").trim();
}

function MetaBar({ ex, exIdx, addSet, removeLastSet }){
  const setsReps = `${ex.workSets}×${ex.reps}`;
  const rest = shortRest(ex.rest);
  const intensity = shortIntensity(ex.intensity);
  const eq = Array.isArray(ex.equipment) ? ex.equipment.join(", ") : "";
  return (
   <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200 bg-white/60">
      <div className="flex flex-col divide-y divide-zinc-200 sm:flex-row sm:items-stretch sm:divide-x sm:divide-y-0">
        <div className="min-w-0 flex flex-1 flex-wrap items-center gap-1.5 px-2 py-1.5">
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
      </div>
    </div>
  );
}

const InputMini = React.forwardRef(function InputMini({ className="", onEnter, ...props }, ref){
  return (
    <input
      ref={ref}
      inputMode="decimal"
      pattern="[0-9.,]*"
      className={[
       "h-8 w-full rounded-md border border-zinc-300 px-2 text-center text-sm",
        className,
      ].join(" ")}
      style={{ fontSize: "14px" }}
      onKeyDown={(e)=>{ if(e.key==="Enter") onEnter?.(); }}
      {...props}
    />
  );
});

const RIR_OPTIONS = [
  { value: "",  label: "Выбрать" },
  { value: "4", label: "4" },
  { value: "3", label: "3" },
  { value: "2", label: "2" },
  { value: "1", label: "1" },
  { value: "0", label: "Отказ" },
];
const rirColor = (v)=> v==="0" ? "border-rose-300 bg-rose-50" : (v==="1"||v==="2") ? "border-amber-300 bg-amber-50" : "border-zinc-300 bg-white";

const RirSelect = React.forwardRef(function RirSelect({ value, onChange, onEnter }, ref){
  return (
    <div className={["h-8 rounded-md", rirColor(value || ""), "border"].join(" ")}>
      <select
        ref={ref}
        className="h-full w-full rounded-md bg-transparent pl-2 pr-6 text-xs"
        value={value ?? ""}
        onChange={(e)=>onChange(e.target.value)}
        onKeyDown={(e)=>{ if(e.key==="Enter") onEnter?.(); }}
      >
        {RIR_OPTIONS.map(o => (<option key={o.value} value={o.value} disabled={o.value===""}>{o.label}</option>))}
      </select>
    </div>
  );
});

/* ===== Панель «Объём/Эффективность/Время» (локально для вкладки) ===== */
function StatsRow({ volume, effectiveness, timeText, started, paused, onStart, onPause, onResume, onReset }) {
  const Card = ({ children, className = "" }) => (
    <div className={`rounded-2xl border border-zinc-200 bg-white p-3 shadow-sm ${className}`}>{children}</div>
  );
  return (
    <div className="mt-2">
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <div className="text-sm text-zinc-600">Объём</div>
          <div className="mt-0.5 text-xl font-semibold">
            {volume} <span className="text-base font-normal text-zinc-600">кг</span>
          </div>
        </Card>
        <Card>
          <div className="flex items-start justify-between">
            <div className="text-sm text-zinc-600">Эффективность</div>
            <button className="ml-2 h-5 w-5 rounded-full border border-zinc-300 text-xs text-zinc-600"
              onClick={()=>alert("Эффективность = выполнение × средняя интенсивность (RIR)")}>?</button>
          </div>
          <div className="mt-0.5 text-xl font-semibold">{effectiveness != null ? `${effectiveness} %` : "—"}</div>
        </Card>
      </div>
      <div className="mt-3">
        <Card>
          <div className="text-sm text-zinc-600">Время</div>
          <div className="mt-0.5 font-mono text-xl tabular-nums">{timeText || "—"}</div>
          {!started && <button className="mt-2 w-full rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onStart}>Старт тренировки</button>}
          {started && !paused && (
            <div className="mt-2 flex gap-2">
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onPause}>Пауза</button>
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onReset}>Сброс</button>
            </div>
          )}
          {started && paused && (
            <div className="mt-2 flex gap-2">
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onResume}>Продолжить</button>
              <button className="w-1/2 rounded-md border border-zinc-300 px-3 py-1.5 text-sm" onClick={onReset}>Сброс</button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ===== Селекторы недели/дня ===== */
function Controls({ level, setLevel, prog, weekIdx, setWeek, dayIdx, setDay }) {
  const week = prog.weeks[weekIdx] || { days: [] };
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value={level} onChange={(e)=>setLevel(e.target.value)} className="rounded-md border px-3 py-2 text-sm">
        <option value="S">Start</option>
        <option value="M" disabled>Medium (скоро)</option>
        <option value="P" disabled>Pro (скоро)</option>
      </select>
      <select value={weekIdx} onChange={(e)=>setWeek(Number(e.target.value))} className="rounded-md border px-3 py-2 text-sm">
        {prog.weeks.map((w,i)=>(<option key={i} value={i}>{w.name}</option>))}
      </select>
      <select value={dayIdx} onChange={(e)=>setDay(Number(e.target.value))} className="rounded-md border px-3 py-2 text-sm">
        {week.days?.map((d,i)=>(<option key={i} value={i}>{d.title}</option>))}
      </select>
    </div>
  );
}

/* ===== Основная вкладка Программ ===== */
export default function ProgramsTab({ onCompleteDay }) {
  const [ps, setPs] = useProgramsState();
  const level = ps.level;
  const prog = PROGRAMS[level] || { weeks: [] };
  const week = prog.weeks[ps.week] || { days: [] };
  const day  = week.days[ps.day];

  const setLevel = (l)=> setPs({ ...ps, level:l, week:0, day:0 });
  const setWeek  = (i)=> setPs({ ...ps, week:i, day:0 });
  const setDay   = (i)=> setPs({ ...ps, day:i });

  const totalSets = useMemo(()=> day ? day.exercises.reduce((a,ex)=>a+(ex.workSets||0),0) : 0, [day]);
  const doneSets  = useMemo(()=> {
    if(!day) return 0;
    return day.exercises.reduce((a, ex, exIdx)=>{
      const k = keyFor(level, ps.week, ps.day, exIdx);
      const rows = ps.progress[k]?.sets || [];
      return a + rows.filter(r => r?.done).length;
    }, 0);
  }, [day, ps.progress, level, ps.week, ps.day]);

  // Таймер отдыха
  const restKey = `${level}.${ps.week}.${ps.day}.rest`;
  const [restEnd, setRestEnd] = useState(()=>{ try { return Number(localStorage.getItem(restKey) || 0); } catch { return 0; }});
  useEffect(()=>{ try { localStorage.setItem(restKey, String(restEnd)); } catch {} }, [restKey, restEnd]);
  const [, forceTick] = useState(0);
  useEffect(()=>{
    if(!restEnd) return;
    const t = setInterval(()=>{
      if(Date.now() >= restEnd){ clearInterval(t); setRestEnd(0); vibrate(35); }
      else forceTick(x=>x+1);
    }, 300);
    return ()=> clearInterval(t);
  }, [restEnd]);
  const leftMs = Math.max(0, restEnd - Date.now());
  const mm = String(Math.floor(leftMs/1000/60)).padStart(2,"0");
  const ss = String(Math.floor((leftMs/1000)%60)).padStart(2,"0");

  // Таймер тренировки
  const dayKey = `${level}.${ps.week}.${ps.day}`;
  const wKeyStart = "r7:wstart:" + dayKey;
  const wKeyAccum = "r7:waccum:" + dayKey;
  const [wStart, setWStart] = useState(()=>{ try { return Number(localStorage.getItem(wKeyStart) || 0); } catch { return 0; }});
  const [wAccum, setWAccum] = useState(()=>{ try { return Number(localStorage.getItem(wKeyAccum) || 0); } catch { return 0; }});
  useEffect(()=>{ try { setWStart(Number(localStorage.getItem(wKeyStart) || 0)); setWAccum(Number(localStorage.getItem(wKeyAccum) || 0)); } catch {} }, [dayKey]);
  useEffect(()=>{ try { wStart ? localStorage.setItem(wKeyStart, String(wStart)) : localStorage.removeItem(wKeyStart); } catch {} }, [wStart, wKeyStart]);
  useEffect(()=>{ try { wAccum ? localStorage.setItem(wKeyAccum, String(wAccum)) : localStorage.removeItem(wKeyAccum); } catch {} }, [wAccum, wKeyAccum]);
  const [, tickW] = useState(0);
  useEffect(()=>{ if(!wStart) return; const t=setInterval(()=>tickW(x=>x+1),1000); return ()=>clearInterval(t); }, [wStart]);
  const elapsed = Math.max(0, wAccum + (wStart ? Date.now()-wStart : 0));
  const eh = Math.floor(elapsed/3600000), em = Math.floor((elapsed%3600000)/60000), es = Math.floor((elapsed%60000)/1000);
  const timeText = (eh>0?`${String(eh).padStart(2,"0")}:`:"") + `${String(em).padStart(2,"0")}:${String(es).padStart(2,"0")}`;
  const startWorkout = ()=>{ setWStart(Date.now()); setWAccum(0); };
  const pauseWorkout = ()=>{ if(wStart){ setWAccum(wAccum + (Date.now()-wStart)); setWStart(0); } };
  const resumeWorkout = ()=>{ if(!wStart) setWStart(Date.now()); };
  const resetWorkout  = ()=>{ setWStart(0); setWAccum(0); };
  const paused = !wStart && wAccum>0; const started = !!(wStart || wAccum);

  // Ячейки подходов
  function setCell(exIdx, setIdx, field, value){
    const k = keyFor(level, ps.week, ps.day, exIdx);
    setPs(prev=>{
      const cur = prev.progress[k] || { sets: [] };
      const sets = [...(cur.sets || [])];
      sets[setIdx] = { ...(sets[setIdx] || {}), [field]: value };
      return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
    });
  }
  function toggleSet(exIdx, setIdx){
    const k = keyFor(level, ps.week, ps.day, exIdx);
    setPs(prev=>{
      const cur = prev.progress[k] || { sets: [] };
      const sets = [...(cur.sets || [])];
      const next = !sets[setIdx]?.done;
      sets[setIdx] = { ...(sets[setIdx] || {}), done: next };
      return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
    }); vibrate(12);
  }
  function isExerciseDone(exIdx, workSets){
    const k = keyFor(level, ps.week, ps.day, exIdx);
    const cur = ps.progress[k];
    const done = (cur?.sets || []).filter(s=>s?.done).length;
    return done >= workSets;
  }
  function addSet(exIdx){ week.days[ps.day].exercises[exIdx].workSets = (week.days[ps.day].exercises[exIdx].workSets||0) + 1; setPs({ ...ps }); }
  function removeLastSet(exIdx){ if((week.days[ps.day].exercises[exIdx].workSets||0) > 1){ week.days[ps.day].exercises[exIdx].workSets -= 1; setPs({ ...ps }); } }

  // Видео (путь сохраняем из прошлого)
  function getVideoHref(ex){
    const alt = (()=>{ try { return localStorage.getItem("r7:video:" + exId(level, ps.week, ps.day, ex)) || ""; } catch { return ""; }})();
    return ex?.videos?.[0]?.href || alt || "";
  }
  function openVideo(ex){ const href=getVideoHref(ex); if(href) window.open(href,"_blank","noopener"); }
  function copyLast(exIdx){
    const ex = week.days[ps.day].exercises[exIdx];
    const last = (()=>{ try { return JSON.parse(localStorage.getItem("r7:last:" + exId(level, ps.week, ps.day, ex)) || "null"); } catch { return null; }})();
    if(!last) return;
    const k = keyFor(level, ps.week, ps.day, exIdx);
    const need = Math.max(ex.workSets||0, last.length);
    const sets = Array.from({ length: need }).map((_,i)=>({ reps:last[i]?.reps||"", weight:last[i]?.weight||"", rir:last[i]?.rir||"", done:false }));
    setPs(prev=>({ ...prev, progress: { ...prev.progress, [k]: { sets } } }));
  }

  // Микро-статы дня
  const dayStats = useMemo(()=>{
    if(!day) return { volume: 0, effectiveness: undefined };
    let vol=0, scoreSum=0, completed=0;
    day.exercises.forEach((ex, exIdx)=>{
      const k = keyFor(level, ps.week, ps.day, exIdx);
      const rows = ps.progress[k]?.sets || [];
      rows.forEach(r=>{
        vol += N(r.weight) * N(r.reps);
        if(r?.done){
          const rir = Number(r.rir ?? 4);
          const intensity = Math.max(0,(4-rir)/4);
          scoreSum += intensity; completed += 1;
        }
      });
    });
    const completion = totalSets ? completed / totalSets : 0;
    const avgIntensity = completed ? scoreSum / completed : 0;
    const effectiveness = Math.round(100 * completion * avgIntensity);
    return { volume: Math.round(vol), effectiveness };
  }, [day, ps.progress, level, ps.week, ps.day, totalSets]);
const canCompleteDay = day && totalSets > 0 ? doneSets >= totalSets : false;
  const planDayIndex = ps.week * 7 + ps.day;

  const triggerCompleteDay = () => {
    if (!day || !onCompleteDay) return;
    if (totalSets > 0 && doneSets < totalSets) return;
    const completedAt = new Date().toISOString();
    const workoutSets = day.exercises.map((ex, exIdx) => {
      const k = keyFor(level, ps.week, ps.day, exIdx);
      const rows = ps.progress[k]?.sets || [];
      return {
        id: exId(level, ps.week, ps.day, ex),
        name: ex.name,
        muscle: ex.muscle,
        sets: rows.map((r) => ({
          reps: r?.reps || "",
          weight: r?.weight || "",
          rir: r?.rir ?? "",
          done: !!r?.done,
        })),
      };
    });
    onCompleteDay({
      level,
      weekIndex: ps.week,
      dayIndex: ps.day,
      planDayIndex,
      completedAt,
      summary: {
        volume: dayStats.volume,
        effectiveness: dayStats.effectiveness,
        duration: elapsed,
        exercises: day.exercises.length,
      },
      workoutSets,
    });
    vibrate(25);
  };
  if(!day){
    return (
      <Section title="Программы тренировок">
        <div className="mb-3"><Controls level={level} setLevel={setLevel} prog={prog} weekIdx={ps.week} setWeek={setWeek} dayIdx={ps.day} setDay={setDay} /></div>
        <StickyInfoBar doneSets={0} totalSets={0} leftContent={null} rightTimer={{ mm:"00", ss:"00", start:()=>{}, stop:()=>{}, active:false }} />
        <div className="mt-3 text-sm text-zinc-600">Выберите Start → Неделя 1.</div>
      </Section>
    );
  }

  return (
    <>
      <Section title="Программы тренировок">
        <div className="mb-3"><Controls level={level} setLevel={setLevel} prog={prog} weekIdx={ps.week} setWeek={setWeek} dayIdx={ps.day} setDay={setDay} /></div>
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
         {onCompleteDay && (
          <button
            className={`mt-3 w-full rounded-md px-3 py-2 text-sm ${
              canCompleteDay ? "bg-emerald-600 text-white" : "cursor-not-allowed bg-zinc-200 text-zinc-500"
            }`}
            onClick={triggerCompleteDay}
            disabled={!canCompleteDay}
          >
            Сохранить в план
          </button>
        )}
      </Section>

      <StickyInfoBar
        doneSets={doneSets}
        totalSets={totalSets}
        leftContent={null}
        rightTimer={{ mm, ss, start:(s)=>setRestEnd(Date.now()+s*1000), stop:()=>setRestEnd(0), active:!!restEnd }}
      />

      {day.exercises.map((ex, exIdx)=>{
        const k = keyFor(level, ps.week, ps.day, exIdx);
        const progress = ps.progress[k]?.sets || [];
        const exDone = isExerciseDone(exIdx, ex.workSets);
        const [menuOpen, setMenuOpen] = useState(false);
        const holdRef = React.useRef(null);
        const onHoldStart = ()=>{ holdRef.current = setTimeout(()=>setMenuOpen(true), 500); };
        const onHoldEnd   = ()=>{ if(holdRef.current){ clearTimeout(holdRef.current); holdRef.current = null; } };
        return (
          <Section key={exIdx}
            id={"ex-"+exIdx}
            title={(
              <div className="flex items-center gap-2">
                <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${exDone ? "border-emerald-300 bg-emerald-500 text-white" : "border-zinc-300 text-zinc-500"}`}>✓</div>
                <div>
                  <div className="text-xs text-zinc-500">{ex.muscle}</div>
                  <div className="text-base font-semibold">{ex.name}</div>
                </div>
              </div>
            )}
            right={(getVideoHref(ex) && <button onClick={()=>openVideo(ex)} className="rounded-full border border-zinc-300 px-2 py-0.5 text-xs">▶︎ Видео</button>)}
          >
            <div className="flex flex-wrap items-start justify-between gap-2 pr-10">
              <div className="min-w-0">
                <div className="flex items-center gap-2"
                  onContextMenu={(e)=>{ e.preventDefault(); setMenuOpen(true); }}
                  onTouchStart={onHoldStart} onTouchEnd={onHoldEnd}
                />
                {menuOpen && (
                  <div className="z-10 mt-2 w-44 overflow-hidden rounded-xl border bg-white text-sm shadow-lg">
                    <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={()=>{ setMenuOpen(false); openVideo(ex); }}>Открыть видео</button>
                    <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={()=>{ setMenuOpen(false); copyLast(exIdx); }}>Как в прошлый раз</button>
                    <button className="block w-full px-3 py-2 text-left hover:bg-zinc-50" onClick={()=> setMenuOpen(false)}>Закрыть</button>
                  </div>
                )}
                <MetaBar ex={ex} exIdx={exIdx} addSet={addSet} removeLastSet={removeLastSet} />
              </div>
            </div>

            {ex.notes && (
              <details className="mt-2">
                <summary className="cursor-pointer text-sm text-zinc-700">Примечания</summary>
                <div className="mt-2 text-sm text-zinc-600">{ex.notes}</div>
              </details>
            )}

            {/* Мобильная сетка подходов */}
            <div className="mt-3 space-y-2 sm:hidden">
              {Array.from({ length: ex.workSets }).map((_, si)=>{
                const row = progress[si] || {};
                const idBase = `${exIdx}-${si}`;
                return (
                  <div key={si} className="grid grid-cols-[auto_64px_64px_minmax(0,1fr)_40px] items-center gap-2 rounded-xl border border-zinc-200 p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-xs">{si+1}</span>
                    <InputMini aria-label="Повторы" placeholder={ex.reps || "повт."}
                      value={row.reps || ""} onChange={(e)=>setCell(exIdx, si, "reps", e.target.value)}
                      onEnter={()=>document.getElementById(`kg-${idBase}`)?.focus()} />
                    <InputMini id={`kg-${idBase}`} aria-label="Вес, кг" placeholder="кг"
                      value={row.weight || ""} onChange={(e)=>setCell(exIdx, si, "weight", e.target.value)}
                      onEnter={()=>document.getElementById(`rir-${idBase}`)?.focus()} />
                    <div id={`rir-${idBase}`}>
                      <RirSelect value={row.rir ?? ""} onChange={(val)=>{
                        const k = keyFor(level, ps.week, ps.day, exIdx);
                        setPs(prev=>{
                          const cur = prev.progress[k] || { sets: [] };
                          const sets = [...(cur.sets || [])];
                          sets[si] = { ...(sets[si] || {}), rir: val };
                          if (si===0 && val){
                            for(let j=1;j<(ex.workSets||0);j++){ const r = sets[j] || {}; if(!r.rir) sets[j] = { ...r, rir: val }; }
                          }
                          return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
                        });
                      }} onEnter={()=>{ toggleSet(exIdx, si); }} />
                    </div>
                    <button onClick={()=>toggleSet(exIdx, si)}
                      className={`flex h-8 w-8 items-center justify-center rounded-full border border-zinc-300 text-lg transition-all duration-150 ${row.done ? "scale-105 bg-emerald-500 text-white" : "bg-white text-zinc-600"}`}
                      aria-label="Сделано" title="Сделано">✓</button>
                  </div>
                );
              })}
            </div>

            {/* Десктопная таблица */}
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
                  {Array.from({ length: ex.workSets }).map((_, si)=>{
                    const row = progress[si] || {};
                    const idBase = `${exIdx}-desk-${si}`;
                    return (
                      <tr key={si} className="border-b">
                        <td className="px-2 py-1">{si+1}</td>
                        <td className="px-2 py-1">
                           <input
                            className="h-8 w-28 rounded border border-zinc-300 px-2 text-sm"
                            style={{ fontSize: "14px" }}
                            value={row.reps || ""} onChange={(e)=>setCell(exIdx, si, "reps", e.target.value)}
                            onKeyDown={(e)=>{ if(e.key==="Enter"){ document.getElementById(`kg-${idBase}`)?.focus(); }}}
                            placeholder={ex.reps} inputMode="numeric" />
                        </td>
                        <td className="px-2 py-1">
                           <input id={`kg-${idBase}`}
                            className="h-8 w-28 rounded border border-zinc-300 px-2 text-sm"
                            style={{ fontSize: "14px" }}
                            value={row.weight || ""} onChange={(e)=>setCell(exIdx, si, "weight", e.target.value)}
                            onKeyDown={(e)=>{ if(e.key==="Enter"){ document.getElementById(`rir-${idBase}`)?.focus(); }}}
                            placeholder="кг" inputMode="decimal" />
                        </td>
                        <td className="px-2 py-1">
                          <div id={`rir-${idBase}`} className="w-24">
                            <RirSelect value={row.rir ?? ""} onChange={(val)=>{
                              const k = keyFor(level, ps.week, ps.day, exIdx);
                              setPs(prev=>{
                                const cur = prev.progress[k] || { sets: [] };
                                const sets = [...(cur.sets || [])];
                                sets[si] = { ...(sets[si] || {}), rir: val };
                                if (si===0 && val){
                                  for(let j=1;j<(ex.workSets||0);j++){ const r = sets[j] || {}; if(!r.rir) sets[j] = { ...r, rir: val }; }
                                }
                                return { ...prev, progress: { ...prev.progress, [k]: { ...cur, sets } } };
                              });
                            }} onEnter={()=>{ toggleSet(exIdx, si); }} />
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <input type="checkbox" checked={!!row.done} onChange={()=>{ toggleSet(exIdx, si); }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
             <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <div className="flex items-center gap-1">
                <button
                  className="rounded-md border border-zinc-300 px-2 py-1"
                  onClick={()=>addSet(exIdx)}
                >
                  + подход
                </button>
                <button
                  className="rounded-md border border-zinc-300 px-2 py-1"
                  onClick={()=>removeLastSet(exIdx)}
                >
                  – подход
                </button>
              </div>
              <button className="rounded-md border border-zinc-300 px-2 py-1" onClick={()=>copyLast(exIdx)}>Как в прошлый раз</button>
              <button className="rounded-md border border-zinc-300 px-2 py-1" onClick={()=>{
                saveDayHistory(level, ps.week, ps.day, day, ps.progress);
                alert("Значения сохранены как «прошлый раз».");
              }}>Сохранить «прошлый раз»</button>
            </div>
          </Section>
        );
      })}
    </>
  );
}
