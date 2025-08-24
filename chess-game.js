// Axios para peticiones HTTP a Ollama
let axios;
if (typeof window !== 'undefined') {
    axios = window.axios;
} else {
    axios = require('axios');
}

const SYSTEM_PROMPT = `You are a Chess Grandmaster playing a serious game. Your ONLY task is to select ONE valid move from the provided list of legal moves, using Standard Algebraic Notation (SAN).

CRITICAL REQUIREMENTS:
1. You MUST select EXACTLY ONE move from the provided legal moves list. DO NOT invent, modify, or ignore moves.
2. Your move MUST match EXACTLY one of the legal moves shown (case, format, and spelling).
3. DO NOT use coordinates (e2e4), only SAN (e.g., Nf3, exd5, O-O).
4. DO NOT add any extra text, comments, or explanations outside the JSON.
5. DO NOT wrap the JSON in code blocks or markdown.
6. DO NOT add any text before or after the JSON.
7. DO NOT return more than one move.
8. If you cannot select a move from the list, return an error in the reasoning field and leave the move field empty.
9. You must analyze all available pieces and moves, considering tactical and strategic factors, and always play as a Chess Grandmaster would.
10. Consider piece development, control of the center, king safety, threats, captures, and all positional and tactical elements before choosing your move.
11. If castling is available, consider its strategic value. If captures are available, evaluate their consequences. If checks or checkmates are possible, prioritize them.
12. Your reasoning must explain why the chosen move is the best among all legal options, referencing specific pieces, squares, and plans.

RESPONSE FORMAT:
{
  "move": "<your chosen move in EXACT SAN format>",
  "reasoning": "<your analysis and explanation>"
}

Example valid responses:
- {"move": "e4", "reasoning": "Advances the pawn to control the center and opens lines for the bishop and queen."}
- {"move": "Nf3", "reasoning": "Develops the knight, controls key central squares, and prepares for kingside castling."}
- {"move": "O-O", "reasoning": "Castles kingside to safeguard the king and connect the rooks."}
- {"move": "Bxe4", "reasoning": "Captures the pawn, gaining material and central control."}
- {"move": "Qh7#", "reasoning": "Delivers checkmate by attacking the king on h7."}

Previous game moves and current position will be provided. Respond ONLY with a valid JSON object as described above.`;

class ChessModelProvider {
   async makeMove({ fen, history, legalMoves }) {
       throw new Error('Method must be implemented');
   }
   
   validateResponse(moveData, legalMoves) {
       if (!moveData?.move || !legalMoves.includes(moveData.move)) {
           throw new Error(`Invalid move: ${moveData?.move}. Must be one of: ${legalMoves.join(', ')}`);
       }
       return moveData;
   }

   async retryWithBackoff(fn, maxRetries = 3) {
       for (let i = 0; i < maxRetries; i++) {
           try {
               return await fn();
           } catch (error) {
               if (i === maxRetries - 1) throw error;
               await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
           }
       }
   }
}

class GroqProvider extends ChessModelProvider {
   constructor(apiKey, model, temperature) {
       super();
       this.apiKey = apiKey;
       this.model = model;
       this.temperature = temperature;
   }

   async makeMove({ fen, history, legalMoves }) {
       return this.retryWithBackoff(async () => {
           const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
               method: 'POST',
               headers: {
                   'Authorization': `Bearer ${this.apiKey}`,
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                   messages: [
                       { role: "system", content: SYSTEM_PROMPT },
                       { role: "user", content: this.formatPrompt(fen, history, legalMoves) }
                   ],
                   model: this.model,
                   temperature: parseFloat(this.temperature),
                   max_tokens: 8024,
                   response_format: { type: "json_object" }
               })
           });

           if (!response.ok) {
               throw new Error(`Groq API Error: ${response.status} ${response.statusText}`);
           }

           const data = await response.json();
           return this.validateResponse(JSON.parse(data.choices[0].message.content), legalMoves);
       });
   }

   formatPrompt(fen, history, legalMoves) {
       return `Current position (FEN): ${fen}
Game history: ${history || 'Opening position'}
Legal moves: ${legalMoves.join(', ')}

Choose a legal move from the provided list.
Your move MUST match exactly one of the legal moves shown above.
Respond with a JSON containing your chosen move and reasoning.`;
   }
}

class OpenAIProvider extends ChessModelProvider {
   constructor(apiKey, model, temperature) {
       super();
       this.apiKey = apiKey;
       this.model = model;
       this.temperature = temperature;
   }

