let carte = [];
    let deck = [];
    let players = [];
    let marketCards = [];
    let currentPlayer = 0;
    let selectedCard = null;
    let turnState = 'START';

    async function caricaCarte(csvText) {
    carte = []; // Reset dell'array carte
    try {
        const righe = csvText.split('\n').filter(riga => riga.trim());
        if (righe.length < 2) {
            throw new Error('Il CSV non contiene dati validi');
        }

        const intestazioni = righe[0].split(',').map(h => h.trim());
        
        for (let i = 1; i < righe.length; i++) {
            const valori = righe[i].split(',').map(v => v.trim());
            if (valori.length !== intestazioni.length) continue;
            
            const carta = {};
            for (let j = 0; j < intestazioni.length; j++) {
                carta[intestazioni[j]] = valori[j];
            }
            carte.push(carta);
        }

        if (carte.length === 0) {
            throw new Error('Nessuna carta valida trovata nel CSV');
        }

        console.log(`Caricate ${carte.length} carte con successo`);
        document.getElementById('startButton').disabled = false;
    } catch (error) {
        console.error('Errore nel parsing del CSV:', error);
        throw new Error('Errore nella lettura del file CSV: ' + error.message);
    }
}
	

    async function startGame() {
    const playerCount = parseInt(document.getElementById('playerCount').value);
    if(!playerCount){
      console.log('non hai selezionato il numero di giocatori');
      return;
    }
    if (playerCount < 2 || playerCount > 4) {
        alert('Inserire un numero di giocatori tra 2 e 4');
        return;
    }

    const csvSource = document.getElementById('csvSource').value;

    
    
    try {
        if (csvSource === 'official') {
            const csvUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSXDu5cclp63cI_8HQAYXqiwS4bQ7RQitiis_m0_dMw8oJM5hJ9hMrI1R6MBNRUGmbsDY4Mz7xvWzhF/pub?gid=1066411849&single=true&output=csv";
            await caricaCarteDaLink(csvUrl);
        }
        initializeGame(playerCount);
    } catch (error) {
        console.error('Errore durante l\'avvio del gioco:', error);
        alert('Si è verificato un errore durante il caricamento delle carte. Riprova.');
    }
}

async function caricaCarteDaLink(url) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            mode: 'cors',
            headers: {
                'Accept': 'text/csv'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        if (!csvText) {
            throw new Error('CSV vuoto');
        }
        
        await caricaCarte(csvText);
    } catch (error) {
        console.error('Errore nel caricamento del CSV dal link:', error);
        throw new Error('Impossibile caricare il CSV dal link specificato');
    }
}


