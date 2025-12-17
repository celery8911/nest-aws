/**
 * Items 服务
 * 处理 Item 的业务逻辑
 * Phase 1: 使用内存存储（临时方案）
 * Phase 2: 将替换为 Prisma + 数据库
 */

import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Item, CreateItemDto } from './item.entity';

@Injectable()
export class ItemsService {
  private readonly logger = new Logger(ItemsService.name);

  // 临时的内存存储
  // Phase 2 将替换为 Prisma Client
  private items: Item[] = [];

  /**
   * 获取所有 Items
   * 返回按创建时间倒序排列的 Items
   */
  async findAll(): Promise<Item[]> {
    this.logger.debug(`Found ${this.items.length} items`);
    // 返回副本并按创建时间倒序排列（最新的在前）
    return [...this.items].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    );
  }

  /**
   * 创建新 Item
   * @param createItemDto - 包含 title 和 content 的对象
   * @returns 新创建的 Item
   */
  async create(createItemDto: CreateItemDto): Promise<Item> {
    // 生成简单的唯一 ID（实际生产环境会由数据库自动生成）
    const id = Date.now().toString();

    // 创建新 Item 对象
    const newItem: Item = {
      id,
      title: createItemDto.title,
      content: createItemDto.content,
      createdAt: new Date(), // 记录创建时间
    };

    // 添加到内存数组
    this.items.push(newItem);

    this.logger.log(`Created item with id: ${id}`);
    return newItem;
  }

  /**
   * 删除指定 Item
   * @param id - 要删除的 Item ID
   * @returns 删除的 Item
   * @throws NotFoundException - 如果 Item 不存在
   */
  async remove(id: string): Promise<Item> {
    // 查找要删除的 Item 索引
    const index = this.items.findIndex((item) => item.id === id);

    // 如果找不到，抛出 404 异常
    if (index === -1) {
      this.logger.warn(`Item with id ${id} not found`);
      throw new NotFoundException(`Item with id ${id} not found`);
    }

    // 从数组中删除并返回被删除的 Item
    const [removedItem] = this.items.splice(index, 1);

    this.logger.log(`Deleted item with id: ${id}`);
    return removedItem;
  }
}
