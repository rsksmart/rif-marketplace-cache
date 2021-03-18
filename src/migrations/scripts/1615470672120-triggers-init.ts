import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

/**
 * Actions summary:
 *
 * createTable "triggers_provider", deps: []
 * createTable "triggers_stakes", deps: []
 *
 **/
type Commands = { fn: keyof QueryInterface, [key: string]: any }[]
const migrationCommands = function (transaction: any): Commands {
  return [
    // Triggers
    {
      fn: 'createTable',
      params: [
        'triggers_provider',
        {
          provider: {
            type: Sequelize.STRING(64),
            field: 'provider',
            primaryKey: true
          },
          url: {
            type: Sequelize.STRING,
            field: 'url',
            allowNull: false
          },
          createdAt: {
            type: Sequelize.DATE,
            field: 'createdAt',
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            field: 'updatedAt',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'createTable',
      params: [
        'triggers_stakes',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          total: {
            type: Sequelize.STRING,
            field: 'total',
            allowNull: false
          },
          token: {
            type: Sequelize.STRING,
            field: 'token',
            allowNull: false
          },
          account: {
            type: Sequelize.STRING,
            field: 'account',
            allowNull: false
          },
          symbol: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            references: {
              model: 'rates',
              key: 'token'
            },
            name: 'symbol',
            field: 'symbol',
            allowNull: false
          },
          createdAt: {
            type: Sequelize.DATE,
            field: 'createdAt',
            allowNull: false
          },
          updatedAt: {
            type: Sequelize.DATE,
            field: 'updatedAt',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'createTable',
      params: [
        'triggers_plan',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            primaryKey: true,
            allowNull: false
          },
          name: {
            type: Sequelize.STRING,
            field: 'name',
            allowNull: false
          },
          planStatus: {
            type: Sequelize.STRING,
            field: 'planStatus',
            allowNull: false
          },
          daysLeft: {
            type: Sequelize.INTEGER,
            field: 'daysLeft',
            allowNull: false
          },
          quantity: {
            type: Sequelize.INTEGER,
            field: 'quantity',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'createTable',
      params: [
        'triggers_channel',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            primaryKey: true,
            allowNull: false
          },
          name: {
            type: Sequelize.STRING,
            field: 'name',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'createTable',
      params: [
        'triggers_price',
        {
          price: {
            type: Sequelize.STRING,
            field: 'price',
            allowNull: false
          },
          rateId: {
            primaryKey: true,
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            references: {
              model: 'rates',
              key: 'token'
            },
            name: 'rateId',
            field: 'rateId',
            allowNull: false
          }
        },
        {
          transaction: transaction
        }
      ]
    }
  ]
}
const rollbackCommands = function (transaction: any): Commands {
  return [
    {
      fn: 'dropTable',
      params: [
        'triggers_provider', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'triggers_stakes', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'triggers_plan', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'triggers_channel', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'triggers_price', {
          transaction: transaction
        }
      ]
    }
  ]
}

function run (queryInterface: QueryInterface, _commands: (transaction: any) => Commands) {
  return async function (transaction: any): Promise<void> {
    for (const command of _commands(transaction)) {
      // @ts-ignore: Incorrect typings in QueryInterface
      // eslint-disable-next-line prefer-spread
      await queryInterface[command.fn].apply(queryInterface, command.params)
    }
  }
}

export default {
  async up (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, migrationCommands))
  },
  async down (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, rollbackCommands))
  }
}
