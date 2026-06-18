import { Knex } from 'knex'
import { TransferRepository } from './transfer.repository'

export class TransferService {
  private repo: TransferRepository

  constructor(private db: Knex) {
    this.repo = new TransferRepository(db)
  }
}
