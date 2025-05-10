export abstract class Component<P = {}> {
  protected readonly container: HTMLElement;
  protected readonly props: P;

  public constructor(container: HTMLElement, props: P) {
    this.container = container;
    this.props = props;
  }

  public abstract draw(): Promise<void>;
  public abstract clear(): Promise<void>;
}
