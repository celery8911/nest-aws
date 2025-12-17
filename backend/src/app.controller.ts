/**
 * 应用程序根控制器
 * 处理根路径的 HTTP 请求
 */

import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';
import { PrismaService } from './prisma.service';

// @Controller() 装饰器定义控制器，不传参数表示根路径 "/"
@Controller()
export class AppController {
  // 通过构造函数注入 AppService 和 PrismaService
  // Nest.js 会自动实例化并注入依赖
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 健康检查端点
   * GET /
   * 返回应用运行状态，用于验证服务是否正常
   */
  @Get()
  getHealth() {
    return this.appService.getHealth();
  }

  /**
   * 临时端点：运行数据库 migration
   * POST /migrate
   * ⚠️ 仅用于 Phase 7 初始化，之后应该删除或禁用
   */
  @Post('migrate')
  async runMigration() {
    try {
      // 执行建表 SQL
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "items" (
          "id" SERIAL NOT NULL,
          "title" TEXT NOT NULL,
          "content" TEXT NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "items_pkey" PRIMARY KEY ("id")
        );
      `);

      return {
        success: true,
        message: 'Migration completed successfully',
      };
    } catch (error: any) {
      return {
        success: false,
        message: 'Migration failed',
        error: error.message,
      };
    }
  }
}
