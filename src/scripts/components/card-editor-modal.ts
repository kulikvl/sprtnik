import type { Card } from '../database';
import { Utils } from '../utils';
import { CardEditor } from './card-editor';
import { Component } from './component';

const template = document.createElement('template');
template.innerHTML = `
  <div id="card-editor-modal">
    <div id="card-editor-modal-content">
      <header>
        <button id="card-editor-modal-close-btn" class="icon-button">
          <img src="icons/cancel.svg" />
        </button>
        <h2 id="card-editor-modal-title">Edit card</h2>
        <div>
          <button id="card-editor-modal-delete-btn" class="icon-button">
            <img src="icons/delete.svg" />
          </button>
          <button id="card-editor-modal-save-btn" class="icon-button">
            <img src="icons/save.svg" />
          </button>
        </div>
      </header>
      <section id="card-editor-container"></section>
      <footer>
        <div id="card-editor-modal-tag-container">
          <div id="card-editor-modal-tag-list"></div>
          <input type="text" id="card-editor-modal-tag-input" placeholder="Tags here" />
        </div>
      </footer>
    </div>
  </div>
`;

interface CardEditorModalProps {
  onImageGet: (id: number) => Promise<Blob>;
  onImageUpload: (image: Blob) => Promise<number>;
  onCardCreate: (card: Card) => Promise<number>;
  onCardUpdate: (card: Card) => Promise<number>;
  onCardDelete: (id: number) => Promise<void>;
}

export class CardEditorModal extends Component<CardEditorModalProps> {
  private cardEditor: CardEditor | null = null;

  private card: Card | null = null;
  private tags: string[] = [];

  private cardEditorEl!: HTMLElement;
  private titleEl!: HTMLElement;
  private tagListEl!: HTMLElement;
  private tagInputEl!: HTMLInputElement;
  private saveBtnEl!: HTMLButtonElement;
  private deleteBtnEl!: HTMLButtonElement;
  private closeBtnEl!: HTMLButtonElement;

  public async open(card: Card | null) {
    this.card = card;
    this.tags = card ? [...card.tags] : [];

    this.cardEditor = new CardEditor(this.cardEditorEl, {
      card,
      onImageGet: this.props.onImageGet,
      onImageUpload: this.props.onImageUpload,
    });

    await this.cardEditor.draw();

    this.renderTags();

    this.titleEl.textContent = card ? 'Edit Card' : 'Create Card';

    document.body.classList.add('card-editor-modal-visible');
  }

  private renderTags() {
    this.tags.forEach(tag => {
      const badge = document.createElement('span');
      badge.classList.add('tag');
      badge.textContent = tag;
      badge.style.backgroundColor = Utils.stringToColor(tag);
      this.tagListEl.appendChild(badge);
    });
  }

  public async close() {
    document.body.classList.remove('card-editor-modal-visible');
    this.cardEditor?.clear();
    this.cardEditor = null;
    this.cardEditorEl.innerHTML = '';
    this.titleEl.textContent = '';
    this.tagListEl.innerHTML = '';
    this.tagInputEl.value = '';
    this.tags = [];
    this.card = null;
  }

  public override async draw() {
    this.container.appendChild(template.content.cloneNode(true));

    this.cardEditorEl = Utils.findElementByIdOrFail('card-editor-container');
    this.titleEl = Utils.findElementByIdOrFail('card-editor-modal-title');
    this.tagListEl = Utils.findElementByIdOrFail('card-editor-modal-tag-list');
    this.tagInputEl = Utils.findElementByIdOrFail<HTMLInputElement>('card-editor-modal-tag-input');
    this.saveBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('card-editor-modal-save-btn');
    this.deleteBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>(
      'card-editor-modal-delete-btn',
    );
    this.closeBtnEl = Utils.findElementByIdOrFail<HTMLButtonElement>('card-editor-modal-close-btn');

    this.tagInputEl.addEventListener('keydown', event => {
      if (event.key === 'Enter') {
        const tagText = this.tagInputEl.value.trim();
        this.tagInputEl.value = '';
        if (!tagText) return;
        // Check for duplicate tags.
        if (Array.from(this.tagListEl.children).some(child => child.textContent === tagText)) {
          return;
        }
        const badge = document.createElement('span');
        badge.classList.add('tag');
        badge.textContent = tagText;
        badge.style.backgroundColor = Utils.stringToColor(tagText);
        this.tagListEl.appendChild(badge);
        this.tags.push(tagText);
      } else if (event.key === 'Backspace' && this.tagInputEl.value === '') {
        if (this.tagListEl.lastElementChild) {
          this.tagListEl.lastElementChild.remove();
          this.tags.pop();
        }
      }
    });

    this.saveBtnEl.addEventListener('click', async () => {
      if (!this.cardEditor) return;
      const cardEditorData = await this.cardEditor.getCardData();
      if (cardEditorData.question.blocks.length === 0 || cardEditorData.answer.blocks.length === 0)
        return;

      const cardData = {
        ...this.card,
        ...cardEditorData,
        tags: this.tags,
      };

      const isNewCard = cardData.id === undefined;

      if (isNewCard) {
        await this.props.onCardCreate(cardData as Card);
        await this.cardEditor.setCardData(null);
      } else {
        await this.props.onCardUpdate(cardData as Card);
        this.close();
      }
    });

    this.deleteBtnEl.addEventListener('click', async () => {
      if (this.card?.id !== undefined) {
        await this.props.onCardDelete(this.card.id);
      }
      this.close();
    });

    this.closeBtnEl.addEventListener('click', () => {
      this.close();
    });
  }

  public override async clear() {
    this.cardEditor?.clear();
    this.container.innerHTML = '';
  }
}
