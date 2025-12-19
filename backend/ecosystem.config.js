/**
 * PM2 Ecosystem 配置文件
 * 用于管理 Nest.js 应用的进程
 *
 * 使用方式：
 *   pm2 start ecosystem.config.js
 *   pm2 restart nest-aws
 *   pm2 stop nest-aws
 *   pm2 logs nest-aws
 */

module.exports = {
  apps: [
    {
      // 应用名称
      name: 'nest-aws',

      // 启动脚本（编译后的入口文件）
      script: './dist/main.js',

      // 工作目录
      cwd: '/home/ec2-user/nest-aws/backend',

      // 进程模式
      // - 'fork': 单进程模式（推荐：t4g.micro 内存有限）
      // - 'cluster': 集群模式，充分利用多核 CPU
      exec_mode: 'fork',

      // 实例数量
      // 单进程模式：instances: 1
      // 集群模式：instances: 'max' 或具体数字
      instances: 1,

      // 自动重启配置
      autorestart: true,

      // 监听文件变化（生产环境建议关闭）
      watch: false,

      // 最大内存限制（超过后自动重启）
      // t4g.micro 总内存 1GB，分配 700MB 给应用
      max_memory_restart: '700M',

      // 环境变量
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },

      // 日志配置
      error_file: '/home/ec2-user/logs/nest-aws-error.log',
      out_file: '/home/ec2-user/logs/nest-aws-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

      // 日志文件合并（所有实例的日志写入同一文件）
      merge_logs: true,

      // 时间格式
      time: true,

      // 重启延迟（避免频繁重启）
      restart_delay: 4000,

      // 最大重启次数（在 min_uptime 时间内）
      max_restarts: 10,

      // 最小运行时间（小于此时间重启视为异常）
      min_uptime: '10s',

      // 等待应用关闭的时间（SIGINT 后）
      kill_timeout: 5000,

      // 进程标题（方便 top/ps 查看）
      instance_var: 'INSTANCE_ID',
    },
  ],
};