   async makeMove({ fen, history, legalMoves }) {
       return this.retryWithBackoff(async () => {
           const response = await fetch('https://api.openai.com/v1/chat/completions', {
               method: 'POST',
               headers: {
                   'Authorization': `Bearer ${this.apiKey}`,
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                   messages: [
                       { role: "system", content: SYSTEM_PROMPT },
                       { role: "user", content: this.formatPrompt(fen, history, legalMoves) }
                   ],
                   model: this.model,
                   temperature: parseFloat(this.temperature),
                   response_format: { type: "json_object" }
               })
           });

           if (!response.ok) {
               throw new Error(`OpenAI API Error: ${response.status} ${response.statusText}`);
           }

           const data = await response.json();
           return this.validateResponse(JSON.parse(data.choices[0].message.content), legalMoves);
       });
   }

   formatPrompt(fen, history, legalMoves) {
       return `Current position (FEN): ${fen}
Game history: ${history || 'Opening position'}
Legal moves: ${legalMoves.join(', ')}

Choose a legal move from the provided list.
Your move MUST match exactly one of the legal moves shown above.
Respond with a JSON containing your chosen move and reasoning.`;
   }
}

class GrokProvider extends ChessModelProvider {
   constructor(apiKey, model, temperature) {
       super();
       this.apiKey = apiKey;
       this.model = model;
       this.temperature = temperature;
   }

   async makeMove({ fen, history, legalMoves }) {
       return this.retryWithBackoff(async () => {
           const response = await fetch('https://api.x.ai/v1/chat/completions', {
               method: 'POST',
               headers: {
                   'Authorization': `Bearer ${this.apiKey}`,
                   'Content-Type': 'application/json'
               },
               body: JSON.stringify({
                   messages: [
                       { role: "system", content: SYSTEM_PROMPT },
                       { role: "user", content: this.formatPrompt(fen, history, legalMoves) }
                   ],
                   model: this.model,
                   temperature: parseFloat(this.temperature),
                   stream: false
               })
           });

           if (!response.ok) {
               throw new Error(`Grok API Error: ${response.status} ${response.statusText}`);
           }

           const data = await response.json();
           return this.validateResponse(JSON.parse(data.choices[0].message.content), legalMoves);
       });
   }

   formatPrompt(fen, history, legalMoves) {
       return `Current position (FEN): ${fen}
Game history: ${history || 'Opening position'}
Legal moves: ${legalMoves.join(', ')}

Choose a legal move from the provided list.
Your move MUST match exactly one of the legal moves shown above.
Respond with a JSON containing your chosen move and reasoning.`;
   }
}

class GeminiProvider extends ChessModelProvider {
    constructor(apiKey, model, temperature) {
        super();
        this.apiKey = apiKey;
        this.model = model;
        this.temperature = temperature;
    }

    async makeMove({ fen, history, legalMoves }) {
        return this.retryWithBackoff(async () => {
            const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [
                        {
                            role: 'user',
                            parts: [{ text: SYSTEM_PROMPT }]
                        },
                        {
                            role: 'user',
                            parts: [{ text: this.formatPrompt(fen, history, legalMoves) }]
                        }
                    ],
                    generationConfig: {
                        temperature: parseFloat(this.temperature),
                        topP: 0.95,
                        topK: 40,
                        maxOutputTokens: 8192,
                        stopSequences: []
                    }
                })
            });

            if (!response.ok) {
                throw new Error(`Gemini API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
                throw new Error('Invalid response format from Gemini API');
            }

            let responseText = data.candidates[0].content.parts[0].text;
            responseText = responseText.replace(/```json\s*|\s*```/g, '').trim();
            const moveData = JSON.parse(responseText);

            return this.validateResponse(moveData, legalMoves);
        });
    }

    formatPrompt(fen, history, legalMoves) {
        return `Current position (FEN): ${fen}
Game history: ${history || 'Opening position'}
Legal moves: ${legalMoves.join(', ')}

Choose a legal move from the provided list.
Your move MUST match exactly one of the legal moves shown above.
Respond with a JSON containing your chosen move and reasoning.`;
    }
}

class OpenRouterProvider extends ChessModelProvider {
    constructor(apiKey, model, temperature) {
        super();
        this.apiKey = apiKey;
        this.model = model;
        this.temperature = temperature;
    }

    async makeMove({ fen, history, legalMoves }) {
        return this.retryWithBackoff(async () => {
            const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin // OpenRouter requiere esto
                },
                body: JSON.stringify({
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        { role: "user", content: this.formatPrompt(fen, history, legalMoves) }
                    ],
                    model: this.model,
                    temperature: parseFloat(this.temperature),
                    response_format: { type: "json_object" }
                })
            });

            if (!response.ok) {
                throw new Error(`OpenRouter API Error: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            return this.validateResponse(JSON.parse(data.choices[0].message.content), legalMoves);
        });
    }

    formatPrompt(fen, history, legalMoves) {
        return `
Current board position (FEN): ${fen}

Game history:
${history.map(move => `${move.moveNumber}. ${move.san}`).join('\n')}

Legal moves: ${legalMoves.join(', ')}

Based on the current board position and game history, select one move from the legal moves list.
Think carefully and choose the best move according to sound chess principles.
Respond in the required JSON format with your move and reasoning.
`;
    }
}

class OllamaProvider extends ChessModelProvider {
    constructor(model, temperature) {
        super();
        this.model = model;
        this.temperature = temperature;
    }

