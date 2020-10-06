module.exports = {
  lint: {
    files: ['src/**/*', 'test/**/*']
  },
  depCheck: {
    ignore: [
      'cross-env', 'tasegir', 'reflect-metadata', 'socket.io-client', 'web3-core', '@types/*', 'sqlite3', '@oclif/*',
    ]
  }
}
