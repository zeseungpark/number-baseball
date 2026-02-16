class NumberBaseball {
    constructor() {
        this.targetNumbers = [];
        this.currentAttempts = 0;
        this.maxAttempts = 20;
        this.currentInput = [];
        this.history = [];
        this.isGameOver = false;

        // Game Settings
        this.hintCost = 50;
        this.winReward = 100;
        this.initialPoints = 50;

        // Villain attack settings (fixed count per game)
        this.villainAttackMin = 0;
        this.villainAttackMax = 1;
        this.villainAttackTurns = []; // Which turns the attacks happen

        // Load saved points from cookie, or use initial points
        this.points = this.loadPoints();

        // DOM Elements
        this.elements = {
            inputDisplay: document.getElementById('input-display'),
            digitBoxes: document.querySelectorAll('.digit-box'),
            keys: document.querySelectorAll('.key'),
            historyList: document.getElementById('history-list'),
            attemptsLeft: document.getElementById('attempts-left'),
            lastResult: document.getElementById('last-result'),
            currentPoints: document.getElementById('current-points'),
            hintBtn: document.getElementById('hint-btn'),
            eventNotification: document.getElementById('event-notification'),
            eventMessage: document.getElementById('event-message'),
            notifCloseBtn: document.getElementById('notif-close-btn'),
            hintModal: document.getElementById('hint-modal'),
            hintMessage: document.getElementById('hint-message'),
            closeHintBtn: document.getElementById('close-hint-btn'),
            rulesBtn: document.getElementById('rules-btn'),
            rulesModal: document.getElementById('rules-modal'),
            endModal: document.getElementById('end-modal'),
            endTitle: document.getElementById('end-title'),
            endMessage: document.getElementById('end-message'),
            restartBtn: document.getElementById('restart-btn'),
            closeBtn: document.querySelector('.close-btn'),
            // History toggle (mobile)
            historyPanel: document.getElementById('history-panel'),
            historyToggleBtn: document.getElementById('history-toggle-btn'),
            historyCloseBtn: document.getElementById('history-close-btn'),
            historyCount: document.getElementById('history-count'),
            // Difficulty
            difficultyModal: document.getElementById('difficulty-modal'),
            difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        };

        this.init();
    }

    // ─── Initialization ───────────────────────────────

    init() {
        this.bindEvents();
        // Display loaded points
        this.elements.currentPoints.textContent = this.points;
        this.updateHintButton();
        // Show difficulty selection on load
        this.showDifficultyModal();
    }

    showDifficultyModal() {
        this.elements.difficultyModal.classList.remove('hidden');
    }

    selectDifficulty(min, max) {
        this.villainAttackMin = min;
        this.villainAttackMax = max;
        this.elements.difficultyModal.classList.add('hidden');
        this.startNewGame();
    }

    // Pick random turns for villain attacks
    scheduleVillainAttacks() {
        const count = this.villainAttackMin +
            Math.floor(Math.random() * (this.villainAttackMax - this.villainAttackMin + 1));

        // Pick random unique turns (from turn 2 onwards, so first turn is always safe)
        const possibleTurns = [];
        for (let i = 2; i <= this.maxAttempts; i++) {
            possibleTurns.push(i);
        }

        // Shuffle and pick
        this.villainAttackTurns = [];
        for (let i = 0; i < count && possibleTurns.length > 0; i++) {
            const idx = Math.floor(Math.random() * possibleTurns.length);
            this.villainAttackTurns.push(possibleTurns[idx]);
            possibleTurns.splice(idx, 1);
        }

        console.log("Villain attacks scheduled at turns:", this.villainAttackTurns.sort((a, b) => a - b));
    }

    startNewGame() {
        this.targetNumbers = this.generateTargetNumbers();
        this.currentAttempts = 0;
        this.currentInput = [];
        this.history = [];
        this.isGameOver = false;

        // Schedule villain attacks for this game
        this.scheduleVillainAttacks();

        // Reset UI
        this.updateInputDisplay();
        this.elements.historyList.innerHTML = '';
        this.elements.attemptsLeft.textContent = this.maxAttempts;
        this.elements.lastResult.textContent = '-';
        this.elements.endModal.classList.add('hidden');
        this.elements.eventNotification.classList.add('hidden');
        this.elements.historyPanel.classList.remove('open');
        this.updateHistoryCount();

        console.log("Secret Code (For Debug):", this.targetNumbers.join(''));
    }

    generateTargetNumbers() {
        const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
        const result = [];
        for (let i = 0; i < 3; i++) {
            const index = Math.floor(Math.random() * numbers.length);
            result.push(numbers[index]);
            numbers.splice(index, 1);
        }
        return result;
    }

    // ─── Event Binding ────────────────────────────────

    bindEvents() {
        // Difficulty Buttons
        this.elements.difficultyBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const min = parseInt(btn.dataset.min);
                const max = parseInt(btn.dataset.max);
                this.selectDifficulty(min, max);
            });
        });

        // Keypad clicks
        this.elements.keys.forEach(key => {
            key.addEventListener('click', () => {
                if (this.isGameOver) return;
                const keyValue = key.dataset.key;
                if (keyValue === 'enter') {
                    this.submitGuess();
                } else if (keyValue === 'clear') {
                    this.removeDigit();
                } else {
                    this.addDigit(parseInt(keyValue));
                }
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (this.isGameOver) return;
            if (e.key >= '0' && e.key <= '9') {
                this.addDigit(parseInt(e.key));
            } else if (e.key === 'Backspace') {
                this.removeDigit();
            } else if (e.key === 'Enter') {
                this.submitGuess();
            }
        });

        // Hint Button
        this.elements.hintBtn.addEventListener('click', () => {
            this.buyHint();
        });

        // Notification Close Button
        this.elements.notifCloseBtn.addEventListener('click', () => {
            this.elements.eventNotification.classList.add('hidden');
        });

        // Hint Modal Close
        this.elements.closeHintBtn.addEventListener('click', () => {
            this.elements.hintModal.classList.add('hidden');
        });

        // Rules Modal
        this.elements.rulesBtn.addEventListener('click', () => {
            this.elements.rulesModal.classList.remove('hidden');
        });

        this.elements.closeBtn.addEventListener('click', () => {
            this.elements.rulesModal.classList.add('hidden');
        });

        // Restart Button — show difficulty selection again
        this.elements.restartBtn.addEventListener('click', () => {
            this.elements.endModal.classList.add('hidden');
            this.showDifficultyModal();
        });

        // History Toggle (Mobile)
        this.elements.historyToggleBtn.addEventListener('click', () => {
            this.elements.historyPanel.classList.add('open');
        });

        this.elements.historyCloseBtn.addEventListener('click', () => {
            this.elements.historyPanel.classList.remove('open');
        });
    }

    // ─── Points System (Cookie-Persisted) ─────────────

    loadPoints() {
        const saved = this.getCookie('nb_points');
        if (saved !== null) {
            return parseInt(saved, 10);
        }
        // First time ever: give initial points and save
        this.setCookie('nb_points', this.initialPoints, 365);
        return this.initialPoints;
    }

    addPoints(amount) {
        this.points += amount;
        if (this.points < 0) this.points = 0;
        this.elements.currentPoints.textContent = this.points;
        this.updateHintButton();
        // Persist to cookie
        this.setCookie('nb_points', this.points, 365);
    }

    updateHintButton() {
        this.elements.hintBtn.disabled = this.points < this.hintCost;
    }

    setCookie(name, value, days) {
        const expires = new Date(Date.now() + days * 864e5).toUTCString();
        document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
    }

    getCookie(name) {
        const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
        return match ? match[2] : null;
    }

    // ─── Hint System ──────────────────────────────────

    buyHint() {
        if (this.points < this.hintCost) return;

        this.addPoints(-this.hintCost);

        const randomIndex = Math.floor(Math.random() * 3);
        const number = this.targetNumbers[randomIndex];

        // Show Hint Modal
        this.elements.hintMessage.textContent = `정답에 숫자 '${number}' 가 포함되어 있습니다!`;
        this.elements.hintModal.classList.remove('hidden');
    }

    // ─── Villain Attack ───────────────────────────────

    triggerVillainAttack() {
        const newNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(n => !this.targetNumbers.includes(n));
        const newDigit = newNumbers[Math.floor(Math.random() * newNumbers.length)];
        const indexToChange = Math.floor(Math.random() * 3);

        this.targetNumbers[indexToChange] = newDigit;

        // Show warning notification
        this.elements.eventNotification.classList.remove('hidden');
        this.elements.eventMessage.textContent = "😈 악당의 습격! 숫자 하나가 은밀하게 바뀌었습니다.";

        console.log("Secret Code Changed to:", this.targetNumbers.join(''));
    }

    // ─── Input Handling ───────────────────────────────

    addDigit(digit) {
        if (this.currentInput.length < 3) {
            if (this.currentInput.includes(digit)) {
                this.shakeInput();
                return;
            }
            this.currentInput.push(digit);
            this.updateInputDisplay();
        }
    }

    removeDigit() {
        if (this.currentInput.length > 0) {
            this.currentInput.pop();
            this.updateInputDisplay();
        }
    }

    updateInputDisplay() {
        this.elements.digitBoxes.forEach((box, index) => {
            if (index < this.currentInput.length) {
                box.textContent = this.currentInput[index];
                box.classList.add('filled', 'active');
            } else {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            }
            // Highlight the next empty box
            if (index === this.currentInput.length) {
                box.classList.add('active');
            }
        });
    }

    shakeInput() {
        const inputArea = this.elements.inputDisplay;
        inputArea.classList.add('shake');
        setTimeout(() => inputArea.classList.remove('shake'), 300);
    }

    // ─── Game Logic ───────────────────────────────────

    submitGuess() {
        if (this.currentInput.length !== 3) {
            this.shakeInput();
            return;
        }

        const guess = [...this.currentInput];
        this.processTurn(guess);

        this.currentInput = [];
        this.updateInputDisplay();
    }

    processTurn(guess) {
        this.currentAttempts++;
        const { strikes, balls } = this.calculateResult(guess);

        this.addHistoryItem(guess, strikes, balls);
        this.elements.attemptsLeft.textContent = this.maxAttempts - this.currentAttempts;
        this.updateHistoryCount();

        if (strikes === 3) {
            this.endGame(true);
        } else if (this.currentAttempts >= this.maxAttempts) {
            this.endGame(false);
        } else {
            let resultText = '';
            if (strikes === 0 && balls === 0) {
                resultText = "OUT";
            } else {
                if (strikes > 0) resultText += `${strikes}S `;
                if (balls > 0) resultText += `${balls}B`;
            }
            this.elements.lastResult.textContent = resultText;

            // Villain Attack if this turn is scheduled
            if (this.villainAttackTurns.includes(this.currentAttempts)) {
                this.triggerVillainAttack();
            }
        }
    }

    calculateResult(guess) {
        let strikes = 0;
        let balls = 0;

        guess.forEach((digit, index) => {
            if (digit === this.targetNumbers[index]) {
                strikes++;
            } else if (this.targetNumbers.includes(digit)) {
                balls++;
            }
        });

        return { strikes, balls };
    }

    addHistoryItem(guess, strikes, balls) {
        const item = document.createElement('div');
        item.className = 'history-item';

        let resultHtml = '';
        if (strikes === 0 && balls === 0) {
            resultHtml = '<span class="result-badge out">OUT</span>';
        } else {
            if (strikes > 0) resultHtml += `<span class="result-badge strike">${strikes}S</span>`;
            if (balls > 0) resultHtml += `<span class="result-badge ball">${balls}B</span>`;
        }

        item.innerHTML = `
            <div class="history-round">#${this.currentAttempts}</div>
            <div class="history-guess">${guess.join('')}</div>
            <div class="history-result">${resultHtml}</div>
        `;

        this.elements.historyList.prepend(item);
    }

    updateHistoryCount() {
        this.elements.historyCount.textContent = this.currentAttempts;
    }

    // ─── End Game ─────────────────────────────────────

    endGame(isWin) {
        this.isGameOver = true;
        this.elements.endModal.classList.remove('hidden');

        if (isWin) {
            this.addPoints(this.winReward);
            this.elements.endTitle.textContent = "🎉 Victory!";
            this.elements.endMessage.textContent = `축하합니다! ${this.currentAttempts}번 만에 맞추셨네요. (+${this.winReward}P)`;
        } else {
            this.elements.endTitle.textContent = "Game Over";
            this.elements.endMessage.textContent = `아쉽게도 기회를 모두 소진하셨습니다. 정답은 ${this.targetNumbers.join('')} 이었습니다.`;
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new NumberBaseball();
});
