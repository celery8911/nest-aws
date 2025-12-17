/**
 * 应用程序根模块
 * 整合所有功能模块（Items、GitHub）
 */

import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ItemsModule } from './items/items.module';
import { GithubModule } from './github/github.module';

@Module({
  // imports: 导入其他模块
  // ConfigModule: 环境变量配置模块
  //   - isGlobal: true 表示全局可用，其他模块无需重复导入
  //   - envFilePath: 指定 .env 文件路径
  // ItemsModule: Item CRUD 功能模块
  // GithubModule: GitHub API 调用功能模块
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // 设置为全局模块，所有模块都可以访问环境变量
      envFilePath: '.env', // .env 文件路径
    }),
    ItemsModule,
    GithubModule,
  ],

  // controllers: 注册控制器
  // AppController: 根路径控制器，处理健康检查等基础路由
  controllers: [AppController],

  // providers: 注册服务提供者
  // AppService: 根服务，提供基础功能
  providers: [AppService],
})
export class AppModule {}