    async makeMove({ fen, history, legalMoves }) {
        return this.retryWithBackoff(async () => {
            const prompt = SYSTEM_PROMPT + '\n' +
                `Current position (FEN): ${fen}\nGame history: ${history || 'Opening position'}\nLegal moves: ${legalMoves.join(', ')}\nChoose a legal move from the provided list. Your move MUST match exactly one of the legal moves shown above. Respond with a JSON containing your chosen move and reasoning.`;
            const response = await axios.post('http://localhost:11434/api/generate', {
                model: this.model,
                prompt,
                options: {
                    temperature: parseFloat(this.temperature)
                },
                stream: false
            });
            if (response.status !== 200) throw new Error('Ollama API error');
            let content = response.data.response.trim();
            content = content.replace(/```json|```/g, '').trim();
            const moveData = JSON.parse(content);
            return this.validateResponse(moveData, legalMoves);
        });
    }
}

class ChessProviderFactory {
    // Ollama: obtener modelos dinámicamente
    static async fetchOllamaModels() {
        try {
            const response = await axios.get('http://localhost:3000/api/tags');
            if (response.status !== 200) throw new Error('Ollama server not available');
            const models = response.data.models || [];
            // Formato: { id: modelName, name: modelName }
            return models.map(m => ({ id: m.name, name: m.name }));
        } catch (err) {
            console.error('Error fetching Ollama models:', err);
            return [];
        }
    }
    // Use the external configuration file
    static get PROVIDERS() {
        console.log(" ChessProviderFactory.PROVIDERS getter called");
        console.log(" PROVIDERS_CONFIG type:", typeof PROVIDERS_CONFIG);
        console.log(" PROVIDER_CONFIG type:", typeof PROVIDER_CONFIG);
        
        if (typeof PROVIDERS_CONFIG !== 'undefined') {
            console.log(" Using PROVIDERS_CONFIG");
            console.log(" Available providers:", Object.keys(PROVIDERS_CONFIG));
            return PROVIDERS_CONFIG;
        }
        
        if (typeof PROVIDER_CONFIG !== 'undefined') {
            console.log(" Using PROVIDER_CONFIG");
            console.log(" Available providers:", Object.keys(PROVIDER_CONFIG));
            return PROVIDER_CONFIG;
        }
        
        console.log(" No config found, returning empty object");
        return {};
    }

    static getProviders() {
        console.log(" ChessProviderFactory.getProviders called");
        const providers = Object.keys(this.PROVIDERS).map(key => ({
            id: key,
            name: this.PROVIDERS[key].displayName
        }));
        console.log(" Provider list:", JSON.stringify(providers, null, 2));
        return providers;
    }

    static async getModelsByProvider(providerId) {
        if (providerId === 'ollama') {
            return await this.fetchOllamaModels();
        }
        const provider = this.PROVIDERS[providerId];
        if (!provider) return [];
        return Object.keys(provider.models).map(key => ({
            id: key,
            name: provider.models[key].displayName
        }));
    }

    static getTempRange(providerId, modelId) {
        console.log(` ChessProviderFactory.getTempRange called for provider: ${providerId}, model: ${modelId}`);
        const range = this.PROVIDERS[providerId]?.models[modelId]?.tempRange || { min: 0.1, max: 1.0 };
        console.log(` Temperature range:`, JSON.stringify(range, null, 2));
        return range;
    }

    static createProvider(providerId, modelId, apiKey, temperature) {
        console.log(` ChessProviderFactory.createProvider called`);
        console.log(` Provider: ${providerId}, Model: ${modelId}, Temperature: ${temperature}`);
        console.log(` API Key present: ${apiKey ? 'Yes' : 'No'}`);
        
        switch(providerId) {
            case 'ollama':
                return new OllamaProvider(modelId, temperature);
            case 'groq':
                console.log(` Creating GroqProvider instance`);
                return new GroqProvider(apiKey, modelId, temperature);
            case 'openai':
                console.log(` Creating OpenAIProvider instance`);
                return new OpenAIProvider(apiKey, modelId, temperature);
            case 'gemini':
                console.log(` Creating GeminiProvider instance`);
                return new GeminiProvider(apiKey, modelId, temperature);
            case 'grok':
                console.log(` Creating GrokProvider instance`);
                return new GrokProvider(apiKey, modelId, temperature);
            case 'openrouter':
                console.log(` Creating OpenRouterProvider instance`);
                return new OpenRouterProvider(apiKey, modelId, temperature);
            default:
                console.log(` Unknown provider: ${providerId}`);
                throw new Error(`Unknown provider: ${providerId}`);
        }
    }
}


class ChessGame {
   constructor() {
       this.game = new Chess();
       this.board = null;
       this.currentPlayer = 'white';
       this.moveCount = 1;
       this.autoPlayInterval = null;
       this.isProcessingMove = false;
       this.debugMode = false;
       this.selectedPiece = null;
       this.legalMoves = new Map();
       this.initialized = false;
       this.initAsync();
   }

