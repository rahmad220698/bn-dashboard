module.exports = {
  apps: [
    {
      name: "fn-dashboard",
      script: "npm",
      args: "start",
      cwd: "/var/www/fn-dashboard",
      exec_mode: "cluster",
      instances: "max",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      },
      error_file: "/home/tapsel/.pm2/logs/fn-dashboard-error.log",
      out_file: "/home/tapsel/.pm2/logs/fn-dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    },
    {
      name: "bn-dashboard",
      script: "npm",
      args: "start",
      cwd: "/var/www/bn-dashboard",
      exec_mode: "cluster",
      instances: "max",
      env: {
        NODE_ENV: "production",
        PORT: 3001
      },
      error_file: "/home/tapsel/.pm2/logs/bn-dashboard-error.log",
      out_file: "/home/tapsel/.pm2/logs/bn-dashboard-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
