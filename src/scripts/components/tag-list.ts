import { Component } from './component';
import { Utils } from '../utils';

const itemTemplate = document.createElement('template');
itemTemplate.innerHTML = `
  <button class="tag"></button>
`;

interface TagListProps {
  allTags: string[];
  selectedTags: string[];
  onToggle: (tag: string) => void;
}

export class TagList extends Component<TagListProps> {
  public override async draw() {
    this.props.allTags.forEach(tag => {
      const item = itemTemplate.content.cloneNode(true) as DocumentFragment;

      const btnEl = item.querySelector('.tag') as HTMLButtonElement;
      btnEl.addEventListener('click', () => this.props.onToggle(tag));
      btnEl.textContent = this.props.selectedTags.includes(tag) ? `${tag} ✔` : tag;
      btnEl.style.backgroundColor = Utils.stringToColor(tag);

      this.container.appendChild(btnEl);
    });
  }

  public async setData(allTags: string[], selectedTags: string[]) {
    this.props.allTags = allTags;
    this.props.selectedTags = selectedTags;
    await this.clear();
    await this.draw();
  }

  public override async clear() {
    this.container.innerHTML = '';
  }
}
