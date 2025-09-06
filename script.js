// Global variables
let currentSession = null;
let currentQuestionIndex = 0;
let sessionQuestions = [];
let questionStartTime = 0;
let studentId = 'cs_student_' + Math.random().toString(36).substr(2, 9);
let studentAnalytics = {};

// CS Topic Display Names
const topicDisplayNames = {
    'control_structures': 'Control Structures (if-else, switch)',
    'loops': 'Loops (for, while)',
    'operators': 'Operators & Expressions',
    'number_systems': 'Number Systems (Binary, Octal, Hex)',
    'functions': 'Functions & Recursion',
    'arrays': 'Arrays & Strings',
    'pointers': 'Pointers',
    'strings': 'String Manipulation'
};

// Utility Functions
function showScreen(screenId) {
    const screens = document.querySelectorAll('.screen');
    screens.forEach(screen => screen.classList.add('hidden'));
    document.getElementById(screenId).classList.remove('hidden');
}

function showLoading(elementId, message = 'Loading...') {
    const element = document.getElementById(elementId);
    element.innerHTML = `<div class="loading"></div> ${message}`;
}

function formatCodeInText(text) {
    if (!text) return text;
    
    // Handle code blocks
    if (text.includes('```')) {
        text = text.replace(/```c\n/g, '<pre class="code-block">');
        text = text.replace(/```\n/g, '</pre>');
        text = text.replace(/```/g, '</pre>');
    }
    
    // Handle line breaks
    text = text.replace(/\n/g, '<br>');
    
    return text;
}

// Main Functions
async function startLearning() {
    showScreen('learning-screen');
    showLoading('ai-message', 'AI analyzing your CS F111 knowledge areas...');
    
    try {
        const response = await fetch('/api/start-session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: studentId
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            currentSession = data;
            sessionQuestions = data.action.questions;
            currentQuestionIndex = 0;
            studentAnalytics = data;
            
            // Update displays
            updateScores(data.competence, data.engagement);
            updateTopicAnalysis(data.weak_topics, data.topic_competence, data.action.focus_topics);
            updateAIMessage(data.action.message);
            
            // Start showing questions
            setTimeout(() => showNextQuestion(), 1000);
        } else {
            updateAIMessage('Error loading session. Please try again.');
        }
    } catch (error) {
        console.error('Error starting session:', error);
        updateAIMessage('Connection error. Please check your setup and try again.');
    }
}

function updateScores(competence, engagement) {
    const competencePercent = Math.round(competence * 100);
    const engagementPercent = Math.round(engagement * 100);
    
    document.getElementById('competence-score').textContent = competencePercent + '%';
    document.getElementById('engagement-score').textContent = engagementPercent + '%';
    
    // Update progress bar
    const progress = Math.max(0, Math.min(100, (currentQuestionIndex / sessionQuestions.length) * 100));
    document.getElementById('progress').style.width = progress + '%';
}

function updateTopicAnalysis(weakTopics, topicCompetence, focusTopics) {
    let analysisHtml = '<div class="topic-analysis">';
    analysisHtml += '<h4>🎯 Focus Areas This Session:</h4>';
    
    if (focusTopics && focusTopics.length > 0) {
        analysisHtml += '<div class="focus-topics">';
        focusTopics.forEach(topic => {
            const displayName = topicDisplayNames[topic] || topic.replace(/_/g, ' ').toUpperCase();
            const competence = topicCompetence && topicCompetence[topic] ? Math.round(topicCompetence[topic] * 100) : 0;
            const level = competence < 60 ? 'weak' : competence < 80 ? 'medium' : 'strong';
            analysisHtml += `<span class="topic-badge ${level}">${displayName} (${competence}%)</span>`;
        });
        analysisHtml += '</div>';
    } else {
        analysisHtml += '<p>Building your initial CS F111 profile...</p>';
    }
    
    analysisHtml += '</div>';
    
    // Add to DOM or update existing
    const aiStatus = document.querySelector('.ai-status');
    let topicSection = document.querySelector('.topic-analysis');
    if (topicSection) {
        topicSection.outerHTML = analysisHtml;
    } else {
        aiStatus.insertAdjacentHTML('afterend', analysisHtml);
    }
}

function updateAIMessage(message) {
    document.getElementById('ai-message').innerHTML = message;
}

function showNextQuestion() {
    if (currentQuestionIndex >= sessionQuestions.length) {
        showResults();
        return;
    }
    
    const question = sessionQuestions[currentQuestionIndex];
    questionStartTime = Date.now();
    
    // Format the question text
    const formattedQuestion = formatCodeInText(question.question);
    
    const questionCard = document.getElementById('question-card');
    questionCard.innerHTML = `
        <div class="question-header">
            <span class="question-number">Question ${currentQuestionIndex + 1} of ${sessionQuestions.length}</span>
            <span class="question-topic">${topicDisplayNames[question.topic] || question.topic.replace(/_/g, ' ')}</span>
            <span class="question-difficulty difficulty-${question.difficulty}">${question.difficulty}</span>
        </div>
        <div class="question-text">
            ${formattedQuestion}
        </div>
        <div class="options">
            ${question.options.map((option, index) => `
                <button class="option-btn" onclick="selectAnswer(${index})" data-index="${index}">
                    <span class="option-letter">${String.fromCharCode(65 + index)}</span>
                    <span class="option-text">${option}</span>
                </button>
            `).join('')}
        </div>
    `;
    
    // Hide previous feedback
    const feedbackEl = document.getElementById('feedback');
    if (feedbackEl) {
        feedbackEl.style.display = 'none';
    }
    
    // Update progress
    updateScores(currentSession.competence, currentSession.engagement);
}

async function selectAnswer(selectedIndex) {
    const timeTaken = (Date.now() - questionStartTime) / 1000;
    const question = sessionQuestions[currentQuestionIndex];
    
    // Disable all option buttons and show correct answer
    const optionBtns = document.querySelectorAll('.option-btn');
    optionBtns.forEach(btn => {
        btn.disabled = true;
        const btnIndex = parseInt(btn.dataset.index);
        
        if (btnIndex === selectedIndex) {
            btn.classList.add('selected');
        }
        if (btnIndex === question.correct) {
            btn.classList.add('correct-answer');
        }
    });
    
    try {
        const response = await fetch('/api/submit-answer', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: studentId,
                question_id: question.id,
                selected_answer: selectedIndex,
                time_taken: timeTaken
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Update scores
            updateScores(result.competence, result.engagement);
            
            // Update topic competence display
            updateTopicCompetence(result.topic_competence);
            
            // Show enhanced feedback
            showEnhancedFeedback(result.correct, result.feedback, question, result.concept_learned);
            
            // Update current session data
            currentSession.competence = result.competence;
            currentSession.engagement = result.engagement;
            
            // Move to next question after delay
            setTimeout(() => {
                currentQuestionIndex++;
                showNextQuestion();
            }, 3500);
        } else {
            showEnhancedFeedback(false, 'Error submitting answer. Please try again.', question, 'error');
        }
    } catch (error) {
        console.error('Error submitting answer:', error);
        showEnhancedFeedback(false, 'Network error. Please check your connection.', question, 'error');
    }
}

function showEnhancedFeedback(isCorrect, message, question, conceptLearned) {
    const feedbackEl = document.getElementById('feedback');
    
    let feedbackHtml = `
        <div class="feedback-content">
            <div class="feedback-message">${message}</div>
    `;
    
    if (conceptLearned !== 'error') {
        feedbackHtml += `
            <div class="feedback-details">
                <span class="concept-tag">Concept: ${conceptLearned}</span>
                <span class="topic-tag">Topic: ${topicDisplayNames[question.topic] || question.topic}</span>
            </div>
        `;
    }
    
    feedbackHtml += '</div>';
    
    feedbackEl.innerHTML = feedbackHtml;
    feedbackEl.className = 'feedback ' + (isCorrect ? 'correct' : 'incorrect');
    feedbackEl.style.display = 'block';
    
    // Scroll feedback into view
    feedbackEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateTopicCompetence(topicCompetence) {
    if (!topicCompetence || Object.keys(topicCompetence).length === 0) return;
    
    let competenceHtml = '<div class="topic-competence-display"><h5>Your CS Topic Mastery:</h5>';
    
    const sortedTopics = Object.entries(topicCompetence).sort(([,a], [,b]) => b - a);
    
    sortedTopics.forEach(([topic, score]) => {
        const percentage = Math.round(score * 100);
        const level = percentage >= 80 ? 'expert' : percentage >= 60 ? 'good' : 'learning';
        competenceHtml += `
            <div class="competence-item">
                <span class="topic-name">${topicDisplayNames[topic] || topic.replace(/_/g, ' ')}</span>
                <div class="competence-bar">
                    <div class="competence-fill ${level}" style="width: ${percentage}%">
                        <span class="competence-score">${percentage}%</span>
                    </div>
                </div>
            </div>
        `;
    });
    competenceHtml += '</div>';
    
    // Update or create competence display
    let existingDisplay = document.querySelector('.topic-competence-display');
    if (existingDisplay) {
        existingDisplay.outerHTML = competenceHtml;
    } else {
        const topicAnalysis = document.querySelector('.topic-analysis');
        if (topicAnalysis) {
            topicAnalysis.insertAdjacentHTML('afterend', competenceHtml);
        }
    }
}

async function showResults() {
    showScreen('results-screen');
    showLoading('results-summary', 'Calculating your CS F111 performance...');
    
    try {
        const response = await fetch('/api/get-student-analytics', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                student_id: studentId
            })
        });
        
        const analytics = await response.json();
        
        if (analytics.success) {
            displayDetailedResults(analytics);
        } else {
            displayBasicResults();
        }
    } catch (error) {
        console.error('Error getting analytics:', error);
        displayBasicResults();
    }
}

function displayDetailedResults(analytics) {
    const totalQuestions = analytics.total_questions;
    const overallCompetence = Math.round(analytics.overall_competence * 100);
    const engagementLevel = Math.round(analytics.engagement_level * 100);
    
    let resultsHtml = `
        <h3>🎓 Your CS F111 Learning Session Complete!</h3>
        <div class="results-overview">
            <div class="stat-card">
                <h4>📊 Overall Performance</h4>
                <p><strong>Questions Completed:</strong> ${totalQuestions}</p>
                <p><strong>CS Competence:</strong> ${overallCompetence}%</p>
                <p><strong>Engagement Level:</strong> ${engagementLevel}%</p>
            </div>
        </div>
    `;
    
    // Topic breakdown
    if (Object.keys(analytics.topic_competence).length > 0) {
        resultsHtml += `
            <div class="topic-breakdown">
                <h4>📚 Topic-wise Performance</h4>
        `;
        
        const sortedTopics = Object.entries(analytics.topic_competence).sort(([,a], [,b]) => b - a);
        
        sortedTopics.forEach(([topic, competence]) => {
            const percentage = Math.round(competence * 100);
            const counts = analytics.topic_counts[topic] || {attempted: 0, correct: 0};
            const accuracy = counts.attempted > 0 ? Math.round((counts.correct / counts.attempted) * 100) : 0;
            
            resultsHtml += `
                <div class="topic-result">
                    <div class="topic-header">
                        <span class="topic-title">${topicDisplayNames[topic] || topic.replace(/_/g, ' ')}</span>
                        <span class="topic-score ${percentage >= 70 ? 'good' : 'needs-work'}">${percentage}%</span>
                    </div>
                    <div class="topic-details">
                        Questions: ${counts.attempted} | Accuracy: ${accuracy}%
                    </div>
                </div>
            `;
        });
        
        resultsHtml += `</div>`;
    }
    
    // Recommendations
    if (analytics.weak_topics.length > 0) {
        resultsHtml += `
            <div class="recommendations">
                <h4>🎯 Recommended Study Areas</h4>
                <p>Focus on these topics for your next session:</p>
                <ul>
        `;
        analytics.weak_topics.forEach(topic => {
            resultsHtml += `<li>${topicDisplayNames[topic] || topic.replace(/_/g, ' ')}</li>`;
        });
        resultsHtml += `</ul></div>`;
    }
    
    resultsHtml += `
        <div class="motivational-message">
            <p>${getPersonalizedCSMessage(overallCompetence, engagementLevel, analytics.weak_topics)}</p>
        </div>
    `;
    
    document.getElementById('results-summary').innerHTML = resultsHtml;
}

function displayBasicResults() {
    const totalQuestions = sessionQuestions.length;
    const competence = Math.round((currentSession.competence || 0.5) * 100);
    const engagement = Math.round((currentSession.engagement || 0.8) * 100);
    
    document.getElementById('results-summary').innerHTML = `
        <h3>CS F111 Session Results</h3>
        <div class="results-summary">
            <p><strong>Questions Completed:</strong> ${totalQuestions}</p>
            <p><strong>Overall Competence:</strong> ${competence}%</p>
            <p><strong>Engagement Level:</strong> ${engagement}%</p>
            <p style="margin-top: 15px; font-style: italic;">
                ${getPersonalizedCSMessage(competence, engagement, [])}
            </p>
        </div>
    `;
}

function getPersonalizedCSMessage(competence, engagement, weakTopics) {
    if (competence >= 80 && engagement >= 80) {
        return "Outstanding! You're mastering CS F111 concepts with excellent focus. Ready for advanced programming challenges!";
    } else if (competence < 50 && weakTopics.includes('control_structures')) {
        return "Focus on control structures (if-else, loops) - they're the foundation of programming. Practice with simple programs first!";
    } else if (competence >= 60 && weakTopics.includes('number_systems')) {
        return "You're doing well with programming logic! Work on number systems (binary, octal) - they're crucial for CS fundamentals.";
    } else if (engagement < 50) {
        return "Try coding the examples yourself! Programming is best learned by doing. Start with simple programs and build up.";
    } else if (weakTopics.includes('operators')) {
        return "Great progress! Focus on operators and expressions - mastering these will make complex programming much easier.";
    } else if (competence < 60) {
        return "Keep practicing! CS F111 builds the foundation for all programming. Each concept you master makes the next one easier!";
    } else {
        return "Solid work! You're building strong CS fundamentals. Keep challenging yourself with varied question types.";
    }
}

function startNewSession() {
    currentQuestionIndex = 0;
    sessionQuestions = [];
    currentSession = null;
    studentAnalytics = {};
    
    // Clear dynamic displays
    const dynamicElements = document.querySelectorAll('.topic-analysis, .topic-competence-display');
    dynamicElements.forEach(el => el.remove());
    
    // Reset progress bar
    document.getElementById('progress').style.width = '0%';
    
    // Reset scores
    document.getElementById('competence-score').textContent = '50%';
    document.getElementById('engagement-score').textContent = '80%';
    
    showScreen('welcome-screen');
}

// Utility functions for better UX
function handleError(error, userMessage = 'Something went wrong. Please try again.') {
    console.error('Error:', error);
    updateAIMessage(userMessage);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(event) {
    // Only activate shortcuts when on question screen
    if (!document.getElementById('learning-screen').classList.contains('hidden')) {
        const optionBtns = document.querySelectorAll('.option-btn:not(:disabled)');
        
        // A, B, C, D keys for options
        const keyMap = {'KeyA': 0, 'KeyB': 1, 'KeyC': 2, 'KeyD': 3};
        if (keyMap.hasOwnProperty(event.code) && optionBtns[keyMap[event.code]]) {
            event.preventDefault();
            selectAnswer(keyMap[event.code]);
        }
    }
    
    // Space or Enter to start new session from welcome screen
    if (!document.getElementById('welcome-screen').classList.contains('hidden')) {
        if (event.code === 'Space' || event.code === 'Enter') {
            event.preventDefault();
            startLearning();
        }
    }
    
    // Enter to start new session from results screen
    if (!document.getElementById('results-screen').classList.contains('hidden')) {
        if (event.code === 'Enter') {
            event.preventDefault();
            startNewSession();
        }
    }
});

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    console.log('CS F111 AI Study Buddy loaded! Student ID:', studentId);
    
    // Add some CS-specific styling hints to the body
    document.body.classList.add('cs-mode');
    
    // Add welcome message with keyboard shortcuts
    const welcomeContent = document.querySelector('.welcome-content');
    if (welcomeContent) {
        const shortcutsHTML = `
            <div style="margin-top: 20px; padding: 15px; background: #f0f4ff; border-radius: 10px; font-size: 0.9rem;">
                <p><strong>Keyboard Shortcuts:</strong></p>
                <p>• Use A, B, C, D keys to select answers</p>
                <p>• Press Space or Enter to start from welcome screen</p>
            </div>
        `;
        welcomeContent.insertAdjacentHTML('beforeend', shortcutsHTML);
    }
});

// Performance tracking
let performanceMetrics = {
    startTime: null,
    questionsAnswered: 0,
    correctAnswers: 0,
    totalTime: 0
};

function trackPerformanceStart() {
    performanceMetrics.startTime = Date.now();
    performanceMetrics.questionsAnswered = 0;
    performanceMetrics.correctAnswers = 0;
    performanceMetrics.totalTime = 0;
}

function trackPerformanceAnswer(isCorrect, timeSpent) {
    performanceMetrics.questionsAnswered++;
    if (isCorrect) performanceMetrics.correctAnswers++;
    performanceMetrics.totalTime += timeSpent;
}

// Add visual feedback for loading states
function addLoadingState(buttonElement) {
    if (buttonElement) {
        buttonElement.disabled = true;
        buttonElement.innerHTML = '<div class="loading"></div> Processing...';
    }
}

function removeLoadingState(buttonElement, originalText) {
    if (buttonElement) {
        buttonElement.disabled = false;
        buttonElement.innerHTML = originalText;
    }
}