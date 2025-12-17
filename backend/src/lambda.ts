/**
 * AWS Lambda Handler for Nest.js
 * 使用 serverless-http 适配器
 *
 * 工作原理：
 * 1. Lambda 冷启动时创建 Nest.js 应用实例（缓存）
 * 2. serverless-http 将 API Gateway 事件转换为 HTTP 请求
 * 3. Nest.js 处理请求并返回响应
 * 4. serverless-http 将响应转换为 API Gateway 格式
 *
 * 优势：
 * - 轻量级（只有一个依赖）
 * - 自动处理请求/响应转换
 * - 完全兼容 Express 和 Nest.js
 * - 支持所有 HTTP 方法和特性
 */

import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import serverless from 'serverless-http';
import express from 'express';

// 全局缓存的 serverless handler
// Lambda 容器复用时会重用这个 handler（重要！）
let cachedHandler: any;

/**
 * 初始化 Nest.js 应用并创建 Lambda handler
 * 只在冷启动时执行一次
 */
async function bootstrap() {
  const logger = new Logger('Lambda');

  // 如果 handler 已经初始化，直接返回
  if (cachedHandler) {
    logger.log('Using cached serverless handler');
    return cachedHandler;
  }

  logger.log('Initializing Nest.js application for Lambda...');

  // 创建 Express 实例
  const expressApp = express();

  // 创建 Nest.js 应用，使用 Express 适配器
  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(expressApp),
    {
      logger: ['log', 'error', 'warn', 'debug'],
    },
  );

  // 启用 CORS
  // 允许前端从不同域名访问 API
  app.enableCors();

  // 初始化应用（不需要监听端口，Lambda 会直接调用）
  await app.init();

  logger.log('Nest.js application initialized successfully');

  // 使用 serverless-http 包装 Express 应用
  // 这会返回一个可以处理 Lambda 事件的函数
  cachedHandler = serverless(expressApp, {
    // 二进制内容类型（如图片、PDF等）
    binary: ['image/*', 'application/pdf'],
  });

  logger.log('Serverless handler created and cached');

  return cachedHandler;
}

/**
 * Lambda Handler 入口函数
 * AWS Lambda 会调用这个导出的函数
 *
 * @param event - API Gateway 事件对象
 * @param context - Lambda 上下文对象
 * @returns API Gateway 响应对象
 */
export const handler = async (event: any, context: any) => {
  const logger = new Logger('LambdaHandler');

  try {
    // 记录请求信息
    logger.log(`Request: ${event.httpMethod} ${event.path}`);
    logger.debug(`AWS Request ID: ${context.requestId}`);

    // 获取或创建 serverless handler
    const serverlessHandler = await bootstrap();

    // 调用 handler 处理请求
    const response = await serverlessHandler(event, context);

    logger.debug(`Response status: ${response.statusCode}`);

    return response;
  } catch (error: any) {
    logger.error('Lambda execution error:', error);

    // 返回 500 错误
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Internal server error',
        error: error.message,
        requestId: context.requestId,
      }),
    };
  }
};
