/**
 * Prisma Service - 全局单例模式
 *
 * ⚠️ Serverless 环境下的最佳实践：
 * 1. 使用全局单例避免重复创建连接
 * 2. 禁止在 Lambda handler 中调用 $disconnect()
 * 3. 复用 Lambda 容器中的连接
 *
 * 工作原理：
 * - Lambda 容器会保持一段时间活跃（通常 5-15 分钟）
 * - 同一个容器的多次调用会复用这个 Prisma Client 实例
 * - 减少数据库连接开销，提升性能
 */

import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  /**
   * 模块初始化时连接数据库
   * Nest.js 会在应用启动时自动调用这个方法
   *
   * ⚠️ Phase 3-4: 由于没有 VPC，连接会失败，但不阻止应用启动
   * Phase 5+: VPC 配置后，连接会成功
   */
  async onModuleInit() {
    this.logger.log('Connecting to database...');

    try {
      // 连接数据库
      await this.$connect();
      this.logger.log('Database connected successfully');
    } catch (error) {
      // ⚠️ 在 Serverless 环境下，如果数据库连接失败，只记录警告
      // 不抛出错误，让应用可以启动（至少健康检查能工作）
      // Phase 3-4: 预期会失败（无 VPC）
      // Phase 5+: 如果失败说明配置有问题
      this.logger.warn(
        'Failed to connect to database - app will start but database operations will fail',
      );
      this.logger.warn(error);
    }
  }

  /**
   * ⚠️ 重要：不实现 OnModuleDestroy
   *
   * 在 Serverless 环境中，我们故意不在模块销毁时断开连接：
   * - Lambda 容器可能会被复用
   * - 保持连接可以加快后续调用
   * - AWS Lambda 会在容器被销毁时自动清理连接
   *
   * 如果实现了 onModuleDestroy 并调用 $disconnect()：
   * - 会导致每次请求都重新建立连接
   * - 严重影响性能和冷启动时间
   */

  /**
   * 清理方法（仅用于本地开发或测试）
   * Serverless 环境下不应该调用这个方法
   */
  async enableShutdownHooks() {
    // 在接收到 SIGINT 或 SIGTERM 信号时清理
    process.on('SIGINT', async () => {
      this.logger.log('Received SIGINT, disconnecting from database...');
      await this.$disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      this.logger.log('Received SIGTERM, disconnecting from database...');
      await this.$disconnect();
      process.exit(0);
    });
  }
}
