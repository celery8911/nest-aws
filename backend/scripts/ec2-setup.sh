#!/bin/bash
# EC2 初始化脚本
# 用途：安装 Node.js、PM2、Nginx 等基础环境
# 使用：在 EC2 实例上首次运行
#
# 执行方式：
#   chmod +x ec2-setup.sh
#   ./ec2-setup.sh

set -e  # 遇到错误立即退出

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
node --version
npm --version

# 安装 PM2（全局）
echo "[3/6] 安装 PM2..."
sudo npm install -g pm2

# 配置 PM2 开机自启
echo "[4/6] 配置 PM2 开机自启..."
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 安装 Nginx
echo "[5/6] 安装 Nginx..."
sudo dnf install -y nginx

# 启动 Nginx 并设置开机自启
sudo systemctl start nginx
sudo systemctl enable nginx

# 安装 Git（可选，用于从仓库拉取代码）
echo "[6/6] 安装 Git..."
sudo dnf install -y git

echo "=========================================="
echo "EC2 环境初始化完成！"
echo "=========================================="
echo "已安装："
echo "  - Node.js $(node --version)"
echo "  - npm $(npm --version)"
echo "  - PM2 $(pm2 --version)"
echo "  - Nginx $(nginx -v 2>&1)"
echo "  - Git $(git --version)"
echo ""
echo "下一步："
echo "  1. 上传应用代码到 /home/ec2-user/nest-aws"
echo "  2. 配置环境变量"
echo "  3. 运行部署脚本"
