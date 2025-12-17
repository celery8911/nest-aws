/**
 * 应用程序入口文件
 * 负责启动 Nest.js 应用并配置基础设置
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  // 创建日志记录器实例，用于记录启动信息
  const logger = new Logger('Bootstrap');

  // 创建 Nest.js 应用实例
  // logger 选项指定日志级别：log、error、warn、debug、verbose
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });

  // 启用 CORS（跨域资源共享）
  // 允许前端应用从不同的域名访问 API
  app.enableCors();

  // 从环境变量获取端口，默认为 3000
  // 本地开发使用 3000，Lambda 会使用环境变量中的端口
  const port = process.env.PORT || 3000;

  // 启动应用，监听指定端口
  await app.listen(port);

  // 记录应用启动成功的日志
  logger.log(`Application is running on: http://localhost:${port}`);
}

// 执行启动函数
bootstrap();
