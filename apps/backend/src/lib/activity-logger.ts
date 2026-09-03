import { Knex } from 'knex'

export interface LogActivityOptions {
  db: Knex | Knex.Transaction
  objectType: string
  objectId: string
  objectCode?: string | null
  action: string
  actorId: string
  actorName?: string | null
  payload?: Record<string, unknown> | null
}

export async function logActivity(opts: LogActivityOptions) {
  const { db, objectType, objectId, objectCode, action, actorId, actorName, payload } = opts
  try {
    await db('activity_logs').insert({
      object_type: objectType,
      object_id:   objectId,
      object_code: objectCode ?? null,
      action,
      actor_id:    actorId,
      actor_name:  actorName ?? null,
      payload:     payload ? JSON.stringify(payload) : null,
    })
  } catch {
    // Log failure không block nghiệp vụ chính
  }
}

// Lấy tên user nhanh (dùng trong service khi chưa có actor_name sẵn)
export async function resolveActorName(db: Knex | Knex.Transaction, userId: string): Promise<string | null> {
  const row = await db('users').where('id', userId).select('full_name').first()
  return row?.full_name ?? null
}
