const STORAGE_KEY = 'pyrio_gemini_key';

export function getApiKey() {
    return localStorage.getItem(STORAGE_KEY) || '';
}

export function setApiKey(key) {
    if (key) {
        localStorage.setItem(STORAGE_KEY, key);
    }
}

export function clearApiKey() {
    localStorage.removeItem(STORAGE_KEY);
}

export function promptForApiKey() {
    const key = prompt(
        "Please enter your Google Gemini API Key to enable the AI Chatbot.\n" +
        "(Your key will be saved in your browser's local storage for future use)."
    );
    if (key) {
        setApiKey(key);
        return key;
    }
    return null;
}
