import Sequelize, { QueryInterface } from 'sequelize'
import { Sequelize as SequelizeTs } from 'sequelize-typescript'

/**
 * Actions summary:
 *
 * createTable "event", deps: []
 * createTable "storage_offer", deps: []
 * createTable "rates", deps: []
 * createTable "rns_transfer", deps: []
 * createTable "rns_domain", deps: []
 * createTable "rns_domain_expiration", deps: [rns_domain]
 * createTable "rns_sold-domain", deps: [rns_domain]
 * createTable "rns_domain-offer", deps: [rns_domain]
 * createTable "storage_agreement", deps: [storage_offer]
 * createTable "storage_billing-plan", deps: [storage_offer]
 * createTable "rns_owner", deps: [rns_domain]
 * addIndex "event_transaction_hash_log_index" to table "event"
 *
 **/
type Commands = { fn: keyof QueryInterface, [key: string]: any }[]
const migrationCommands = function (transaction: any): Commands {
  return [
    {
      fn: 'createTable',
      params: [
        'event',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          blockNumber: {
            type: Sequelize.INTEGER,
            field: 'blockNumber'
          },
          transactionHash: {
            type: Sequelize.STRING(66),
            field: 'transactionHash'
          },
          logIndex: {
            type: Sequelize.INTEGER,
            field: 'logIndex'
          },
          targetConfirmation: {
            type: Sequelize.INTEGER,
            field: 'targetConfirmation'
          },
          contractAddress: {
            type: Sequelize.STRING(66),
            field: 'contractAddress'
          },
          event: {
            type: Sequelize.TEXT,
            field: 'event'
          },
          content: {
            type: Sequelize.TEXT,
            field: 'content'
          },
          emitted: {
            type: Sequelize.BOOLEAN,
            field: 'emitted',
            defaultValue: false
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
        'storage_offer',
        {
          provider: {
            type: Sequelize.STRING(64),
            field: 'provider',
            primaryKey: true
          },
          totalCapacity: {
            type: Sequelize.STRING,
            field: 'totalCapacity'
          },
          peerId: {
            type: Sequelize.STRING,
            field: 'peerId'
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
        'rates',
        {
          token: {
            type: Sequelize.STRING(15),
            field: 'token',
            primaryKey: true
          },
          usd: {
            type: Sequelize.FLOAT,
            field: 'usd'
          },
          eur: {
            type: Sequelize.FLOAT,
            field: 'eur'
          },
          btc: {
            type: Sequelize.FLOAT,
            field: 'btc'
          },
          ars: {
            type: Sequelize.FLOAT,
            field: 'ars'
          },
          cny: {
            type: Sequelize.FLOAT,
            field: 'cny'
          },
          krw: {
            type: Sequelize.FLOAT,
            field: 'krw'
          },
          jpy: {
            type: Sequelize.FLOAT,
            field: 'jpy'
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
        'rns_transfer',
        {
          id: {
            type: Sequelize.STRING,
            field: 'id',
            primaryKey: true
          },
          tokenId: {
            type: Sequelize.STRING,
            field: 'tokenId',
            primaryKey: true
          },
          sellerAddress: {
            type: Sequelize.STRING,
            field: 'sellerAddress'
          },
          buyerAddress: {
            type: Sequelize.STRING,
            field: 'buyerAddress'
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
        'rns_domain',
        {
          tokenId: {
            type: Sequelize.STRING,
            field: 'tokenId',
            primaryKey: true
          },
          name: {
            type: Sequelize.STRING,
            field: 'name'
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
        'rns_domain_expiration',
        {
          tokenId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'rns_domain',
              key: 'tokenId'
            },
            allowNull: true,
            name: 'tokenId',
            field: 'tokenId',
            primaryKey: true
          },
          date: {
            type: Sequelize.DATE,
            field: 'date'
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
        'rns_sold-domain',
        {
          id: {
            type: Sequelize.STRING,
            allowNull: true,
            name: 'id',
            field: 'id',
            primaryKey: true
          },
          tokenId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'rns_domain',
              key: 'tokenId'
            },
            allowNull: true,
            name: 'tokenId',
            field: 'tokenId'
          },
          paymentToken: {
            type: Sequelize.STRING,
            field: 'paymentToken'
          },
          price: {
            type: Sequelize.DECIMAL,
            field: 'price'
          },
          priceString: {
            type: Sequelize.STRING,
            field: 'priceString'
          },
          soldDate: {
            type: Sequelize.DATE,
            field: 'soldDate'
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
        'rns_domain-offer',
        {
          offerId: {
            type: Sequelize.STRING,
            field: 'offerId',
            primaryKey: true
          },
          tokenId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            references: {
              model: 'rns_domain',
              key: 'tokenId'
            },
            allowNull: true,
            name: 'tokenId',
            field: 'tokenId'
          },
          ownerAddress: {
            type: Sequelize.STRING,
            field: 'ownerAddress'
          },
          ownerDomain: {
            type: Sequelize.STRING,
            field: 'ownerDomain'
          },
          paymentToken: {
            type: Sequelize.STRING,
            field: 'paymentToken'
          },
          price: {
            type: Sequelize.DECIMAL,
            field: 'price'
          },
          priceString: {
            type: Sequelize.STRING,
            field: 'priceString'
          },
          creationDate: {
            type: Sequelize.DATE,
            field: 'creationDate'
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
        'storage_agreement',
        {
          agreementReference: {
            type: Sequelize.STRING(67),
            field: 'agreementReference',
            primaryKey: true
          },
          dataReference: {
            type: Sequelize.STRING,
            field: 'dataReference'
          },
          consumer: {
            type: Sequelize.STRING(64),
            field: 'consumer'
          },
          size: {
            type: Sequelize.STRING,
            field: 'size'
          },
          isActive: {
            type: Sequelize.BOOLEAN,
            field: 'isActive',
            defaultValue: true
          },
          billingPeriod: {
            type: Sequelize.STRING,
            field: 'billingPeriod'
          },
          billingPrice: {
            type: Sequelize.STRING,
            field: 'billingPrice'
          },
          availableFunds: {
            type: Sequelize.STRING,
            field: 'availableFunds'
          },
          lastPayout: {
            type: Sequelize.DATE,
            field: 'lastPayout'
          },
          offerId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            references: {
              model: 'storage_offer',
              key: 'provider'
            },
            allowNull: true,
            name: 'offerId',
            field: 'offerId'
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
        'storage_billing-plan',
        {
          id: {
            type: Sequelize.INTEGER,
            field: 'id',
            autoIncrement: true,
            primaryKey: true,
            allowNull: false
          },
          period: {
            type: Sequelize.STRING,
            field: 'period'
          },
          price: {
            type: Sequelize.STRING,
            field: 'price'
          },
          offerId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'NO ACTION',
            references: {
              model: 'storage_offer',
              key: 'provider'
            },
            allowNull: true,
            name: 'offerId',
            field: 'offerId'
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
        'rns_owner',
        {
          tokenId: {
            type: Sequelize.STRING,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
            references: {
              model: 'rns_domain',
              key: 'tokenId'
            },
            allowNull: true,
            name: 'tokenId',
            field: 'tokenId',
            primaryKey: true
          },
          address: {
            type: Sequelize.STRING,
            field: 'address'
          }
        },
        {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'addIndex',
      params: [
        'event',
        ['transactionHash', 'logIndex'],
        {
          indexName: 'event_transaction_hash_log_index',
          name: 'event_transaction_hash_log_index',
          indicesType: 'UNIQUE',
          type: 'UNIQUE',
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
        'rns_owner', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'event', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rns_domain-offer', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rns_domain', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rns_domain_expiration', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rates', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rns_sold-domain', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'rns_transfer', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'storage_agreement', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'storage_billing-plan', {
          transaction: transaction
        }
      ]
    },
    {
      fn: 'dropTable',
      params: [
        'storage_offer', {
          transaction: transaction
        }
      ]
    }
  ]
}

function run (queryInterface: QueryInterface, _commands: (transaction: any) => Commands) {
  return async function (transaction: any): Promise<void> {
    for (const command of _commands(transaction)) {
      // @ts-ignore
      // eslint-disable-next-line prefer-spread
      await queryInterface[command.fn].apply(queryInterface, command.params)
    }
  }
}

export default {
  // eslint-disable-next-line require-await
  async up (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, migrationCommands))
  },
  // eslint-disable-next-line require-await
  async down (queryInterface: QueryInterface, sequelize: SequelizeTs): Promise<void> {
    await queryInterface.sequelize.transaction(run(queryInterface, rollbackCommands))
  }
}
