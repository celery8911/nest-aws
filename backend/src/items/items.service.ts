/**
 * Items 服务
 * 处理 Item 的业务逻辑
 * Phase 1: 使用内存存储（临时方案）✅
 * Phase 2: 使用 Prisma + PostgreSQL ✅
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { CreateItemDto } from './item.entity';
import { PrismaService } from '../prisma.service';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  // 通过构造函数注入 PrismaService
  // Nest.js 会自动提供 PrismaService 实例（全局单例）
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取所有 Items
   * 返回按创建时间倒序排列的 Items
   * 使用 Prisma 查询数据库
   */
  async findAll() {
    // 使用 Prisma 查询数据库
    // orderBy: 按 createdAt 降序排列（最新的在前）
    const items = await this.prisma.item.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    this.logger.debug(`Found ${items.length} items from database`);
    return items;
  }

  /**
   * 创建新 Item
   * @param createItemDto - 包含 title 和 content 的对象
   * @returns 新创建的 Item
   */
  async create(createItemDto: CreateItemDto) {
    // 使用 Prisma 插入数据到数据库
    // data: 要插入的数据
    // Prisma 会自动：
    // 1. 生成自增 ID
    // 2. 设置 createdAt 为当前时间（schema 中定义了 @default(now())）
    const item = await this.prisma.item.create({
      data: {
        title: createItemDto.title,
        content: createItemDto.content,
      },
    });

    this.logger.log(`Created item with id: ${item.id}`);
    return item;
  }

  /**
   * 删除指定 Item
   * @param id - 要删除的 Item ID（字符串格式，需转换为数字）
   * @returns 删除的 Item
   * @throws NotFoundException - 如果 Item 不存在
   */
  async remove(id: string) {
    // 将字符串 ID 转换为数字
    // Prisma schema 中 id 定义为 Int 类型
    const itemId = parseInt(id, 10);

    // 检查 ID 是否有效
    if (isNaN(itemId)) {
      this.logger.warn(`Invalid item id: ${id}`);
      throw new NotFoundException(`Invalid item id: ${id}`);
    }

    try {
      // 使用 Prisma 删除数据
      // where: 指定删除条件
      // 如果 ID 不存在，Prisma 会抛出 RecordNotFound 异常
      const item = await this.prisma.item.delete({
        where: { id: itemId },
      });

      this.logger.log(`Deleted item with id: ${itemId}`);
      return item;
    } catch (error) {
      // 捕获 Prisma 的 RecordNotFound 异常
      // 转换为 Nest.js 的 NotFoundException
      if (error.code === 'P2025') {
        this.logger.warn(`Item with id ${itemId} not found`);
        throw new NotFoundException(`Item with id ${itemId} not found`);
      }
      // 其他错误直接抛出
      throw error;
    }
  }
}
