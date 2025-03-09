import * as db from './db';
import { LearningProgressService } from './app';

console.log('learn.js')

const mainContainer = document.getElementById('mainContainer');
const cardContainer = document.getElementById('cardContainer');
const remainingCountEl = document.getElementById('remainingCount');
const questionArea = document.getElementById('questionArea');
const answerArea = document.getElementById('answerArea');
const imageArea = document.getElementById('imageArea');
const showAnswerBtn = document.getElementById('showAnswerBtn');
const easyBtn = document.getElementById('easyBtn');
const goodBtn = document.getElementById('goodBtn');
const againBtn = document.getElementById('againBtn');
const completedMessage = document.getElementById('completedMessage');

let currentCard = null;

function updateStats() {
  const stats = LearningProgressService.getStats();
  remainingCountEl.textContent = `${stats.remaining} / ${stats.total}`;
}

async function loadNextCard() {
  const queueIds = LearningProgressService.getQueueCardIds();

  if (queueIds.length === 0) {
    cardContainer.style.display = 'none';
    // questionArea.textContent = '';
    // answerArea.textContent = '';
    // imageArea.style.display = 'none';

    // showAnswerBtn.style.display = 'none';
    // easyBtn.style.display = 'none';
    // goodBtn.style.display = 'none';
    // againBtn.style.display = 'none';

    completedMessage.style.display = 'block';
    return;
  }

  answerArea.style.display = 'none';
  answerArea.textContent = '';
  imageArea.style.display = 'none';

  showAnswerBtn.style.display = 'inline-block';
  easyBtn.style.display = 'none';
  goodBtn.style.display = 'none';
  againBtn.style.display = 'none';

  currentCard = await db.getOneFlashcard(queueIds[0]);

  questionArea.textContent = currentCard.question ?? 'No question found';

  // if (currentCardData.imageBase64) {
  //   imageArea.src = currentCardData.imageBase64;
  //   imageArea.style.display = 'block';
  // }
}

function showAnswer() {
  if (!currentCard) return;

  answerArea.textContent = currentCard.answer ?? 'No answer found';
  answerArea.style.display = 'block';

  showAnswerBtn.style.display = 'none';
  easyBtn.style.display = 'inline-block';
  goodBtn.style.display = 'inline-block';
  againBtn.style.display = 'inline-block';
}

async function markEasy() {
  LearningProgressService.removeFirstFromQueue();
  updateStats();
  await loadNextCard();
}

async function markGood() {
  const removedCardId = LearningProgressService.removeFirstFromQueue();
  LearningProgressService.addToQueue(removedCardId);
  await loadNextCard();
}

async function markAgain() {
  await loadNextCard();
}

showAnswerBtn.addEventListener('click', showAnswer);
easyBtn.addEventListener('click', markEasy);
goodBtn.addEventListener('click', markGood);
againBtn.addEventListener('click', markAgain);

await db.initDB();
await loadNextCard();
updateStats();

mainContainer.style.display = 'block';
