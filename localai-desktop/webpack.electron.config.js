import path from 'path';

export default {
  target: 'electron-renderer',
  node: {
    __dirname: false,
    __filename: false
  },
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  // Add more Electron-specific config here as needed
};
