import type { Application } from './definitions'
import type { Sequelize } from 'sequelize-typescript'
import type { Eth } from 'web3-eth'

const HEALTHCHECK_ROUTE = '/healthcheck'
export default function (app: Application): void {
  app.use(HEALTHCHECK_ROUTE, async (req, res) => {
    const sequelize = app.get('sequelize') as Sequelize
    try {
      await sequelize.authenticate()
    } catch (e) {
      res.status(500).send('No DB connection')
    }

    const eth = app.get('eth') as Eth
    try {
      await eth.getBlockNumber()
    } catch (e) {
      res.status(500).send('No blockchain provider connection')
    }

    res.status(204).end()
  })
}
