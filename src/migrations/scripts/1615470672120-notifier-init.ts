import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

/**
 * Actions summary:
 *
 * createTable "notifier_provider", deps: []
 * createTable "notifier_plan", deps: []
 * createTable "notifier_subscription", deps: []
 * createTable "notifier_price", deps: []
 * createTable "notifier_stakes", deps: []
 *
 **/
type Commands = { fn: keyof QueryInterface, [key: string]: any }[]
const migrationCommands = function (transaction: any): Commands {
  return [
    // Notifier
    {
      fn: 'createTable',
      params: [
        'notifier_provider',
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
        'notifier_stakes',
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
        'notifier_plan',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            primaryKey: true,
            allowNull: false,
            autoIncrement: true
          },
          planId: {
            type: Sequelize.INTEGER,
            field: 'planId',
            allowNull: false
          },
          channels: {
            type: Sequelize.JSON,
            field: 'channels',
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
          },
          providerId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'notifier_provider',
              key: 'provider'
            },
            name: 'providerId',
            field: 'providerId',
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
        'notifier_subscription',
        {
          hash: {
            type: Sequelize.STRING,
            field: 'hash',
            primaryKey: true,
            allowNull: false
          },
          subscriptionId: {
            type: Sequelize.NUMBER,
            field: 'subscriptionId',
            allowNull: false
          },
          signature: {
            type: Sequelize.STRING,
            field: 'signature',
            allowNull: false
          },
          status: {
            type: Sequelize.STRING,
            field: 'status',
            allowNull: false
          },
          subscriptionPlanId: {
            type: Sequelize.NUMBER,
            field: 'subscriptionPlanId',
            allowNull: false
          },
          notificationBalance: {
            type: Sequelize.NUMBER,
            field: 'notificationBalance',
            allowNull: false
          },
          previousSubscription: {
            type: Sequelize.STRING,
            field: 'previousSubscription',
            allowNull: true
          },
          expirationDate: {
            type: Sequelize.DATE,
            field: 'expirationDate',
            allowNull: false
          },
          consumer: {
            type: Sequelize.STRING,
            field: 'consumer',
            allowNull: false
          },
          topics: {
            type: Sequelize.JSON,
            field: 'topics',
            allowNull: false
          },
          paid: {
            type: Sequelize.BOOLEAN,
            field: 'paid',
            allowNull: false
          },
          price: {
            type: Sequelize.STRING,
            field: 'price',
            allowNull: false
          },
          rateId: {
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
          },
          providerId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'notifier_provider',
              key: 'provider'
            },
            name: 'providerId',
            field: 'providerId',
            allowNull: false
          },
          withdrawableFunds: {
            type: Sequelize.STRING,
            field: 'withdrawableFunds',
            allowNull: true
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
        'notifier_price',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          price: {
            type: Sequelize.STRING,
            field: 'price',
            allowNull: false
          },
          rateId: {
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
          },
          planId: {
            type: Sequelize.INTEGER,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'notifier_plan',
              key: 'id'
            },
            name: 'planId',
            field: 'planId',
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
        'notifier_provider', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'notifier_stakes', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'notifier_plan', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'notifier_price', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'notifier_subscription', {
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
