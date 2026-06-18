import { Knex } from 'knex'
import { StocktakeRepository } from './stocktake.repository'

export class StocktakeService {
  private repo: StocktakeRepository

  constructor(private db: Knex) {
    this.repo = new StocktakeRepository(db)
  }
}
