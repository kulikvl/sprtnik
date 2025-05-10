import { Component } from './component';
import type { Card, CardQuestionAnswerData } from '../database';
import { Editor } from '../editorjs-wrapper';
import { Utils } from '../utils';

const template = document.createElement('template');
template.innerHTML = `
  <div id="card-viewer">
    <div id="card-viewer-question"></div>
    <hr id="card-viewer-separator" class="hidden" />
    <div id="card-viewer-answer" class="hidden"></div>
  </div>
`;

interface CardViewerProps {
  card: Card;
  onImageGet: (id: number) => Promise<Blob>;
}

export class CardViewer extends Component<CardViewerProps> {
  private questionEditor!: Editor;
  private answerEditor!: Editor;

  private answerEditorEl!: HTMLElement;
  private separatorEl!: HTMLElement;

  public isFlipped = false;

  public override async draw() {
    this.container.appendChild(template.content.cloneNode(true));

    this.answerEditorEl = Utils.findElementByIdOrFail('card-viewer-answer');
    this.separatorEl = Utils.findElementByIdOrFail('card-viewer-separator');

    this.questionEditor = new Editor({
      containerId: 'card-viewer-question',
      initialData: this.props.card.question,
      readOnly: true,
      onImageGet: this.props.onImageGet,
    });

    await this.questionEditor.init();

    this.answerEditor = new Editor({
      containerId: 'card-viewer-answer',
      initialData: this.props.card.answer,
      readOnly: true,
      onImageGet: this.props.onImageGet,
    });

    await this.answerEditor.init();

    // https://github.com/codex-team/editor.js/issues/724
    document.querySelectorAll('.codex-editor__loader').forEach(element => {
      if (!(element instanceof HTMLElement)) return;
      element.style.setProperty('height', '10px', 'important');
    });
    document.querySelectorAll('.codex-editor__redactor').forEach(element => {
      if (!(element instanceof HTMLElement)) return;
      element.style.setProperty('padding-bottom', '10px', 'important');
    });
  }

  public async setCardData(cardData: CardQuestionAnswerData) {
    await this.questionEditor.setData(cardData.question);
    await this.answerEditor.setData(cardData.answer);
  }

  public override async clear() {
    this.questionEditor.destroy();
    this.answerEditor.destroy();
    this.container.innerHTML = '';
  }

  public async flip() {
    this.isFlipped = !this.isFlipped;
    this.answerEditorEl.classList.toggle('hidden');
    this.separatorEl.classList.toggle('hidden');
  }
}
