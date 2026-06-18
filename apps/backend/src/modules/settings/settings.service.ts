import { Knex } from 'knex'
import { SettingsRepository } from './settings.repository'

export class SettingsService {
  private repo: SettingsRepository

  constructor(private db: Knex) {
    this.repo = new SettingsRepository(db)
  }
}
