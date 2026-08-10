import { Knex } from 'knex'
import fs from 'fs'
import path from 'path'

export async function up(knex: Knex): Promise<void> {
  const sqlPath = path.join(__dirname, '../../../backend/migrations/001_initial_schema.sql')
  let sql = fs.readFileSync(sqlPath, 'utf-8')
  // Strip psql meta-commands and transaction wrappers not supported by knex.raw()
  sql = sql
    .replace(/^\\restrict\s.*$/gim, '')
    .replace(/^\\unrestrict\s.*$/gim, '')
    .replace(/^\s*BEGIN\s*;?\s*$/gim, '')
    .replace(/^\s*COMMIT\s*;?\s*$/gim, '')
  await knex.raw(sql)
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw('DROP SCHEMA public CASCADE; CREATE SCHEMA public; GRANT ALL ON SCHEMA public TO PUBLIC;')
}
