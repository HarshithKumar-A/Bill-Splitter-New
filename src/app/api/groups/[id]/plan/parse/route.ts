import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { forbiddenResponse, getAuthUser, unauthorizedResponse } from '@/lib/auth'

const models = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.0-flash']

const schema = {
  type: 'OBJECT',
  properties: {
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      type: { type: 'STRING', enum: ['STAY', 'TRAVEL', 'ACTIVITY'], description: 'TRAVEL for train, flight, bus, cab, or ferry; STAY for accommodation; ACTIVITY for tours, events, or tickets.' },
      title: { type: 'STRING', description: 'Concise booking or service name, including a train or flight number when present.' },
      locationFrom: { type: 'STRING', nullable: true, description: 'Origin, boarding station, airport, or departure city for travel. Use null only when absent.' },
      locationTo: { type: 'STRING', nullable: true, description: 'Destination, arrival station, airport, city, or stay property location. Use null only when absent.' },
      startDate: { type: 'STRING', description: 'Departure, check-in, or activity date in YYYY-MM-DD format. Never use invoice, booking, or print dates.' },
      endDate: { type: 'STRING', nullable: true, description: 'Arrival, check-out, or activity end date in YYYY-MM-DD format; include next-day dates for overnight travel.' },
      startTime: { type: 'STRING', nullable: true, description: '24-hour HH:mm without seconds or timezone, e.g. 21:25. Use departure/check-in/start time.' },
      endTime: { type: 'STRING', nullable: true, description: '24-hour HH:mm without seconds or timezone, e.g. 05:30. Use arrival/check-out/end time.' },
      bookingRef: { type: 'STRING', nullable: true, description: 'PNR, booking ID, confirmation number, or ticket number.' },
      notes: { type: 'STRING', nullable: true, description: 'Concise context such as passenger count, class, coach, or seat details; maximum 300 characters.' },
    }, required: ['type', 'title', 'locationFrom', 'locationTo', 'startDate', 'endDate', 'startTime', 'endTime', 'bookingRef', 'notes'] } },
    detectedExpense: { type: 'OBJECT', nullable: true, properties: { amount: { type: 'NUMBER', description: 'Actual total paid, if shown.' }, currency: { type: 'STRING', description: 'Currency code or explicit currency symbol/code from the bill.' } }, required: ['amount', 'currency'] },
  }, required: ['items', 'detectedExpense'],
}

