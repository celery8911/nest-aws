/**
 * 应用程序根服务
 * 提供基础功能，如健康检查
 */

import { Injectable, Logger } from '@nestjs/common';

// @Injectable() 装饰器标记这是一个可注入的服务
// Nest.js 会管理其生命周期并支持依赖注入
@Injectable()
export class AppService {
  // 创建日志记录器实例
  // AppService.name 会自动使用类名作为日志上下文
  private readonly logger = new Logger(AppService.name);

  /**
   * 获取健康状态
   * 返回应用的运行状态信息
   * 这个方法会在 Lambda 冷启动和健康检查时被调用
   */
  getHealth() {
    // 记录日志到 CloudWatch Logs（部署到 AWS 后）
    this.logger.log('Health check requested');

    // 返回标准的健康检查响应
    return {
      status: 'ok', // 状态：正常
      timestamp: new Date().toISOString(), // 当前时间戳（ISO 8601 格式）
      message: 'Nest.js AWS Serverless Backend is running', // 描述信息
    };
  }
}
