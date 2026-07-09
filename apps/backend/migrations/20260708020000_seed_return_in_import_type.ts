import type { Knex } from 'knex'

export async function up(knex: Knex) {
  const exists = await knex('import_types').where({ key: 'return_in' }).first()
  if (!exists) {
    await knex('import_types').insert({
      key: 'return_in',
      label: 'Hàng trả lại từ khách',
      is_system: true,
      requires_company: 'customer',
      requires_ref_document: 'quotation',
      is_active: true,
    })
  }
}

export async function down(knex: Knex) {
  await knex('import_types').where({ key: 'return_in', is_system: true }).delete()
}
