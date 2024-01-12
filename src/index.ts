import { configure, getLogger } from 'log4js';
import Instance from './models/Instance';
import db from './models/db';

(async () => {
  configure({
    appenders: {
      console: { type: 'console' },
    },
    categories: {
      default: { level: 'debug', appenders: ['console'] },
    },
  });
  const log = getLogger('Main');
  process.on('unhandledRejection', error => {
    log.error('UnhandledException: ', error);
  });
  const instanceEntries = await db.instance.findMany();

  const instances = [] as Instance[];
  if (!instanceEntries.length) {
    instances.push(await Instance.start(0));
  }
  else {
    for (const instanceEntry of instanceEntries) {
      instances.push(await Instance.start(instanceEntry.id));
    }
  }

})();
