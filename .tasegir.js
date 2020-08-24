module.exports = {
  lint: {
    files: ['src/**/*', 'test/**/*']
  },
  depCheck: {
    ignore: [
      'cross-env', 'tasegir', 'reflect-metadata', '@types/*', 'sqlite3', '@oclif/*',
    ]
  }
}
