#!/bin/bash
# EC2 快速更新脚本
# 用途：快速更新代码并重启应用（无需重新安装依赖）
# 使用：在本地开发机器上运行
#
# 使用方式：
#   export EC2_HOST="<EC2_PUBLIC_IP>"
#   export SSH_KEY="$HOME/.ssh/nest-aws-ec2-key.pem"
#   chmod +x update-ec2.sh
#   ./update-ec2.sh

set -e

# 配置
EC2_HOST="${EC2_HOST:-54.199.89.29}"
SSH_KEY="${SSH_KEY:-$HOME/.ssh/nest-aws-ec2-key.pem}"
SSH_USER="ec2-user"
REMOTE_DIR="/home/ec2-user/nest-aws"
LOCAL_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "=========================================="
echo "EC2 快速更新"
echo "=========================================="
echo "目标主机: $EC2_HOST"
echo ""

# 同步代码
echo "[1/4] 同步代码..."
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
echo "✓ 代码同步完成"

# 重新编译
echo "[2/4] 重新编译..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" << 'ENDSSH'
cd /home/ec2-user/nest-aws/backend
npm run build
echo "✓ 编译完成"
ENDSSH

# 重启 PM2
echo "[3/4] 重启应用..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "pm2 restart nest-aws"
echo "✓ 应用已重启"

# 显示状态
echo "[4/4] 检查状态..."
ssh -i "$SSH_KEY" "$SSH_USER@$EC2_HOST" "pm2 status && pm2 logs nest-aws --lines 20 --nostream"

echo ""
echo "=========================================="
echo "✅ 更新完成！"
echo "=========================================="
echo "应用地址: http://$EC2_HOST"
