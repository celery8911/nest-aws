# Makefile for SAM build with esbuild
# 使用 esbuild 打包，Layer 只包含 Prisma Client

build-NestFunction:
	# 使用 esbuild 打包 Lambda 函数
	mkdir -p bundle
	node esbuild.js
	# 复制打包后的文件到 ARTIFACTS_DIR
	mkdir -p $(ARTIFACTS_DIR)
	cp -r bundle/* $(ARTIFACTS_DIR)/
	cp package.json $(ARTIFACTS_DIR)/
	# 不需要 dist/ 和 node_modules，已经打包

build-NodeModulesLayer:
	# Layer 只包含 Prisma Client（唯一的 external 依赖）
	mkdir -p $(ARTIFACTS_DIR)/nodejs
	# 创建最小化的 package.json（只包含 @prisma/client + prisma CLI 用于生成）
	echo '{"name":"layer","version":"1.0.0","dependencies":{"@prisma/client":"^5.8.0"},"devDependencies":{"prisma":"^5.8.0"}}' > $(ARTIFACTS_DIR)/nodejs/package.json
	# 安装 @prisma/client 和 prisma CLI
	cd $(ARTIFACTS_DIR)/nodejs && npm install
	# 复制 prisma schema 到 nodejs/ 目录用于生成
	cp -r prisma $(ARTIFACTS_DIR)/nodejs/
	# 生成 Prisma Client
	cd $(ARTIFACTS_DIR)/nodejs && npx prisma generate
	# 删除 prisma CLI 和所有 devDependencies（只保留 @prisma/client）
	cd $(ARTIFACTS_DIR)/nodejs && npm prune --production
	# 生成后删除 prisma 目录（runtime 不需要 schema 文件）
	rm -rf $(ARTIFACTS_DIR)/nodejs/prisma
	# 删除不需要的平台二进制文件（只保留 Linux ARM64）
	find $(ARTIFACTS_DIR)/nodejs/node_modules/.prisma/client -name "*.dylib.node" -delete
	find $(ARTIFACTS_DIR)/nodejs/node_modules/.prisma/client -name "*darwin*" -delete
