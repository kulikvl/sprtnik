import EditorJS from '@editorjs/editorjs';
import List from '@editorjs/list';
import Image from '@editorjs/image';

export class EditorAdapter {
  #editorInstance = null;
  #containerId = null;
  #imageStore = null;

  constructor(containerId, imageStore) {
    this.#containerId = containerId;
    this.#imageStore = imageStore;
  }

  async init(data, readOnly) {
    if (data) await this.preprocessData(data);

    return new Promise((resolve, _) => {
      this.#editorInstance = new EditorJS({
        autofocus: false,
        inlineToolbar: false,
        hideToolbar: true,
        holder: this.#containerId,
        data,
        tools: {
          list: List,
          image: {
            class: Image,
            config: {
              uploader: {
                uploadByFile: async file => {
                  const blob = new Blob([file], { type: '' });
                  const imageId = await this.#imageStore.add(blob);
                  const objectURL = URL.createObjectURL(blob);

                  return {
                    success: 1,
                    file: {
                      url: objectURL,
                      key: imageId,
                    },
                  };
                },
              },
            },
          },
        },
        onReady: async () => {
          if (readOnly) {
            this.#editorInstance.readOnly.toggle();
          }
          // https://github.com/codex-team/editor.js/issues/2405
          this.#editorInstance.ui.nodes.wrapper.classList.remove('codex-editor--narrow');
          resolve();
        },
      });
    });
  }

  async preprocessData(data) {
    return await Promise.all(
      data.blocks.map(async block => {
        if (block.type === 'image' && block.data?.file?.key) {
          const blobKey = block.data.file.key;
          const blob = await this.#imageStore.get(blobKey);
          block.data.file.url = URL.createObjectURL(blob);
        }
      }),
    );
  }

  async setData(data) {
    if (!data) {
      await this.#editorInstance.blocks.clear();
      return;
    }

    await this.preprocessData(data);
    await this.#editorInstance.render(data);
  }

  async getData() {
    return await this.#editorInstance.save();
  }

  destroy() {
    this.#editorInstance.destroy();
  }
}

export class CardEditor {
  #questionEditor = null;
  #answerEditor = null;
  #imageStore = null;

  #containerEl = null;
  #questionEditorEl = null;
  #answerEditorEl = null;

  constructor(imageStore) {
    this.#imageStore = imageStore;
  }

  async init(card, readOnly) {
    this.#buildCardUI();

    this.#questionEditor = new EditorAdapter('question-editor', this.#imageStore);
    this.#answerEditor = new EditorAdapter('answer-editor', this.#imageStore);

    await this.#questionEditor.init(card?.question, readOnly);
    await this.#answerEditor.init(card?.answer, readOnly);

    document.querySelectorAll('.codex-editor__loader').forEach(element => {
      element.style.setProperty('height', '250px', 'important');
    });
    document.querySelectorAll('.codex-editor__redactor').forEach(element => {
      element.style.setProperty('padding-bottom', '250px', 'important');
    });
  }

  #buildCardUI() {
    this.#containerEl = document.getElementById('card-editor');

    this.#questionEditorEl = document.createElement('div');
    this.#questionEditorEl.id = 'question-editor';
    this.#questionEditorEl.classList.add('editor-container');
    this.#containerEl.appendChild(this.#questionEditorEl);

    this.#answerEditorEl = document.createElement('div');
    this.#answerEditorEl.id = 'answer-editor';
    this.#answerEditorEl.classList.add('editor-container');
    this.#containerEl.appendChild(this.#answerEditorEl);
  }

  async getCardData() {
    const questionData = await this.#questionEditor.getData();
    const answerData = await this.#answerEditor.getData();

    return {
      question: questionData,
      answer: answerData,
    };
  }

  async setCardData(cardData) {
    await this.#questionEditor.setData(cardData?.question);
    await this.#answerEditor.setData(cardData?.answer);
  }

  destroy() {
    this.#questionEditor.destroy();
    this.#answerEditor.destroy();

    this.#questionEditorEl.remove();
    this.#answerEditorEl.remove();
    this.#containerEl.innerHTML = '';
  }
}

export class CardViewer {
  #questionEditor = null;
  #answerEditor = null;
  #imageStore = null;

  #containerEl = null;
  #questionEditorEl = null;
  #answerEditorEl = null;
  #separatorEl = null;

  constructor(imageStore) {
    this.#imageStore = imageStore;
  }

  async init(card) {
    this.#buildCardUI();

    this.#questionEditor = new EditorAdapter('question-viewer', this.#imageStore);
    this.#answerEditor = new EditorAdapter('answer-viewer', this.#imageStore);

    await this.#questionEditor.init(card.question, true);
    await this.#answerEditor.init(card.answer, true);

    document.querySelectorAll('.codex-editor__loader').forEach(element => {
      element.style.setProperty('height', '10px', 'important');
    });
    document.querySelectorAll('.codex-editor__redactor').forEach(element => {
      element.style.setProperty('padding-bottom', '10px', 'important');
    });
  }

  #buildCardUI() {
    this.#containerEl = document.getElementById('card-viewer');

    this.#questionEditorEl = document.createElement('div');
    this.#questionEditorEl.id = 'question-viewer';
    this.#containerEl.appendChild(this.#questionEditorEl);

    this.#separatorEl = document.createElement('hr');
    this.#separatorEl.classList.add('separator', 'hidden');
    this.#containerEl.appendChild(this.#separatorEl);

    this.#answerEditorEl = document.createElement('div');
    this.#answerEditorEl.id = 'answer-viewer';
    this.#answerEditorEl.classList.add('hidden');
    this.#containerEl.appendChild(this.#answerEditorEl);
  }

  async setCardData(cardData) {
    await this.#questionEditor.setData(cardData.question);
    await this.#answerEditor.setData(cardData.answer);
  }

  destroy() {
    this.#questionEditor.destroy();
    this.#answerEditor.destroy();

    this.#questionEditorEl.remove();
    this.#answerEditorEl.remove();
    this.#containerEl.innerHTML = '';
  }

  async flip() {
    this.#answerEditorEl.classList.toggle('hidden');
    this.#separatorEl.classList.toggle('hidden');
  }
}
