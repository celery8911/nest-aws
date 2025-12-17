# Nest.js + AWS Serverless 学习项目

从 0 构建一个 **Nest.js + AWS Serverless + Aurora Serverless v2 + Prisma** 的完整学习项目。

## 项目目标

通过实践理解以下核心概念：

- Serverless 架构设计
- AWS SAM / CloudFormation（基础设施即代码）
- Lambda + VPC + 子网网络设计
- Aurora Serverless v2 数据库
- 成本控制策略（特别是 NAT Gateway）

## 技术栈

| 类别 | 技术 |
|------|------|
| 后端框架 | Nest.js (Node.js 20) |
| 部署工具 | AWS SAM |
| 计算服务 | AWS Lambda (ARM64) |
| API 网关 | API Gateway (REST) |
| ORM | Prisma |
| 数据库 | Aurora PostgreSQL Serverless v2 |
| 数据库管理 | Supabase (只读查看) |
| 前端 | React + Vite |
| 静态托管 | S3 + CloudFront |
| 日志监控 | CloudWatch Logs |

## 项目结构

```
nest-aws/
├── backend/           # Nest.js 后端代码
├── frontend/          # React 前端代码
├── docs/              # 项目文档
├── template.yaml      # AWS SAM 模板
├── plan.md           # 详细的学习计划
└── README.md         # 本文件
```

## 学习路径（12 个 Phase）

### Phase 1: Nest.js 本地初始化
- 搭建 Nest.js 项目
- 配置基础依赖
- 本地开发环境验证

### Phase 2: Prisma + 本地数据库
- 配置 Prisma ORM
- 使用本地 PostgreSQL
- 实现 Item CRUD 功能

### Phase 3: SAM + Lambda + API Gateway (不进 VPC) + CloudWatch Logs
- 创建 SAM template.yaml
- 部署到 AWS Lambda
- 配置 API Gateway
- 配置 CloudWatch Logs（7天保留期）

### Phase 4: 创建 VPC 网络（控制台操作）
👉 **你需要在 AWS 控制台手动创建**：
- 1 个 VPC
- 1 个公网子网（用于 NAT Gateway）
- 3 个私网子网（用于 Lambda 和 Aurora）

### Phase 5: Lambda 进入 VPC
- 配置 Lambda VpcConfig
- 引用 Phase 4 创建的子网和安全组

### Phase 6: 创建 Aurora Serverless v2（控制台操作）
👉 **你需要在 AWS 控制台手动创建**：
- Aurora PostgreSQL Serverless v2 集群
- 最小配置：0.5 ACU
- ⚠️ **成本提示：约 $43/月（$1.4/天）持续计费**

### Phase 7: Prisma 连接 Aurora
- 更新 DATABASE_URL
- 运行 Prisma migrations
- 验证 CRUD 功能
- 通过 Supabase 查看数据

### Phase 8: 临时创建 NAT Gateway
👉 **临时创建 NAT Gateway 用于测试**：
- 测试 Lambda 调用外部 GitHub API
- ⚠️ **成本：约 $33/月（$1.1/天）+ 流量费**

### Phase 9: 删除 NAT Gateway
👉 **立即删除 NAT Gateway**：
- 避免持续收费
- 释放 Elastic IP

### Phase 10: 前端开发
- React + Vite 项目初始化
- Item CRUD 界面
- GitHub 用户信息获取

### Phase 11: 前端部署
- S3 静态网站托管
- CloudFront CDN 配置
- HTTPS 支持

### Phase 12: 项目完整联调与清理
- 端到端功能测试
- 资源清理（见下方清理清单）

## 为什么某些资源在控制台手动创建？

### VPC / Aurora 在控制台创建的原因

1. **成本可见性**：在控制台创建便于直观查看资源和费用
2. **学习友好**：理解每个网络组件的作用
3. **避免误删**：不会因为 `sam delete` 而删除数据库
4. **灵活测试**：可以独立于 SAM 部署进行测试

### NAT Gateway 为什么只能临时存在？

- NAT Gateway **按小时计费**（约 $0.045/小时 = $33/月）
- **流量费**额外收费（$0.045/GB）
- 学习项目只在测试外网访问时需要
- **Phase 8 测试完成后必须立即删除**

## Aurora Serverless v2 的成本与扩缩容

### 成本计算
- 最小配置：0.5 ACU
- 定价：约 $0.12/ACU/小时
- 月成本：0.5 × $0.12 × 24 × 30 ≈ **$43/月**

### 扩缩容逻辑
- 根据负载自动在 0.5-1 ACU 之间扩缩容
- **无自动暂停功能**（与 Aurora Serverless v1 不同）
- 最小容量持续计费，即使无连接

### 成本优化建议
- 学习完成后**立即删除集群**
- 测试期间控制在最小 0.5 ACU
- 避免长时间闲置

