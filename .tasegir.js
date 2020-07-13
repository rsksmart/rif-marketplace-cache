module.exports = {
  lint: {
    files: ['src/**/*', 'test/**/*']
  },
  depCheck: {
    ignore: [
      'tasegir', 'reflect-metadata', '@types/*', 'sqlite3', '@oclif/*',
    ]
  }
}
