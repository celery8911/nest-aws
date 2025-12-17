/**
 * Item 实体定义
 * 定义 Item 的数据结构
 *
 * Phase 1: 用于内存存储的接口
 * Phase 2: 将替换为 Prisma 生成的类型
 */

export interface Item {
  // 唯一标识符
  id: string;

  // 标题
  title: string;

  // 内容
  content: string;

  // 创建时间
  createdAt: Date;
}

/**
 * 创建 Item 的 DTO（Data Transfer Object）
 * 用于接收客户端请求数据
 */
export interface CreateItemDto {
  title: string;
  content: string;
}
