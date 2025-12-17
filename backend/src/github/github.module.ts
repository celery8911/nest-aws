/**
 * GitHub 模块
 * 负责调用 GitHub API 获取用户信息
 */

import { Module } from '@nestjs/common';
import { GithubController } from './github.controller';
import { GithubService } from './github.service';

@Module({
  // controllers: 注册此模块的控制器
  controllers: [GithubController],

  // providers: 注册此模块的服务提供者
  providers: [GithubService],
})
export class GithubModule {}
