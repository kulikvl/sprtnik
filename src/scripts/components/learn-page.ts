import { Page } from './page';
import { Utils } from '../utils';
import { CardViewer } from './card-viewer';
import { learningProgressStore } from '../learning-progress-store';

const template = document.createElement('template');
template.innerHTML = `
  <div id="learn-page-container">
    <header>
      <button id="back-btn" class="icon-button">
        <img src="icons/back.svg" />
      </button>
      <div class="learning-progress-card-counter">
        <span id="learning-progress-done-count">0</span><span id="learning-progress-all-count">/0</span>
      </div>
      <div id="learning-progress-bar-container">
        <div id="learning-progress-bar"></div>
      </div>
    </header>
    <section id="card-viewer-container"></section>
    <footer>
      <button id="flip-btn" class="icon-button">
        <img src="icons/show.svg" />
      </button>
      <div id="learning-progress-response-buttons">
        <button id="again-btn" class="icon-button">
          <img src="icons/hard.svg" />
        </button>
        <button id="ok-btn" class="icon-button">
          <img src="icons/ok.svg" />
        </button>
        <button id="easy-btn" class="icon-button">
          <img src="icons/easy.svg" />
        </button>
      </div>
    </footer>
  </div>
`;

export class LearnPage extends Page {
  private cardViewer?: CardViewer;

  private barEl!: HTMLElement;
  private doneCountEl!: HTMLElement;
  private allCountEl!: HTMLElement;

  public override async draw() {
    this.container.appendChild(template.content.cloneNode(true));

    this.barEl = Utils.findElementByIdOrFail('learning-progress-bar');
    this.doneCountEl = Utils.findElementByIdOrFail('learning-progress-done-count');
    this.allCountEl = Utils.findElementByIdOrFail('learning-progress-all-count');

    const flipBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('flip-btn');
    flipBtnEl.addEventListener('click', async () => {
      this.cardViewer?.flip();
    });

    const againBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('again-btn');
    againBtnEl.addEventListener('click', async () => {
      await this.loadNextCard();
    });

    const okBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('ok-btn');
    okBtnEl.addEventListener('click', async () => {
      const removedCardId = learningProgressStore.popNext()!;
      learningProgressStore.addToQueue(removedCardId);
      await this.loadNextCard();
    });

    const easyBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('easy-btn');
    easyBtnEl.addEventListener('click', async () => {
      learningProgressStore.popNext();
      await this.loadNextCard();
    });

    const backBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('back-btn');
    backBtnEl.addEventListener('click', async () => {
      await this.props.router.navigate('/');
    });

    await this.loadNextCard();
  }

  private updateStats() {
    const stats = learningProgressStore.getStats();
    let value = (stats.done / stats.total) * 100;
    if (value === 0) value = 3;
    this.barEl.style.width = `${value}%`;
    this.doneCountEl.textContent = `${stats.done}`;
    this.allCountEl.textContent = `/${stats.total}`;
  }

  private async loadNextCard() {
    this.updateStats();
    const queueIds = learningProgressStore.queueCardIds;

    if (queueIds.length === 0) {
      Utils.findElementByIdOrFail('card-viewer-container').classList.add('hidden');
      this.container.querySelector('footer')!.classList.add('hidden');
      return;
    }

    if (this.cardViewer && this.cardViewer.isFlipped) {
      this.cardViewer.flip();
    }

    const nextCard = await this.props.database.cards.get(queueIds[0]!);

    if (this.cardViewer) {
      this.cardViewer.setCardData(nextCard);
    } else {
      this.cardViewer = new CardViewer(Utils.findElementByIdOrFail('card-viewer-container'), {
        card: nextCard,
        onImageGet: async id => await this.props.database.images.get(id),
      });
      await this.cardViewer.draw();
    }
  }

  public override async clear() {
    await this.cardViewer?.clear();
    this.container.innerHTML = '';
  }
}
