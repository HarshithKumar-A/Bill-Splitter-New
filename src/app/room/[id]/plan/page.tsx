'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { FaPlus, FaCopy, FaTrash, FaEdit, FaPlane, FaBed, FaTicketAlt, FaMoneyBillWave } from 'react-icons/fa'
import { format, addDays, parseISO } from 'date-fns'
import Header from '@/components/Header'
import { useApiAuth } from '@/hooks/useApiAuth'
import { useOfflineData } from '@/modules/offline/useOfflineData'
import { OfflineStorage } from '@/modules/offline/offline-storage'
import { useOffline } from '@/modules/offline/OfflineContext'
import { auth } from '@/lib/firebase.config'
import { onAuthStateChanged } from 'firebase/auth'
import { useBillOcr } from '@/hooks/useBillOcr'

type PlanType = 'STAY' | 'TRAVEL' | 'ACTIVITY'
type PlanItem = { id: string; type: PlanType; title: string; locationFrom?: string | null; locationTo?: string | null; startDate: string; endDate?: string | null; startTime?: string | null; endTime?: string | null; bookingRef?: string | null; notes?: string | null; participantIds: string[]; linkedExpenseId?: string | null; sortOrder: number }
type Member = { id: string; name: string }
type Room = { name: string; destination: string; startDate: string; endDate: string; members: Member[] }
type PendingChange = { method: 'POST' | 'PATCH' | 'DELETE'; itemId: string; clientId?: string; data?: Record<string, unknown> }
type ParsedItem = Omit<PlanItem, 'id' | 'sortOrder' | 'participantIds' | 'linkedExpenseId'>

const blankForm = (date: string): Omit<PlanItem, 'id' | 'sortOrder'> => ({ type: 'ACTIVITY', title: '', startDate: date, endDate: '', startTime: '', endTime: '', locationFrom: '', locationTo: '', bookingRef: '', notes: '', participantIds: [], linkedExpenseId: null })
const inputClass = 'w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-gray-900 dark:text-white'
const typeLabels: Record<PlanType, string> = { STAY: 'Stay', TRAVEL: 'Travel', ACTIVITY: 'Activity' }

