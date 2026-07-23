import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.text('deal_title').nullable()
    t.decimal('deal_amount', 15, 2).nullable()
    t.text('contract_number').nullable()
    t.text('region').nullable()
    t.text('bitrix_deal_url').nullable()
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('purchase_orders', (t) => {
    t.dropColumn('deal_title')
    t.dropColumn('deal_amount')
    t.dropColumn('contract_number')
    t.dropColumn('region')
    t.dropColumn('bitrix_deal_url')
  })
}