   async initAsync() {
       this.initializeBoard();
       this.initializeControls();
       await this.populateProviderDropdownsAsync();
       this.setupPlayerTypeChangeHandlers();
       this.loadSettings();
       this.loadSavedApiKeys();
       ['1', '2'].forEach(playerNum => this.updateApiKeyButtons(playerNum));
       $(window).resize(() => this.board.resize());
       this.initialized = true;
       this.updatePlayerControls();
   }

   initialize() {
       this.initializeBoard();
       this.initializeControls();
       this.populateProviderDropdowns();
       this.setupPlayerTypeChangeHandlers();
       this.loadSettings();
       this.loadSavedApiKeys();
       ['1', '2'].forEach(playerNum => this.updateApiKeyButtons(playerNum));
       $(window).resize(() => this.board.resize());
   }

   initializeBoard() {
       const config = {
           position: 'start',
           showNotation: true,
           pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
           draggable: true,
           onDragStart: (source, piece) => this.onDragStart(source, piece),
           onDrop: (source, target) => this.onDrop(source, target),
           onMouseoutSquare: () => this.onMouseoutSquare(),
           onMouseoverSquare: (square) => this.onMouseoverSquare(square),
           onSnapEnd: () => this.board.position(this.game.fen())
       };

       this.board = Chessboard('board', config);
   }

   updateApiKeyButtons(playerNum) {
       const apiKeyInput = document.getElementById(`apiKey${playerNum}`);
       const providerSelect = document.getElementById(`provider${playerNum}`);
       const providerId = providerSelect.value;
       const savedKey = providerId ? localStorage.getItem(`${providerId}_api_key`) : null;
       const saveButton = document.getElementById(`saveApiKey${playerNum}`);
       const clearButton = document.getElementById(`clearApiKey${playerNum}`);

       saveButton.style.display = (apiKeyInput.value && apiKeyInput.value !== savedKey) ? 'inline-block' : 'none';
       clearButton.style.display = savedKey ? 'inline-block' : 'none';
   }

   saveApiKey(playerNum) {
       const apiKeyInput = document.getElementById(`apiKey${playerNum}`);
       const providerSelect = document.getElementById(`provider${playerNum}`);
       const providerId = providerSelect.value;
       
       if (apiKeyInput.value && providerId) {
           localStorage.setItem(`${providerId}_api_key`, apiKeyInput.value);
           this.logDebug(`Saved API key for ${providerId}`);
           this.updateApiKeyButtons(playerNum);
       }
   }

   clearApiKey(playerNum) {
       const providerSelect = document.getElementById(`provider${playerNum}`);
       const providerId = providerSelect.value;
       
       if (providerId) {
           localStorage.removeItem(`${providerId}_api_key`);
           document.getElementById(`apiKey${playerNum}`).value = '';
           this.logDebug(`Cleared API key for ${providerId}`);
           this.updateApiKeyButtons(playerNum);
       }
   }

   loadApiKeyForModel(modelSelect) {
       const playerNum = modelSelect.id === 'model1' ? '1' : '2';
       const providerSelect = document.getElementById(`provider${playerNum}`);
       const providerId = providerSelect.value;
       const savedKey = providerId ? localStorage.getItem(`${providerId}_api_key`) : null;
       
       const apiKeyInput = document.getElementById(`apiKey${playerNum}`);
       apiKeyInput.value = savedKey || '';
       this.updateApiKeyButtons(playerNum);
   }

   onDragStart(source, piece) {
       const playerType = this.currentPlayer === 'white' ? 
           document.getElementById('playerType1').value :
           document.getElementById('playerType2').value;

       if (playerType !== 'human') return false;
       if (this.game.game_over()) return false;
       if ((this.currentPlayer === 'white' && piece.search(/^b/) !== -1) ||
           (this.currentPlayer === 'black' && piece.search(/^w/) !== -1)) {
           return false;
       }
       return true;
   }

   onMouseoverSquare(square) {
       const playerType = this.currentPlayer === 'white' ? 
           document.getElementById('playerType1').value :
           document.getElementById('playerType2').value;

       if (playerType !== 'human') return;

       const moves = this.game.moves({
           square: square,
           verbose: true
       });

       if (moves.length === 0) return;

       this.greySquare(square);

       for (let i = 0; i < moves.length; i++) {
           this.greySquare(moves[i].to);
       }
   }

   onMouseoutSquare() {
       $('.square-55d63').css('background', '');
   }

   greySquare(square) {
       const $square = $('.square-' + square);
       const background = $square.hasClass('black-3c85d') ? '#696969' : '#a9a9a9';
       $square.css('background', background);
   }

   onDrop(source, target) {
       const playerType = this.currentPlayer === 'white' ? 
           document.getElementById('playerType1').value :
           document.getElementById('playerType2').value;

       if (playerType !== 'human') return 'snapback';

       const move = this.game.move({
           from: source,
           to: target,
           promotion: 'q'
       });

       if (move === null) return 'snapback';

       this.logMove({
           move: move.san,
           reasoning: "Human player's move"
       });

       this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
       this.moveCount++;
       this.updateStatus();

       if (this.game.game_over()) {
           this.handleGameOver();
           return;
       }

       const nextPlayerType = this.currentPlayer === 'white' ? 
           document.getElementById('playerType1').value :
           document.getElementById('playerType2').value;

       if (nextPlayerType === 'ai') {
           setTimeout(() => this.makeMove(), 500);
       }
   }

