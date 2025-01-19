const mapData = {
  minX: 1,
  maxX: 14,
  minY: 4,
  maxY: 12,
  blockedSpaces: {
    "7x4": true,
    "1x11": true,
    "12x10": true,
    "4x7": true,
    "5x7": true,
    "6x7": true,
    "8x6": true,
    "9x6": true, 
    "10x6": true,
    "7x9": true,
    "8x9": true,
    "9x9": true,
  },
};

// Options for Player Colors... these are in the same order as our sprite sheet
const playerColors = ["blue", "red", "orange", "yellow", "green", "purple"];
const gun = document.createElement("div");

//Misc Helpers
function randomFromArray(array) {
  return array[Math.floor(Math.random() * array.length)];
}
function getKeyString(x, y) {
  return `${x}x${y}`;
}

function createName() {
  const prefix = randomFromArray([
    "🛸", // COOL (OVNI)  
    "🚀", // SUPER (Exploração espacial)  
    "🤖", // HIP (Robô)  
    "👽", // SMUG (Alienígena)  
    "🛸", // COOL (Repetido - OVNI)  
    "🔋", // SILKY (Energia futurista)  
    "🪐", // GOOD (Planeta Sci-fi)  
    "🛡️", // SAFE (Escudo protetor)  
    "🦾", // DEAR (Ciborgue)  
    "💧", // DAMP (Planeta aquático Sci-fi)  
    "☀️", // WARM (Estrela Sci-fi)  
    "💰", // RICH (Mega corporações distópicas)  
    "📏", // LONG (Sabre de luz ou armas futuristas)  
    "🌌", // DARK (O universo sombrio)  
    "☁️", // SOFT (Tecnologia na nuvem)  
    "🔮", // BUFF (Visões do futuro)  
    "🔥", // DOPE (Explosões épicas)  
    
  ]);
  const animal = randomFromArray([
    "Saci Skywalker",
    "Curupira Solo",
    "Jabuti Vader",
    "Boi-Tata Spock",
    "Iara Kenobi",
    "Cuca Yoda",
    "Caipora Leia",
    "Anhangá Worf",
    "Mapinguari Uhura",
    "Boitatá Chewbacca"
  ]);
  return `${prefix} ${animal}`;
}

function isSolid(x,y) {

  const blockedNextSpace = mapData.blockedSpaces[getKeyString(x, y)];
  return (
    blockedNextSpace ||
    x >= mapData.maxX ||
    x < mapData.minX ||
    y >= mapData.maxY ||
    y < mapData.minY
  )
}

function getRandomSafeSpot() {
  //We don't look things up by key here, so just return an x/y
  return randomFromArray([
    { x: 1, y: 4 },
    { x: 2, y: 4 },
    { x: 1, y: 5 },
    { x: 2, y: 6 },
    { x: 2, y: 8 },
    { x: 2, y: 9 },
    { x: 4, y: 8 },
    { x: 5, y: 5 },
    { x: 5, y: 8 },
    { x: 5, y: 10 },
    { x: 5, y: 11 },
    { x: 11, y: 7 },
    { x: 12, y: 7 },
    { x: 13, y: 7 },
    { x: 13, y: 6 },
    { x: 13, y: 8 },
    { x: 7, y: 6 },
    { x: 7, y: 7 },
    { x: 7, y: 8 },
    { x: 8, y: 8 },
    { x: 10, y: 8 },
    { x: 8, y: 8 },
    { x: 11, y: 4 },
  ]);
}

