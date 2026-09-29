import { Knex } from 'knex'
import { NotificationRepository, CreateNotificationInput } from './notification.repository'

export class NotificationService {
  private repo: NotificationRepository

  constructor(private db: Knex) {
    this.repo = new NotificationRepository(db)
  }

  async list(userId: string) {
    const [items, unread_count] = await Promise.all([
      this.repo.findForUser(userId),
      this.repo.countUnread(userId),
    ])
    return { data: items, unread_count }
  }

  async markRead(id: string, userId: string) {
    return this.repo.markRead(id, userId)
  }

  async markAllRead(userId: string) {
    await this.repo.markAllRead(userId)
  }

  // Tạo thông báo cho tất cả user có permission key nhất định. Nhận `db` riêng (không
  // dùng this.db) vì caller luôn gọi qua getNotificationService(this.db).notifyByPermission
  // (this.db, ...) NGOÀI transaction chính (xem receipt.service.ts::complete()) — cố ý để
  // lỗi tạo notification không rollback nghiệp vụ chính; tham số `trx` chỉ dùng khi thật sự
  // cần ghi trong cùng transaction (hiếm, hầu hết callsite truyền `db` = app.db, không phải trx).
  async notifyByPermission(
    db: Knex,
    permissionKey: string,
    notification: Omit<CreateNotificationInput, 'user_id'>,
    excludeUserId?: string,
    trx?: Knex.Transaction,
  ) {
    const runner = trx ?? db
    const users = await runner('user_group_members as ugm')
      .join('user_groups as ug', 'ug.id', 'ugm.group_id')
      .join('role_permissions as rp', 'rp.role_id', 'ug.role_id')
      .join('permissions as p', 'p.id', 'rp.permission_id')
      .join('users as u', 'u.id', 'ugm.user_id')
      .where('p.key', permissionKey)
      .where('u.is_active', true)
      .modify((q) => { if (excludeUserId) q.whereNot('ugm.user_id', excludeUserId) })
      .distinct('ugm.user_id')
      .pluck('ugm.user_id') as string[]

    if (!users.length) return
    const items: CreateNotificationInput[] = users.map((user_id) => ({ user_id, ...notification }))
    await this.repo.createMany(items, trx)
  }

  // Tạo thông báo cho 1 user cụ thể
  async notifyUser(
    userId: string,
    notification: Omit<CreateNotificationInput, 'user_id'>,
    trx?: Knex.Transaction,
  ) {
    await this.repo.create({ user_id: userId, ...notification }, trx)
  }
}

// Singleton helper cho các service khác sử dụng (không cần tạo instance mới)
let _svc: NotificationService | null = null
export function getNotificationService(db: Knex): NotificationService {
  if (!_svc || (_svc as any).db !== db) _svc = new NotificationService(db)
  return _svc
}