   async populateProviderDropdownsAsync() {
       const providers = ChessProviderFactory.getProviders();
       ['1', '2'].forEach(playerNum => {
           const select = document.getElementById(`provider${playerNum}`);
           if (!select) return;
           const currentValue = select.value;
           const newSelect = document.createElement('select');
           newSelect.id = `provider${playerNum}`;
           newSelect.innerHTML = '';
           newSelect.appendChild(new Option('Select Provider', ''));
           providers.forEach(provider => {
               newSelect.appendChild(new Option(provider.name, provider.id));
           });
           if (currentValue) newSelect.value = currentValue;
           newSelect.addEventListener('change', async (e) => {
               const providerId = e.target.value;
               const modelGroup = document.getElementById(`modelGroup${playerNum}`);
               const apiKeyGroup = document.getElementById(`apiKeyGroup${playerNum}`);
               modelGroup.style.display = providerId ? 'block' : 'none';
               apiKeyGroup.style.display = providerId ? 'block' : 'none';
               // Mostrar el campo modelo y label aunque no haya modelos aún
               document.getElementById(`modelLabel${playerNum}`).style.display = providerId ? '' : 'none';
               document.getElementById(`model${playerNum}`).style.display = providerId ? '' : 'none';
               document.getElementById(`model${playerNum}Error`).style.display = 'none';
               if (providerId) {
                   await this.populateModelDropdownAsync(playerNum, providerId);
                   this.loadApiKeyForProvider(playerNum, providerId);
               } else {
                   // Si no hay proveedor, ocultar modelo
                   document.getElementById(`modelLabel${playerNum}`).style.display = 'none';
                   document.getElementById(`model${playerNum}`).style.display = 'none';
                   document.getElementById(`model${playerNum}Error`).style.display = 'none';
               }
               this.saveSettings();
           });
           select.parentNode.replaceChild(newSelect, select);
           // Forzar recarga visual del modelo si ya hay proveedor seleccionado
           if (newSelect.value) {
               document.getElementById(`modelGroup${playerNum}`).style.display = 'block';
               document.getElementById(`modelLabel${playerNum}`).style.display = '';
               document.getElementById(`model${playerNum}`).style.display = '';
               this.populateModelDropdownAsync(playerNum, newSelect.value);
           }
       });
   }

   async populateModelDropdownAsync(playerNum, providerId) {
       const select = document.getElementById(`model${playerNum}`);
       const label = document.getElementById(`modelLabel${playerNum}`);
       const errorSpan = document.getElementById(`model${playerNum}Error`);
       if (!select || !label || !errorSpan) return;
       select.style.display = 'none';
       label.style.display = 'none';
       errorSpan.style.display = 'none';
       select.innerHTML = '';

       // Ollama: escanear modelos realmente disponibles
       if (providerId === 'ollama') {
           label.style.display = '';
           select.style.display = '';
           select.innerHTML = '<option value="">Cargando modelos...</option>';
           try {
               const response = await axios.get('http://localhost:3000/ollama/api/tags');
               let models = [];
               let rawJson = null;
               // Log para depuración
               console.log('Ollama response:', response);
               if (response && response.data) {
                   if (typeof response.data === 'string') {
                       try {
                           rawJson = JSON.parse(response.data);
                       } catch (e) {
                           rawJson = null;
                       }
                   } else if (typeof response.data === 'object') {
                       rawJson = response.data;
                   }
               }
               if (rawJson && rawJson.models && Array.isArray(rawJson.models)) {
                   models = rawJson.models;
               }
               // Si no hay modelos, mostrar select vacío pero visible
               if (!models || models.length === 0) {
                   select.innerHTML = '<option value="">No hay modelos Ollama instalados</option>';
                   errorSpan.textContent = 'No hay modelos Ollama instalados.';
                   errorSpan.style.display = '';
                   select.style.display = '';
                   label.style.display = '';
                   return;
               }
               select.innerHTML = '<option value="">Selecciona modelo</option>';
               models.forEach(model => {
                   const opt = document.createElement('option');
                   opt.value = model.name;
                   opt.textContent = model.name;
                   select.appendChild(opt);
               });
               errorSpan.style.display = 'none';
               select.style.display = '';
               label.style.display = '';
           } catch (err) {
               select.innerHTML = '<option value="">Error al cargar modelos Ollama</option>';
               errorSpan.textContent = 'Error al cargar modelos Ollama.';
               errorSpan.style.display = '';
               select.style.display = '';
               label.style.display = '';
           }
           return;
       }

       // Otros proveedores: mostrar solo si tienen modelos definidos
       const providerConfig = window.PROVIDER_CONFIG ? window.PROVIDER_CONFIG[providerId] : undefined;
       if (providerConfig && providerConfig.models && Object.keys(providerConfig.models).length > 0) {
           label.style.display = '';
           select.style.display = '';
           select.innerHTML = '<option value="">Selecciona modelo</option>';
           Object.entries(providerConfig.models).forEach(([modelId, modelCfg]) => {
               const opt = document.createElement('option');
               opt.value = modelId;
               opt.textContent = modelCfg.displayName || modelId;
               select.appendChild(opt);
           });
       } else {
           select.style.display = 'none';
           label.style.display = 'none';
       }
   }

