import EditorJS from '@editorjs/editorjs';
import Header from '@editorjs/header';
import List from '@editorjs/list';
import Image from '@editorjs/image';

export class EditorAdapter {
  /**
   * @type {EditorJS}
   */
  #editorInstance = null;

  #containerId = null;
  #imageStore = null;
  #isReadOnly = false;

  constructor(containerId, imageStore) {
    this.#containerId = containerId;
    this.#imageStore = imageStore;
  }

  async init() {
    return new Promise((resolve, _) => {
      this.#editorInstance = new EditorJS({
        minHeight: 300,
        autofocus: false,
        inlineToolbar: false,
        hideToolbar: true,
        placeholder: 'Start typing...',
        holder: this.#containerId,
        readOnly: false,
        tools: {
          header: {
            class: Header,
          },
          list: {
            class: List,
          },
          image: {
            class: Image,
            config: {
              uploader: {
                uploadByFile: async file => {
                  const imageId = await this.#imageStore.add(file);
                  const objectURL = URL.createObjectURL(file);

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
        onReady: () => resolve(),
      });
    });
  }

  async setData(data) {
    if (!data) {
      await this.#editorInstance.blocks.clear();
      return;
    }

    await Promise.all(
      data.blocks.map(async block => {
        if (block.type === 'image' && block?.data?.file?.key) {
          const blobKey = block.data.file.key;
          const blob = await this.#imageStore.get(blobKey);
          block.data.file.url = URL.createObjectURL(blob);
        }
      }),
    );

    await this.#editorInstance.render(data);
  }

  async getData() {
    return await this.#editorInstance.save();
  }

  async isEmpty() {
    const data = await this.getData();
    return data.blocks.length === 0;
  }

  async setReadOnly(flag) {
    if (this.#isReadOnly === flag) return;
    this.#isReadOnly = flag;
    await this.#editorInstance.readOnly.toggle();
  }
}

export class CardEditor {
  /**
   * @type {EditorAdapter}
   */
  #questionEditor = null;
  /**
   * @type {EditorAdapter}
   */
  #answerEditor = null;

  #cardStore = null;
  #imageStore = null;
  #card = null;
  #onChange = null;

  // DOM
  #containerEl = null;
  #questionEditorEl = null;
  #answerEditorEl = null;
  #tagsEl = null;
  #addBtnEl = null;
  #saveBtnEl = null;
  #btnRowEl = null;

  constructor(cardStore, imageStore, onChange = () => {}) {
    this.#cardStore = cardStore;
    this.#imageStore = imageStore;
    this.#onChange = onChange;
  }

  async init(cardId) {
    this.#buildCardUI();

    this.#questionEditor = new EditorAdapter('questionEditor', this.#imageStore);
    this.#answerEditor = new EditorAdapter('answerEditor', this.#imageStore);

    await this.#questionEditor.init();
    await this.#answerEditor.init();

    if (cardId) {
      await this.loadCardById(cardId);
    }
  }

  #buildCardUI() {
    this.#containerEl = document.getElementById('cardEditor');
    this.#questionEditorEl = document.getElementById('questionEditor');
    this.#answerEditorEl = document.getElementById('answerEditor');
    this.#tagsEl = document.getElementById('tags');
    this.#addBtnEl = document.getElementById('addBtn');
    this.#addBtnEl.addEventListener('click', async () => {
      await this.add();
    });
    this.#saveBtnEl = document.getElementById('saveBtn');
    this.#saveBtnEl.addEventListener('click', async () => {
      await this.save();
    });
    this.#saveBtnEl.classList.add('d-none');
    const clearBtn = document.getElementById('clearBtn');
    clearBtn.addEventListener('click', async () => {
      await this.clear();
    });
    const deleteBtn = document.getElementById('deleteBtn');
    deleteBtn.addEventListener('click', async () => {
      await this.deleteCard();
    });
    this.#btnRowEl = document.getElementById('btnRow');

    // TODO:
    // const xs = document.querySelectorAll('.editor-container');
    // for (const x of xs) {
    //   x.addEventListener('mouseenter', async () => {
    //     console.log('Mouse enter');
    //     this.#questionEditor.setReadOnly(false);
    //   });

    //   x.addEventListener('mouseleave', async () => {
    //     console.log('Mouse leave');
    //     this.#questionEditor.setReadOnly(true);
    //   });
    // }
  }

  async loadCardById(cardId) {
    this.#card = await this.#cardStore.get(cardId);
    if (!this.#card) {
      throw new Error(`Card with ID ${cardId} not found`);
    }

    console.log('Loaded card:', this.#card);

    await this.#questionEditor.setData(this.#card.question);
    await this.#answerEditor.setData(this.#card.answer);

    this.#tagsEl.value = this.#card.tags.join(',');
    this.#addBtnEl.classList.add('d-none');
    this.#saveBtnEl.classList.remove('d-none');
  }

  async add() {
    const isQuestionDataEmpty = await this.#questionEditor.isEmpty();
    const isAnswerDataEmpty = await this.#answerEditor.isEmpty();

    if (isQuestionDataEmpty || isAnswerDataEmpty) {
      alert('Question and answer cannot be empty');
      return;
    }

    const questionData = await this.#questionEditor.getData();
    const answerData = await this.#answerEditor.getData();
    const tags = this.#tagsEl.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    const newCard = {
      tags,
      question: questionData,
      answer: answerData,
    };

    const savedKey = await this.#cardStore.add(newCard);
    this.#card = { ...newCard, id: savedKey };

    await this.clear();
    await this.#onChange('add');

    return this.#card;
  }

  async save() {
    if (!this.#card) {
      this.#card = {};
    }

    const isQuestionDataEmpty = await this.#questionEditor.isEmpty();
    const isAnswerDataEmpty = await this.#answerEditor.isEmpty();

    if (isQuestionDataEmpty || isAnswerDataEmpty) {
      alert('Question and answer cannot be empty');
      return;
    }

    const questionData = await this.#questionEditor.getData();
    const answerData = await this.#answerEditor.getData();
    const tags = this.#tagsEl.value
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    let updatedCard = {
      ...this.#card,
      tags,
      question: questionData,
      answer: answerData,
    };

    const savedKey = await this.#cardStore.put(updatedCard);
    updatedCard = { ...updatedCard, id: savedKey };

    await this.clear();
    await this.#onChange('save');

    return updatedCard;
  }

  async clear() {
    this.#card = null;
    await this.#questionEditor.setData(null);
    await this.#answerEditor.setData(null);
    this.#tagsEl.value = '';
    this.#addBtnEl.classList.remove('d-none');
    this.#saveBtnEl.classList.add('d-none');

    await this.#onChange('clear');
  }

  async deleteCard() {
    if (!this.#card?.id) return;

    await this.#cardStore.delete(this.#card.id);
    await this.clear();

    await this.#onChange('delete');
  }

  async renderCardContent({
    showQuestion = true,
    showAnswer = true,
    showTags = true,
    showEditButtons = true,
    readOnly = false,
  } = {}) {
    await this.#questionEditor.setReadOnly(readOnly);
    await this.#answerEditor.setReadOnly(readOnly);

    this.#questionEditorEl.classList[showQuestion ? 'remove' : 'add']('d-none');
    this.#answerEditorEl.classList[showAnswer ? 'remove' : 'add']('d-none');
    this.#tagsEl.classList[showTags ? 'remove' : 'add']('d-none');
    this.#btnRowEl.classList[showEditButtons ? 'remove' : 'add']('d-none');
  }
}