export default function PlanPage() {
  const { id: roomId } = useParams<{ id: string }>()
  const router = useRouter()
  const { authenticatedFetch } = useApiAuth()
  const { isOnline } = useOffline()
  const [authReady, setAuthReady] = useState(false)
  const [room, setRoom] = useState<Room | null>(null)
  const [localItems, setLocalItems] = useState<PlanItem[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(blankForm(new Date().toISOString().slice(0, 10)))
  const [moreDetails, setMoreDetails] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [showScan, setShowScan] = useState(false)
  const [scanBusy, setScanBusy] = useState(false)
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
  const [detectedExpense, setDetectedExpense] = useState<{ amount: number; currency: string } | null>(null)
  const [scanError, setScanError] = useState('')
  const { recognize, progress: ocrProgress, status: ocrStatus, isProcessing: ocrProcessing } = useBillOcr()
  const syncing = useRef(false)

  useEffect(() => onAuthStateChanged(auth, user => user ? setAuthReady(true) : router.push('/login')), [router])

  const fetchItems = useCallback(async () => {
    if (!authReady) throw new Error('Waiting for authentication')
    const response = await authenticatedFetch(`/api/groups/${roomId}/plan`)
    if (!response.ok) throw new Error('Could not load plan')
    return response.json()
  }, [authenticatedFetch, authReady, roomId])
  const { data: cachedItems, isLoading, error: loadError } = useOfflineData<PlanItem[]>({ key: OfflineStorage.KEYS.GROUP_PLAN(roomId), fetchFn: fetchItems })
  useEffect(() => { if (cachedItems) setLocalItems(cachedItems) }, [cachedItems])
  const items = localItems
  const pendingKey = OfflineStorage.KEYS.GROUP_PLAN_PENDING(roomId)
  const cacheKey = OfflineStorage.KEYS.GROUP_PLAN(roomId)

  useEffect(() => {
    if (!authReady || !isOnline || syncing.current) return
    const queue = OfflineStorage.load<PendingChange[]>(pendingKey) || []
    if (!queue.length) return
    syncing.current = true
    void (async () => {
      let remaining = [...queue]
      try {
        while (remaining.length) {
          const change = remaining[0]
          const response = await authenticatedFetch(`/api/groups/${roomId}/plan${change.method === 'POST' ? '' : `/${change.itemId}`}`, { method: change.method, ...(change.data ? { body: JSON.stringify(change.data) } : {}) })
          if (!response.ok) break
          const saved = change.method === 'DELETE' ? null : await response.json()
          const latest = OfflineStorage.load<PlanItem[]>(cacheKey) || []
          const updated = change.method === 'DELETE'
            ? latest.filter(item => item.id !== change.itemId)
            : change.method === 'POST'
              ? latest.map(item => item.id === change.clientId ? saved : item)
              : latest.map(item => item.id === change.itemId ? saved : item)
          OfflineStorage.save(cacheKey, updated)
          setLocalItems(updated)
          remaining = remaining.slice(1)
          OfflineStorage.save(pendingKey, remaining)
        }
      } catch { /* Keep unsynced changes queued for the next connection attempt. */ }
      finally { syncing.current = false }
    })()
  }, [authReady, isOnline, authenticatedFetch, roomId, pendingKey, cacheKey])

  useEffect(() => {
    if (!authReady) return
    authenticatedFetch(`/api/groups/${roomId}`).then(r => r.ok ? r.json() : null).then(data => data && setRoom(data)).catch(() => {})
  }, [authReady, authenticatedFetch, roomId])

  const dayGroups = useMemo(() => {
    const groups: { date: string; label: string; items: PlanItem[] }[] = []
    if (room?.startDate && room?.endDate) {
      const first = parseISO(room.startDate)
      const last = parseISO(room.endDate)
      for (let date = first, day = 1; date <= last && day <= 60; date = addDays(date, 1), day++) {
        const key = format(date, 'yyyy-MM-dd')
        groups.push({ date: key, label: `Day ${day} · ${format(date, 'EEE, MMM d')}`, items: items.filter(item => item.startDate.slice(0, 10) === key) })
      }
    }
    const inTrip = new Set(groups.map(g => g.date))
    const unscheduled = items.filter(item => !inTrip.has(item.startDate.slice(0, 10)))
    if (unscheduled.length) groups.push({ date: 'unscheduled', label: 'Unscheduled / Anytime', items: unscheduled })
    return groups
  }, [items, room])

  const openNew = (date?: string) => { setEditingId(null); setForm(blankForm(date || room?.startDate || new Date().toISOString().slice(0, 10))); setMoreDetails(false); setError(''); setShowForm(true) }
  const openEdit = (item: PlanItem) => { setEditingId(item.id); setForm({ ...item, endDate: item.endDate || '', startTime: item.startTime || '', endTime: item.endTime || '', locationFrom: item.locationFrom || '', locationTo: item.locationTo || '', bookingRef: item.bookingRef || '', notes: item.notes || '', participantIds: item.participantIds || [] }); setMoreDetails(true); setError(''); setShowForm(true) }
  const saveItem = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError('')
    const data = { ...form, title: form.title.trim(), endDate: form.endDate || null, startTime: form.startTime || null, endTime: form.endTime || null, locationFrom: form.locationFrom || null, locationTo: form.locationTo || null, bookingRef: form.bookingRef || null, notes: form.notes || null, sortOrder: editingId ? items.find(i => i.id === editingId)?.sortOrder || 0 : items.length }
    if (!isOnline) {
      const queue = OfflineStorage.load<PendingChange[]>(pendingKey) || []
      if (editingId) {
        const updated = items.map(item => item.id === editingId ? { ...item, ...data } as PlanItem : item)
        const existing = queue.find(change => change.itemId === editingId && change.method !== 'DELETE')
        if (existing?.method === 'POST') existing.data = { ...existing.data, ...data }
        else if (existing?.method === 'PATCH') existing.data = { ...existing.data, ...data }
        else queue.push({ method: 'PATCH', itemId: editingId, data })
        setLocalItems(updated); OfflineStorage.save(cacheKey, updated); OfflineStorage.save(pendingKey, queue)
      } else {
        const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2)}`
        const localItem = { ...data, id: clientId, sortOrder: data.sortOrder } as PlanItem
        const updated = [...items, localItem]
        setLocalItems(updated); OfflineStorage.save(cacheKey, updated); OfflineStorage.save(pendingKey, [...queue, { method: 'POST', itemId: clientId, clientId, data }])
      }
      setShowForm(false); setEditingId(null); setSaving(false)
      return
    }
    try {
      const response = await authenticatedFetch(`/api/groups/${roomId}/plan${editingId ? `/${editingId}` : ''}`, { method: editingId ? 'PATCH' : 'POST', body: JSON.stringify(data) })
      if (!response.ok) throw new Error((await response.json()).error || 'Could not save plan item')
      const saved = await response.json()
      const updated = editingId ? items.map(item => item.id === editingId ? saved : item) : [...items, saved]
      setLocalItems(updated)
      OfflineStorage.save(OfflineStorage.KEYS.GROUP_PLAN(roomId), updated)
      setShowForm(false); setEditingId(null)
      router.refresh()
    } catch (e: unknown) { setError(isOnline ? (e instanceof Error ? e.message : 'Could not save item') : 'You are offline. Reconnect to save changes.') }
    finally { setSaving(false) }
  }
  const deleteItem = async (item: PlanItem) => {
    if (!window.confirm(`Delete “${item.title}” from the plan?`)) return
    if (!isOnline) {
      const updated = items.filter(i => i.id !== item.id)
      let queue = OfflineStorage.load<PendingChange[]>(pendingKey) || []
      const wasLocalCreate = queue.some(change => change.method === 'POST' && change.clientId === item.id)
      queue = queue.filter(change => change.itemId !== item.id)
      if (!wasLocalCreate) queue.push({ method: 'DELETE', itemId: item.id })
      setLocalItems(updated); OfflineStorage.save(cacheKey, updated); OfflineStorage.save(pendingKey, queue)
      return
    }
    try {
      const response = await authenticatedFetch(`/api/groups/${roomId}/plan/${item.id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Could not delete plan item')
      const updated = items.filter(i => i.id !== item.id)
      setLocalItems(updated); OfflineStorage.save(OfflineStorage.KEYS.GROUP_PLAN(roomId), updated); router.refresh()
    } catch { setError(isOnline ? 'Could not delete item. Please try again.' : 'You are offline. Reconnect to delete items.') }
  }
  const copyDay = async (group: typeof dayGroups[number]) => {
    const lines = [group.label, ...group.items.map(item => {
      const time = [item.startTime, item.endTime].filter(Boolean).join('–')
      const place = item.type === 'TRAVEL' ? [item.locationFrom, item.locationTo].filter(Boolean).join(' → ') : item.locationFrom
      return `• ${time ? `${time} ` : ''}${item.title}${place ? ` — ${place}` : ''}${item.notes ? `\n  ${item.notes}` : ''}`
    })]
    try { await navigator.clipboard.writeText(lines.join('\n')); setError('Day plan copied to clipboard.') } catch { setError('Clipboard access is unavailable.') }
  }

  const scanBill = async (file?: File) => {
    if (!file) return
    setScanBusy(true); setScanError(''); setParsedItems([]); setDetectedExpense(null)
    try {
      const ocrText = await recognize(file)
      const response = await authenticatedFetch(`/api/groups/${roomId}/plan/parse`, { method: 'POST', body: JSON.stringify({ ocrText, tripStartDate: room?.startDate?.slice(0, 10), tripEndDate: room?.endDate?.slice(0, 10) }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Could not parse bill')
      setParsedItems(result.items || []); setDetectedExpense(result.detectedExpense || null)
      if (!result.items?.length && !result.detectedExpense) setScanError('No itinerary details or payable amount were found. You can try a clearer image.')
    } catch (e: unknown) { setScanError(e instanceof Error ? e.message : 'Could not scan this bill') }
    finally { setScanBusy(false) }
  }

  const saveParsedItems = async () => {
    if (!parsedItems.length) {
      if (detectedExpense) router.push(`/room/${roomId}/split/new?title=${encodeURIComponent('Travel expense')}&date=${encodeURIComponent(new Date().toISOString().slice(0, 10))}&amount=${encodeURIComponent(String(detectedExpense.amount))}&currency=${encodeURIComponent(detectedExpense.currency)}`)
      return
    }
    setSaving(true); setScanError('')
    try {
      const created: PlanItem[] = []
      for (const item of parsedItems) {
        const response = await authenticatedFetch(`/api/groups/${roomId}/plan`, { method: 'POST', body: JSON.stringify({ ...item, sortOrder: items.length + created.length, participantIds: [] }) })
        if (!response.ok) throw new Error((await response.json()).error || 'Could not save all plan items')
        created.push(await response.json())
      }
      const updated = [...items, ...created].sort((a, b) => a.startDate.localeCompare(b.startDate))
      setLocalItems(updated); OfflineStorage.save(cacheKey, updated); setParsedItems([]); setShowScan(false)
      if (detectedExpense) router.push(`/room/${roomId}/split/new?title=${encodeURIComponent(parsedItems[0]?.title || 'Travel expense')}&date=${encodeURIComponent(parsedItems[0]?.startDate || new Date().toISOString().slice(0, 10))}&amount=${encodeURIComponent(String(detectedExpense.amount))}&currency=${encodeURIComponent(detectedExpense.currency)}`)
    } catch (e: unknown) { setScanError(e instanceof Error ? e.message : 'Could not save itinerary') }
    finally { setSaving(false) }
  }

  const labelDate = (value: string) => { try { return format(parseISO(value.slice(0, 10)), 'EEE, MMM d') } catch { return value } }
  const icons: Record<PlanType, JSX.Element> = { STAY: <FaBed />, TRAVEL: <FaPlane />, ACTIVITY: <FaTicketAlt /> }
  const styles: Record<PlanType, string> = { STAY: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200', TRAVEL: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200', ACTIVITY: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200' }

  return <div className="min-h-screen bg-gray-100 dark:bg-gray-900"><Header title={room ? `${room.name} · Plan` : 'Trip Plan'} showBackButton backUrl={`/room/${roomId}`} />
    <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Trip plan</h1><p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{room?.destination || 'Your schedule, day by day'}</p></div><div className="flex gap-2"><button onClick={() => { setShowScan(true); setParsedItems([]); setScanError('') }} className="rounded-md border border-indigo-600 px-4 py-2 font-medium text-indigo-700 dark:text-indigo-300">Scan Bill to Plan</button><button onClick={() => openNew()} className="inline-flex items-center gap-2 rounded-md bg-indigo-600 px-4 py-2 font-medium text-white hover:bg-indigo-700"><FaPlus /> Add to plan</button></div></div>
      {!isOnline && <p className="mb-4 rounded-md bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">Offline mode · showing the last saved itinerary.</p>}
      {error && <div className="mb-4 rounded-md bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/30 dark:text-blue-200">{error}<button className="float-right" onClick={() => setError('')}>×</button></div>}
      {loadError && !items.length && <p className="mb-4 text-sm text-red-600">Could not load the itinerary.</p>}
      {isLoading && !items.length ? <p className="py-12 text-center text-gray-500">Loading itinerary…</p> : dayGroups.length === 0 ? <div className="rounded-xl bg-white p-10 text-center shadow dark:bg-gray-800"><FaTicketAlt className="mx-auto mb-3 text-3xl text-indigo-400" /><h2 className="font-medium text-gray-900 dark:text-white">Nothing planned yet</h2><p className="mt-1 text-sm text-gray-500">Add a stay, travel leg, or activity to get started.</p><button onClick={() => openNew()} className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-white">Add the first item</button></div> : <div className="space-y-7">{dayGroups.map(group => <section key={group.date}><div className="mb-3 flex items-center justify-between"><h2 className="font-semibold text-gray-900 dark:text-white">{group.label}</h2><div className="flex gap-2"><button onClick={() => copyDay(group)} className="flex items-center gap-1 rounded px-2 py-1 text-xs text-gray-600 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-700"><FaCopy /> Copy day</button>{group.date !== 'unscheduled' && <button onClick={() => openNew(group.date)} className="rounded px-2 py-1 text-xs text-indigo-700 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-gray-800"><FaPlus /> Add item</button>}</div></div>
        {!group.items.length ? <button onClick={() => openNew(group.date)} className="w-full rounded-lg border border-dashed border-gray-300 p-4 text-left text-sm text-gray-500 hover:border-indigo-400 dark:border-gray-700">Nothing scheduled · add an item</button> : <div className="space-y-3 border-l-2 border-indigo-200 pl-4 dark:border-indigo-900">{group.items.map(item => <article key={item.id} className="rounded-lg bg-white p-4 shadow-sm dark:bg-gray-800"><div className="flex flex-wrap items-start justify-between gap-3"><div className="flex min-w-0 gap-3"><span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${styles[item.type]}`}>{icons[item.type]}</span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-gray-900 dark:text-white">{item.title}</h3><span className={`rounded-full px-2 py-0.5 text-xs ${styles[item.type]}`}>{typeLabels[item.type]}</span></div><p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{item.type === 'TRAVEL' ? <>{item.locationFrom || 'Origin'} <span className="mx-1">→</span> {item.locationTo || 'Destination'}</> : item.locationFrom}</p><p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{item.type === 'STAY' && item.endDate ? `Check-in ${labelDate(item.startDate)} · Check-out ${labelDate(item.endDate)}` : item.type === 'TRAVEL' && item.endDate ? `Departure ${labelDate(item.startDate)} · Arrival ${labelDate(item.endDate)}` : labelDate(item.startDate)}{item.startTime ? ` · ${item.startTime}` : ''}{item.endTime ? ` – ${item.endTime}` : ''}</p>{item.bookingRef && <p className="mt-1 text-xs text-gray-500">Ref: {item.bookingRef}</p>}{item.notes && <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600 dark:text-gray-300">{item.notes}</p>}</div></div><div className="flex items-center gap-1"><button title="Edit" onClick={() => openEdit(item)} className="rounded p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"><FaEdit /></button><button title="Delete" onClick={() => deleteItem(item)} className="rounded p-2 text-gray-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/30"><FaTrash /></button></div></div><div className="mt-3 flex flex-wrap gap-2 border-t border-gray-100 pt-3 dark:border-gray-700">{item.participantIds.length > 0 && <span className="mr-auto self-center text-xs text-gray-500">{item.participantIds.map(id => room?.members.find(m => m.id === id)?.name).filter(Boolean).join(', ')}</span>}<button onClick={() => router.push(`/room/${roomId}/split/new?title=${encodeURIComponent(item.title)}&date=${encodeURIComponent(item.startDate.slice(0, 10))}&time=${encodeURIComponent(item.startTime || '')}&participantIds=${encodeURIComponent(item.participantIds.join(','))}&planItemId=${encodeURIComponent(item.id)}`)} className="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 dark:bg-green-900/30 dark:text-green-300"><FaMoneyBillWave /> {item.linkedExpenseId ? 'Log another expense' : 'Log Expense'}</button></div></article>)}</div>}</section>)}</div>}
    </main>
    {showScan && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={e => e.target === e.currentTarget && !scanBusy && setShowScan(false)}><section className="max-h-[95vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:rounded-xl"><div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold text-gray-900 dark:text-white">Scan bill to plan</h2><p className="text-sm text-gray-500">OCR runs in your browser; Gemini extracts suggested details.</p></div><button disabled={scanBusy} onClick={() => setShowScan(false)} className="text-2xl text-gray-500">×</button></div>
      {!parsedItems.length && <label className="block rounded-lg border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:text-gray-300">Choose a travel ticket, hotel confirmation, or booking bill<input type="file" accept="image/*" className="mt-3 block w-full text-sm" disabled={scanBusy} onChange={e => void scanBill(e.target.files?.[0])} />{ocrProcessing && <span className="mt-3 block">{ocrStatus} · {ocrProgress}%<span className="mt-2 block h-2 rounded bg-gray-200"><span className="block h-2 rounded bg-indigo-600" style={{ width: `${ocrProgress}%` }} /></span></span>}{scanBusy && !ocrProcessing && <span className="mt-3 block">Extracting plan details…</span>}</label>}
      {parsedItems.map((item, index) => <div key={index} className="mt-4 rounded-lg border border-gray-200 p-4 dark:border-gray-700"><p className="mb-3 text-sm font-medium">Suggested item {index + 1} · {item.type}</p><div className="grid grid-cols-2 gap-3"><label className="col-span-2 text-sm">Title<input className={`${inputClass} mt-1`} value={item.title} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, title: e.target.value } : v))} /></label><label className="text-sm">Start date<input type="date" className={`${inputClass} mt-1`} value={item.startDate} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, startDate: e.target.value } : v))} /></label><label className="text-sm">End date<input type="date" className={`${inputClass} mt-1`} value={item.endDate || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, endDate: e.target.value || null } : v))} /></label><label className="text-sm">Start time<input type="time" className={`${inputClass} mt-1`} value={item.startTime || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, startTime: e.target.value || null } : v))} /></label><label className="text-sm">End time<input type="time" className={`${inputClass} mt-1`} value={item.endTime || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, endTime: e.target.value || null } : v))} /></label><label className="text-sm">Location / origin<input className={`${inputClass} mt-1`} value={item.locationFrom || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, locationFrom: e.target.value || null } : v))} /></label><label className="text-sm">Destination<input className={`${inputClass} mt-1`} value={item.locationTo || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, locationTo: e.target.value || null } : v))} /></label><label className="col-span-2 text-sm">Booking reference<input className={`${inputClass} mt-1`} value={item.bookingRef || ''} onChange={e => setParsedItems(list => list.map((v, i) => i === index ? { ...v, bookingRef: e.target.value || null } : v))} /></label></div></div>)}
      {detectedExpense && <p className="mt-4 rounded-md bg-green-50 p-3 text-sm text-green-800 dark:bg-green-900/30 dark:text-green-200">Detected payable amount: {detectedExpense.currency} {detectedExpense.amount}. You can review it in a new split after saving the plan.</p>}{scanError && <p className="mt-3 text-sm text-red-600">{scanError}</p>}<div className="mt-5 flex justify-end gap-2"><button disabled={scanBusy} onClick={() => setShowScan(false)} className="rounded-md px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Close</button>{detectedExpense && !parsedItems.length && <button onClick={() => void saveParsedItems()} className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white">Add detected expense</button>}{parsedItems.length > 0 && <button disabled={saving} onClick={() => void saveParsedItems()} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : detectedExpense ? 'Save plan & add expense' : 'Save plan items'}</button>}</div></section></div>}
    {showForm && <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4" onMouseDown={e => e.target === e.currentTarget && setShowForm(false)}><form onSubmit={saveItem} className="max-h-[95vh] w-full max-w-xl overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-800 sm:rounded-xl"><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-semibold text-gray-900 dark:text-white">{editingId ? 'Edit plan item' : 'Add to your plan'}</h2><button type="button" onClick={() => setShowForm(false)} className="text-2xl text-gray-500">×</button></div>
      <div className="mb-4 grid grid-cols-3 gap-2">{(['STAY', 'TRAVEL', 'ACTIVITY'] as PlanType[]).map(type => <button type="button" key={type} onClick={() => setForm(f => ({ ...f, type }))} className={`rounded-md border px-3 py-2 text-sm font-medium ${form.type === type ? 'border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200' : 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-300'}`}>{icons[type]} <span className="ml-1">{typeLabels[type]}</span></button>)}</div>
      <label className="mb-3 block text-sm font-medium text-gray-700 dark:text-gray-300">Title<input required autoFocus className={`${inputClass} mt-1`} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder={form.type === 'STAY' ? 'Hotel or accommodation' : form.type === 'TRAVEL' ? 'Flight, train, or drive' : 'What are you doing?'} /></label>
      <div className="grid grid-cols-2 gap-3"><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{form.type === 'STAY' ? 'Check-in' : form.type === 'TRAVEL' ? 'Departure' : 'Date'}<input type="date" required className={`${inputClass} mt-1`} value={form.startDate.slice(0, 10)} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))} /></label><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{form.type === 'STAY' ? 'Check-out' : form.type === 'TRAVEL' ? 'Arrival date' : 'End date (optional)'}<input type="date" className={`${inputClass} mt-1`} value={form.endDate || ''} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))} /></label><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{form.type === 'STAY' ? 'Check-in time' : form.type === 'TRAVEL' ? 'Departure time' : 'Start time'}<input type="time" className={`${inputClass} mt-1`} value={form.startTime || ''} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} /></label><label className="text-sm font-medium text-gray-700 dark:text-gray-300">{form.type === 'STAY' ? 'Check-out time' : form.type === 'TRAVEL' ? 'Arrival time' : 'End time'}<input type="time" className={`${inputClass} mt-1`} value={form.endTime || ''} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} /></label></div>
      <button type="button" onClick={() => setMoreDetails(v => !v)} className="my-4 text-sm font-medium text-indigo-600 dark:text-indigo-300">{moreDetails ? '− Fewer details' : '+ More details'}</button>
      {moreDetails && <div className="space-y-3">{form.type === 'TRAVEL' ? <div className="grid grid-cols-2 gap-3"><label className="text-sm text-gray-700 dark:text-gray-300">From<input className={`${inputClass} mt-1`} value={form.locationFrom || ''} onChange={e => setForm(f => ({ ...f, locationFrom: e.target.value }))} /></label><label className="text-sm text-gray-700 dark:text-gray-300">To<input className={`${inputClass} mt-1`} value={form.locationTo || ''} onChange={e => setForm(f => ({ ...f, locationTo: e.target.value }))} /></label></div> : <label className="block text-sm text-gray-700 dark:text-gray-300">Location or address<input className={`${inputClass} mt-1`} value={form.locationFrom || ''} onChange={e => setForm(f => ({ ...f, locationFrom: e.target.value }))} /></label>}<label className="block text-sm text-gray-700 dark:text-gray-300">Booking reference<input className={`${inputClass} mt-1`} value={form.bookingRef || ''} onChange={e => setForm(f => ({ ...f, bookingRef: e.target.value }))} /></label><label className="block text-sm text-gray-700 dark:text-gray-300">Notes<textarea rows={3} className={`${inputClass} mt-1`} value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></label><fieldset><legend className="mb-2 text-sm text-gray-700 dark:text-gray-300">Who’s included?</legend><div className="flex flex-wrap gap-2">{room?.members.map(member => <label key={member.id} className="flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-sm dark:bg-gray-700"><input type="checkbox" checked={form.participantIds.includes(member.id)} onChange={e => setForm(f => ({ ...f, participantIds: e.target.checked ? [...f.participantIds, member.id] : f.participantIds.filter(id => id !== member.id) }))} />{member.name}</label>)}</div><p className="mt-1 text-xs text-gray-500">Leave everyone unchecked to use all room members when splitting.</p></fieldset></div>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}<div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setShowForm(false)} className="rounded-md px-4 py-2 text-sm text-gray-600 dark:text-gray-300">Cancel</button><button disabled={saving || !isOnline} className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{saving ? 'Saving…' : editingId ? 'Save changes' : 'Add to plan'}</button></div></form></div>}
  </div>
}
