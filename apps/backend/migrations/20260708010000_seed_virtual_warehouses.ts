import type { Knex } from 'knex'

const VIRTUAL_WAREHOUSES = [
  { code: 'WH-DEMO', name: 'Kho Demo (Cho mượn)' },
  { code: 'WH-BH',   name: 'Kho Bảo hành' },
  { code: 'WH-QC',   name: 'Kho Chờ QC' },
  { code: 'WH-SN',   name: 'Kho Chờ nhập SN' },
]

export async function up(knex: Knex) {
  for (const wh of VIRTUAL_WAREHOUSES) {
    const existing = await knex('warehouses').where({ code: wh.code }).first()
    if (!existing) {
      await knex('warehouses').insert({
        id: knex.raw('gen_random_uuid()'),
        code: wh.code,
        name: wh.name,
        type: 'virtual',
        created_at: knex.fn.now(),
        updated_at: knex.fn.now(),
      })
    }
  }
}

export async function down(knex: Knex) {
  await knex('warehouses')
    .whereIn('code', VIRTUAL_WAREHOUSES.map(w => w.code))
    .delete()
}