   loadApiKeyForProvider(playerNum, providerId) {
       const savedKey = providerId ? localStorage.getItem(`${providerId}_api_key`) : null;
       
       const apiKeyInput = document.getElementById(`apiKey${playerNum}`);
       apiKeyInput.value = savedKey || '';
       this.updateApiKeyButtons(playerNum);
   }

   initializeControls() {
        document.getElementById('startBtn').addEventListener('click', () => this.startNewGame());
        document.getElementById('stepBtn').addEventListener('click', () => this.makeMove());
        document.getElementById('copyPgn').addEventListener('click', () => this.copyPgnToClipboard());

        // Button event listeners
        const setupButtonListener = (id, callback) => {
            const button = document.getElementById(id);
            if (button) {
                button.addEventListener('click', callback);
            }
        };

        setupButtonListener('startBtn', () => this.startNewGame());
        setupButtonListener('stepBtn', () => this.makeMove());
        setupButtonListener('copyPgn', () => this.copyPgnToClipboard());

        // Save model selection button
        setupButtonListener('saveSelectionBtn', () => {
            this.saveSettings();
            // Show feedback to user
            const btn = document.getElementById('saveSelectionBtn');
            btn.textContent = '¡Selección guardada!';
            setTimeout(() => { btn.textContent = 'Guardar Selección de Modelos'; }, 1500);
        });

        // API key handling
        ['1', '2'].forEach(playerNum => {
            const apiKeyInput = document.getElementById(`apiKey${playerNum}`);
            if (apiKeyInput) {
                apiKeyInput.addEventListener('input', () => {
                    this.updateApiKeyButtons(playerNum);
                });
            }
            setupButtonListener(`saveApiKey${playerNum}`, () => this.saveApiKey(playerNum));
            setupButtonListener(`clearApiKey${playerNum}`, () => this.clearApiKey(playerNum));
        });
    }

   setupPlayerTypeChangeHandlers() {
       ['1', '2'].forEach(playerNum => {
           const select = document.getElementById(`playerType${playerNum}`);
            
           // Create a new select element and copy all options
           const newSelect = select.cloneNode(true); // Use deep clone to include all child elements
           select.parentNode.replaceChild(newSelect, select);
           newSelect.value = select.value; // Preserve the current value
            
           // Add new event listener
           newSelect.addEventListener('change', () => {
               const isAI = newSelect.value === 'ai';
               const aiSettings = document.getElementById(`aiSettings${playerNum}`);
               aiSettings.style.display = isAI ? 'block' : 'none';
                
               if (isAI) {
                   // Make sure provider dropdown is visible
                   console.log(`Player ${playerNum} changed to AI, showing provider dropdown`);
                   
                   // Reset provider dropdown if needed
                   const providerSelect = document.getElementById(`provider${playerNum}`);
                   if (!providerSelect.value) {
                       this.populateProviderDropdowns();
                   }
               }
                
               this.saveSettings();
               this.updatePlayerControls();
           });
       });
   }

   loadSettings() {
       const settings = JSON.parse(localStorage.getItem('chessSettings') || '{}');
       ['playerType1', 'provider1', 'model1', 'temp1', 'playerType2', 'provider2', 'model2', 'temp2'].forEach(key => {
           const element = document.getElementById(key);
           if (settings[key]) {
               element.value = settings[key];
               if (key.startsWith('temp')) {
                   document.getElementById(key + 'Value').textContent = settings[key];
               }
           }
       });

       // Update temperature ranges for saved models
       ['1', '2'].forEach(playerNum => {
           const providerId = document.getElementById(`provider${playerNum}`).value;
           const modelId = document.getElementById(`model${playerNum}`).value;
           if (providerId && modelId) {
               this.updateTempRange(playerNum, providerId, modelId);
           }
       });
        
       this.updatePlayerControls();
   }

   loadSavedApiKeys() {
       ['1', '2'].forEach(playerNum => {
           const providerId = document.getElementById(`provider${playerNum}`).value;
           if (providerId) {
               const savedKey = localStorage.getItem(`${providerId}_api_key`);
               if (savedKey) {
                   document.getElementById(`apiKey${playerNum}`).value = savedKey;
                   this.logDebug(`Loaded saved API key for ${providerId}`);
               }
           }
       });
   }