## 环境变量管理

### Lambda 环境变量（通过 SAM template.yaml）
```yaml
Environment:
  Variables:
    DATABASE_URL: postgresql://...
    GITHUB_TOKEN: ghp_xxxxx
```

### 本地开发（.env 文件）
```bash
DATABASE_URL="postgresql://localhost:5432/mydb"
GITHUB_TOKEN="ghp_xxxxx"
```

⚠️ `.env` 文件已在 `.gitignore` 中，不会提交到 Git

## 日志与监控

### CloudWatch Logs
- Lambda 自动输出 `console.log/error` 到 CloudWatch
- 日志组：`/aws/lambda/{FunctionName}`
- 保留期：7 天（控制成本）

### 日志最佳实践
- 使用 Nest.js Logger 统一格式
- 结构化输出 JSON 日志
- 捕获并记录所有异常

## 💰 成本预估

| 阶段 | 资源 | 预估成本 | 说明 |
|------|------|----------|------|
| Phase 1-3 | 本地开发 + Lambda | $0 | 免费额度内 |
| Phase 4-5 | VPC + 子网 | $0 | VPC 本身免费 |
| **Phase 6-9** | **Aurora Serverless v2** | **~$43/月** | 持续计费 |
| Phase 8 | **NAT Gateway** | **~$33/月** | 临时创建，用完立删 |
| Phase 10-11 | S3 + CloudFront | $0.5-2/月 | 存储和流量费 |
| **学习期总成本** | **1 周完成** | **~$10-20** | 及时清理是关键 |

## 🗑️ 资源清理检查清单

学习完成后，按以下顺序删除资源：

### 优先级 1：立即删除（有持续费用）

- [ ] **NAT Gateway**（Phase 8 测试后立即删除）
  - EC2 Console → NAT Gateways → 删除
  - 释放关联的 Elastic IP

- [ ] **Aurora Serverless v2 集群**
  - RDS Console → Databases → 删除集群和实例
  - ⚠️ 取消勾选"创建最终快照"（学习项目无需保留）

- [ ] **CloudFormation Stack**（包含 Lambda + API Gateway）
  - `sam delete` 或 CloudFormation Console 删除

### 优先级 2：清理存储（小额费用）

- [ ] **S3 Bucket**（前端静态文件）
  - 清空 Bucket 后删除

- [ ] **CloudWatch Logs**
  - 删除 `/aws/lambda/*` 日志组（或等待自动过期）

- [ ] **ECR 镜像**（如使用 Docker 部署 Lambda）
  - ECR Console 删除镜像

### 优先级 3：清理网络（无费用但建议清理）

- [ ] **VPC**（手动创建的）
  - 先删除依赖资源（子网、路由表、Internet Gateway）
  - 再删除 VPC

- [ ] **Security Groups**（手动创建的）

- [ ] **CloudFront Distribution**（如已启用）
  - 先禁用，等待部署完成后删除

### 验证清理完成

- [ ] CloudFormation Console 无遗留 Stack
- [ ] RDS Console 无数据库实例
- [ ] EC2 Console 无 NAT Gateway 和未释放的 EIP
- [ ] 查看 Billing Dashboard 确认无持续费用

## 功能需求（MVP）

### 后端 API

1. **Item CRUD**
   - `POST /items` - 创建 Item
   - `GET /items` - 获取所有 Items
   - `DELETE /items/:id` - 删除 Item

2. **GitHub 用户信息**
   - `GET /github/me` - 获取当前用户信息
   - GitHub Token 存储在 Lambda 环境变量中

### 前端页面

- 表单：新增 Item
- 列表：展示 / 删除 Item
- 按钮：获取 GitHub 用户信息

## 开发进度

- [x] 项目初始化
- [x] Phase 1: Nest.js 本地初始化
- [x] Phase 2: Prisma + 本地数据库
- [ ] Phase 3: SAM + Lambda + API Gateway
- [ ] Phase 4: 创建 VPC 网络
- [ ] Phase 5: Lambda 进入 VPC
- [ ] Phase 6: 创建 Aurora Serverless v2
- [ ] Phase 7: Prisma 连接 Aurora
- [ ] Phase 8: 临时创建 NAT Gateway
- [ ] Phase 9: 删除 NAT Gateway
- [ ] Phase 10: 前端开发
- [ ] Phase 11: 前端部署
- [ ] Phase 12: 完整联调与清理

## 参考资源

- [AWS SAM 官方文档](https://docs.aws.amazon.com/serverless-application-model/)
- [Aurora Serverless v2 文档](https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html)
- [Nest.js 官方文档](https://docs.nestjs.com/)
- [Prisma 官方文档](https://www.prisma.io/docs)

## 许可证

本项目仅用于学习目的。
