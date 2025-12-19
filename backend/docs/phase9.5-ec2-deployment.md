# Phase 9.5: EC2 + PM2 + Nginx 部署指南

## 概述

本指南将带你完成将 Nest.js 应用部署到 EC2 实例的完整流程，使用 PM2 作为进程守护，Nginx 作为反向代理。

**部署架构**：
```
Internet → Nginx (80) → PM2 → Nest.js (3000) → Aurora (VPC 内)
```

**关键特点**：
- 与 Lambda 部署并行存在（两种部署方式都保留）
- 使用 t4g.micro 实例（ARM64 架构，与 Lambda 一致）
- 手动部署脚本（学习传统运维流程）
- 月成本约 $5（首年免费额度内为 $0）

---

## 前提条件

### 已完成的 Phase
- ✅ Phase 4: VPC 和子网已创建
- ✅ Phase 6: Aurora Serverless v2 集群已运行
- ✅ Phase 7: 数据库连接和表结构已就绪

### 本地环境需求
- **本地机器**：macOS/Linux/Windows（支持 bash 和 rsync）
- **AWS CLI**：已配置（用于查看资源信息）
- **SSH 客户端**：用于连接 EC2 实例

---

## 第一步：创建 EC2 实例（AWS 控制台操作）

### 1.1 启动实例创建向导

