module.exports = {
  apps: [
    {
      name: 'movio-api',
      script: 'src/index.js',
      watch: ['src'],
      ignore_watch: ['node_modules', 'sql', '.git', 'logs', 'certs'],
      watch_delay: 1000,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'development',
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_restarts: 10,
      restart_delay: 2000,
    },
  ],
};
