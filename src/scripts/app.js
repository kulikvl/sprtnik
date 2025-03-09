export class Flashcard {
  constructor({ question = '', answer = '', tags = [], questionImages = [], answerImages = [] }) {
    this.question = question;
    this.answer = answer;
    this.tags = tags;
    this.questionImages = questionImages;
    this.answerImages = answerImages;
    this.createdAt = Date.now();
  }
}

export class LearningProgressService {
  static #STORAGE_KEY = 'learningProgress';

  static getLearningProgress() {
    const rawData = localStorage.getItem(LearningProgressService.#STORAGE_KEY);
    if (rawData) {
      return JSON.parse(rawData);
    }
    const defaultData = {
      allCardIds: [],
      queueCardIds: [],
    };
    localStorage.setItem(LearningProgressService.#STORAGE_KEY, JSON.stringify(defaultData));
    return defaultData;
  }

  static saveLearningProgress(data) {
    localStorage.setItem(LearningProgressService.#STORAGE_KEY, JSON.stringify(data));
  }

  static getQueueCardIds() {
    return this.getLearningProgress().queueCardIds;
  }

  static addToQueue(cardId) {
    const progress = this.getLearningProgress();
    if (!progress.queueCardIds.some(id => id === cardId)) {
      progress.queueCardIds.push(cardId);
      this.saveLearningProgress(progress);
    }
  }

  static addToFront(cardId) {
    const progress = this.getLearningProgress();
    if (!progress.queueCardIds.some(id => id === cardId)) {
      progress.queueCardIds.unshift(cardId);
      this.saveLearningProgress(progress);
    }
  }

  static removeFirstFromQueue() {
    const progress = this.getLearningProgress();
    const removedCardId = progress.queueCardIds.shift();
    this.saveLearningProgress(progress);
    return removedCardId;
  }

  static getStats() {
    const progress = this.getLearningProgress();
    return {
      total: progress.allCardIds.length,
      remaining: progress.queueCardIds.length,
    };
  }
}