function initializeGame(playerCount) {
    deck = [...carte];
    players = [];
    marketCards = [];
    currentPlayer = 0;
    turnState = 'START';
    document.getElementById('setup').style.display = 'none';
    document.getElementById('game').style.display = 'block';
    shuffleDeck();
    for (let i = 0; i < playerCount; i++) {
        players.push({
            id: i,
            points: 0,
            money: 0,
            cards: []
        });
    }
    for (let i = 0; i < playerCount; i++) {
        players[i].cards.push(deck.pop());
    }
    for (let i = 0; i < 6; i++) {
        if (deck.length > 0) {
            marketCards.push(deck.pop());
        }
    }
    updateCurrentPlayer();
    renderGame();
}

    function getCardIcon(category) {
      const icons = {
        'Vaso': '🏺',
        'Piatto': '🍽️',
        'Piastrella': '🔲',
        'Opera Speciale': '🗿'
      };
      return icons[category] || '❓';
    }

    function getDifficultyStars(difficulty) {
      const stars = {
        'Facile': '⭐',
        'Medio': '⭐⭐',
        'Difficile': '⭐⭐⭐'
      };
      return stars[difficulty] || '';
    }

    function shuffleDeck() {
      for (let i = deck.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [deck[i], deck[j]] = [deck[j], deck[i]];
      }
    }

    function createCard(cardData) {
      const card = document.createElement('div');
      card.className = 'card';
      card.dataset.id = cardData.ID;

      card.innerHTML = `
    <div class="card-difficulty">${getDifficultyStars(cardData.Difficoltà)}</div>
    <div class="card-resources">
       ${cardData.Argilla > 0 ? `<span class="gray-square"></span>${cardData.Argilla} ` : ''}
	   
		
        ${cardData["Quantità Blu"] > 0 ? `🟦${cardData["Quantità Blu"]} ` : ''}
        ${cardData["Quantità Giallo"] > 0 ? `🟨${cardData["Quantità Giallo"]} ` : ''}
        ${cardData["Quantità Rosso"] > 0 ? `🟥${cardData["Quantità Rosso"]} ` : ''}
    </div>
    <div class="card-icon">${getCardIcon(cardData.Categoria)}</div> 
    <div class="card-title">${cardData.Nome}</div> 
    <div class="card-rewards">
        🏅${cardData["Punti Vittoria"]}
        ${cardData.Lire > 0 ? ` 🪙${cardData.Lire}` : ''}
    </div>
`;
  return card;
}


    function updateCurrentPlayer() {
    const currentPlayerElement = document.getElementById('currentPlayer');
    const turnText = getTurnStateText();
    currentPlayerElement.innerHTML = `
        Turno del Giocatore ${currentPlayer + 1}<br>
        <small>${turnText}</small>
    `;
}

