import { Component } from './component';
import type { Database } from '../database';
import type { Router } from '../router';
import type { ZipManager } from '../zip-manager';

interface PageProps {
  router: Router;
  database: Database;
  zip: ZipManager;
}

export abstract class Page extends Component<PageProps> {}
