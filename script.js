// script.js - Asistente Legal LFT
class SofiaLFT {
  constructor() {
    this.legalDB = {};
    this.loadLegalData();
    this.setupEventListeners();
    this.greetUser();
  }

  // Cargar base de datos legal
  async loadLegalData() {
    try {
      const response = await fetch('data.json');
      this.legalDB = await response.json();
      console.log('Base legal cargada:', this.legalDB.metadata);
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.displayMessage('⚠️ Error al cargar la base legal. Intenta recargar la página.', 'bot');
    }
  }

  // Configurar interacción
  setupEventListeners() {
    const input = document.getElementById('userInput');
    
    // Enviar con Enter
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') this.processUserInput();
    });

    // Enviar con botón
    document.querySelector('button').addEventListener('click', () => {
      this.processUserInput();
    });
  }

  // Procesar consultas
  processUserInput() {
    const input = document.getElementById('userInput');
    const query = input.value.trim();
    
    if (!query) return;

    this.displayMessage(query, 'user');
    input.value = '';

    setTimeout(() => {
      const response = this.generateLegalResponse(query);
      this.displayMessage(response, 'bot');
    }, 600);
  }

  // Generar respuestas legales
  generateLegalResponse(query) {
    // Búsqueda por número de artículo
    const articleMatch = query.match(/artículo\s*(\d+)/i);
    if (articleMatch) {
      const artNum = articleMatch[1];
      return this.getArticleResponse(artNum);
    }

    // Búsqueda por concepto
    const conceptResponse = this.searchConcepts(query);
    if (conceptResponse) return conceptResponse;

    // Búsqueda semántica
    return this.semanticSearch(query);
  }

  // Obtener artículo específico
  getArticleResponse(artNum) {
    const articulo = this.legalDB.articulos[artNum];
    
    if (!articulo) {
      return `❌ No encontré el artículo ${artNum}. Prueba con: <ul>
        <li>"Artículo 47" (despidos)</li>
        <li>"Artículo 123" (jornadas)</li>
        <li>"Artículo 82" (pago de salario)</li>
      </ul>`;
    }

    let response = `📜 <strong>Artículo ${artNum} LFT</strong>:<br>${articulo.texto}`;
    
    if (articulo.explicacion) {
      response += `<br><br>💡 <strong>Explicación:</strong> ${articulo.explicacion}`;
    }

    if (articulo.tags) {
      response += `<br><div class="tags">${articulo.tags.map(t => 
        `<span class="legal-tag">${t}</span>`).join('')}</div>`;
    }

    return response;
  }

  // Buscar en conceptos jurídicos
  searchConcepts(query) {
    const lowerQuery = query.toLowerCase();
    
    for (const [concept, data] of Object.entries(this.legalDB.conceptos || {})) {
      if (lowerQuery.includes(concept) || 
          data.tags?.some(tag => lowerQuery.includes(tag))) {
        return `🔍 <strong>${concept.replace('_', ' ')}</strong>:<br>
          ${data.definicion || ''}
          ${data.acciones ? '<br><br>🚀 <strong>Acciones:</strong><ul>' + 
            data.acciones.map(a => `<li>${a}</li>`).join('') + '</ul>' : ''}
          ${data.plazo ? `<br>⏳ <strong>Plazo:</strong> ${data.plazo}` : ''}`;
      }
    }
    return null;
  }

  // Búsqueda semántica básica
  semanticSearch(query) {
    const lowerQuery = query.toLowerCase();
    const matchingArticles = [];

    // Buscar en artículos
    for (const [artNum, artData] of Object.entries(this.legalDB.articulos || {})) {
      const matchScore = this.calculateMatchScore(lowerQuery, artData);
      if (matchScore > 0.3) {
        matchingArticles.push({ artNum, score: matchScore });
      }
    }

    // Ordenar por relevancia
    matchingArticles.sort((a, b) => b.score - a.score);

    if (matchingArticles.length > 0) {
      const bestMatch = matchingArticles[0];
      return `🔎 Parece que necesitas el <strong>Artículo ${bestMatch.artNum}</strong>:
        <br>${this.getArticleResponse(bestMatch.artNum)}
        <br><br>¿Quieres más detalles sobre este artículo?`;
    }

    return `🤔 No encontré información específica. Prueba con:
      <ul>
        <li>"Artículo [número]"</li>
        <li>"Derechos en un despido"</li>
        <li>"Cómo denunciar acoso laboral"</li>
      </ul>`;
  }

  // Calcular coincidencias
  calculateMatchScore(query, artData) {
    let score = 0;
    
    // Coincidencia en tags
    if (artData.tags) {
      score += artData.tags.filter(tag => 
        query.includes(tag.toLowerCase())).length * 0.5;
    }

    // Coincidencia en texto
    const text = artData.texto.toLowerCase();
    if (text.includes(query)) score += 0.8;

    return score;
  }

  // Mostrar mensajes en el chat
  displayMessage(text, sender) {
    const chatbox = document.getElementById('chatbox');
    const messageDiv = document.createElement('div');
    
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = text;
    chatbox.appendChild(messageDiv);

    // Auto-scroll
    chatbox.scrollTop = chatbox.scrollHeight;
  }

  // Mensaje de bienvenida
  greetUser() {
    this.displayMessage(
      `👋 ¡Hola! Soy <strong>Sofía</strong>, tu asistente en la <strong>Ley Federal del Trabajo</strong>.
      <br><br>Puedes preguntarme sobre:
      <ul>
        <li>Artículos específicos ("Artículo 47")</li>
        <li>Conceptos legales ("despido injustificado")</li>
        <li>Procedimientos ("cómo demandar")</li>
      </ul>`, 
      'bot'
    );
  }
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  new SofiaLFT();
});
