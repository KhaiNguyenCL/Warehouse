import { Knex } from 'knex'

export class AuthRepository {
  constructor(private db: Knex) {}

  async findUserByEmail(email: string) {
    const user = await this.db('users')
      .where({ email, is_active: true })
      .select('id', 'email', 'full_name', 'password_hash')
      .first()
    if (!user) return null
    const groups = await this.db('user_group_members as ugm')
      .join('user_groups as ug', 'ug.id', 'ugm.group_id')
      .join('roles as r', 'r.id', 'ug.role_id')
      .where('ugm.user_id', user.id)
      .select('ug.id', 'ug.name', 'r.name as role_name')
    return { ...user, groups }
  }
}
