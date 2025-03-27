import { CardStore, Database, ImageStore } from './database';
import { CardEditor } from './editor';
import { Utils } from './utils';
import { LearningProgressService } from './learningProgress';
import { ZipDataManager } from './zipDataManager';

// #region UI Functions
/**
 * Displays the card editor modal.
 */
function showCardEditorModal() {
  state.dom.cardEditor.modal.classList.add('show');
  document.body.classList.add('modal-active');
}

/**
 * Hides the card editor modal and resets its state.
 */
function hideCardEditorModal() {
  state.dom.cardEditor.modal.classList.remove('show');
  state.dom.cardEditor.modal.dispatchEvent(new Event('modalHidden'));
  document.body.classList.remove('modal-active');
}

/**
 * Opens the card editor in a given mode ('edit' or 'add').
 */
async function openCardEditor(card, mode) {
  const cardEditor = new CardEditor(state.stores.image);
  await cardEditor.init(card, false);

  (card?.tags || []).forEach(tag => {
    const badge = document.createElement('span');
    badge.classList.add('tag');
    badge.textContent = tag;
    badge.style.backgroundColor = Utils.stringToColor(tag);
    state.dom.cardEditor.tagList.appendChild(badge);
  });

  state.cardEditor.instance = cardEditor;
  state.cardEditor.card = card;
  state.cardEditor.tags = card?.tags || [];
  state.cardEditor.mode = mode;
  state.dom.cardEditor.label.textContent = mode === 'edit' ? 'Edit card' : 'Add new card';

  showCardEditorModal();
}

/**
 * Renders the list of all cards tags.
 */
async function renderTagList() {
  state.dom.tagList.innerHTML = '';
  const tags = await state.stores.card.getAllTags();

  tags.forEach(tag => {
    const tagBtn = document.createElement('button');
    tagBtn.textContent = state.selectedTags.includes(tag) ? `${tag} ✔` : tag;
    tagBtn.classList.add('tag');
    tagBtn.style.backgroundColor = Utils.stringToColor(tag);
    tagBtn.addEventListener('click', async () => {
      if (state.selectedTags.includes(tag)) {
        state.selectedTags = state.selectedTags.filter(t => t !== tag);
        tagBtn.textContent = tag;
      } else {
        state.selectedTags.push(tag);
        tagBtn.textContent = `${tag} ✔`;
      }
      await renderCardList();
    });
    state.dom.tagList.appendChild(tagBtn);
  });
}

/**
 * Renders the list of all cards.
 */
async function renderCardList() {
  state.dom.cardList.innerHTML = '';
  let cards = await state.stores.card.getAll();

  if (state.selectedTags.length) {
    cards = cards.filter(card => state.selectedTags.every(tag => card.tags?.includes(tag)));
  }

  cards.forEach(card => {
    const questionSnippet = Utils.getQuestionSnippet(card.question);
    const answerSnippet = Utils.getQuestionSnippet(card.answer);

    const cardButton = document.createElement('button');
    cardButton.classList.add('card');

    const cardContent = document.createElement('div');
    cardContent.classList.add('card-content');

    const questionEl = document.createElement('p');
    questionEl.style.marginBottom = '0';
    questionEl.textContent = questionSnippet;

    const answerEl = document.createElement('p');
    answerEl.style.color = '#99999B';
    answerEl.style.marginTop = '0.4rem';
    answerEl.textContent = answerSnippet;

    cardContent.append(questionEl, answerEl);
    cardButton.appendChild(cardContent);
    cardButton.addEventListener('click', async () => {
      await openCardEditor(card, 'edit');
    });
    state.dom.cardList.appendChild(cardButton);
  });
}
// #endregion

// #region Event Handlers
/**
 * Handles transitioning to the learning page.
 */
async function handleLearn() {
  const allCards = await state.stores.card.getAll();
  const filteredCardIds = allCards
    .filter(card => state.selectedTags.every(tag => card.tags?.includes(tag)))
    .map(card => card.id);

  LearningProgressService.saveLearningProgress({
    allCardIds: filteredCardIds,
    queueCardIds: filteredCardIds,
  });
  window.location.assign('/learn');
}

/**
 * Handles saving the card from the editor.
 */
async function handleSaveCard() {
  const cardEditorData = await state.cardEditor.instance.getCardData();

  if (cardEditorData.question.blocks.length === 0 || cardEditorData.answer.blocks.length === 0) {
    return;
  }

  state.cardEditor.card = {
    ...state.cardEditor.card,
    ...cardEditorData,
    tags: state.cardEditor.tags,
  };

  if (state.cardEditor.mode === 'edit') {
    await state.stores.card.put(state.cardEditor.card);
    hideCardEditorModal();
  } else if (state.cardEditor.mode === 'add') {
    await state.stores.card.add(state.cardEditor.card);
    await state.cardEditor.instance.setCardData(null);
  }
  await renderCardList();
  await renderTagList();
}

