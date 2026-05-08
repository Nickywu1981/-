{
  "apps": [
    {
      "name": "ai-saas-server",
      "script": "src/index.js",
      "cwd": "./server",
      "instances": "max",
      "exec_mode": "cluster",
      "watch": false,
      "max_memory_restart": "512M",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3001",
        "MOCK_ENABLED": "false"
      },
      "env_development": {
        "NODE_ENV": "development",
        "PORT": "3001",
        "MOCK_ENABLED": "true"
      },
      "error_file": "./logs/pm2-server-error.log",
      "out_file": "./logs/pm2-server-out.log",
      "merge_logs": true,
      "log_date_format": "YYYY-MM-DD HH:mm:ss"
    }
  ]
}
