import type { Page } from './components/page';

export class Router {
  private readonly routes: Record<string, () => Page> = {};
  private currentPage: Page | null = null;

  public constructor() {
    window.addEventListener('popstate', async () => await this.handleLocation());
  }

  public register(path: string, createPage: () => Page) {
    this.routes[path] = createPage;
    return this;
  }

  public async init() {
    await this.handleLocation();
  }

  private async handleLocation() {
    let path = window.location.pathname;
    let createPage = this.routes[path];

    if (!createPage) {
      const fallback = this.routes['/']!;
      history.replaceState(null, '', '/');
      path = '/';
      createPage = fallback;
    }

    if (this.currentPage) {
      await this.currentPage.clear();
    }

    this.currentPage = createPage();
    await this.currentPage.draw();
  }

  public async navigate(path: string) {
    history.pushState(null, '', path);
    await this.handleLocation();
  }
}
