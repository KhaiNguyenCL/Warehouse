import { Knex } from 'knex'

export interface CreateNotificationInput {
  user_id: string
  type: string
  title: string
  body?: string
  link?: string
}

export class NotificationRepository {
  constructor(private db: Knex) {}

  async create(data: CreateNotificationInput, trx?: Knex.Transaction) {
    const runner = trx ?? this.db
    const [row] = await runner('notifications').insert(data).returning('*')
    return row
  }

  async createMany(items: CreateNotificationInput[], trx?: Knex.Transaction) {
    if (!items.length) return []
    const runner = trx ?? this.db
    return runner('notifications').insert(items).returning('*')
  }

  async findForUser(userId: string, limit = 30) {
    return this.db('notifications')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .select('*')
  }

  async countUnread(userId: string) {
    const row = await this.db('notifications')
      .where({ user_id: userId })
      .whereNull('read_at')
      .count('id as count')
      .first()
    return Number(row?.count ?? 0)
  }

  async markRead(id: string, userId: string) {
    const [row] = await this.db('notifications')
      .where({ id, user_id: userId })
      .update({ read_at: this.db.fn.now() })
      .returning('*')
    return row
  }

  async markAllRead(userId: string) {
    await this.db('notifications')
      .where({ user_id: userId })
      .whereNull('read_at')
      .update({ read_at: this.db.fn.now() })
  }
}
