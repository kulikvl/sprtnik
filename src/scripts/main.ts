import { Utils } from './utils.js';
import { MainPage } from './components/main-page.js';
import { LearnPage } from './components/learn-page.js';
import { Database } from './database.js';
import { ZipManager } from './zip-manager.js';
import { Router } from './router.js';

async function main() {
  const appEl = Utils.findElementByIdOrFail('app');
  const database = await new Database().open();
  const zip = new ZipManager(database);
  const router = new Router();
  const pageProps = { router, database, zip };
  router
    .register('/', () => new MainPage(appEl, pageProps))
    .register('/learn', () => new LearnPage(appEl, pageProps));
  await router.init();
}

await main();
