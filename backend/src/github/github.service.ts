/**
 * GitHub 服务
 * 负责调用 GitHub API
 */

import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);

  // GitHub API 基础 URL
  private readonly GITHUB_API_URL = 'https://api.github.com';

  /**
   * 获取 GitHub 用户信息
   *
   * 工作流程：
   * 1. 从环境变量获取 GITHUB_TOKEN
   * 2. 调用 GitHub API /user 端点
   * 3. 返回用户信息
   *
   * 注意事项：
   * - 需要有效的 GitHub Personal Access Token
   * - Lambda 必须在 VPC 中且有 NAT Gateway 才能访问外网
   * - Phase 1-7 期间此功能会失败（无 NAT Gateway）
   * - Phase 8 创建 NAT 后才能正常工作
   */
  async getUserInfo() {
    // 从环境变量获取 GitHub Token
    const token = process.env.GITHUB_TOKEN;

    // 如果没有配置 Token，返回友好提示
    if (!token) {
      this.logger.warn('GITHUB_TOKEN not configured');
      throw new HttpException(
        {
          message: 'GitHub Token not configured',
          hint: 'Please set GITHUB_TOKEN in environment variables',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    try {
      this.logger.debug('Calling GitHub API /user');

      // 调用 GitHub API
      // 需要在 Authorization header 中传递 Token
      const response = await axios.get(`${this.GITHUB_API_URL}/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github+json',
          // GitHub API 需要 User-Agent header
          'User-Agent': 'Nest-AWS-Serverless-App',
        },
        // 设置超时时间（10秒）
        timeout: 10000,
      });

      this.logger.log(`Successfully fetched GitHub user: ${response.data.login}`);

      // 返回用户信息的子集（不返回所有字段）
      return {
        login: response.data.login, // 用户名
        name: response.data.name, // 显示名称
        avatar_url: response.data.avatar_url, // 头像 URL
      };
    } catch (error) {
      // 记录错误详情
      this.logger.error('Failed to fetch GitHub user info', error.message);

      // 如果是 axios 错误，提取具体信息
      if (axios.isAxiosError(error)) {
        // 网络错误或超时（通常是因为没有 NAT Gateway）
        if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
          throw new HttpException(
            {
              message: 'Cannot reach GitHub API',
              hint: 'Lambda needs NAT Gateway to access external APIs (Phase 8)',
              error: error.message,
            },
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        }

        // GitHub API 返回错误（如 Token 无效）
        if (error.response) {
          throw new HttpException(
            {
              message: 'GitHub API error',
              status: error.response.status,
              error: error.response.data,
            },
            error.response.status,
          );
        }
      }

      // 其他未知错误
      throw new HttpException(
        {
          message: 'Internal server error',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
