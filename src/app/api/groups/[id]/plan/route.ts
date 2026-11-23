import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import prisma from '@/lib/db'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

const types = ['STAY', 'TRAVEL', 'ACTIVITY'] as const
const fields = ['type', 'title', 'locationFrom', 'locationTo', 'startDate', 'endDate', 'startTime', 'endTime', 'bookingRef', 'notes', 'participantIds', 'linkedExpenseId', 'sortOrder'] as const

async function authorize(request: Request, groupId: string) {
  const user = await getAuthUser(request)
  const membership = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } })
  return membership ? user : null
}

function cleanPayload(input: unknown, partial = false) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Invalid payload')
  const payload = input as Record<string, unknown>
  const data: Record<string, any> = {}
  for (const key of fields) if (key in payload) data[key] = payload[key]
  if (!partial && (!data.title || !data.startDate || !data.type)) throw new Error('Type, title, and start date are required')
  if (data.type !== undefined && !types.includes(data.type)) throw new Error('Invalid plan item type')
  if (data.title !== undefined && (typeof data.title !== 'string' || !data.title.trim())) throw new Error('Title is required')
  for (const key of ['startDate', 'endDate']) {
    if (data[key] === null && key === 'endDate') continue
    if (data[key] !== undefined) {
      const date = new Date(data[key])
      if (Number.isNaN(date.getTime())) throw new Error(`Invalid ${key}`)
      data[key] = date
    }
  }
  for (const key of ['startTime', 'endTime', 'locationFrom', 'locationTo', 'bookingRef', 'notes', 'linkedExpenseId']) {
    if (data[key] !== undefined && data[key] !== null && typeof data[key] !== 'string') throw new Error(`Invalid ${key}`)
  }
  if (data.participantIds !== undefined && (!Array.isArray(data.participantIds) || data.participantIds.some((id: unknown) => typeof id !== 'string'))) throw new Error('Invalid participants')
  if (data.sortOrder !== undefined && !Number.isInteger(data.sortOrder)) throw new Error('Invalid sort order')
  if (data.title !== undefined) data.title = data.title.trim()
  return data
}

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    if (!await authorize(request, params.id)) return forbiddenResponse('You are not a member of this group')
    const items = await prisma.itineraryItem.findMany({ where: { groupId: params.id }, orderBy: [{ startDate: 'asc' }, { startTime: { sort: 'asc', nulls: 'last' } }, { sortOrder: 'asc' }] })
    return NextResponse.json(items)
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) return unauthorizedResponse(error.message)
    return NextResponse.json({ error: 'Failed to fetch plan' }, { status: 500 })
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthUser(request)
    const member = await prisma.groupMember.findFirst({ where: { groupId: params.id, userId: user.id } })
    if (!member) return forbiddenResponse('You are not a member of this group')
    let data
    try { data = cleanPayload(await request.json()) } catch (error: unknown) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Invalid payload' }, { status: 400 }) }
    if (data.participantIds?.length) {
      const count = await prisma.groupMember.count({ where: { groupId: params.id, userId: { in: data.participantIds } } })
      if (count !== new Set(data.participantIds).size) return NextResponse.json({ error: 'Participants must be group members' }, { status: 400 })
    }
    const item = await prisma.itineraryItem.create({ data: { ...data, groupId: params.id, createdById: user.id } as Prisma.ItineraryItemUncheckedCreateInput })
    return NextResponse.json(item, { status: 201 })
  } catch (error: unknown) {
    if (error instanceof Error && error.message.includes('Unauthorized')) return unauthorizedResponse(error.message)
    return NextResponse.json({ error: 'Failed to create plan item' }, { status: 500 })
  }
}
