import 'dotenv/config';

import { defineConfig } from 'prisma/config';

// Prisma 7 起不再支持 `package.json#prisma`，迁移到独立配置文件。
// 当前只保留 seed 命令，其余 schema / migrations 路径走 Prisma 默认约定（prisma/）。
//
// 注意：检测到 prisma.config.ts 后，Prisma 不再自动加载 .env，
// 因此需要在这里显式 `import 'dotenv/config'`，否则 schema.prisma 里
// `env("DATABASE_URL")` 会因为找不到变量而报 P1012。
export default defineConfig({
  migrations: {
    seed: 'tsx prisma/seed.ts',
  },
});
