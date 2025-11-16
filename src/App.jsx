import { useEffect, useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Section({ title, children, actions }) {
  return (
    <div className="bg-white/80 backdrop-blur border border-gray-200 rounded-2xl p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-gray-800">{title}</h2>
        {actions}
      </div>
      {children}
    </div>
  )
}

function Input({ label, ...props }) {
  return (
    <label className="block text-sm mb-3">
      <span className="text-gray-700 mb-1 block">{label}</span>
      <input
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </label>
  )
}

function Textarea({ label, ...props }) {
  return (
    <label className="block text-sm mb-3">
      <span className="text-gray-700 mb-1 block">{label}</span>
      <textarea
        className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
        {...props}
      />
    </label>
  )
}

function Pill({ children, active = false, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-full text-sm font-medium transition ${
        active ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`)
  if (!res.ok) throw new Error(`GET ${path} failed`)
  return res.json()
}

async function apiPost(path, body) {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`POST ${path} failed`)
  return res.json()
}

function App() {
  const [tab, setTab] = useState('plan') // plan | log | history | library

  // Library (exercises)
  const [exercises, setExercises] = useState([])
  const [exName, setExName] = useState('')
  const [exGroup, setExGroup] = useState('')
  const [exEquip, setExEquip] = useState('')
  const [exNotes, setExNotes] = useState('')

  // Workout templates
  const [workouts, setWorkouts] = useState([])
  const [wTitle, setWTitle] = useState('')
  const [wDesc, setWDesc] = useState('')
  const [wItems, setWItems] = useState([])
  const [tempExerciseName, setTempExerciseName] = useState('')
  const [tempSets, setTempSets] = useState(3)
  const [tempReps, setTempReps] = useState(10)
  const [tempRest, setTempRest] = useState(90)

  // Logging session
  const isoToday = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const [dateStr, setDateStr] = useState(isoToday)
  const [sessionTitle, setSessionTitle] = useState('')
  const [sessionNotes, setSessionNotes] = useState('')
  const [sessionItems, setSessionItems] = useState([])

  // History
  const [sessions, setSessions] = useState([])

  const refreshAll = async () => {
    try {
      const [exs, wos, sess] = await Promise.all([
        apiGet('/api/exercises').catch(() => []),
        apiGet('/api/workouts').catch(() => []),
        apiGet('/api/sessions').catch(() => []),
      ])
      setExercises(exs)
      setWorkouts(wos)
      setSessions(sess)
    } catch (e) {
      // ignore for MVP
    }
  }

  useEffect(() => {
    refreshAll()
  }, [])

  const addExercise = async () => {
    if (!exName.trim()) return
    await apiPost('/api/exercises', {
      name: exName,
      muscle_group: exGroup || undefined,
      equipment: exEquip || undefined,
      notes: exNotes || undefined,
    })
    setExName(''); setExGroup(''); setExEquip(''); setExNotes('')
    refreshAll()
  }

  const addWorkoutItem = () => {
    if (!tempExerciseName.trim()) return
    setWItems(prev => [...prev, {
      exercise_name: tempExerciseName,
      sets: Number(tempSets),
      reps: Number(tempReps),
      rest_seconds: Number(tempRest)
    }])
    setTempExerciseName('')
  }

  const createWorkout = async () => {
    if (!wTitle.trim() || wItems.length === 0) return
    await apiPost('/api/workouts', {
      title: wTitle,
      description: wDesc || undefined,
      items: wItems,
    })
    setWTitle(''); setWDesc(''); setWItems([])
    refreshAll()
  }

  const loadTemplateIntoSession = (wo) => {
    setSessionTitle(wo.title)
    const items = (wo.items || []).map((it) => ({
      exercise_name: it.exercise_name,
      target_sets: it.sets,
      target_reps: it.reps,
      performed_sets: [],
    }))
    setSessionItems(items)
    setTab('log')
  }

  const addPerformedSet = (idx) => {
    const weight = 0
    const reps = sessionItems[idx]?.target_reps || 10
    const next = [...sessionItems]
    next[idx] = {
      ...next[idx],
      performed_sets: [...next[idx].performed_sets, { set_number: next[idx].performed_sets.length + 1, weight, reps }],
    }
    setSessionItems(next)
  }

  const updatePerformedSet = (i, j, field, value) => {
    const next = [...sessionItems]
    next[i].performed_sets = next[i].performed_sets.map((s, idx) => idx === j ? { ...s, [field]: value } : s)
    setSessionItems(next)
  }

  const logSession = async () => {
    if (!sessionTitle.trim()) return
    await apiPost('/api/sessions', {
      date_str: dateStr,
      workout_title: sessionTitle,
      notes: sessionNotes || undefined,
      items: sessionItems,
    })
    setSessionNotes('')
    setSessionItems([])
    refreshAll()
    setTab('history')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">FitTrack MVP</h1>
            <p className="text-gray-600 text-sm">Create workouts, log sessions, and see your history. Data persists in a database.</p>
          </div>
          <div className="flex gap-2">
            <Pill active={tab==='plan'} onClick={()=>setTab('plan')}>Workout Planner</Pill>
            <Pill active={tab==='log'} onClick={()=>setTab('log')}>Log Session</Pill>
            <Pill active={tab==='history'} onClick={()=>setTab('history')}>History</Pill>
            <Pill active={tab==='library'} onClick={()=>setTab('library')}>Exercise Library</Pill>
          </div>
        </header>

        {tab === 'library' && (
          <Section title="Exercise Library" actions={
            <button onClick={refreshAll} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Refresh</button>
          }>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Input label="Name" value={exName} onChange={e=>setExName(e.target.value)} placeholder="Bench Press" />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Muscle Group" value={exGroup} onChange={e=>setExGroup(e.target.value)} placeholder="Chest" />
                  <Input label="Equipment" value={exEquip} onChange={e=>setExEquip(e.target.value)} placeholder="Barbell" />
                </div>
                <Textarea label="Notes" value={exNotes} onChange={e=>setExNotes(e.target.value)} placeholder="Keep elbows 45°" rows={3} />
                <button onClick={addExercise} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">Add Exercise</button>
              </div>
              <div>
                <h3 className="font-medium text-gray-700 mb-2">Saved Exercises</h3>
                <ul className="space-y-2 max-h-64 overflow-auto pr-2">
                  {exercises.length === 0 && <p className="text-gray-500 text-sm">No exercises yet.</p>}
                  {exercises.map(ex => (
                    <li key={ex.id} className="p-3 rounded-lg border bg-white flex items-center justify-between">
                      <div>
                        <p className="font-medium">{ex.name}</p>
                        <p className="text-xs text-gray-500">{[ex.muscle_group, ex.equipment].filter(Boolean).join(' • ')}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        )}

        {tab === 'plan' && (
          <Section title="Workout Planner" actions={
            <button onClick={refreshAll} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200">Refresh</button>
          }>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Input label="Title" value={wTitle} onChange={e=>setWTitle(e.target.value)} placeholder="Push Day" />
                <Textarea label="Description" value={wDesc} onChange={e=>setWDesc(e.target.value)} placeholder="Chest, shoulders, triceps focus" rows={2} />

                <div className="p-3 border rounded-xl bg-gray-50 mb-3">
                  <p className="font-medium text-sm mb-2">Add Exercise</p>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <input value={tempExerciseName} onChange={e=>setTempExerciseName(e.target.value)} placeholder="Exercise name" className="rounded-lg border px-3 py-2" />
                    <input type="number" min={1} value={tempSets} onChange={e=>setTempSets(e.target.value)} placeholder="Sets" className="rounded-lg border px-3 py-2" />
                    <input type="number" min={1} value={tempReps} onChange={e=>setTempReps(e.target.value)} placeholder="Reps" className="rounded-lg border px-3 py-2" />
                    <input type="number" min={0} value={tempRest} onChange={e=>setTempRest(e.target.value)} placeholder="Rest (s)" className="rounded-lg border px-3 py-2" />
                  </div>
                  <button onClick={addWorkoutItem} className="mt-2 text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white">Add to List</button>
                </div>

                <div className="space-y-2">
                  {wItems.length === 0 && <p className="text-sm text-gray-500">No exercises added yet.</p>}
                  {wItems.map((it, idx) => (
                    <div key={idx} className="p-3 border rounded-lg bg-white flex items-center justify-between">
                      <div>
                        <p className="font-medium">{it.exercise_name}</p>
                        <p className="text-xs text-gray-500">{it.sets} x {it.reps} • Rest {it.rest_seconds}s</p>
                      </div>
                      <button onClick={() => setWItems(wItems.filter((_, i)=>i!==idx))} className="text-xs text-red-600">Remove</button>
                    </div>
                  ))}
                </div>

                <button onClick={createWorkout} className="mt-3 w-full bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-lg">Save Workout</button>
              </div>

              <div>
                <h3 className="font-medium text-gray-700 mb-2">Saved Workouts</h3>
                <ul className="space-y-2 max-h-[420px] overflow-auto pr-2">
                  {workouts.length === 0 && <p className="text-gray-500 text-sm">No workouts yet.</p>}
                  {workouts.map(wo => (
                    <li key={wo.id} className="p-3 rounded-lg border bg-white">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{wo.title}</p>
                          {wo.description && <p className="text-xs text-gray-500">{wo.description}</p>}
                        </div>
                        <button onClick={() => loadTemplateIntoSession(wo)} className="text-sm px-3 py-1.5 rounded-lg bg-blue-600 text-white">Use</button>
                      </div>
                      {wo.items && wo.items.length > 0 && (
                        <ul className="mt-2 text-sm text-gray-600 list-disc pl-5">
                          {wo.items.map((it, idx)=> (
                            <li key={idx}>{it.exercise_name} — {it.sets}x{it.reps}</li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Section>
        )}

        {tab === 'log' && (
          <Section title="Log Workout Session">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <Input label="Date" type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} />
                <Input label="Workout Title" value={sessionTitle} onChange={e=>setSessionTitle(e.target.value)} placeholder="Push Day" />
                <Textarea label="Notes" value={sessionNotes} onChange={e=>setSessionNotes(e.target.value)} rows={3} />
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Exercises</p>
                <div className="space-y-3">
                  {sessionItems.length === 0 && <p className="text-gray-500 text-sm">Load a template from Planner or add exercises there first.</p>}
                  {sessionItems.map((item, i) => (
                    <div key={i} className="p-3 border rounded-lg bg-white">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{item.exercise_name}</p>
                        <button onClick={() => addPerformedSet(i)} className="text-xs px-2 py-1 rounded bg-gray-100">Add Set</button>
                      </div>
                      <p className="text-xs text-gray-500 mb-2">Target: {item.target_sets} x {item.target_reps}</p>
                      <div className="space-y-2">
                        {item.performed_sets.map((s, j) => (
                          <div key={j} className="grid grid-cols-3 gap-2">
                            <input type="number" min={0} className="rounded border px-2 py-1" value={s.weight ?? 0} onChange={e=>updatePerformedSet(i, j, 'weight', Number(e.target.value))} placeholder="Weight" />
                            <input type="number" min={1} className="rounded border px-2 py-1" value={s.reps} onChange={e=>updatePerformedSet(i, j, 'reps', Number(e.target.value))} placeholder="Reps" />
                            <input type="number" min={1} max={10} className="rounded border px-2 py-1" value={s.rpe ?? ''} onChange={e=>updatePerformedSet(i, j, 'rpe', Number(e.target.value))} placeholder="RPE" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={logSession} className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg">Save Session</button>
              </div>
            </div>
          </Section>
        )}

        {tab === 'history' && (
          <Section title="Workout History" actions={
            <div className="flex items-center gap-2">
              <input type="date" value={dateStr} onChange={e=>setDateStr(e.target.value)} className="rounded-lg border px-3 py-1.5" />
              <button onClick={() => apiGet(`/api/sessions?date_str=${dateStr}`).then(setSessions)} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100">Filter</button>
              <button onClick={refreshAll} className="text-sm px-3 py-1.5 rounded-lg bg-gray-100">Refresh</button>
            </div>
          }>
            <ul className="space-y-3">
              {sessions.length === 0 && <p className="text-gray-500 text-sm">No sessions logged yet.</p>}
              {sessions.map((s) => (
                <li key={s.id} className="p-4 border rounded-xl bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{s.workout_title}</p>
                      <p className="text-xs text-gray-500">{s.date_str}</p>
                    </div>
                  </div>
                  {s.items && s.items.length > 0 && (
                    <ul className="mt-2 text-sm text-gray-700 list-disc pl-5">
                      {s.items.map((it, idx) => (
                        <li key={idx}>
                          {it.exercise_name}: {it.performed_sets?.map(ps => `${ps.reps}${ps.weight?`@${ps.weight}`:''}`).join(', ') || '—'}
                        </li>
                      ))}
                    </ul>
                  )}
                  {s.notes && <p className="mt-2 text-sm text-gray-600 italic">{s.notes}</p>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        <footer className="text-center text-xs text-gray-500 pt-4">Backend: {API_BASE}</footer>
      </div>
    </div>
  )
}

export default App
