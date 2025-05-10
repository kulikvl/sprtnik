import { CardEditorModal } from './card-editor-modal';
import { CardList } from './card-list';
import type { Card } from '../database';
import { Page } from './page';
import { TagList } from './tag-list';
import { Utils } from '../utils';
import { learningProgressStore } from '../learning-progress-store';

const template = document.createElement('template');
template.innerHTML = `
  <div id="card-editor-modal-container"></div>
  <div id="main-page-container">
    <nav>
      <input type="file" id="import-input" accept=".zip" class="hidden" />
      <button id="import-btn" class="icon-button">
        <img src="icons/import.svg" />
      </button>
      <button id="export-btn" class="icon-button">
        <img src="icons/export.svg" />
      </button>
      <button id="add-card-btn" class="icon-button">
        <img src="icons/add.svg" />
      </button>
      <button id="learn-btn" class="icon-button">
        <img src="icons/learn.svg" />
      </button>
    </nav>
    <section id="tag-list"></section>
    <section id="card-list"></section>
  </div>
`;

export class MainPage extends Page {
  private tagList!: TagList;
  private cardList!: CardList;
  private cardEditorModal!: CardEditorModal;

  private allTags: string[] = [];
  private allCards: Card[] = [];
  private selectedTags: string[] = [];

  private get filteredCards(): Card[] {
    return this.allCards.filter(card => this.selectedTags.every(tag => card.tags.includes(tag)));
  }

  public override async draw() {
    this.container.appendChild(template.content.cloneNode(true));

    await this.loadData();

    this.cardEditorModal = new CardEditorModal(
      Utils.findElementByIdOrFail('card-editor-modal-container'),
      {
        onImageGet: async id => await this.props.database.images.get(id),
        onImageUpload: async image => {
          const id = await this.props.database.images.add(image);
          await this.reloadAndRefresh();
          return id;
        },
        onCardCreate: async card => {
          const id = await this.props.database.cards.add(card);
          await this.reloadAndRefresh();
          return id;
        },
        onCardUpdate: async card => {
          const id = await this.props.database.cards.put(card);
          await this.reloadAndRefresh();
          return id;
        },
        onCardDelete: async id => {
          await this.props.database.cards.delete(id);
          await this.reloadAndRefresh();
        },
      },
    );
    await this.cardEditorModal.draw();

    this.tagList = new TagList(Utils.findElementByIdOrFail('tag-list'), {
      onToggle: async tag => await this.toggleTag(tag),
      allTags: this.allTags,
      selectedTags: this.selectedTags,
    });
    await this.tagList.draw();

    this.cardList = new CardList(Utils.findElementByIdOrFail('card-list'), {
      onSelect: async card => await this.cardEditorModal.open(card),
      cards: this.allCards,
    });
    await this.cardList.draw();

    const importInputEl = Utils.findElementByIdOrFail<HTMLInputElement>('import-input');
    const importBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('import-btn');

    importInputEl.addEventListener('change', async event => {
      const input = event.target as HTMLInputElement;
      const file = input.files?.[0];
      if (!file) return;
      await this.props.zip.importData(file);
      await this.reloadAndRefresh();
    });

    importBtnEl.addEventListener('click', () => {
      importInputEl.click();
    });

    const exportBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('export-btn');

    exportBtnEl.addEventListener('click', async () => {
      const blob = await this.props.zip.exportData();
      Utils.downloadBlob(blob, 'sprtnik.zip');
    });

    const addCardBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('add-card-btn');

    addCardBtnEl.addEventListener('click', async () => {
      await this.cardEditorModal.open(null);
    });

    const learnBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('learn-btn');

    learnBtnEl.addEventListener('click', async () => {
      const allCards = await this.props.database.cards.getAll();
      const filteredCardIds = allCards
        .filter(card => this.selectedTags.every(tag => card.tags?.includes(tag)))
        .map(card => card.id);
      learningProgressStore.reset(filteredCardIds);
      await this.props.router.navigate('/learn');
    });
  }

  private async toggleTag(tag: string) {
    const idx = this.selectedTags.indexOf(tag);
    if (idx >= 0) this.selectedTags.splice(idx, 1);
    else this.selectedTags.push(tag);
    await this.reloadAndRefresh();
  }

  private async loadData() {
    this.allTags = await this.props.database.cards.getAllTags();
    this.allCards = await this.props.database.cards.getAll();
  }

  private async reloadAndRefresh() {
    await this.loadData();
    await this.tagList.setData(this.allTags, this.selectedTags);
    await this.cardList.setData(this.filteredCards);
  }

  public override async clear() {
    this.cardEditorModal.clear();
    this.tagList.clear();
    this.cardList.clear();
    this.container.innerHTML = '';
  }
}
