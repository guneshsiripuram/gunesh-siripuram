// --- DOM Element Selection ---
const generateBtn = document.getElementById('generate-btn');
const promptInput = document.getElementById('prompt');
const gradeSelect = document.getElementById('grade');
const subjectInput = document.getElementById('subject');
const loadingDiv = document.getElementById('loading');
const errorDiv = document.getElementById('error');
const outputDiv = document.getElementById('output');

// --- Event Listener ---
generateBtn.addEventListener('click', generateLessonPlan);

// --- Core Function to Generate Lesson Plan ---
async function generateLessonPlan() {
    const topic = promptInput.value;
    const grade = gradeSelect.value;
    const subject = subjectInput.value;

    if (!topic || !subject) {
        showError("Please enter a lesson topic and subject.");
        return;
    }

    // --- UI Update: Start Loading State ---
    startLoadingState();

    try {
        // --- Construct the Prompt and JSON Schema for the AI Model ---
        const userPrompt = `Generate a complete and engaging lesson plan about "${topic}" for a ${grade} ${subject} class. Ensure the content is age-appropriate. Provide a lesson title, 3-4 clear learning objectives, content for 5-7 slides with a title and bulleted content for each, a 5-question multiple-choice quiz with 4 options each and the correct answer indicated, and a creative homework assignment. Format the entire output as a single JSON object according to the provided schema.`;

        const schema = {
            type: "OBJECT",
            properties: {
                title: { type: "STRING" },
                learning_objectives: { type: "ARRAY", items: { type: "STRING" } },
                slides: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: { title: { type: "STRING" }, content: { type: "STRING" } },
                        required: ["title", "content"]
                    }
                },
                quiz: {
                    type: "ARRAY",
                    items: {
                        type: "OBJECT",
                        properties: {
                            question: { type: "STRING" },
                            options: { type: "ARRAY", items: { type: "STRING" } },
                            answer: { type: "STRING" }
                        },
                        required: ["question", "options", "answer"]
                    }
                },
                homework: {
                    type: "OBJECT",
                    properties: { title: { type: "STRING" }, description: { type: "STRING" } },
                    required: ["title", "description"]
                }
            },
            required: ["title", "learning_objectives", "slides", "quiz", "homework"]
        };

        const payload = {
            contents: [{ parts: [{ text: userPrompt }] }],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: schema,
            },
        };

        // --- API Call with Retry Logic ---
        const lessonData = await callGeminiWithBackoff(payload);

        if (lessonData) {
            renderLessonPlan(lessonData);
        } else {
            showError("Could not generate lesson plan. The model returned an empty response.");
        }

    } catch (e) {
        console.error(e);
        showError(`An error occurred: ${e.message}`);
    } finally {
        // --- UI Update: End Loading State ---
        endLoadingState();
    }
}

// --- API Call Function with Exponential Backoff ---
async function callGeminiWithBackoff(payload, retries = 3, delay = 1000) {
    // NOTE: The API key is an empty string because it's automatically handled by the environment this code runs in.
    const apiKey = "AIzaSyDFr-fzpvf5ayLSy098qo9DKIOvnNrNlXM";
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-05-20:generateContent?key=${apiKey}`;

    for (let i = 0; i < retries; i++) {
        try {
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`API request failed with status ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            const jsonText = result?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (jsonText) {
                return JSON.parse(jsonText);
            } else {
                throw new Error("Invalid response structure from API.");
            }
        } catch (error) {
            console.warn(`Attempt ${i + 1} failed. Retrying in ${delay}ms...`);
            if (i === retries - 1) throw error; // Rethrow on the last attempt
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2; // Double the delay for the next retry
        }
    }
}

// --- UI Helper Functions ---

function startLoadingState() {
    outputDiv.innerHTML = '';
    errorDiv.classList.add('hidden');
    loadingDiv.classList.remove('hidden');
    generateBtn.disabled = true;
    generateBtn.classList.replace('bg-indigo-600', 'bg-indigo-400');
    generateBtn.innerHTML = `
        <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Generating...`;
}

function endLoadingState() {
    loadingDiv.classList.add('hidden');
    generateBtn.disabled = false;
    generateBtn.classList.replace('bg-indigo-400', 'bg-indigo-600');
    generateBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/></svg>
        Generate Lesson Materials`;
}

function showError(message) {
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

// --- Rendering Functions ---

function renderLessonPlan(data) {
    // Main function to build the entire output HTML
    outputDiv.innerHTML = `
        <div class="space-y-8">
            <div class="fade-in text-center">
                <h2 class="text-3xl font-bold text-gray-900">${data.title}</h2>
            </div>
            ${renderSection('🎯', 'Learning Objectives', renderObjectives(data.learning_objectives))}
            ${renderSection('🖥️', 'Lesson Slides', renderSlides(data.slides))}
            ${renderSection('❓', 'Quiz Questions', renderQuiz(data.quiz))}
            ${renderSection('📚', 'Homework Assignment', renderHomework(data.homework))}
        </div>
    `;
}

function renderSection(icon, title, content) {
    // Helper to create a consistent section wrapper
    return `
        <section class="fade-in bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <h3 class="text-xl font-bold text-gray-800 mb-4 flex items-center">
                <span class="mr-3 text-2xl">${icon}</span>
                ${title}
            </h3>
            ${content}
        </section>
    `;
}

function renderObjectives(objectives) {
    return `<ul class="list-disc list-inside space-y-2 text-gray-700">
        ${objectives.map(obj => `<li>${obj}</li>`).join('')}
    </ul>`;
}

function renderSlides(slides) {
    return `<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        ${slides.map((slide, index) => `
            <div class="bg-gray-100 p-4 rounded-lg border border-gray-200">
                <h4 class="font-semibold text-indigo-700">Slide ${index + 1}: ${slide.title}</h4>
                <div class="mt-2 text-sm text-gray-600">${formatSlideContent(slide.content)}</div>
            </div>
        `).join('')}
    </div>`;
}

function renderQuiz(quiz) {
    return `<div class="space-y-4">
        ${quiz.map((q, index) => `
            <div class="bg-white p-4 rounded-lg border border-gray-200">
                <p class="font-medium">${index + 1}. ${q.question}</p>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3">
                    ${q.options.map(opt => `<button class="text-left text-sm p-2 border rounded-md hover:bg-gray-100">${opt}</button>`).join('')}
                </div>
                <div class="mt-2">
                    <button class="text-xs font-semibold text-indigo-600 hover:underline" onclick="this.nextElementSibling.classList.toggle('hidden')">Show Answer</button>
                    <p class="hidden mt-1 p-2 bg-green-100 text-green-800 rounded-md text-sm">Correct Answer: <strong>${q.answer}</strong></p>
                </div>
            </div>
        `).join('')}
    </div>`;
}

function renderHomework(homework) {
    return `<div class="bg-indigo-50 p-5 rounded-lg border border-indigo-200">
        <h4 class="font-bold text-indigo-800">${homework.title}</h4>
        <p class="mt-2 text-gray-700">${homework.description}</p>
    </div>`;
}

function formatSlideContent(content) {
    // Converts markdown-style lists (e.g., "- item") into HTML unordered lists
    const lines = content.split('\n').filter(line => line.trim() !== '');
    if (lines.length === 0) return '';
    const listItems = lines.map(line => `<li>${line.replace(/[-*]\s*/, '')}</li>`).join('');
    return `<ul class="list-disc list-inside space-y-1">${listItems}</ul>`;
}
