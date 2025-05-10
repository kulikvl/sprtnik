import { Component } from './component';
import type { Card, CardQuestionAnswerData } from '../database';
import { Editor } from '../editorjs-wrapper';

const template = document.createElement('template');
template.innerHTML = `
  <div id="card-editor">
    <div id="card-editor-question" class="editor"></div>
    <div id="card-editor-answer" class="editor"></div>
  </div>
`;

interface CardEditorProps {
  card: Card | null;
  onImageUpload: (image: Blob) => Promise<number>;
  onImageGet: (id: number) => Promise<Blob>;
}

export class CardEditor extends Component<CardEditorProps> {
  private questionEditor!: Editor;
  private answerEditor!: Editor;

  public override async draw() {
    this.container.appendChild(template.content.cloneNode(true));

    this.questionEditor = new Editor({
      containerId: 'card-editor-question',
      initialData: this.props.card?.question,
      onImageUpload: this.props.onImageUpload,
      onImageGet: this.props.onImageGet,
    });

    await this.questionEditor.init();

    this.answerEditor = new Editor({
      containerId: 'card-editor-answer',
      initialData: this.props.card?.answer,
      onImageUpload: this.props.onImageUpload,
      onImageGet: this.props.onImageGet,
    });

    await this.answerEditor.init();

    // https://github.com/codex-team/editor.js/issues/724
    document.querySelectorAll('.codex-editor__loader').forEach(element => {
      if (!(element instanceof HTMLElement)) return;
      element.style.setProperty('height', '250px', 'important');
    });
    document.querySelectorAll('.codex-editor__redactor').forEach(element => {
      if (!(element instanceof HTMLElement)) return;
      element.style.setProperty('padding-bottom', '250px', 'important');
    });
  }

  public async getCardData() {
    const questionData = await this.questionEditor.getData();
    const answerData = await this.answerEditor.getData();

    return {
      question: questionData,
      answer: answerData,
    };
  }

  public async setCardData(cardData: CardQuestionAnswerData | null) {
    await this.questionEditor.setData(cardData === null ? null : cardData.question);
    await this.answerEditor.setData(cardData === null ? null : cardData.answer);
  }

  public override async clear() {
    this.questionEditor.destroy();
    this.answerEditor.destroy();
    this.container.innerHTML = '';
  }
}
