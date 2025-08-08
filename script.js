/*
  Diese Datei ist identisch mit der Skriptdatei der gelben Variante und
  behandelt die Eingabe des API‑Schlüssels sowie das Versenden von Prompts.
*/

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('apiKeyModal');
  const apiKeyInput = document.getElementById('apiKeyInput');
  const saveApiKeyBtn = document.getElementById('saveApiKey');
  let apiKey = localStorage.getItem('openai_api_key');

  function showModal() {
    modal.style.display = 'block';
  }
  function hideModal() {
    modal.style.display = 'none';
  }

  if (!apiKey) {
    showModal();
  }

  saveApiKeyBtn.addEventListener('click', () => {
    const key = apiKeyInput.value.trim();
    if (key) {
      localStorage.setItem('openai_api_key', key);
      apiKey = key;
      hideModal();
    }
  });

  const chatContainer = document.getElementById('chat');
  const sendBtn = document.getElementById('sendBtn');
  const promptInput = document.getElementById('prompt');

  /**
   * Hilfsfunktion, die eine Warnung ausgibt, wenn die Seite als
   * file:// geöffnet wurde. Der OpenAI‑Endpunkt erlaubt standardmäßig
   * keine Anfragen mit dem Origin „null“, was beim Öffnen einer
   * HTML‑Datei direkt aus dem Dateisystem der Fall ist. In diesem
   * Szenario wird der API‑Aufruf von der CORS‑Policy blockiert und
   * schlägt immer fehl. Um dies zu vermeiden, sollte die Anwendung
   * über einen kleinen lokalen Webserver gestartet werden (z.B.
   * `python -m http.server` oder `npx serve`).
   */
  function warnIfFileProtocol() {
    if (window.location.protocol === 'file:') {
      addMessage(
        'Diese Anwendung funktioniert nicht, wenn sie direkt über eine lokale Datei (file://) geöffnet wird. Bitte starte einen lokalen Webserver (z.\u00a0B. mit "python -m http.server" im Projektordner) und öffne die Seite über http://localhost:PORT.',
        'ai'
      );
      return true;
    }
    return false;
  }

  function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message');
    msgDiv.classList.add(type);
    msgDiv.textContent = text;
    chatContainer.appendChild(msgDiv);
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  async function sendPrompt() {
    const prompt = promptInput.value.trim();
    if (!prompt) return;
    promptInput.value = '';
    addMessage(prompt, 'user');
    if (!apiKey) {
      addMessage('Kein API‑Schlüssel gefunden. Bitte gib deinen Schlüssel ein.', 'ai');
      showModal();
      return;
    }

    // Prüfe, ob wir im file://‑Kontext laufen. In diesem Fall
    // gibt es keine CORS‑Unterstützung und der Aufruf schlägt fehl.
    if (warnIfFileProtocol()) {
      return;
    }
    const payload = {
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 200,
      temperature: 0.7
    };
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        // Lese Fehlermeldung aus dem Antwortkörper, wenn vorhanden
        let errorMsg = `HTTP error ${response.status}`;
        try {
          const errorData = await response.json();
          if (errorData && errorData.error && errorData.error.message) {
            errorMsg = `${errorMsg}: ${errorData.error.message}`;
          }
        } catch (e) {
          /* ignore JSON parse errors */
        }
        throw new Error(errorMsg);
      }
      const data = await response.json();
      const aiText = data.choices && data.choices[0].message && data.choices[0].message.content
        ? data.choices[0].message.content.trim()
        : 'Keine Antwort erhalten.';
      addMessage(aiText, 'ai');
    } catch (error) {
      console.error(error);
      // Fange CORS‑ und Netzwerkfehler ab
      if (error.message && error.message.toLowerCase().includes('failed to fetch')) {
        addMessage('Fehler: Die Anfrage konnte nicht gesendet werden. Dies kann an der CORS‑Policy liegen. Starte die Seite über einen lokalen Webserver oder überprüfe deine Internetverbindung.', 'ai');
      } else {
        addMessage(`Fehler bei der Kommunikation mit der API: ${error.message}`, 'ai');
      }
    }
  }

  sendBtn.addEventListener('click', sendPrompt);
  promptInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      sendPrompt();
    }
  });

  window.addEventListener('click', (event) => {
    if (event.target === modal) {
      hideModal();
    }
  });

  // Ermögliche manuelles Öffnen des API‑Key‑Dialogs
  const changeKeyBtn = document.getElementById('changeApiKey');
  if (changeKeyBtn) {
    changeKeyBtn.addEventListener('click', () => {
      showModal();
    });
  }
});