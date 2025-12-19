/**
 * API 服务
 * 封装所有后端 API 调用
 * 支持动态切换 Lambda 和 EC2 服务
 */

export interface Item {
  id: number;
  title: string;
  content: string;
  createdAt: string;
}

export interface GitHubUser {
  login: string;
  name: string;
  avatar_url: string;
}

/**
 * 创建 Item API 实例
 * @param apiUrl - API 基础 URL
 */
export function createItemApi(apiUrl: string) {
  return {
    // 获取所有 Items
    async getAll(): Promise<Item[]> {
      const response = await fetch(`${apiUrl}/items`);
      if (!response.ok) {
        throw new Error('Failed to fetch items');
      }
      return response.json();
    },

    // 创建新 Item
    async create(title: string, content: string): Promise<Item> {
      const response = await fetch(`${apiUrl}/items`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) {
        throw new Error('Failed to create item');
      }
      return response.json();
    },

    // 删除 Item
    async delete(id: number): Promise<void> {
      const response = await fetch(`${apiUrl}/items/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete item');
      }
    },
  };
}

/**
 * 创建 GitHub API 实例
 * @param apiUrl - API 基础 URL
 */
export function createGitHubApi(apiUrl: string) {
  return {
    // 获取 GitHub 用户信息
    async getMe(): Promise<GitHubUser> {
      const response = await fetch(`${apiUrl}/github/me`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch GitHub user');
      }
      return response.json();
    },
  };
}