function normalizeTimeHHmm(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const match = value.trim().match(/^(\d{1,2}):(\d{1,2})(?::\d{1,2}(?:\.\d+)?)?\s*(?:Z|[+-]\d{2}:?\d{2})?\s*(AM|PM)?$/i)
  if (!match) return null
  let hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  if (match[3]) {
    if (hours < 1 || hours > 12) return null
    hours = hours % 12 + (match[3].toUpperCase() === 'PM' ? 12 : 0)
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    const member = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: user.id } })
    if (!member) return forbiddenResponse('You are not a member of this group')

    const body = await request.json()
    const ocrText = typeof body.ocrText === 'string' ? body.ocrText.trim().slice(0, 30000) : ''
    if (ocrText.length < 20) return NextResponse.json({ error: 'Could not read enough text from this bill. Try a clearer image.' }, { status: 400 })
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: 'Bill parsing is not configured. Add GEMINI_API_KEY to the server environment.' }, { status: 503 })

    const prompt = `You are a travel booking parser. Extract structured itinerary items and any payable expense from the OCR text below. Return only facts explicitly present in or directly implied by the OCR. Do not invent missing details.

Dates and times:
- Ignore booking, invoice, issue, print, and payment timestamps when selecting itinerary dates/times.
- Dates must be YYYY-MM-DD. Convert formats such as 22-Dec-2026 to 2026-12-22.
- Times must be strictly 24-hour HH:mm with no seconds and no timezone (for example, 21:25 or 05:30). Never return values like 21:25:00.000Z.
- For travel, extract both departure and arrival, including arrival date/time on the next day for overnight journeys.
- If a year is missing, use the trip window (${body.tripStartDate || 'unknown'} to ${body.tripEndDate || 'unknown'}) when it fits. Otherwise choose the most plausible matching date and explain uncertainty in notes. Use null for any date or time not present.

Fields:
- type is TRAVEL for trains, flights, buses, cabs, or ferries; STAY for accommodation; ACTIVITY for tours, events, or tickets.
- title is a concise service name and should include the train/flight number when present.
- For TRAVEL, populate locationFrom from the origin/boarding station and locationTo from the destination/arrival station whenever shown. Preserve station/city names and station codes together, such as EKTA NAGAR (EKNR).
- For STAY, use the property or city in locationTo or locationFrom, and include check-in/check-out dates and times when present.
- bookingRef is the PNR, booking ID, confirmation number, or ticket number.
- "notes": Concise ticket/booking context (max 300 characters total). Include travel class, passenger count, coach, and seat/berth details when present—listing passenger name with seat/berth when available. Omit details not present in the OCR text; do not exceed 300 characters.
- detectedExpense should be null unless the actual total fare/amount paid is shown. Do not infer an amount from fees or tax lines alone.

Trip window: ${body.tripStartDate || 'unknown'} to ${body.tripEndDate || 'unknown'}.

OCR text:
${ocrText}`
    let response: Response | undefined
    for (let i = 0; i < models.length; i++) {
      response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${models[i]}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY)}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: schema } }),
      })
      if (response.ok || ![429, 503].includes(response.status) || i === models.length - 1) break
    }
    if (!response?.ok) {
      const status = response?.status || 502
      return NextResponse.json({ error: status === 429 ? 'Gemini is temporarily rate limited. Please try again shortly.' : status === 503 ? 'Gemini is temporarily unavailable. Please try again shortly.' : 'Could not parse this bill with Gemini.' }, { status: status === 429 || status === 503 ? 503 : 502 })
    }
    const payload = await response.json()
    const output = payload.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('')
    if (!output) return NextResponse.json({ error: 'Gemini returned an empty result. Try another bill image.' }, { status: 502 })
    let parsed: Record<string, unknown>
    try { parsed = JSON.parse(output) } catch { return NextResponse.json({ error: 'Gemini returned an unreadable result. Please retry.' }, { status: 502 }) }
    if (!Array.isArray(parsed.items)) return NextResponse.json({ error: 'Gemini returned an invalid itinerary. Please retry.' }, { status: 502 })
    const rawItems = parsed.items as Record<string, unknown>[]
    const items = rawItems.filter(item => item && typeof item === 'object' && ['STAY', 'TRAVEL', 'ACTIVITY'].includes(String(item.type)) && typeof item.title === 'string' && typeof item.startDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.startDate)).map(item => ({
      type: item.type as 'STAY' | 'TRAVEL' | 'ACTIVITY', title: (item.title as string).slice(0, 200), startDate: item.startDate as string,
      endDate: typeof item.endDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.endDate) ? item.endDate : null,
      startTime: normalizeTimeHHmm(item.startTime),
      endTime: normalizeTimeHHmm(item.endTime),
      locationFrom: typeof item.locationFrom === 'string' ? item.locationFrom.slice(0, 300) : null,
      locationTo: typeof item.locationTo === 'string' ? item.locationTo.slice(0, 300) : null,
      bookingRef: typeof item.bookingRef === 'string' ? item.bookingRef.slice(0, 120) : null,
      notes: typeof item.notes === 'string' ? item.notes.slice(0, 1000) : null,
    }))
    const expense = parsed.detectedExpense && typeof parsed.detectedExpense === 'object' ? parsed.detectedExpense as Record<string, unknown> : null
    const detectedExpense = expense && typeof expense.amount === 'number' && Number.isFinite(expense.amount) && expense.amount > 0 && typeof expense.currency === 'string'
      ? { amount: expense.amount, currency: expense.currency.slice(0, 8) } : null
    return NextResponse.json({ items, detectedExpense })
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) return unauthorizedResponse(error.message)
    return NextResponse.json({ error: 'Failed to parse bill' }, { status: 500 })
  }
}
