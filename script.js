// Configuración inicial
const CONFIG = {
    apiKey: null, // 'sk-...' si usas OpenAI
    model: 'gpt-3.5-turbo', // o 'gpt-4'
    temperature: 0.7,
    maxHistory: 5, // Mensajes a recordar
    defaultErrorMessage: '⚠️ Ocurrió un error. Por favor, intenta de nuevo.'
};

class SofiaLFT {
    constructor() {
        this.legalDB = {};
        this.conversationHistory = [];
        this.isLoading = false;
        
        this.init = this.init.bind(this);
        this.processUserInput = this.processUserInput.bind(this);
        
        this.init();
    }

    async init() {
        try {
            await this.loadLegalData();
            this.setupEventListeners();
            this.greetUser();
            this.setupUIEnhancements();
        } catch (error) {
            console.error('Error inicializando:', error);
            this.displayMessage(CONFIG.defaultErrorMessage, 'bot');
        }
    }

    // Cargar base de datos legal mejorada
    async loadLegalData() {
        try {
            const response = await fetch('data.json');
            this.legalDB = await response.json();
            
            // Preprocesar datos para búsqueda rápida
            this.legalDB.articulosArray = Object.entries(this.legalDB.articulos || {})
                .map(([num, data]) => ({ num, ...data }));
            
            console.log('Base legal cargada:', this.legalDB.metadata);
        } catch (error) {
            console.error('Error cargando datos:', error);
            throw error;
        }
    }

