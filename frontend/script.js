// =================================================================================
// IMPORTANT: USER CONFIGURATION
// After deploying your Google Apps Script and publishing your Google Sheet,
// you must fill in the following two URLs.
// =================================================================================

// 1. The URL of your deployed Google Apps Script.
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycby8W9kNoFnhNeE1rlP2YER_9vPfkoJqsodPm30_vfU9arEq57JDYmtwCuwVMlqbTMLH/exec";

// 2. The "Publish to the web" CSV URL of your "Flash-cards" sheet.
const QUIZ_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQS6PTeNR_SoAbQgKwkSFTpB5vJ0JPzHujVJOB5VH-phfKt6DojHSpLbRMsUVKKWZ9wGY2qFJEkv7ff/pub?output=csv";

// =================================================================================
// APPLICATION LOGIC
// =================================================================================

// Global state
let quizData = [];
let originalQuizData = [];
let currentCardIndex = 0;
let cardIsFlipped = false;

// DOM Elements
let appContainer, flashcard, questionEl, answerEl, difficultyButtons, skipButton, loadingEl, statusMessageEl;

document.addEventListener('DOMContentLoaded', () => {
    appContainer = document.getElementById('app');
    appContainer.innerHTML = `
        <div class="app-container">
            <div class="loading">Loading flashcards...</div>
            <div class="status-message" style="display: none;"></div>
            <div class="flashcard-container" style="display: none;">
                <div class="flashcard">
                    <div class="card-face card-face-front"><p id="question"></p></div>
                    <div class="card-face card-face-back"><p id="answer"></p></div>
                </div>
            </div>
            <div class="controls-container" style="display: none;">
                <div class="difficulty-buttons">
                    <button class="easy">Easy</button>
                    <button class="medium">Medium</button>
                    <button class="hard">Hard</button>
                </div>
                <div class="navigation-buttons">
                    <button id="skip-card">Skip Card</button>
                </div>
            </div>
        </div>
    `;

    initializeDOMElements();
    addEventListeners();
    fetchQuizData();
});

function initializeDOMElements() {
    loadingEl = document.querySelector('.loading');
    statusMessageEl = document.querySelector('.status-message');
    flashcard = document.querySelector('.flashcard');
    questionEl = document.getElementById('question');
    answerEl = document.getElementById('answer');
    difficultyButtons = document.querySelector('.difficulty-buttons');
    skipButton = document.getElementById('skip-card');
}

function addEventListeners() {
    flashcard.addEventListener('click', flipCard);
    difficultyButtons.addEventListener('click', handleDifficultyClick);
    skipButton.addEventListener('click', nextCard);
}

async function fetchQuizData() {
    if (QUIZ_SHEET_CSV_URL === "YOUR_GOOGLE_SHEET_CSV_URL_HERE") {
        showStatus("Please configure the QUIZ_SHEET_CSV_URL in script.js");
        return;
    }
    try {
        const response = await fetch(QUIZ_SHEET_CSV_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        originalQuizData = parseCsv(csvText);

        // Filter for cards that need review
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const reviewCards = originalQuizData.filter(card => {
            const nextReviewDateStr = card['Date prochaine répétition'];
            if (!nextReviewDateStr) return true; // Review if never reviewed

            const [day, month, year] = nextReviewDateStr.split('/');
            const nextReviewDate = new Date(year, month - 1, day);

            return nextReviewDate && nextReviewDate.getTime() <= today.getTime();
        });

        quizData = reviewCards;

        if (quizData.length > 0) {
            hideLoading();
            renderCard();
        } else {
            showStatus("No flashcards to review today. Great job!");
        }
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        showStatus("Failed to load flashcards. Check the console and your CSV URL.");
    }
}

function parseCsv(text) {
    const lines = text.split(/\r?\n/);
    const headers = lines[0].split(',');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        if (!lines[i]) continue;
        const obj = {};
        const currentline = lines[i].split(',');
        headers.forEach((header, j) => {
            obj[header.trim()] = currentline[j] ? currentline[j].trim() : "";
        });
        // The original script uses 1-based indexing for rows and skips the header.
        obj.rowIndex = i + 1;
        data.push(obj);
    }
    return data;
}

function renderCard() {
    if (currentCardIndex >= quizData.length) {
        showStatus("You've reviewed all available cards for now!");
        return;
    }

    const card = quizData[currentCardIndex];
    questionEl.textContent = card.Question;
    answerEl.textContent = card.Reponse;

    if (cardIsFlipped) {
        flashcard.classList.remove('is-flipped');
        cardIsFlipped = false;
    }
    difficultyButtons.style.visibility = 'hidden';
}

function flipCard() {
    flashcard.classList.toggle('is-flipped');
    cardIsFlipped = !cardIsFlipped;
    difficultyButtons.style.visibility = cardIsFlipped ? 'visible' : 'hidden';
}

async function handleDifficultyClick(e) {
    if (e.target.tagName !== 'BUTTON') return;
    if (SCRIPT_URL === "YOUR_APPS_SCRIPT_URL_HERE") {
        alert("Please configure the SCRIPT_URL in script.js first.");
        return;
    }

    const difficulty = e.target.textContent;
    const card = quizData[currentCardIndex];

    // Disable buttons to prevent multiple clicks
    setButtonsDisabled(true);

    try {
        const response = await fetch(SCRIPT_URL, {
            method: 'POST',
            mode: 'cors', // Required for cross-origin requests
            credentials: 'omit',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }, // Apps Script seems to prefer text/plain for POST data
            body: JSON.stringify({
                action: 'update_card',
                rowIndex: card.rowIndex,
                difficulty: difficulty
            })
        });

        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        if (result.success) {
            console.log("Flashcard updated successfully.");
            nextCard();
        } else {
            throw new Error(result.message || "Unknown error from Apps Script.");
        }

    } catch (error) {
        console.error("Error updating flashcard:", error);
        alert(`Failed to update flashcard: ${error.message}`);
    } finally {
        // Re-enable buttons
        setButtonsDisabled(false);
    }
}

function nextCard() {
    currentCardIndex++;
    renderCard();
}

function hideLoading() {
    loadingEl.style.display = 'none';
    document.querySelector('.flashcard-container').style.display = 'block';
    document.querySelector('.controls-container').style.display = 'block';
}

function showStatus(message) {
    loadingEl.style.display = 'none';
    document.querySelector('.flashcard-container').style.display = 'none';
    document.querySelector('.controls-container').style.display = 'none';
    statusMessageEl.textContent = message;
    statusMessageEl.style.display = 'block';
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('.difficulty-buttons button').forEach(button => {
        button.disabled = disabled;
    });
    skipButton.disabled = disabled;
}
