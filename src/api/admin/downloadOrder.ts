import { adminGet, adminJson } from '../client'

export interface DownloadIni {
  id: number
  fileName: string
  title: string
  gameId: string
  optVersion: string
  orderTime?: string
  gameDesc: string
  partSize: string
  imageUrl: string
  optionalInstallUrls?: string
  imageSize?: number
  imageHash?: string
  releaseTime?: string
  reportUrl: string
  reportInterval: number
  releaseType: number
  immediatelyRelease: number
  note?: string
  content: string
  createdAt: number
  updatedAt: number
}

export type DownloadIniWrite = Omit<DownloadIni, 'id' | 'content' | 'createdAt' | 'updatedAt'>

export interface DownloadAssignment {
  id: number
  serial: string
  gameId: string
  version: string
  iniId: number
  iniFileName: string
  iniTitle: string
  enabled: boolean
  createdAt: number
  updatedAt: number
}

export type DownloadAssignmentWrite = {
  serial: string
  gameId: string
  version: string
  iniId: number
  enabled: boolean
}

export interface DownloadReport {
  id: number
  serial?: string
  gameId?: string
  version?: string
  imageType: string
  state?: number
  totalSegmentCount?: string
  downloadedSegmentCount?: string
  payload: string
  clientIp?: string
  createdAt: number
}

export interface LoaderState {
  id: number
  serial?: string
  numFilesToDownload?: string
  numFilesDownloaded?: string
  downloadState?: string
  payload: string
  clientIp?: string
  createdAt: number
}

const base = '/api/v2/admin/allnet/download-order'

export async function listIni() {
  return adminGet(`${base}/ini`) as Promise<DownloadIni[]>
}

export async function previewIni(body: Partial<DownloadIniWrite>) {
  return adminJson('POST', `${base}/ini/preview`, body) as Promise<{ content: string }>
}

export async function createIni(body: Partial<DownloadIniWrite>) {
  return adminJson('POST', `${base}/ini`, body) as Promise<DownloadIni>
}

export async function updateIni(id: number, body: Partial<DownloadIniWrite>) {
  return adminJson('POST', `${base}/ini/${id}/update`, body) as Promise<DownloadIni>
}

export async function deleteIni(id: number) {
  return adminJson('POST', `${base}/ini/${id}/delete`) as Promise<{ status: string; id: number }>
}

export async function listAssignments(serial?: string) {
  const suffix = serial?.trim() ? `?serial=${encodeURIComponent(serial.trim())}` : ''
  return adminGet(`${base}/assignment${suffix}`) as Promise<DownloadAssignment[]>
}

export async function createAssignment(body: DownloadAssignmentWrite) {
  return adminJson('POST', `${base}/assignment`, body) as Promise<DownloadAssignment>
}

export async function updateAssignment(id: number, body: Partial<DownloadAssignmentWrite>) {
  return adminJson('POST', `${base}/assignment/${id}/update`, body) as Promise<DownloadAssignment>
}

export async function deleteAssignment(id: number) {
  return adminJson('POST', `${base}/assignment/${id}/delete`) as Promise<{ status: string; id: number }>
}

export async function listReports() {
  return adminGet(`${base}/report`) as Promise<DownloadReport[]>
}

export async function listLoaderStates() {
  return adminGet(`${base}/loader-state`) as Promise<LoaderState[]>
}
