import { NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { getAuthUser, unauthorizedResponse, forbiddenResponse } from '@/lib/auth'

// Cast the new delegate while a local generated client may still reflect an older schema.
const db = prisma as any

async function getItem(request: Request, groupId: string, itemId: string) {
  const user = await getAuthUser(request)
  const member = await prisma.groupMember.findFirst({ where: { groupId, userId: user.id } })
  if (!member) return { response: forbiddenResponse('You are not a member of this group') }
  const item = await db.itineraryItem.findFirst({ where: { id: itemId, groupId } })
  if (!item) return { response: NextResponse.json({ error: 'Plan item not found' }, { status: 404 }) }
  return { item }
}

export async function PATCH(request: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const result = await getItem(request, params.id, params.itemId)
    if (result.response) return result.response
    const input = await request.json()
    const allowed = ['type', 'title', 'locationFrom', 'locationTo', 'startDate', 'endDate', 'startTime', 'endTime', 'bookingRef', 'notes', 'participantIds', 'linkedExpenseId', 'sortOrder']
    const data: Record<string, any> = {}
    for (const key of allowed) if (key in input) data[key] = input[key]
    if (data.type !== undefined && !['STAY', 'TRAVEL', 'ACTIVITY'].includes(data.type)) return NextResponse.json({ error: 'Invalid plan item type' }, { status: 400 })
    if ('title' in data && (typeof data.title !== 'string' || !data.title.trim())) return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    if ('title' in data) data.title = data.title.trim()
    for (const key of ['startDate', 'endDate']) if (data[key] != null) { const date = new Date(data[key]); if (Number.isNaN(date.getTime())) return NextResponse.json({ error: `Invalid ${key}` }, { status: 400 }); data[key] = date }
    if (data.participantIds !== undefined) {
      if (!Array.isArray(data.participantIds) || data.participantIds.some((id: unknown) => typeof id !== 'string')) return NextResponse.json({ error: 'Invalid participants' }, { status: 400 })
      const count = await prisma.groupMember.count({ where: { groupId: params.id, userId: { in: data.participantIds } } })
      if (count !== new Set(data.participantIds).size) return NextResponse.json({ error: 'Participants must be group members' }, { status: 400 })
    }
    if (data.linkedExpenseId) {
      const expense = await prisma.expense.findFirst({ where: { id: data.linkedExpenseId, groupId: params.id } })
      if (!expense) return NextResponse.json({ error: 'Expense must belong to this group' }, { status: 400 })
    }
    return NextResponse.json(await db.itineraryItem.update({ where: { id: params.itemId }, data }))
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) return unauthorizedResponse(error.message)
    return NextResponse.json({ error: 'Failed to update plan item' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string; itemId: string } }) {
  try {
    const result = await getItem(request, params.id, params.itemId)
    if (result.response) return result.response
    await db.itineraryItem.delete({ where: { id: params.itemId } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) return unauthorizedResponse(error.message)
    return NextResponse.json({ error: 'Failed to delete plan item' }, { status: 500 })
  }
}
