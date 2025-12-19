// esbuild 配置：打包 Lambda 函数
const esbuild = require('esbuild');

esbuild.build({
  entryPoints: ['dist/lambda.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'bundle/lambda.js',
  external: [
    // Prisma Client (必需，由 Layer 提供)
    '@prisma/client',
    '.prisma/client',
    // NestJS 可选依赖（不需要）
    'class-transformer',
    'class-validator',
    '@nestjs/microservices',
    '@nestjs/websockets',
    '@nestjs/platform-socket.io',
    'cache-manager',
  ],
  minify: true,
  sourcemap: false,
}).then(() => {
  console.log('✅ Bundle created successfully');
}).catch(() => process.exit(1));
