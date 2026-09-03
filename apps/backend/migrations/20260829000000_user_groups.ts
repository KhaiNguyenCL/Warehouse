import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.createTable('user_groups', (t) => {
    t.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'))
    t.string('name').notNullable().unique()
    t.text('description')
    t.uuid('role_id').notNullable().references('id').inTable('roles').onDelete('RESTRICT')
    t.timestamps(true, true)
  })

  await knex.schema.createTable('user_group_members', (t) => {
    t.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE')
    t.uuid('group_id').notNullable().references('id').inTable('user_groups').onDelete('CASCADE')
    t.primary(['user_id', 'group_id'])
  })

  // Create one group per distinct role currently assigned to users
  await knex.raw(`
    INSERT INTO user_groups (id, name, role_id, created_at, updated_at)
    SELECT gen_random_uuid(), r.name, r.id, NOW(), NOW()
    FROM roles r
    WHERE r.id IN (SELECT DISTINCT role_id FROM users)
  `)

  // Assign each user to the group matching their current role
  await knex.raw(`
    INSERT INTO user_group_members (user_id, group_id)
    SELECT u.id, ug.id
    FROM users u
    JOIN user_groups ug ON ug.role_id = u.role_id
  `)

  await knex.schema.table('users', (t) => {
    t.dropColumn('role_id')
  })
}

export async function down(knex: Knex) {
  await knex.schema.table('users', (t) => {
    t.uuid('role_id').references('id').inTable('roles')
  })
  await knex.schema.dropTable('user_group_members')
  await knex.schema.dropTable('user_groups')
}