    // Configurar interacción mejorada
    setupEventListeners() {
        const input = document.getElementById('userInput');
        
        // Enviar con Enter
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isLoading) this.processUserInput();
        });

        // Enviar con botón
        document.getElementById('sendButton').addEventListener('click', () => {
            if (!this.isLoading) this.processUserInput();
        });

        // Sugerencias mientras escribe
        input.addEventListener('input', this.showSuggestions.bind(this));
    }

    // Mejoras de UI
    setupUIEnhancements() {
        // Botón de ejemplos
        const examplesBtn = document.createElement('button');
        examplesBtn.id = 'examplesBtn';
        examplesBtn.innerHTML = '📌 Ver ejemplos';
        examplesBtn.addEventListener('click', this.showExamples.bind(this));
        document.querySelector('.input-container').prepend(examplesBtn);

        // Indicador de carga
        const loader = document.createElement('div');
        loader.id = 'loader';
        loader.innerHTML = '⌛ Procesando...';
        loader.style.display = 'none';
        document.getElementById('chatbox').appendChild(loader);
    }

    // Procesar consultas con manejo de estado
    async processUserInput() {
        const input = document.getElementById('userInput');
        const query = input.value.trim();
        
        if (!query || this.isLoading) return;

        this.displayMessage(query, 'user');
        input.value = '';
        this.toggleLoading(true);

        try {
            let response;
            
            // 1. Búsqueda directa en LFT
            response = this.generateLegalResponse(query);
            
            // 2. Si no hay respuesta clara, usar IA
            if (response.includes('No encontré') && CONFIG.apiKey) {
                response = await this.generateAIResponse(query);
            }

            this.displayMessage(response, 'bot');
        } catch (error) {
            console.error('Error procesando input:', error);
            this.displayMessage(CONFIG.defaultErrorMessage, 'bot');
        } finally {
            this.toggleLoading(false);
        }
    }

    // Generar respuestas legales mejoradas
    generateLegalResponse(query) {
        // Limpiar y normalizar query
        const cleanQuery = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        
        // 1. Búsqueda por número de artículo
        const articleMatch = cleanQuery.match(/(articulo|artículo|art)\s*(\d+)/i);
        if (articleMatch) {
            const artNum = articleMatch[2];
            return this.getArticleResponse(artNum);
        }

        // 2. Búsqueda en conceptos jurídicos
        const conceptResponse = this.searchConcepts(cleanQuery);
        if (conceptResponse) return conceptResponse;

        // 3. Búsqueda semántica mejorada
        return this.enhancedSemanticSearch(cleanQuery);
    }

    // Obtener artículo con formato mejorado
    getArticleResponse(artNum) {
        const articulo = this.legalDB.articulos[artNum];
        
        if (!articulo) {
            return `❌ No encontré el artículo ${artNum}. Prueba con:<br>
                <div class="suggestions">
                    <span onclick="this.fillInput('Artículo 47')">Artículo 47 (despidos)</span>
                    <span onclick="this.fillInput('Artículo 123')">Artículo 123 (jornadas)</span>
                    <span onclick="this.fillInput('Artículo 82')">Artículo 82 (salarios)</span>
                </div>`;
        }

        let response = `
            <div class="article-header">
                <h3>📜 Artículo ${artNum} LFT</h3>
                ${articulo.tags ? `<div class="tags">${articulo.tags.map(t => 
                    `<span class="tag">${t}</span>`).join('')}</div>` : ''}
            </div>
            <div class="article-content">
                <p>${articulo.texto}</p>
                ${articulo.explicacion ? 
                    `<div class="explanation">
                        <h4>💡 Explicación:</h4>
                        <p>${articulo.explicacion}</p>
                    </div>` : ''}
                ${articulo.ejemplo ? 
                    `<div class="example">
                        <h4>📌 Ejemplo práctico:</h4>
                        <p>${articulo.ejemplo}</p>
                    </div>` : ''}
            </div>
            <div class="article-actions">
                <button onclick="this.showRelated(${artNum})">Artículos relacionados</button>
            </div>
        `;

        return response;
    }

    // Buscar en conceptos jurídicos mejorado
    searchConcepts(query) {
        for (const [concept, data] of Object.entries(this.legalDB.conceptos || {})) {
            const cleanConcept = concept.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            
            if (query.includes(cleanConcept) || 
                (data.tags && data.tags.some(tag => query.includes(tag.toLowerCase())))) {
                
                return `
                    <div class="concept-card">
                        <h3>🔍 ${concept.replace(/_/g, ' ')}</h3>
                        <p>${data.definicion || ''}</p>
                        
                        ${data.acciones ? `
                            <div class="actions">
                                <h4>🚀 Acciones recomendadas:</h4>
                                <ul>${data.acciones.map(a => `<li>${a}</li>`).join('')}</ul>
                            </div>
                        ` : ''}
                        
                        ${data.plazo ? `
                            <div class="deadline">
                                <h4>⏳ Plazo legal:</h4>
                                <p>${data.plazo}</p>
                            </div>
                        ` : ''}
                        
                        ${data.articulos_relacionados ? `
                            <div class="related-articles">
                                <h4>📚 Artículos relacionados:</h4>
                                <div class="article-links">
                                    ${data.articulos_relacionados.map(art => 
                                        `<span onclick="this.fillInput('Artículo ${art}')">Art. ${art}</span>`
                                    ).join(', ')}
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }
        }
        return null;
    }

    // Búsqueda semántica mejorada
    enhancedSemanticSearch(query) {
        const matchingArticles = this.legalDB.articulosArray
            .map(article => {
                let score = 0;
                
                // Ponderar tags
                if (article.tags) {
                    score += article.tags.filter(tag => 
                        query.includes(tag.toLowerCase())).length * 0.5;
                }
                
                // Ponderar texto
                const text = article.texto.toLowerCase();
                if (text.includes(query)) score += 0.8;
                
                // Ponderar explicación
                if (article.explicacion && article.explicacion.toLowerCase().includes(query)) {
                    score += 0.3;
                }
                
                return { ...article, score };
            })
            .filter(article => article.score > 0.3)
            .sort((a, b) => b.score - a.score);
        
        if (matchingArticles.length > 0) {
            const bestMatch = matchingArticles[0];
            let response = this.getArticleResponse(bestMatch.num);
            
            if (matchingArticles.length > 1) {
                response += `
                    <div class="other-results">
                        <h4>🔎 También podrían interesarte:</h4>
                        <ul>
                            ${matchingArticles.slice(1, 4).map(art => 
                                `<li onclick="this.fillInput('Artículo ${art.num}')">
                                    Art. ${art.num}: ${art.tags?.join(', ') || ''}
                                </li>`
                            ).join('')}
                        </ul>
                    </div>
                `;
            }
            
            return response;
        }
        
        return `🤔 No encontré información exacta. Prueba con:<br>
            <div class="suggestions">
                <span onclick="this.fillInput('Artículo 123')">Artículo 123 (derechos básicos)</span>
                <span onclick="this.fillInput('despido injustificado')">Despido injustificado</span>
                <span onclick="this.fillInput('jornada laboral')">Jornada laboral</span>
                <span onclick="this.fillInput('cómo demandar')">Procedimiento para demandar</span>
            </div>`;
    }

    // Generar respuesta con IA (si está configurado)
    async generateAIResponse(query) {
        if (!CONFIG.apiKey) {
            return 'No encontré información específica en la LFT sobre este tema.';
        }
        
        const prompt = `
            Eres un experto en la Ley Federal del Trabajo de México. 
            El usuario pregunta: "${query}".
            
            Requisitos:
            1. Responde en español con terminología jurídica precisa.
            2. Cita artículos específicos de la LFT cuando sea relevante.
            3. Si no es sobre la LFT, acláralo.
            4. Proporciona ejemplos prácticos.
            5. Sé conciso (máximo 2 párrafos).
            
            Base de conocimiento disponible:
            ${JSON.stringify(this.legalDB.metadata || {})}
        `;
        
        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${CONFIG.apiKey}`
                },
                body: JSON.stringify({
                    model: CONFIG.model,
                    messages: [{ role: 'system', content: prompt }],
                    temperature: CONFIG.temperature
                })
            });
            
            const data = await response.json();
            return data.choices?.[0]?.message?.content || CONFIG.defaultErrorMessage;
        } catch (error) {
            console.error('Error con OpenAI:', error);
            return 'Error al conectar con el servicio. Intenta con una pregunta más específica.';
        }
    }

    // Mostrar sugerencias mientras escribe
    showSuggestions() {
        const input = document.getElementById('userInput');
        const suggestions = document.getElementById('suggestions');
        
        if (!suggestions) return;
        
        const query = input.value.toLowerCase();
        if (query.length < 2) {
            suggestions.innerHTML = '';
            return;
        }
        
        const matches = this.legalDB.articulosArray
            .filter(article => 
                article.tags?.some(tag => tag.toLowerCase().includes(query)) ||
                article.texto.toLowerCase().includes(query)
            )
            .slice(0, 5);
        
        if (matches.length > 0) {
            suggestions.innerHTML = matches.map(article => `
                <div onclick="this.fillInput('Artículo ${article.num}')">
                    Art. ${article.num}: ${article.tags?.join(', ')}
                </div>
            `).join('');
        } else {
            suggestions.innerHTML = '';
        }
    }

    // Mostrar ejemplos de consultas
    showExamples() {
        const examples = [
            "Artículo 47: Despido injustificado",
            "¿Cuánto tiempo tengo para demandar?",
            "Derechos en caso de acoso laboral",
            "Jornada laboral máxima",
            "Cómo calcular mi finiquito",
            "Requisitos para el aguinaldo"
        ];
        
        this.displayMessage(`
            <div class="examples">
                <h3>📌 Ejemplos de consultas:</h3>
                <ul>
                    ${examples.map(ex => 
                        `<li onclick="this.fillInput('${ex}')">${ex}</li>`
                    ).join('')}
                </ul>
                <p>Haz clic en cualquier ejemplo para probarlo.</p>
            </div>
        `, 'bot');
    }

    // Mostrar mensajes en el chat
    displayMessage(text, sender) {
        const chatbox = document.getElementById('chatbox');
        
        // Ocultar loader si está visible
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';
        
        // Crear mensaje
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.innerHTML = text;
        chatbox.appendChild(messageDiv);
        
        // Auto-scroll
        chatbox.scrollTop = chatbox.scrollHeight;
        
        // Guardar en historial
        if (sender === 'user') {
            this.conversationHistory.push({ role: 'user', content: text });
        } else {
            this.conversationHistory.push({ role: 'assistant', content: text });
            
            // Limitar historial
            if (this.conversationHistory.length > CONFIG.maxHistory * 2) {
                this.conversationHistory = this.conversationHistory.slice(-CONFIG.maxHistory * 2);
            }
        }
    }

    // Mensaje de bienvenida mejorado
    greetUser() {
        this.displayMessage(`
            <div class="welcome-message">
                <h2>👋 ¡Hola! Soy <strong>Sofía LFT</strong></h2>
                <p>Tu asistente especializado en la <strong>Ley Federal del Trabajo</strong> de México.</p>
                
                <div class="features">
                    <h3>📌 Puedo ayudarte con:</h3>
                    <ul>
                        <li>Búsqueda de <strong>artículos específicos</strong> (ej: "Artículo 123")</li>
                        <li>Explicación de <strong>conceptos legales</strong> (ej: "despido injustificado")</li>
                        <li>Guía para <strong>procedimientos</strong> (ej: "cómo demandar")</li>
                        <li>Cálculo de <strong>derechos laborales</strong> (ej: "liquidación")</li>
                    </ul>
                </div>
                
                <div class="tip">
                    <p>💡 <strong>Tip:</strong> Usa términos precisos como "jornada laboral", "vacaciones" o "salario mínimo".</p>
                </div>
            </div>
        `, 'bot');
    }

    // Control de estado de carga
    toggleLoading(loading) {
        this.isLoading = loading;
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = loading ? 'block' : 'none';
    }
}

// Funciones globales para interactuar desde HTML
window.fillInput = function(text) {
    const input = document.getElementById('userInput');
    input.value = text;
    input.focus();
};

window.showRelatedArticles = function(artNum) {
    // Implementar lógica para artículos relacionados
    alert(`Mostrar artículos relacionados al ${artNum}`);
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Crear contenedor de sugerencias si no existe
    if (!document.getElementById('suggestions')) {
        const suggestions = document.createElement('div');
        suggestions.id = 'suggestions';
        document.querySelector('.input-container').appendChild(suggestions);
    }
    
    new SofiaLFT();
});
