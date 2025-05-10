import type { Card } from '../database';
import { Utils } from '../utils';
import { Component } from './component';

const itemTemplate = document.createElement('template');
itemTemplate.innerHTML = `
  <button class="card">
    <div class="card-content">
      <p class="card-question"></p>
      <p class="card-answer"></p>
    </div>
  </button>
`;

interface CardListProps {
  cards: Card[];
  onSelect: (card: Card) => void;
}

export class CardList extends Component<CardListProps> {
  public override async draw() {
    if (this.props.cards.length === 0) {
      this.container.textContent = 'No cards found.';
      return;
    }

    this.props.cards.forEach(card => {
      const item = itemTemplate.content.cloneNode(true) as DocumentFragment;

      const btnEl = item.querySelector('.card') as HTMLButtonElement;
      btnEl.addEventListener('click', () => this.props.onSelect(card));

      const questionEl = item.querySelector('.card-question') as HTMLParagraphElement;
      questionEl.textContent = Utils.getSnippet(card.question);

      const answerEl = item.querySelector('.card-answer') as HTMLParagraphElement;
      answerEl.textContent = Utils.getSnippet(card.answer);

      this.container.appendChild(item);
    });
  }

  public override async clear(): Promise<void> {
    this.container.innerHTML = '';
  }

  public async setData(cards: Card[]) {
    this.props.cards = cards;
    await this.clear();
    await this.draw();
  }
}
