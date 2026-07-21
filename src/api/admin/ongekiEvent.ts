import { adminGet, adminJson } from '../client'

const base = '/api/v2/admin/ongeki/events'

export interface OngekiEventEntry {
  id: number
  type: number
  startDate: string
  endDate: string
  enable: boolean
}

export interface OngekiEventWrite {
  id?: number
  type?: number
  startDate?: string
  endDate?: string
  enable?: boolean
}

export async function listEvents(enable?: boolean) {
  const suffix = enable !== undefined ? `?enable=${enable}` : ''
  return adminGet(`${base}${suffix}`) as Promise<OngekiEventEntry[]>
}

export async function getEvent(id: number) {
  return adminGet(`${base}/${id}`) as Promise<OngekiEventEntry>
}

export async function createEvent(body: OngekiEventWrite) {
  return adminJson('POST', base, body) as Promise<OngekiEventEntry>
}

export async function updateEvent(id: number, body: Omit<OngekiEventWrite, 'id'>) {
  return adminJson('PUT', `${base}/${id}`, body) as Promise<OngekiEventEntry>
}

export async function deleteEvent(id: number) {
  return adminJson('DELETE', `${base}/${id}`) as Promise<{ status: string; id: number }>
}

export async function unscheduledIds() {
  return adminGet(`${base}/unscheduled-ids`) as Promise<number[]>
}