(function () {

  let playerId;
  let playerRef;
  let players = {};
  let playerElements = {};
  let coins = {};
  let coinElements = {};

  const gameContainer = document.querySelector(".game-container");
  const playerNameInput = document.querySelector("#player-name");
  const playerColorButton = document.querySelector("#player-color");
  const attackButton = document.querySelector(".btn-red");

  function placeCoin() {
    const { x, y } = getRandomSafeSpot();
    const coinRef = firebase.database().ref(`coins/${getKeyString(x, y)}`);
    coinRef.set({
      x,
      y,
    })

    const coinTimeouts = [2000, 3000, 4000, 5000];
    setTimeout(() => {
      placeCoin();
    }, randomFromArray(coinTimeouts));
  }

  function attemptGrabCoin(x, y) {
    const key = getKeyString(x, y);
    if (coins[key]) {
      // Remove this key from data, then uptick Player's coin count
      firebase.database().ref(`coins/${key}`).remove();
      playerRef.update({
        coins: players[playerId].coins + 1,
      })
    }
  }

  function handleArrowPress(xChange=0, yChange=0) {
    //console.log("Todos os jogadores no início do jogo:", players);
    const newX = players[playerId].x + xChange;
    const newY = players[playerId].y + yChange;
    if (!isSolid(newX, newY)) {
      //move to the next space
      players[playerId].x = newX;
      players[playerId].y = newY;
      if (xChange === 1) {
        players[playerId].direction = "left";
      }
      if (xChange === -1) {
        players[playerId].direction = "right";
      }
      playerRef.set(players[playerId]);
      attemptGrabCoin(newX, newY);
    }
  }

  function initGame() {
    //console.log("Todos os jogadores no início do jogo:", players);
    new KeyPressListener("ArrowUp", () => handleArrowPress(0, -1))
    new KeyPressListener("ArrowDown", () => handleArrowPress(0, 1))
    new KeyPressListener("ArrowLeft", () => handleArrowPress(-1, 0))
    new KeyPressListener("ArrowRight", () => handleArrowPress(1, 0))
    new KeyPressListener("Space", () => shoot());

    const bullet = firebase.database().ref(`bullet`);
    const allPlayersRef = firebase.database().ref(`players`);
    const allCoinsRef = firebase.database().ref(`coins`);

    allPlayersRef.on("value", (snapshot) => {
      //Fires whenever a change occurs
      players = snapshot.val() || {};
      Object.keys(players).forEach((key) => {
        const characterState = players[key];
        let el = playerElements[key];
        // Now update the DOM
        el.querySelector(".Character_name").innerText = characterState.name;
        el.querySelector(".Character_coins").innerText = characterState.coins;
        el.setAttribute("data-color", characterState.color);
        el.setAttribute("data-direction", characterState.direction);
        const left = 16 * characterState.x + "px";
        const top = 16 * characterState.y - 4 + "px";
        el.style.transform = `translate3d(${left}, ${top}, 0)`;
      })
    })
    
    allPlayersRef.on("child_added", (snapshot) => {
      //Fires whenever a new node is added the tree
      const addedPlayer = snapshot.val();
      const characterElement = document.createElement("div");
      characterElement.classList.add("Character", "grid-cell");
      if (addedPlayer.id === playerId) {
        characterElement.classList.add("you");
      }
      characterElement.innerHTML = (`
        <div class="Character_shadow grid-cell"></div>
        <div class="Character_sprite grid-cell"></div>
        <div class="Character_name-container">
          <span class="Character_name"></span>
          <span class="Character_coins">0</span>
        </div>
        <div class="Character_you-arrow"></div>
        <div class="Gun"></div>
      `);
      playerElements[addedPlayer.id] = characterElement;

      //Fill in some initial state
      characterElement.querySelector(".Character_name").innerText = addedPlayer.name;
      characterElement.querySelector(".Character_coins").innerText = addedPlayer.coins;
      characterElement.setAttribute("data-color", addedPlayer.color);
      characterElement.setAttribute("data-direction", addedPlayer.direction);
      const left = 16 * addedPlayer.x + "px";
      const top = 16 * addedPlayer.y - 4 + "px";
      characterElement.style.transform = `translate3d(${left}, ${top}, 0)`;
      gameContainer.appendChild(characterElement);
    })


    //Remove character DOM element after they leave
    allPlayersRef.on("child_removed", (snapshot) => {
      const removedKey = snapshot.val().id;
      gameContainer.removeChild(playerElements[removedKey]);
      delete playerElements[removedKey];
    })


    //New - not in the video!
    //This block will remove coins from local state when Firebase `coins` value updates
    allCoinsRef.on("value", (snapshot) => {
      coins = snapshot.val() || {};
    });
    //

    allCoinsRef.on("child_added", (snapshot) => {
      const coin = snapshot.val();
      const key = getKeyString(coin.x, coin.y);
      coins[key] = true;

      // Create the DOM Element
      const coinElement = document.createElement("div");
      coinElement.classList.add("Coin", "grid-cell");
      coinElement.innerHTML = `
        <div class="Coin_shadow grid-cell"></div>
        <div class="Coin_sprite grid-cell"></div>
      `;

      // Position the Element
      const left = 16 * coin.x + "px";
      const top = 16 * coin.y - 4 + "px";
      coinElement.style.transform = `translate3d(${left}, ${top}, 0)`;

      // Keep a reference for removal later and add to DOM
      coinElements[key] = coinElement;
      gameContainer.appendChild(coinElement);
    })
    allCoinsRef.on("child_removed", (snapshot) => {
      const {x,y} = snapshot.val();
      const keyToRemove = getKeyString(x,y);
      gameContainer.removeChild( coinElements[keyToRemove] );
      delete coinElements[keyToRemove];
    })


    //Updates player name with text input
    playerNameInput.addEventListener("change", (e) => {
      const newName = e.target.value || createName();
      playerNameInput.value = newName;
      playerRef.update({
        name: newName
      })
    })

    //Update player color on button click
    playerColorButton.addEventListener("click", () => {
      const mySkinIndex = playerColors.indexOf(players[playerId].color);
      const nextColor = playerColors[mySkinIndex + 1] || playerColors[0];
      playerRef.update({
        color: nextColor
      })
    })

    //Place my first coin
    placeCoin();

  }

  firebase.auth().onAuthStateChanged((user) => {
    console.log(user)
    if (user) {
      //You're logged in!
      playerId = user.uid;
      playerRef = firebase.database().ref(`players/${playerId}`);

      const name = createName();
      playerNameInput.value = name;

      const {x, y} = getRandomSafeSpot();

        playerRef.set({
        id: playerId,
        name,
        direction: "right",
        color: randomFromArray(playerColors),
        x,
        y,
        coins: 0,
      })

      //Remove me from Firebase when I diconnect
      playerRef.onDisconnect().remove();

      //Begin the game now that we are signed in
      initGame();
    } else {
      //You're logged out.
    }
  })

  firebase.auth().signInAnonymously().catch((error) => {
    var errorCode = error.code;
    var errorMessage = error.message;
    // ...
    console.log(errorCode, errorMessage);
  });

  function handleTouchMove(event) {
    const rect = gameContainer.getBoundingClientRect();
    const clickX = Math.floor((event.clientX - rect.left) / 16); // ajusta a escala do grid
    const clickY = Math.floor((event.clientY - rect.top) / 16);  
    //Detectando toque --------------------------------------------------------------
    //Click max X 20 posicao max nav 13 ---------------------------------------------
    //Click max Y 17 posicao max nav 13

    if ((clickX>=(players[playerId].x+4) && Math.abs(clickY-(players[playerId].y+4))<=2)){
      handleArrowPress(1,0);
    }
    if ((clickX<(players[playerId].x+4) && Math.abs(clickY-(players[playerId].y+4))<=2)){
      handleArrowPress(-1,0);
    }
    if ((clickY<(players[playerId].y+4) && Math.abs(clickX-(players[playerId].x+4))<=3)){
      handleArrowPress(0,-1);
    }
    if ((clickY>=(players[playerId].y+4) && Math.abs(clickX-(players[playerId].x+4))<=3)){
      handleArrowPress(0,1);
    }

    console.log("Posição do clique:", clickX, clickY);

  }
 
  function shoot() {
    if (players[playerId].coins <= 0) {
      console.log("Sem moedas para atirar!");
      return;
    }
  
    // Subtrai uma moeda ao atirar
    players[playerId].coins -= 1;
    playerRef.update({ coins: players[playerId].coins });
  
    const bulletDirection = players[playerId].direction;
    let { x, y } = players[playerId]; // Posição inicial da bala
  
    // Ajuste inicial da bala para que saia da frente da nave
    if (bulletDirection === "left") x -= 1;
    if (bulletDirection === "right") x += 1;
    if (bulletDirection === "up") y -= 1;
    if (bulletDirection === "down") y += 1;
  
    // Referência no Firebase para criar a bala
    const bulletRef = firebase.database().ref(`bullets`).push();
    bulletRef.set({
      playerId,
      x,
      y,
      direction: bulletDirection,
    });
  
    // Atualização visual da bala no DOM
    const bulletElement = document.createElement("div");
    bulletElement.classList.add("Bullet", "grid-cell");
    bulletElement.style.left = `${16 * x}px`;
    bulletElement.style.top = `${16 * y - 4}px`;
    bulletElement.dataset.id = bulletRef.key;
    gameContainer.appendChild(bulletElement);
  
    // Movimentação da bala
    const bulletInterval = setInterval(() => {
      if (bulletDirection === "left") x -= 1;
      if (bulletDirection === "right") x += 1;
      if (bulletDirection === "up") y -= 1;
      if (bulletDirection === "down") y += 1;
  
      // Atualiza no Firebase
      bulletRef.update({ x, y });
  
      // Atualiza visualmente
      bulletElement.style.left = `${16 * x}px`;
      bulletElement.style.top = `${16 * y - 4}px`;
  
      // Remove a bala ao sair do mapa ou colidir com algo
      if (isSolid(x, y)) {
        bulletRef.remove(); // Remove do Firebase
      }
    }, 100);
  
    // Limpeza quando a bala for removida
    bulletRef.on("child_removed", () => {
      clearInterval(bulletInterval);
      bulletElement.remove();
    });
  }
  


  attackButton.addEventListener("click", () => {
    shoot();
  });
  // Adiciona o evento de clique no contêiner do jogo
  gameContainer.addEventListener("click", handleTouchMove);
  
})();