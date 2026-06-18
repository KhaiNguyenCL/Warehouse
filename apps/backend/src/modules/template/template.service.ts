import { Knex } from 'knex'
import { TemplateRepository } from './template.repository'

export class TemplateService {
  private repo: TemplateRepository

  constructor(private db: Knex) {
    this.repo = new TemplateRepository(db)
  }
}
