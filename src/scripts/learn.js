import { LearningProgressService } from './learningProgress';
import { CardStore, Database, ImageStore } from './database';
import { CardViewer } from './editor';
import { Utils } from './utils';

// #region UI Functions
function updateStats() {
  const stats = LearningProgressService.getStats();

  let value = (stats.done / stats.total) * 100;
  if (value === 0) value = 3;

  state.dom.progress.bar.style.width = `${value}%`;
  state.dom.progress.doneCount.textContent = `${stats.done}`;
  state.dom.progress.allCount.textContent = `/${stats.total}`;
}

async function loadNextCard() {
  updateStats();

  const queueIds = LearningProgressService.getQueueCardIds();
  if (queueIds.length === 0) {
    if (state.cardViewer.instance) {
      state.cardViewer.instance.destroy();
      state.cardViewer.instance = null;
      state.cardViewer.card = null;
    }

    state.dom.main.classList.add('hidden');
    state.dom.footer.classList.add('hidden');

    return;
  }

  if (state.cardViewer.isFlipped) state.cardViewer.instance.flip();

  state.cardViewer.card = await state.stores.card.get(queueIds[0]);

  if (!state.cardViewer.instance) {
    state.cardViewer.instance = new CardViewer(state.stores.image);
    await state.cardViewer.instance.init(state.cardViewer.card);
  } else {
    state.cardViewer.instance.setCardData(state.cardViewer.card);
  }
}

async function flip() {
  state.cardViewer.instance.flip();
  state.cardViewer.isFlipped = !state.cardViewer.isFlipped;
}

async function markEasy() {
  LearningProgressService.removeFirstFromQueue();
  await loadNextCard();
}

async function markOk() {
  const removedCardId = LearningProgressService.removeFirstFromQueue();
  LearningProgressService.addToQueue(removedCardId);
  await loadNextCard();
}

async function markAgain() {
  await loadNextCard();
}
// #endregion

// #region DOM & Event Listener Setup
function setup() {
  const flipBtnEl = document.getElementById('flip-btn');
  const againBtnEl = document.getElementById('again-btn');
  const okBtnEl = document.getElementById('ok-btn');
  const easyBtnEl = document.getElementById('easy-btn');
  state.dom.main = document.getElementById('card-container');
  state.dom.footer = document.getElementById('footer');
  state.dom.progress.bar = document.getElementById('progress-bar');
  state.dom.progress.doneCount = document.getElementById('done-count');
  state.dom.progress.allCount = document.getElementById('all-count');

  flipBtnEl.addEventListener('click', flip);
  againBtnEl.addEventListener('click', markAgain);
  okBtnEl.addEventListener('click', markOk);
  easyBtnEl.addEventListener('click', markEasy);
}
// #endregion

// #region Application State
const state = {
  stores: {
    image: null,
    card: null,
  },
  cardViewer: {
    instance: null,
    card: null,
    isFlipped: false,
  },
  dom: {
    footer: null,
    main: null,
    progress: {
      bar: null,
      doneCount: null,
      allCount: null,
    },
  },
};
// #endregion

async function main() {
  const database = new Database();
  await database.init();

  state.stores.image = new ImageStore(database);
  state.stores.card = new CardStore(database);

  setup();
  await loadNextCard();

  Utils.hideLoadingScreen();
}

await main();
