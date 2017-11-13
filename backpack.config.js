module.exports = {
  // eslint-disable-next-line no-unused-vars
  webpack: (config, options, webpack) => {
    // Perform customizations to config
    // Important: return the modified config

    // changes the name of the entry point from index -> main.js
    // eslint-disable-next-line no-param-reassign
    config.entry.main = './index.js';
    return config;
  },
};
