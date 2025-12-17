/**
 * 应用程序根控制器
 * 处理根路径的 HTTP 请求
 */

import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

// @Controller() 装饰器定义控制器，不传参数表示根路径 "/"
@Controller()
export class AppController {
  // 通过构造函数注入 AppService
  // Nest.js 会自动实例化并注入依赖
  constructor(private readonly appService: AppService) {}

  /**
   * 健康检查端点
   * GET /
   * 返回应用运行状态，用于验证服务是否正常
   */
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }
}