   saveSettings() {
       const settings = {
           playerType1: document.getElementById('playerType1').value,
           provider1: document.getElementById('provider1').value,
           model1: document.getElementById('model1').value,
           temp1: document.getElementById('temp1').value,
           playerType2: document.getElementById('playerType2').value,
           provider2: document.getElementById('provider2').value,
           model2: document.getElementById('model2').value,
           temp2: document.getElementById('temp2').value
       };
       localStorage.setItem('chessSettings', JSON.stringify(settings));
       this.updatePlayerControls();
   }

   updatePlayerControls() {
       ['1', '2'].forEach(player => {
           const playerType = document.getElementById(`playerType${player}`).value;
           const aiSettings = document.getElementById(`aiSettings${player}`);
           aiSettings.style.display = playerType === 'ai' ? 'block' : 'none';
            
           // If playerType is 'ai', show model group only if provider is selected
           if (playerType === 'ai') {
               const providerId = document.getElementById(`provider${player}`).value;
               document.getElementById(`modelGroup${player}`).style.display = providerId ? 'block' : 'none';
               document.getElementById(`apiKeyGroup${player}`).style.display = providerId ? 'block' : 'none';
           }
       });

       const currentPlayerNum = this.currentPlayer === 'white' ? '1' : '2';
       const currentPlayerType = document.getElementById(`playerType${currentPlayerNum}`).value;
       document.getElementById('stepBtn').disabled = currentPlayerType !== 'ai' || this.game.game_over();
   }

   async makeMove() {
       if (this.isProcessingMove || this.game.game_over()) return false;
       this.isProcessingMove = true;
       document.getElementById('stepBtn').disabled = true;

       try {
           const player = this.currentPlayer === 'white' ? 1 : 2;
           const playerType = document.getElementById(`playerType${player}`).value;

           if (playerType === 'human') {
               this.isProcessingMove = false;
               document.getElementById('stepBtn').disabled = false;
               return false;
           }

           const providerId = document.getElementById(`provider${player}`).value;
           const modelId = document.getElementById(`model${player}`).value;
           const apiKey = document.getElementById(`apiKey${player}`).value;
           const temperature = document.getElementById(`temp${player}`).value;

           // Only require API key for providers that need it
           if (providerId !== 'ollama' && !apiKey) {
               throw new Error(`API key required for ${this.currentPlayer} player`);
           }

           const provider = ChessProviderFactory.createProvider(providerId, modelId, apiKey, temperature);
           let moveData;
           let modelError = null;
           let maxRetries = parseInt(document.getElementById('maxRetries')?.value || '3');
           for (let attempt = 0; attempt < maxRetries; attempt++) {
               try {
                   moveData = await provider.makeMove({
                       fen: this.game.fen(),
                       history: this.game.history(), // Pasa el historial como array
                       legalMoves: this.game.moves()
                   });
                   // Validar el movimiento aquí también
                   if (moveData && moveData.move && this.game.moves().includes(moveData.move)) {
                       break;
                   } else {
                       throw new Error(`Invalid move from model: ${moveData?.move}`);
                   }
               } catch (err) {
                   modelError = err;
                   moveData = null;
               }
           }

           let move = moveData && moveData.move ? this.game.move(moveData.move) : null;
           let usedMove = moveData && moveData.move ? moveData.move : null;
           let reasoning = moveData && moveData.reasoning ? moveData.reasoning : '';

           if (!move) {
               // Si el modelo falla tras varios intentos, elige uno aleatorio
               const legalMoves = this.game.moves();
               const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
               move = this.game.move(randomMove);
               usedMove = randomMove;
               reasoning = 'El modelo falló tras varios intentos, se eligió un movimiento válido aleatorio.';
               if (modelError) this.logError(modelError);
               else this.logError(new Error('El modelo devolvió un movimiento inválido. Se forzó un movimiento aleatorio.'));
           }

           this.board.position(this.game.fen());
           this.logMove({ move: usedMove, reasoning });
           if (this.debugMode) {
               this.logDebug(`[LLM Output] Move: ${moveData && moveData.move ? moveData.move : 'N/A'} | Reasoning: ${moveData && moveData.reasoning ? moveData.reasoning : 'N/A'} | Error: ${modelError ? modelError.message : 'N/A'}`);
           }
           this.currentPlayer = this.currentPlayer === 'white' ? 'black' : 'white';
           this.moveCount++;
           this.updateStatus();

           if (this.game.game_over()) {
               this.handleGameOver();
               return false;
           }

           const nextPlayerType = this.currentPlayer === 'white' ? 
               document.getElementById('playerType1').value :
               document.getElementById('playerType2').value;

           // Si el siguiente jugador es AI y no está en auto-play, llama a makeMove automáticamente
           if (nextPlayerType === 'ai' && !document.getElementById('autoPlay').checked) {
               setTimeout(() => this.makeMove(), 500);
           }

           if (nextPlayerType === 'ai' && document.getElementById('autoPlay').checked) {
               return true;
           }

           return false;
       } catch (error) {
           this.logError(error);
           return false;
       } finally {
           this.isProcessingMove = false;
           document.getElementById('stepBtn').disabled = false;
           this.updatePlayerControls();
       }
   }