/**
 * Handles deleting a card.
 */
async function handleDeleteCard() {
  if (state.cardEditor?.card?.id) {
    await state.stores.card.delete(state.cardEditor.card.id);
  }

  hideCardEditorModal();
  await renderCardList();
  await renderTagList();
}

/**
 * Handles keydown events on the tag input field for adding or removing tags.
 */
function handleTagInputKeydown(event) {
  const inputEl = state.dom.cardEditor.tagInput;
  if (event.key === 'Enter') {
    const tagText = inputEl.value.trim();
    inputEl.value = '';
    if (!tagText) return;
    // Check for duplicate tags.
    if (
      Array.from(state.dom.cardEditor.tagList.children).some(child => child.textContent === tagText)
    ) {
      return;
    }
    const badge = document.createElement('span');
    badge.classList.add('tag');
    badge.textContent = tagText;
    badge.style.backgroundColor = Utils.stringToColor(tagText);
    state.dom.cardEditor.tagList.appendChild(badge);
    state.cardEditor.tags.push(tagText);
  } else if (event.key === 'Backspace' && inputEl.value === '') {
    if (state.dom.cardEditor.tagList.lastElementChild) {
      state.dom.cardEditor.tagList.lastElementChild.remove();
      state.cardEditor.tags.pop();
    }
  }
}
// #endregion

// #region Dom & Event Listener Setup
/**
 * Sets up DOM element references.
 */
function setupDOM() {
  state.dom.cardList = document.getElementById('card-list');
  state.dom.tagList = document.getElementById('tag-list');
  state.dom.cardEditor.modal = document.getElementById('card-editor-modal');
  state.dom.cardEditor.label = document.getElementById('card-editor-modal-title');
  state.dom.cardEditor.tagList = document.getElementById('card-editor-modal-tag-list');
  state.dom.cardEditor.tagInput = document.getElementById('card-editor-modal-tag-input');

  // Clean up card editor modal when hidden.
  state.dom.cardEditor.modal.addEventListener('modalHidden', () => {
    if (state.cardEditor.instance) {
      state.cardEditor.instance.destroy();
    }
    state.dom.cardEditor.tagList.innerHTML = '';
    state.dom.cardEditor.tagInput.value = '';
    state.cardEditor.instance = null;
    state.cardEditor.card = null;
    state.cardEditor.tags = [];
    state.cardEditor.mode = null;
  });
}

/**
 * Registers event listeners for various UI elements.
 */
function setupEventListeners() {
  const exportBtn = document.getElementById('export-btn');
  const importInput = document.getElementById('import-input');
  const importBtn = document.getElementById('import-btn');
  const learnBtn = document.getElementById('learn-btn');
  const addCardBtn = document.getElementById('add-card-btn');
  const cardEditorModalSaveBtn = document.getElementById('card-editor-modal-save-btn');
  const cardEditorModalDeleteBtn = document.getElementById('card-editor-modal-delete-btn');
  const cardEditorModalCloseBtn = document.getElementById('card-editor-modal-close-btn');

  const zipDataManager = new ZipDataManager(state.stores.card, state.stores.image);

  exportBtn.addEventListener('click', async () => {
    const blob = await zipDataManager.exportData();
    Utils.downloadBlob(blob, 'sprtnik.zip');
  });

  importInput.addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    await zipDataManager.importData(file);
    await renderCardList();
    await renderTagList();
  });

  importBtn.addEventListener('click', () => {
    importInput.click();
  });

  learnBtn.addEventListener('click', handleLearn);

  addCardBtn.addEventListener('click', async () => {
    await openCardEditor(null, 'add');
  });

  cardEditorModalSaveBtn.addEventListener('click', handleSaveCard);
  cardEditorModalDeleteBtn.addEventListener('click', handleDeleteCard);
  cardEditorModalCloseBtn.addEventListener('click', hideCardEditorModal);

  state.dom.cardEditor.tagInput.addEventListener('keydown', handleTagInputKeydown);
}
// #endregion

// #region Application State
const state = {
  cardEditor: {
    instance: null,
    mode: null,
    card: null,
    tags: [],
  },
  stores: {
    image: null,
    card: null,
  },
  dom: {
    cardList: null,
    tagList: null,
    cardEditor: {
      modal: null,
      label: null,
      tagList: null,
      tagInput: null,
    },
  },
  selectedTags: [],
};
// #endregion

async function main() {
  const database = new Database();
  await database.init();

  state.stores.image = new ImageStore(database);
  state.stores.card = new CardStore(database);

  setupDOM();
  setupEventListeners();

  await renderTagList();
  await renderCardList();

  Utils.hideLoadingScreen();
}

await main();
