import request from './request'
import { buildApiPath } from './path'
import type { ApiResponse } from '@/types/api'

export interface OperationListParams {
  page?: number
  size?: number
  path?: string
  user_id?: number
  ip?: string
  status?: number
  method?: string
  trace_id?: string
}

export interface OperationLogRaw {
  id?: number | string
  ID?: number | string
  method?: string
  Method?: string
  path?: string
  Path?: string
  ip?: string
  IP?: string
  status?: number | string
  Status?: number | string
  user_name?: string
  UserName?: string
  trace_id?: string
  TraceID?: string
  created_at?: string
  create_at?: string
  CreatedAt?: string
}

export interface OperationDetailRaw extends OperationLogRaw {
  user_id?: number | string
  UserID?: number | string
  latency?: number | string
  agent?: string
  error_message?: string
  params?: unknown
  resp?: unknown
}

// 获取操作记录列表
export function getOperationList(params: OperationListParams) {
  return request.get<ApiResponse<{ items: OperationLogRaw[]; total: number }>>(buildApiPath('/internal/admin/system/record/paginate'), { params })
}

// 获取操作记录详情
export function getOperationDetail(id: string | number) {
  return request.get<ApiResponse<OperationDetailRaw>>(buildApiPath('/internal/admin/system/record/detail'), {
    params: { id }
  })
}
