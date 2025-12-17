/**
 * Items 模块
 * 负责 Item CRUD 功能
 */

import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { PrismaService } from '../prisma.service';

@Module({
  // controllers: 注册此模块的控制器
  controllers: [ItemsController],

  // providers: 注册此模块的服务提供者
  // PrismaService: 数据库连接服务
  providers: [ItemsService, PrismaService],

  // exports: 导出服务供其他模块使用（如果需要的话）
  // 当前模块不需要被其他模块引用，所以不导出
})
export class ItemsModule { }
