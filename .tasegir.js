module.exports = {
  lint: {
    files: ['src/**/*', 'test/**/*']
  },
  depCheck: {
    ignore: [
      'cross-env', 'tasegir', 'reflect-metadata', 'libp2p', '@types/*', 'sqlite3', '@oclif/*', 'cids', 'multicodec'
    ]
  },
  tsconfig: {
    compilerOptions: {
      skipLibCheck: true
    }
  }
}
