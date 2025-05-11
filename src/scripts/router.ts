import type { Page } from './components/page';

export class Router {
  private readonly routes: Record<string, () => Page> = {};
  private currentPage: Page | null = null;

  public constructor() {
    window.addEventListener('hashchange', async () => await this.handleLocation());
  }

  public register(path: string, createPage: () => Page) {
    this.routes[path] = createPage;
    return this;
  }

  public async init() {
    if (!window.location.hash) {
      window.location.hash = '/';
    } else {
      await this.handleLocation();
    }
  }

  private async handleLocation() {
    const path = window.location.hash.slice(1);

    let createPage = this.routes[path];
    if (!createPage) {
      window.location.hash = '/';
      return;
    }

    if (this.currentPage) {
      await this.currentPage.clear();
    }

    this.currentPage = createPage();
    await this.currentPage.draw();
  }

  public async navigate(path: string) {
    window.location.hash = path;
  }
}
