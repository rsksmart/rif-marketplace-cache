module.exports = {
  lint: {
    files: ['src/**/*', 'test/**/*']
  },
  depCheck: {
    ignore: [
      'web3-core', 'cross-env', 'tasegir', 'reflect-metadata', '@types/*', 'sqlite3', '@oclif/*',
    ]
  }
}
