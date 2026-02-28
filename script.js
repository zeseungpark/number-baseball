class NumberBaseball {
    constructor() {
        this.targetNumbers = [];
        this.currentAttempts = 0;
        this.maxAttempts = 20;
        this.currentInput = [];
        this.history = [];
        this.isGameOver = false;
        this.isSubmitting = false;

        // Game Settings
        this.hintCost = 50;
        this.winReward = 100;
        this.initialPoints = 50;

        // Villain attack settings (fixed count per game)
        this.villainAttackMin = 0;
        this.villainAttackMax = 1;
        this.villainAttackTurns = [];

        // Responsive mode
        this.isMobile = window.innerWidth < 768;

        // Load saved points from cookie, or use initial points
        this.points = this.loadPoints();

        // DOM Elements
        this.elements = {
            // Mobile keypad sheet
            inputDisplay: document.getElementById('input-display'),
            digitBoxes: document.querySelectorAll('#input-display .digit-box'),
            keypadSheet: document.getElementById('keypad-sheet'),
            keypadOverlay: document.getElementById('keypad-overlay'),
            keys: document.querySelectorAll('#keypad-sheet .key'),
            resultFeedback: document.getElementById('result-feedback'),
            resultFeedbackText: document.getElementById('result-feedback-text'),
            sheetPrevResult: document.getElementById('sheet-prev-result'),

            // Desktop keypad
            desktopInputDisplay: document.getElementById('desktop-input-display'),
            desktopDigitBoxes: document.querySelectorAll('#desktop-input-display .digit-box'),
            desktopKeys: document.querySelectorAll('.desktop-keypad .key'),

            // History
            historyList: document.getElementById('history-list'),
            historyEmpty: document.getElementById('history-empty'),

            // Status
            attemptsLeft: document.getElementById('attempts-left'),
            lastResult: document.getElementById('last-result'),
            currentPoints: document.getElementById('current-points'),

            // Buttons
            hintBtn: document.getElementById('hint-btn'),
            hintBtnMobile: document.getElementById('hint-btn-mobile'),
            playBtn: document.getElementById('play-btn'),

            // Notifications
            eventNotification: document.getElementById('event-notification'),
            eventMessage: document.getElementById('event-message'),
            notifCloseBtn: document.getElementById('notif-close-btn'),

            // Modals
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

            // Difficulty
            difficultyModal: document.getElementById('difficulty-modal'),
            difficultyBtns: document.querySelectorAll('.difficulty-btn'),
        };

        this.init();
    }

    // ─── Initialization ───────────────────────────────

    init() {
        this.bindEvents();
        this.elements.currentPoints.textContent = this.points;
        this.updateHintButton();
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

        const possibleTurns = [];
        for (let i = 2; i <= this.maxAttempts; i++) {
            possibleTurns.push(i);
        }

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
        this.isSubmitting = false;

        // Schedule villain attacks for this game
        this.scheduleVillainAttacks();

        // Reset UI
        this.updateInputDisplay();
        this.elements.historyList.innerHTML = '';
        this.elements.attemptsLeft.textContent = this.maxAttempts;
        this.elements.lastResult.textContent = '-';
        this.elements.endModal.classList.add('hidden');
        this.elements.eventNotification.classList.add('hidden');

        // Show empty state
        this.elements.historyEmpty.classList.remove('hidden');

        // Hide result feedback
        this.elements.resultFeedback.classList.add('hidden');

        // Update previous result display
        this.updateSheetPrevResult();

        // Player taps "Play" button to open keypad themselves

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

        // Mobile keypad clicks
        this.elements.keys.forEach(key => {
            key.addEventListener('click', () => {
                if (this.isGameOver || this.isSubmitting) return;
                this.handleKeyPress(key.dataset.key);
            });
        });

        // Desktop keypad clicks
        this.elements.desktopKeys.forEach(key => {
            key.addEventListener('click', () => {
                if (this.isGameOver || this.isSubmitting) return;
                this.handleKeyPress(key.dataset.key);
            });
        });

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (this.isGameOver || this.isSubmitting) return;
            if (e.key >= '0' && e.key <= '9') {
                this.handleKeyPress(e.key);
            } else if (e.key === 'Backspace') {
                this.handleKeyPress('backspace');
            }
        });

        // Hint Buttons (desktop + mobile)
        this.elements.hintBtn.addEventListener('click', () => {
            this.buyHint();
        });

        this.elements.hintBtnMobile.addEventListener('click', () => {
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

        // Restart Button
        this.elements.restartBtn.addEventListener('click', () => {
            this.elements.endModal.classList.add('hidden');
            this.showDifficultyModal();
        });

        // Play Button (Mobile) → open keypad sheet
        this.elements.playBtn.addEventListener('click', () => {
            this.openKeypad();
        });

        // Overlay click → close keypad sheet
        this.elements.keypadOverlay.addEventListener('click', () => {
            this.closeKeypad();
        });

        // Responsive mode tracking
        window.addEventListener('resize', () => {
            this.isMobile = window.innerWidth < 768;
        });
    }

    handleKeyPress(keyValue) {
        if (keyValue === 'clear') {
            this.clearInput();
        } else if (keyValue === 'backspace') {
            this.removeDigit();
        } else if (keyValue === 'enter') {
            // Kept for keyboard only
            this.submitGuess();
        } else {
            this.addDigit(parseInt(keyValue));
        }
    }

    // ─── Keypad Bottom Sheet ─────────────────────────

    openKeypad() {
        this.currentInput = [];
        this.updateInputDisplay();
        this.elements.resultFeedback.classList.add('hidden');
        this.elements.keypadSheet.classList.add('open');
        this.elements.keypadOverlay.classList.remove('hidden');
        this.elements.playBtn.classList.add('hidden');
        this.updateDisabledKeys();
    }

    closeKeypad() {
        this.elements.keypadSheet.classList.remove('open');
        this.elements.keypadOverlay.classList.add('hidden');
        if (!this.isGameOver) {
            this.elements.playBtn.classList.remove('hidden');
        }
        this.currentInput = [];
        this.updateInputDisplay();
    }

    // ─── Points System (Cookie-Persisted) ─────────────

    loadPoints() {
        const saved = this.getCookie('nb_points');
        if (saved !== null) {
            return parseInt(saved, 10);
        }
        this.setCookie('nb_points', this.initialPoints, 365);
        return this.initialPoints;
    }

    addPoints(amount) {
        this.points += amount;
        if (this.points < 0) this.points = 0;
        this.elements.currentPoints.textContent = this.points;
        this.updateHintButton();
        this.setCookie('nb_points', this.points, 365);
    }

    updateHintButton() {
        this.elements.hintBtn.disabled = this.points < this.hintCost;
        this.elements.hintBtnMobile.disabled = this.points < this.hintCost;
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

        // Add villain attack to history
        this.addVillainHistoryItem();

        console.log("Secret Code Changed to:", this.targetNumbers.join(''));
    }

    addVillainHistoryItem() {
        const item = document.createElement('div');
        item.className = 'history-item villain-event';
        item.innerHTML = `
            <span class="villain-event-icon">😈</span>
            <span class="villain-event-text">악당의 습격! 숫자가 바뀌었습니다</span>
        `;
        this.elements.historyList.appendChild(item);
        this.scrollHistoryToBottom();
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
            this.updateDisabledKeys();

            // Auto-submit on 3rd digit
            if (this.currentInput.length === 3) {
                this.isSubmitting = true;
                setTimeout(() => {
                    this.submitGuess();
                }, 400);
            }
        }
    }

    removeDigit() {
        if (this.currentInput.length > 0) {
            this.currentInput.pop();
            this.updateInputDisplay();
            this.updateDisabledKeys();
        }
    }

    clearInput() {
        this.currentInput = [];
        this.updateInputDisplay();
        this.updateDisabledKeys();
    }

    updateInputDisplay() {
        // Update mobile digit boxes
        this.elements.digitBoxes.forEach((box, index) => {
            if (index < this.currentInput.length) {
                box.textContent = this.currentInput[index];
                box.classList.add('filled', 'active');
            } else {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            }
            if (index === this.currentInput.length) {
                box.classList.add('active');
            }
        });

        // Update desktop digit boxes
        this.elements.desktopDigitBoxes.forEach((box, index) => {
            if (index < this.currentInput.length) {
                box.textContent = this.currentInput[index];
                box.classList.add('filled', 'active');
            } else {
                box.textContent = '';
                box.classList.remove('filled', 'active');
            }
            if (index === this.currentInput.length) {
                box.classList.add('active');
            }
        });
    }

    updateDisabledKeys() {
        const allKeys = [...this.elements.keys, ...this.elements.desktopKeys];
        allKeys.forEach(key => {
            const keyValue = key.dataset.key;
            if (keyValue >= '0' && keyValue <= '9') {
                const digit = parseInt(keyValue);
                if (this.currentInput.includes(digit)) {
                    key.classList.add('disabled');
                } else {
                    key.classList.remove('disabled');
                }
            }
        });
    }

    shakeInput() {
        const inputs = [this.elements.inputDisplay, this.elements.desktopInputDisplay];
        inputs.forEach(el => {
            if (el) {
                el.classList.add('shake');
                setTimeout(() => el.classList.remove('shake'), 300);
            }
        });
    }

    // ─── Game Logic ───────────────────────────────────

    submitGuess() {
        if (this.currentInput.length !== 3) {
            this.shakeInput();
            this.isSubmitting = false;
            return;
        }

        const guess = [...this.currentInput];
        const result = this.processTurn(guess);

        // Show result feedback on mobile sheet
        if (this.isMobile) {
            this.showResultFeedback(result);
            // Close keypad after showing feedback
            setTimeout(() => {
                this.closeKeypad();
                this.isSubmitting = false;
            }, result.isWin ? 1200 : 800);
        } else {
            this.currentInput = [];
            this.updateInputDisplay();
            this.updateDisabledKeys();
            this.isSubmitting = false;
        }
    }

    showResultFeedback(result) {
        const fb = this.elements.resultFeedback;
        const txt = this.elements.resultFeedbackText;

        // Remove previous classes
        fb.className = 'sheet-result-feedback';

        if (result.isWin) {
            fb.classList.add('result-win');
            txt.textContent = '🎉 정답! 3S';
        } else if (result.strikes === 0 && result.balls === 0) {
            fb.classList.add('result-out');
            txt.textContent = '😢 OUT';
        } else {
            let text = '';
            if (result.strikes > 0) text += `${result.strikes}S `;
            if (result.balls > 0) text += `${result.balls}B`;
            txt.textContent = text;
            if (result.strikes > 0) {
                fb.classList.add('result-strike');
            } else {
                fb.classList.add('result-ball');
            }
        }

        fb.classList.remove('hidden');
    }

    processTurn(guess) {
        this.currentAttempts++;
        const { strikes, balls } = this.calculateResult(guess);
        const isWin = strikes === 3;

        this.addHistoryItem(guess, strikes, balls);
        this.elements.attemptsLeft.textContent = this.maxAttempts - this.currentAttempts;

        // Hide empty state
        this.elements.historyEmpty.classList.add('hidden');

        if (isWin) {
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

        // Update previous result text for bottom sheet
        this.updateSheetPrevResult();

        return { strikes, balls, isWin };
    }

    updateSheetPrevResult() {
        if (this.currentAttempts === 0) {
            this.elements.sheetPrevResult.innerHTML = '';
            return;
        }
        const lastResult = this.elements.lastResult.textContent;
        this.elements.sheetPrevResult.innerHTML = `직전 결과: <span class="result-highlight">${lastResult}</span>`;
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

        // Append (newest at bottom, like a chat)
        this.elements.historyList.appendChild(item);
        this.scrollHistoryToBottom();
    }

    scrollHistoryToBottom() {
        const historyArea = this.elements.historyList.closest('.history-area');
        if (historyArea) {
            setTimeout(() => {
                historyArea.scrollTop = historyArea.scrollHeight;
            }, 50);
        }
    }

    // ─── End Game ─────────────────────────────────────

    endGame(isWin) {
        this.isGameOver = true;

        // Hide play button
        this.elements.playBtn.classList.add('hidden');

        // Show end modal after a delay if on mobile sheet
        const delay = this.isMobile && this.elements.keypadSheet.classList.contains('open') ? 1400 : 200;

        setTimeout(() => {
            this.elements.endModal.classList.remove('hidden');

            if (isWin) {
                this.addPoints(this.winReward);
                this.elements.endTitle.textContent = "🎉 Victory!";
                this.elements.endMessage.textContent = `축하합니다! ${this.currentAttempts}번 만에 맞추셨네요. (+${this.winReward}P)`;
            } else {
                this.elements.endTitle.textContent = "Game Over";
                this.elements.endMessage.textContent = `아쉽게도 기회를 모두 소진하셨습니다. 정답은 ${this.targetNumbers.join('')} 이었습니다.`;
            }
        }, delay);
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    new NumberBaseball();
});