1. 登录 [AWS EC2 控制台](https://console.aws.amazon.com/ec2/)
2. 点击 **Launch Instance** 按钮
3. 填写以下配置：

### 1.2 基本配置

| 配置项 | 值 |
|-------|-----|
| Name | `nest-aws-ec2` |
| Application and OS Images (AMI) | **Amazon Linux 2023 AMI** (选择 ARM64 架构) |
| Instance type | **t4g.micro** (1 vCPU, 1 GB RAM) |

**重要**：确保选择 **ARM64** 架构，而不是 x86_64，以与 Lambda 保持一致。

### 1.3 密钥对配置

- 点击 **Create new key pair**
- Key pair name: `nest-aws-ec2-key`
- Key pair type: **RSA**
- Private key file format: **.pem** (Linux/macOS) 或 **.ppk** (Windows)
- 点击 **Create key pair**，浏览器会自动下载 `nest-aws-ec2-key.pem` 文件

**立即执行**：
```bash
# 将下载的密钥文件移动到 ~/.ssh/ 目录
mv ~/Downloads/nest-aws-ec2-key.pem ~/.ssh/

# 设置正确的权限（必须，否则 SSH 会拒绝使用）
chmod 400 ~/.ssh/nest-aws-ec2-key.pem
```

### 1.4 网络配置

| 配置项 | 值 |
|-------|-----|
| VPC | 选择 Phase 4 创建的 VPC |
| Subnet | **选择公网子网**（有 Internet Gateway 的子网）|
| Auto-assign public IP | **Enable** |

**如何识别公网子网**：
- 查看子网的路由表
- 公网子网的路由表包含目标为 `0.0.0.0/0`、网关为 `igw-xxxxx` 的路由

### 1.5 安全组配置

点击 **Create security group**，创建新的安全组：

| 配置项 | 值 |
|-------|-----|
| Security group name | `nest-aws-ec2-sg` |
| Description | Security group for nest-aws EC2 instance |

**入站规则**（Inbound rules）：

| Type | Protocol | Port | Source | 说明 |
|------|----------|------|--------|------|
| SSH | TCP | 22 | My IP | SSH 连接（自动检测你的 IP）|
| HTTP | TCP | 80 | 0.0.0.0/0 | 公网访问 |
| HTTPS | TCP | 443 | 0.0.0.0/0 | HTTPS（未来用）|
| Custom TCP | TCP | 3000 | My IP | 直接访问 Nest.js（测试用）|

**出站规则**（Outbound rules）：
- 保持默认（All traffic → 0.0.0.0/0）

### 1.6 存储配置

| 配置项 | 值 |
|-------|-----|
| Storage | 8 GiB gp3 (默认) |

默认配置即可，8GB 足够运行 Node.js 应用。

### 1.7 启动实例

1. 展开 **Advanced details**（可选，保持默认）
2. 点击 **Launch instance**
3. 等待实例状态变为 **Running**（约 1-2 分钟）
4. 记录实例的 **Public IPv4 address**（例如：`54.199.89.29`）54.199.89.29

---

## 第二步：配置 Aurora 安全组

为了让 EC2 实例能访问 Aurora 数据库，需要在 Aurora 安全组中添加入站规则。

### 2.1 找到 Aurora 安全组

1. 打开 [RDS 控制台](https://console.aws.amazon.com/rds/)
2. 点击你的 Aurora 集群
3. 在 **Connectivity & security** 标签页，找到 **VPC security groups**
4. 点击安全组 ID（例如 `sg-xxxxx`）

### 2.2 添加入站规则

1. 在安全组详情页，点击 **Edit inbound rules**
2. 点击 **Add rule**
3. 配置如下：

| Type | Protocol | Port | Source | 说明 |
|------|----------|------|--------|------|
| PostgreSQL | TCP | 5432 | `nest-aws-ec2-sg` | 允许 EC2 访问数据库 |

**Source 选择方式**：
- 选择 **Custom**
- 在搜索框中输入 `nest-aws-ec2-sg`
- 选择刚创建的 EC2 安全组

4. 点击 **Save rules**

---

## 第三步：初始化 EC2 环境

### 3.1 连接到 EC2 实例

使用 SSH 连接到 EC2（替换为你的实际 IP）：

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@54.199.89.29
```

**首次连接时**会提示：
```
Are you sure you want to continue connecting (yes/no)?
```
输入 `yes` 并回车。

### 3.2 运行初始化脚本

在 EC2 实例上执行以下命令：

```bash
# 创建初始化脚本
cat > setup.sh << 'EOF'
#!/bin/bash
set -e

echo "=========================================="
echo "EC2 环境初始化开始"
echo "=========================================="

# 更新系统包
echo "[1/6] 更新系统包..."
sudo dnf update -y

# 安装 Node.js 20
echo "[2/6] 安装 Node.js 20..."
curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
sudo dnf install -y nodejs

# 验证安装
node -v
npm -v

# 安装 PM2
echo "[3/6] 安装 PM2..."
sudo npm install -g pm2

# 配置 PM2 开机自启
echo "[4/6] 配置 PM2 开机自启..."
pm2 startup systemd -u ec2-user --hp /home/ec2-user
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 安装 Nginx
echo "[5/6] 安装 Nginx..."
sudo dnf install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装 Git
echo "[6/6] 安装 Git..."
sudo dnf install -y git

echo ""
echo "=========================================="
echo "✅ EC2 环境初始化完成！"
echo "=========================================="
echo "Node.js: $(node -v)"
echo "npm: $(npm -v)"
echo "PM2: $(pm2 -v)"
echo "Nginx: $(nginx -v 2>&1)"
EOF

# 赋予执行权限
chmod +x setup.sh

# 执行初始化
./setup.sh
```

**预计耗时**：3-5 分钟

初始化完成后，保持 SSH 连接打开（或可以断开，稍后重新连接）。

---

## 第四步：本地环境准备

返回你的本地开发机器。

### 4.1 设置环境变量

```bash
# 设置 EC2 公网 IP（替换为你的实际 IP）
export EC2_HOST="54.199.89.29"

# 设置 SSH 密钥路径（使用 $HOME 而不是 ~）
export SSH_KEY="$HOME/.ssh/nest-aws-ec2-key.pem"

# 验证设置
echo "EC2_HOST: $EC2_HOST"
echo "SSH_KEY: $SSH_KEY"
```

**建议**：将这两行添加到 `~/.bashrc` 或 `~/.zshrc` 中，避免每次重新设置。

### 4.2 创建生产环境变量文件

在 `backend/` 目录下创建 `.env.production.local` 文件：

```bash
cd backend

# 复制模板
cp .env.production .env.production.local

# 编辑文件，填入真实值
nano .env.production.local
```

填入以下内容（**替换为你的实际值**）：

```bash
# 应用端口
PORT=3000

# Node 环境
NODE_ENV=production

# Aurora 数据库连接字符串
# 从 RDS 控制台获取集群端点（Writer endpoint）
DATABASE_URL="postgresql://postgres:你的密码@nest-aws-cluster.cluster-xxxxx.ap-northeast-1.rds.amazonaws.com:5432/nest_aws_prod?schema=public"

# GitHub Personal Access Token
# 从 GitHub Settings > Developer settings > Personal access tokens 获取
GITHUB_TOKEN="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
```

**如何获取 Aurora 端点**：
1. 打开 [RDS 控制台](https://console.aws.amazon.com/rds/)
2. 点击你的 Aurora 集群
3. 在 **Connectivity & security** 标签页找到 **Endpoint** (Writer)
4. 复制端点地址（例如：`nest-aws-cluster.cluster-xxxxx.ap-northeast-1.rds.amazonaws.com`）

**重要**：`.env.production.local` 已在 `.gitignore` 中，不会被提交到 Git。

---

## 第五步：首次部署

确保你在 `backend/` 目录下。

### 5.1 赋予脚本执行权限

```bash
chmod +x scripts/deploy-ec2.sh
chmod +x scripts/update-ec2.sh
```

### 5.2 执行部署脚本

```bash
./scripts/deploy-ec2.sh
```

**部署流程**（9 个步骤）：

1. ✅ 检查 SSH 连接
2. ✅ 创建远程目录
3. ✅ 同步后端代码（排除 node_modules 和 dist）
4. ✅ 配置环境变量（上传 .env.production.local）
5. ✅ 配置 Nginx（上传反向代理配置）
6. ✅ 安装依赖（npm ci）
7. ✅ 生成 Prisma Client（npx prisma generate）
8. ✅ 编译 TypeScript（npm run build）
9. ✅ 启动应用（PM2 启动并重启 Nginx）

**预计耗时**：5-8 分钟（首次部署需要下载所有依赖）

### 5.3 部署成功输出

看到以下输出表示部署成功：

```bash
==========================================
🎉 部署完成！
==========================================
应用地址: http://54.199.89.29

验证命令：
  curl http://54.199.89.29/                 # 健康检查
  curl http://54.199.89.29/items            # Items API
  curl http://54.199.89.29/github/me        # GitHub API

常用命令：
  查看日志: ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@54.199.89.29 'pm2 logs nest-aws'
  查看状态: ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@54.199.89.29 'pm2 status'
  重启应用: ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@54.199.89.29 'pm2 restart nest-aws'
  监控应用: ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@54.199.89.29 'pm2 monit'
```

---

## 第六步：验证部署

### 6.1 健康检查

```bash
curl http://54.199.89.29/
```

预期输出：
```json
{"message":"Hello from Nest.js!"}
```

### 6.2 测试数据库连接（Items API）

```bash
# 创建一个 Item
curl -X POST http://54.199.89.29/items \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Item from EC2"}'

# 获取所有 Items
curl http://54.199.89.29/items
```

预期输出：
```json
[
  {
    "id": 1,
    "name": "Test Item from EC2",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
]
```

### 6.3 测试 GitHub API

```bash
curl http://54.199.89.29/github/me
```

预期输出（你的 GitHub 用户信息）：
```json
{
  "login": "your-username",
  "name": "Your Name",
  "bio": "Your bio",
  ...
}
```

### 6.4 在浏览器中访问

打开浏览器，访问：
- `http://54.199.89.29/` - 应该看到 JSON 响应
- `http://54.199.89.29/items` - 应该看到 Items 列表

---

## 常用运维命令

### 查看应用状态

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 status'
```

输出示例：
```
┌─────┬─────────────┬─────────┬─────────┬─────────┬──────────┐
│ id  │ name        │ status  │ cpu     │ memory  │ restart  │
├─────┼─────────────┼─────────┼─────────┼─────────┼──────────┤
│ 0   │ nest-aws    │ online  │ 0.2%    │ 125 MB  │ 0        │
└─────┴─────────────┴─────────┴─────────┴─────────┴──────────┘
```

### 查看实时日志

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 logs nest-aws'
```

按 `Ctrl+C` 停止查看。

### 查看最近日志（不跟踪）

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 logs nest-aws --lines 50 --nostream'
```

### 重启应用

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 restart nest-aws'
```

### 停止应用

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 stop nest-aws'
```

### 启动应用

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 start nest-aws'
```

### 监控应用（实时 CPU/内存）

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 monit'
```

按 `Ctrl+C` 退出。

### 查看 Nginx 状态

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'sudo systemctl status nginx'
```

### 查看 Nginx 日志

```bash
# 访问日志
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'sudo tail -f /var/log/nginx/nest-aws-access.log'

# 错误日志
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'sudo tail -f /var/log/nginx/nest-aws-error.log'
```

---

## 快速更新代码

当你修改了代码并想快速重新部署时，使用 `update-ec2.sh` 脚本（比完整部署快 5 倍）：

```bash
./scripts/update-ec2.sh
```

**更新流程**（4 个步骤）：
1. ✅ 同步代码
2. ✅ 重新编译
3. ✅ 重启应用
4. ✅ 检查状态

**预计耗时**：30-60 秒

**适用场景**：
- ✅ 修改了业务逻辑代码
- ✅ 修改了配置文件
- ✅ 修改了 Prisma schema（需要先本地运行 `npx prisma migrate dev`）
- ❌ 添加了新的 npm 依赖（需要使用完整部署脚本）

---

## 故障排查

### 问题 1：SSH 连接失败

**错误**：
```
ssh: connect to host 54.199.89.29 port 22: Connection timed out
```

**可能原因**：
1. 安全组未开放 22 端口
2. 实例未运行
3. 公网 IP 错误

**解决方法**：
1. 检查 EC2 实例状态（应为 Running）
2. 检查安全组入站规则（SSH, 22, My IP）
3. 确认公网 IP 正确

### 问题 2：Nginx 返回 502 Bad Gateway

**错误**：
```
curl http://54.199.89.29/
<html>
<head><title>502 Bad Gateway</title></head>
```

**可能原因**：
1. PM2 进程未启动
2. Nest.js 应用崩溃
3. 端口 3000 未监听

**解决方法**：

```bash
# 1. 检查 PM2 状态
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 status'

# 2. 如果状态为 errored 或 stopped，查看日志
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 logs nest-aws --lines 100'

# 3. 重启应用
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 restart nest-aws'
```

### 问题 3：数据库连接失败

**错误日志**：
```
Error: connect ETIMEDOUT
    at PrismaClient.connect
```

**可能原因**：
1. Aurora 安全组未添加 EC2 安全组
2. DATABASE_URL 配置错误
3. Aurora 实例未运行

**解决方法**：
1. 检查 Aurora 安全组入站规则（应包含 nest-aws-ec2-sg）
2. 检查 `.env` 文件中的 DATABASE_URL
3. 确认 Aurora 集群状态为 Available

```bash
# 查看环境变量
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'cat /home/ec2-user/nest-aws/backend/.env'

# 测试数据库连接
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'cd /home/ec2-user/nest-aws/backend && npx prisma db pull'
```

### 问题 4：Prisma 二进制不兼容

**错误日志**：
```
Error: Query engine library for current platform "linux-arm64-openssl-3.0.x" could not be found
```

**原因**：
本地 macOS 生成的 Prisma Client 无法在 Linux ARM64 上运行。

**解决方法**：
部署脚本已包含 `npx prisma generate` 步骤，在 EC2 上重新生成：

```bash
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST << 'EOF'
cd /home/ec2-user/nest-aws/backend
npx prisma generate
pm2 restart nest-aws
EOF
```

### 问题 5：内存不足（OOM）

**错误日志**：
```
Process killed (out of memory)
```

**原因**：
t4g.micro 只有 1GB 内存，Node.js 应用可能超限。

**解决方法**：
PM2 配置已设置 `max_memory_restart: '700M'`，超限会自动重启。如果频繁重启：

```bash
# 查看内存使用
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'free -h'

# 查看 PM2 重启次数
ssh -i ~/.ssh/nest-aws-ec2-key.pem ec2-user@$EC2_HOST 'pm2 status'
```

如果 `restart` 列数字很高（如 >10），考虑：
1. 优化代码减少内存使用
2. 升级到 t4g.small (2GB RAM)

### 问题 6：部署脚本执行失败

**错误**：
```
rsync: command not found
```

**原因**：
本地机器未安装 rsync。

**解决方法**：

```bash
# macOS
brew install rsync

# Ubuntu/Debian
sudo apt-get install rsync

# Windows (WSL)
sudo apt-get install rsync
```

---

## EC2 vs Lambda 对比

| 特性 | Lambda (Serverless) | EC2 + PM2 |
|------|---------------------|-----------|
| **冷启动** | 1-3 秒（首次请求）| 无（持续运行）|
| **并发处理** | 自动扩展（最多 1000 并发）| 单进程（受限于 1 vCPU）|
| **成本模式** | 按请求计费（$0.20/百万请求）| 固定月费（$5）|
| **适用场景** | 间歇性流量、事件驱动 | 持续流量、WebSocket |
| **运维复杂度** | 无需管理服务器 | 需要 SSH、监控、日志 |
| **数据库连接** | 每次调用重连（有连接池）| 持久连接（更高效）|
| **部署方式** | `sam deploy`（自动化）| 脚本 rsync（手动）|
| **扩展性** | 水平自动扩展 | 手动增加实例或升级类型 |
| **日志** | CloudWatch Logs | PM2 日志 + Nginx 日志 |

**建议**：
- **学习项目**：两种都部署，对比学习
- **生产环境**：
  - 流量 < 1000 请求/天：Lambda（成本更低）
  - 流量 > 10000 请求/天：EC2（成本更低）
  - 需要 WebSocket：EC2（Lambda 不适合）

---

## 成本分析

### EC2 部署月成本

| 资源 | 规格 | 月成本 |
|------|------|--------|
| EC2 实例 | t4g.micro (1 vCPU, 1 GB) | $3.01 |
| EBS 存储 | 8 GB gp3 | $0.64 |
| 数据传输 | 出站 10 GB/月 | $0.90 |
| **总计** | | **$4.55** |

**AWS 免费套餐**（新账户首 12 个月）：
- ✅ 750 小时/月 t2.micro 或 t3.micro 免费
- ⚠️ **t4g.micro 不在免费套餐内**（但比 t3.micro 便宜 20%）

如果你的账户在免费套餐期内，可以使用 **t3.micro** 实例（x86_64 架构），月成本为 $0。

### Lambda 部署月成本（对比）

假设每天 1000 个请求：
- Lambda 调用：1000 × 30 = 30,000 次/月
- Lambda 成本：30,000 × $0.0000002 = $0.006
- API Gateway 成本：30,000 × $0.0000035 = $0.105
- **总计**：**$0.11/月**

**结论**：
- 低流量（< 10,000 请求/天）：Lambda 更便宜
- 中高流量（> 10,000 请求/天）：EC2 更便宜
- 持续流量应用：EC2 更稳定（无冷启动）

---

## 清理资源（学习完成后）

### 删除 EC2 实例

1. 打开 [EC2 控制台](https://console.aws.amazon.com/ec2/)
2. 选择 `nest-aws-ec2` 实例
3. **Instance state** → **Terminate instance**
4. 确认删除

### 删除安全组

1. EC2 控制台 → Security Groups
2. 选择 `nest-aws-ec2-sg`
3. **Actions** → **Delete security group**

**注意**：必须先删除 EC2 实例，才能删除安全组。

### 删除 Aurora 入站规则

1. 打开 Aurora 安全组
2. 删除允许 `nest-aws-ec2-sg` 访问的入站规则

### 删除密钥对（可选）

```bash
rm ~/.ssh/nest-aws-ec2-key.pem
```

在 AWS 控制台：
1. EC2 → Key Pairs
2. 选择 `nest-aws-ec2-key`
3. **Actions** → **Delete**

---

## 总结

恭喜！你已经完成了：
- ✅ 在 EC2 上部署 Nest.js 应用
- ✅ 使用 PM2 进行进程管理
- ✅ 使用 Nginx 作为反向代理
- ✅ 理解传统运维部署流程
- ✅ 对比 Lambda 和 EC2 的差异

**下一步**：
- 继续 Phase 10：前端开发（React + Vite）
- 或保留 EC2 部署，继续优化和监控

**参考资料**：
- [PM2 官方文档](https://pm2.keymetrics.io/docs/)
- [Nginx 官方文档](https://nginx.org/en/docs/)
- [AWS EC2 用户指南](https://docs.aws.amazon.com/ec2/)
- [Amazon Linux 2023 文档](https://docs.aws.amazon.com/linux/al2023/)
