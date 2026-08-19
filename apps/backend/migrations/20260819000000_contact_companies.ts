import { Knex } from 'knex'

export async function up(knex: Knex) {
  await knex.schema.createTable('contact_companies', (t) => {
    t.uuid('contact_id').notNullable().references('id').inTable('contacts').onDelete('CASCADE')
    t.uuid('company_id').notNullable().references('id').inTable('companies').onDelete('CASCADE')
    t.boolean('is_primary').notNullable().defaultTo(false)
    t.primary(['contact_id', 'company_id'])
  })

  // Migrate existing data
  await knex.raw(`
    INSERT INTO contact_companies (contact_id, company_id, is_primary)
    SELECT id, company_id, COALESCE(is_primary, false)
    FROM contacts
    WHERE company_id IS NOT NULL
  `)

  await knex.schema.alterTable('contacts', (t) => {
    t.dropColumn('company_id')
    t.dropColumn('is_primary')
  })
}

export async function down(knex: Knex) {
  await knex.schema.alterTable('contacts', (t) => {
    t.uuid('company_id').nullable()
    t.boolean('is_primary').notNullable().defaultTo(false)
  })

  await knex.raw(`
    UPDATE contacts c
    SET company_id = cc.company_id, is_primary = cc.is_primary
    FROM (
      SELECT DISTINCT ON (contact_id) contact_id, company_id, is_primary
      FROM contact_companies
      ORDER BY contact_id, is_primary DESC
    ) cc
    WHERE cc.contact_id = c.id
  `)

  await knex.schema.dropTableIfExists('contact_companies')
}
