import cron from 'node-cron';

import refreshRecordAndFavorites from '@/lib/refreshRecordAndFavorites';

/*
 * 初始化定时任务：每个小时的 02 分执行一次。
 * 若需要添加更多任务，可在此文件中继续编写。
 */

declare global {
  // 避免在开发热重载或多次导入时重复初始化
  // eslint-disable-next-line no-var
  var __moonTVCronInitialized: boolean | undefined;
}

if (!global.__moonTVCronInitialized) {
  cron.schedule(
    '2 * * * *',
    async () => {
      refreshRecordAndFavorites();
    },
    {
      timezone: 'Asia/Shanghai',
    }
  );

  global.__moonTVCronInitialized = true;
}

export {}; // 仅用于确保这是一个模块