function getTurnStateText() {
    switch(turnState) {
        case 'START':
            return 'Puoi prendere una carta dal mercato o passare';
        case 'DRAWN':
            return 'Puoi completare una carta o passare';
        case 'COMPLETED':
            return 'Puoi completare un\'altra carta o passare';
        case 'PASSED':
            return 'Hai passato il turno';
        default:
            return '';
    }
}


    function getActiveCardsCount(player) {
      return player.cards.filter(card => !card.completed).length;
    }

    function takeCardFromMarket(card) {
      if (turnState === 'START' && marketCards.includes(card)) {
        const currentPlayerObj = players[currentPlayer];
        if (getActiveCardsCount(currentPlayerObj) < 4) {
          showPlayerSelector(card);
        } else {
          alert('Hai già il numero massimo di carte attive (4)');
        }
      } else if (turnState !== 'START') {
        alert('Non puoi prendere carte in questa fase del turno');
      }
    }

    function showPlayerSelector(card) {
      selectedCard = card;
      const playerSelector = document.getElementById('playerSelector');
      const playerButtons = document.getElementById('playerButtons');

      playerButtons.innerHTML = '';
      const button = document.createElement('button');
      button.textContent = `Assegna al Giocatore ${currentPlayer + 1}`;
      button.onclick = () => assignCardToPlayer(currentPlayer);
      playerButtons.appendChild(button);
      playerSelector.style.display = 'block';
    }

    function hidePlayerSelector() {
      document.getElementById('playerSelector').style.display = 'none';
      selectedCard = null;
    }

    function assignCardToPlayer(playerIndex) {
      if (selectedCard && getActiveCardsCount(players[playerIndex]) < 4) {
        const cardIndex = marketCards.indexOf(selectedCard);
        if (cardIndex > -1) {
          marketCards.splice(cardIndex, 1);
          players[playerIndex].cards.push(selectedCard);
          if (deck.length > 0) {
            marketCards.push(deck.pop());
          }

          turnState = 'DRAWN';
          updateCurrentPlayer();
          renderGame();
        }
      }
      hidePlayerSelector();
    }

    function completeCard(player, card) {
      if ((turnState === 'DRAWN' || turnState === 'COMPLETED') &&
        !card.completed &&
        hasEnoughResources(player, card)) {
        card.completed = true;
        player.points += parseInt(card["Punti Vittoria"]);
        player.money += parseInt(card.Lire);
        turnState = 'COMPLETED';
        updateCurrentPlayer();
        renderGame();
      }
    }

    function hasEnoughResources(player, card) {
      return true;
    }

    function passTurn() {
      turnState = 'PASSED';
      updateCurrentPlayer();
      setTimeout(() => {
        currentPlayer = (currentPlayer + 1) % players.length;
        turnState = 'START';
        updateCurrentPlayer();
        renderGame();
      }, 1000);
    }

    function endGame() {
      const winner = players.reduce((prev, current) =>
        (prev.points > current.points) ? prev : current
      );
      const message = `
        Gioco terminato!\n
        Vincitore: Giocatore ${winner.id + 1}\n
        Punti: ${winner.points}\n
        Vuoi iniziare una nuova partita?
    `;

      if (confirm(message)) {
        document.getElementById('game').style.display = 'none';
        document.getElementById('setup').style.display = 'block';
      }
    }

    function renderGame() {
      const marketElement = document.getElementById('marketCards');
      marketElement.innerHTML = '';
      marketCards.forEach(card => {
        const cardElement = createCard(card);
        cardElement.onclick = () => takeCardFromMarket(card);
        marketElement.appendChild(cardElement);
      });

      const playerAreasElement = document.getElementById('playerAreas');
      playerAreasElement.innerHTML = '';

      const controls = document.createElement('div');
      controls.className = 'game-controls';
      controls.style.width = '100%';
      controls.style.marginBottom = '20px';
      controls.style.textAlign = 'center';

      const passButton = document.createElement('button');
      passButton.textContent = 'Passa';
      passButton.onclick = passTurn;
      passButton.style.marginRight = '10px';
      const endGameButton = document.createElement('button');
      endGameButton.textContent = 'Fine della Partita';
      endGameButton.onclick = endGame;

      controls.appendChild(passButton);
      controls.appendChild(endGameButton);
      playerAreasElement.appendChild(controls);

      players.forEach((player, index) => {
        const playerArea = document.createElement('div');
        playerArea.className = 'player-area';

        const isCurrentPlayer = index === currentPlayer;
        playerArea.innerHTML = `
            <h2>Giocatore ${player.id + 1} ${isCurrentPlayer ? '(Turno Attuale)' : ''}</h2>
            <div class="player-stats">
                <div>🏅 Punti: ${player.points}</div>
                <div>🪙 Lire: ${player.money}</div>
                <div>🎴 Carte attive: ${getActiveCardsCount(player)}/4</div>
            </div>
            <div class="player-cards"></div>
        `;

        const playerCards = playerArea.querySelector('.player-cards');
        player.cards.forEach(card => {
            const cardElement = createCard(card);
            if (card.completed) {
                cardElement.classList.add('completed');
            } else if (isCurrentPlayer) {
                cardElement.onclick = () => completeCard(player, card);
            }
            playerCards.appendChild(cardElement);
        });

        playerAreasElement.appendChild(playerArea);
    });
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const csvSource = document.getElementById('csvSource');
    const fileInput = document.getElementById('fileInput');
    const startButton = document.getElementById('startButton');

    csvSource.addEventListener('change', () => {
        if (csvSource.value === 'local') {
            fileInput.style.display = 'block';
            startButton.disabled = true; // Disabilita il pulsante finché non viene caricato un file
        } else {
            fileInput.style.display = 'none';
            startButton.disabled = false; // Abilita il pulsante per l'opzione CSV ufficiale
        }
    });

    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                const csvText = event.target.result;
                await caricaCarte(csvText);
                startButton.disabled = false;
            };
            reader.readAsText(file);
        }
    });

  fileInput.addEventListener('change', (event) => {
    const file = event.target.files[0];
    const reader = new FileReader();

    reader.onload = async (event) => {
      const csvText = event.target.result;
      await caricaCarte(csvText);

      // Abilita il pulsante "Inizia Partita" dopo il caricamento del CSV
      startButton.disabled = false;
    };

    reader.readAsText(file);
  });

});