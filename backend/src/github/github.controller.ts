/**
 * GitHub 控制器
 * 处理 GitHub 相关的 HTTP 请求
 * 路由前缀: /github
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { GithubService } from './github.service';

// @Controller('github') 装饰器定义路由前缀为 /github
@Controller('github')
export class GithubController {
  // 创建日志记录器
  private readonly logger = new Logger(GithubController.name);

  // 注入 GithubService
  constructor(private readonly githubService: GithubService) {}

  /**
   * 获取 GitHub 用户信息
   * GET /github/me
   *
   * 注意：
   * - GitHub Token 存储在 Lambda 环境变量中（GITHUB_TOKEN）
   * - 前端不需要传递 Token，也不应该知道 Token
   * - 这个端点需要 NAT Gateway 才能访问外网（Phase 8）
   */
  @Get('me')
  async getMe() {
    this.logger.log('GET /github/me - Fetching GitHub user info');
    return this.githubService.getUserInfo();
  }
}
