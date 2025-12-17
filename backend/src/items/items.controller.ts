/**
 * Items 控制器
 * 处理 Item 相关的 HTTP 请求
 * 路由前缀: /items
 */

import { Controller, Get, Post, Delete, Param, Body, Logger } from '@nestjs/common';
import { ItemsService } from './items.service';
import { CreateItemDto } from './item.entity';

// @Controller('items') 装饰器定义路由前缀为 /items
@Controller('items')
export class ItemsController {
  // 创建日志记录器
  private readonly logger = new Logger(ItemsController.name);

  // 注入 ItemsService
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * 获取所有 Items
   * GET /items
   */
  @Get()
  async findAll() {
    this.logger.log('GET /items - Fetching all items');
    return this.itemsService.findAll();
  }

  /**
   * 创建新 Item
   * POST /items
   * Body: { title: string, content: string }
   */
  @Post()
  async create(@Body() createItemDto: CreateItemDto) {
    this.logger.log(`POST /items - Creating item: ${createItemDto.title}`);
    return this.itemsService.create(createItemDto);
  }

  /**
   * 删除指定 Item
   * DELETE /items/:id
   * Param: id - Item 的唯一标识符
   */
  @Delete(':id')
  async remove(@Param('id') id: string) {
    this.logger.log(`DELETE /items/${id} - Deleting item`);
    return this.itemsService.remove(id);
  }
}