   toggleAutoPlay(enabled) {
       if (enabled && !this.game.game_over()) {
           const delay = parseInt(document.getElementById('moveDelay').value);
           this.autoPlayInterval = setInterval(async () => {
               if (this.game.game_over() || !document.getElementById('autoPlay').checked) {
                   this.toggleAutoPlay(false);
                   document.getElementById('autoPlay').checked = false;
                   return;
               }
               
               const playerType = this.currentPlayer === 'white' ? 
                   document.getElementById('playerType1').value :
                   document.getElementById('playerType2').value;

               if (playerType === 'ai') {
                   const shouldContinue = await this.makeMove();
                   if (!shouldContinue) {
                       this.toggleAutoPlay(false);
                       document.getElementById('autoPlay').checked = false;
                   }
               }
           }, delay);
       } else if (this.autoPlayInterval) {
           clearInterval(this.autoPlayInterval);
           this.autoPlayInterval = null;
       }
   }

   startNewGame() {
       if (this.autoPlayInterval) {
           this.toggleAutoPlay(false);
       }
       this.game = new Chess();
       this.board.position('start');
       this.currentPlayer = 'white';
       this.moveCount = 1;
       document.getElementById('reasoningLog').innerHTML = '';
       document.getElementById('stepBtn').disabled = false;
       document.getElementById('autoPlay').checked = false;
       this.isProcessingMove = false;
       this.logDebug('Starting new game');
       this.updateStatus();
       this.updatePlayerControls();

       const whitePlayerType = document.getElementById('playerType1').value;
       if (whitePlayerType === 'ai') {
           setTimeout(() => this.makeMove(), 500);
       }
   }

   handleGameOver() {
       this.toggleAutoPlay(false);
       document.getElementById('autoPlay').checked = false;
       document.getElementById('stepBtn').disabled = true;
       let result = '';
       if (this.game.in_checkmate()) {
           result = `Checkmate! ${this.currentPlayer === 'white' ? 'Black' : 'White'} wins!`;
       } else if (this.game.in_draw()) {
           result = "Game ended in a draw!";
       } else if (this.game.in_stalemate()) {
           result = "Game ended in stalemate!";
       }
       
       this.logMessage(result);
       this.logDebug(`Game over: ${result}`);
       this.updateStatus();
   }

   updateStatus() {
       document.getElementById('turnIndicator').textContent = `Turn: ${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)}`;
       document.getElementById('moveIndicator').textContent = `Move: ${this.moveCount}`;
       let status = 'In Progress';

       if (this.game.in_checkmate()) status = 'Checkmate';
       else if (this.game.in_check()) status = 'Check';
       else if (this.game.in_draw()) status = 'Draw';
       else if (this.game.in_stalemate()) status = 'Stalemate';
       document.getElementById('gameStatus').textContent = `Status: ${status}`;
       this.updatePlayerControls();
   }

   logMove(moveData) {
       const reasoningLog = document.getElementById('reasoningLog');
       const entry = document.createElement('div');
       entry.className = `move-entry ${this.currentPlayer}`;
       
       const playerNum = this.currentPlayer === 'white' ? '1' : '2';
       const playerType = document.getElementById(`playerType${playerNum}`).value;
       const providerId = document.getElementById(`provider${playerNum}`).value;
       const modelName = playerType === 'ai' ? 
           ` (${document.getElementById(`model${playerNum}`).value})` : 
           ' (Human)';

       entry.innerHTML = `
           <strong>${this.currentPlayer.charAt(0).toUpperCase() + this.currentPlayer.slice(1)} Move ${this.moveCount}:</strong> ${moveData.move}${modelName}<br>
           <strong>Reasoning:</strong> ${moveData.reasoning}
       `;
       reasoningLog.insertBefore(entry, reasoningLog.firstChild);
   }

   logError(error) {
       const entry = document.createElement('div');
       entry.className = 'move-entry error';
       entry.innerHTML = `<strong>Error:</strong> ${error.message}`;
       document.getElementById('reasoningLog').insertBefore(entry, reasoningLog.firstChild);
   }

   logMessage(message) {
       const entry = document.createElement('div');
       entry.className = 'move-entry';
       entry.innerHTML = `<strong>Game:</strong> ${message}`;
       document.getElementById('reasoningLog').insertBefore(entry, reasoningLog.firstChild);
   }

    logDebug(message) {
       if (!this.debugMode) return;
       const entry = document.createElement('div');
       entry.className = 'move-entry debug';
       entry.innerHTML = `<strong>[DEBUG]:</strong> ${message}`;
       document.getElementById('reasoningLog').insertBefore(entry, reasoningLog.firstChild);
   }

   copyPgnToClipboard() {
       const pgn = this.game.pgn();
       navigator.clipboard.writeText(pgn)
           .then(() => this.logMessage('PGN copied to clipboard'))
           .catch(error => this.logError('Failed to copy PGN'));
   }
}

window.addEventListener('load', () => {
   window.game = new ChessGame();
});
