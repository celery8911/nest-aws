#!/bin/bash
# EC2 部署脚本
# 用途：将本地代码部署到 EC2 实例
# 使用：在本地开发机器上运行
#
# 前置条件：
#   1. EC2 实例已运行 ec2-setup.sh 完成初始化
#   2. 本地已创建 backend/.env.production.local 文件
#   3. SSH 密钥已配置正确权限（chmod 400）
#
# 使用方式：
#   export EC2_HOST="<EC2_PUBLIC_IP>"
#   export SSH_KEY="$HOME/.ssh/nest-aws-ec2-key.pem"
#   chmod +x deploy-ec2.sh
#   ./deploy-ec2.sh

set -e  # 遇到错误立即退出

# ==================== 配置区域 ====================
# 请根据实际情况修改以下变量

# EC2 实例公网 IP
EC2_HOST="${EC2_HOST:-54.199.89.29}"

# SSH 密钥路径
SSH_KEY="${SSH_KEY:-$HOME/.ssh/nest-aws-ec2-key.pem}"

# SSH 用户名（Amazon Linux 2023 默认为 ec2-user）
SSH_USER="ec2-user"

# 远程部署目录
REMOTE_DIR="/home/ec2-user/nest-aws"

# 本地 backend 目录
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# ==================== 脚本开始 ====================

echo "=========================================="
echo "EC2 部署开始"
echo "=========================================="
echo "目标主机: $EC2_HOST"
echo "本地目录: $LOCAL_DIR"
echo "远程目录: $REMOTE_DIR"
echo ""

# 检查 SSH 密钥是否存在
if [ ! -f "$SSH_KEY" ]; then
    echo "错误: SSH 密钥不存在: $SSH_KEY"
    exit 1
fi

# 检查 SSH 连接
echo "[1/9] 检查 SSH 连接..."
ssh -i "$SSH_KEY" -o ConnectTimeout=5 "$SSH_USER@$EC2_HOST" "echo 'SSH 连接成功'" || {
    echo "错误: 无法连接到 EC2 实例"
    exit 1
}

# 创建远程目录
echo "[2/9] 创建远程目录..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "mkdir -p $REMOTE_DIR/backend && mkdir -p /home/ec2-user/logs"

# 同步后端代码（排除 node_modules 和 dist）
echo "[3/9] 同步后端代码..."
rsync -avz --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude '.aws-sam' \
    --exclude '.env' \
    --exclude '.env.local' \
    --exclude '.env.production.local' \
    -e "ssh -i $SSH_KEY" \
    "$LOCAL_DIR/" \
    "$SSH_USER@$EC2_HOST:$REMOTE_DIR/backend/"

# 复制环境变量文件（如果存在 .env.production.local）
echo "[4/9] 配置环境变量..."
if [ -f "$LOCAL_DIR/.env.production.local" ]; then
    scp -i "$SSH_KEY" "$LOCAL_DIR/.env.production.local" \
        "$SSH_USER@$EC2_HOST:$REMOTE_DIR/backend/.env"
    echo "✓ 已上传 .env.production.local"
else
    echo "⚠️  警告: .env.production.local 不存在"
    echo "   请在 EC2 上手动创建 $REMOTE_DIR/backend/.env 文件"
    echo "   或从 .env.production 复制并填写实际值"
fi

# 复制 Nginx 配置
echo "[5/9] 配置 Nginx..."
scp -i "$SSH_KEY" "$LOCAL_DIR/nginx/nest-aws.conf" \
    "$SSH_USER@$EC2_HOST:/tmp/nest-aws.conf"
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "sudo mv /tmp/nest-aws.conf /etc/nginx/conf.d/nest-aws.conf"
echo "✓ Nginx 配置已更新"

# 远程执行：安装依赖和构建
echo "[6/9] 安装依赖..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/nest-aws/backend
echo "  正在安装 npm 依赖..."
npm ci --production=false
echo "✓ 依赖安装完成"
ENDSSH

# 远程执行：生成 Prisma Client
echo "[7/9] 生成 Prisma Client..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/nest-aws/backend
echo "  正在生成 Prisma Client..."
npx prisma generate
echo "✓ Prisma Client 生成完成"
ENDSSH

# 远程执行：编译 TypeScript
echo "[8/9] 编译 TypeScript..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/nest-aws/backend
echo "  正在编译 TypeScript..."
npm run build
echo "✓ 编译完成"
ENDSSH

# 远程执行：启动/重启 PM2
echo "[9/9] 启动应用..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/nest-aws/backend

echo "  停止旧进程..."
pm2 stop nest-aws 2>/dev/null || true
pm2 delete nest-aws 2>/dev/null || true

echo "  启动新进程..."
pm2 start ecosystem.config.js

echo "  保存 PM2 进程列表..."
pm2 save

echo "  PM2 进程状态:"
pm2 status

echo "  测试 Nginx 配置..."
sudo nginx -t

echo "  重启 Nginx..."
sudo systemctl restart nginx

echo "✓ 应用启动完成"
ENDSSH

echo ""
echo "=========================================="
echo "🎉 部署完成！"
echo "=========================================="
echo "应用地址: http://$EC2_HOST"
echo ""
echo "验证命令："
echo "  curl http://$EC2_HOST/                 # 健康检查"
echo "  curl http://$EC2_HOST/items            # Items API"
echo "  curl http://$EC2_HOST/github/me        # GitHub API"
echo ""
echo "常用命令："
echo "  查看日志: ssh -i $SSH_KEY $SSH_USER@$EC2_HOST 'pm2 logs nest-aws'"
echo "  查看状态: ssh -i $SSH_KEY $SSH_USER@$EC2_HOST 'pm2 status'"
echo "  重启应用: ssh -i $SSH_KEY $SSH_USER@$EC2_HOST 'pm2 restart nest-aws'"
echo "  监控应用: ssh -i $SSH_KEY $SSH_USER@$EC2_HOST 'pm2 monit'"
