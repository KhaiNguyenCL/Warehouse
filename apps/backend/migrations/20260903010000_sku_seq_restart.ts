import type { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.raw('ALTER SEQUENCE variant_sku_seq RESTART WITH 20260000')
}

export async function down(knex: Knex) {
  await knex.raw('ALTER SEQUENCE variant_sku_seq RESTART WITH 1')
}
