import { Knex } from 'knex'
import { DeliveryRepository } from './delivery.repository'

export class DeliveryService {
  private repo: DeliveryRepository

  constructor(private db: Knex) {
    this.repo = new DeliveryRepository(db)
  }
}
