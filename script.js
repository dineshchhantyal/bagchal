class BaghaChal {
    constructor() {
        this.loadingScreen = document.querySelector('.loading-screen');
        this.assetsToLoad = 7; // 5 sounds + 2 images
        this.loadedAssets = 0;

        this.preloadImages();
        this.board = document.getElementById("board");
        this.status = document.getElementById("status");
        this.positions = [];
        this.tigers = [];
        this.goats = [];
        this.selectedPiece = null;
        this.turn = "goat";
        this.phase = "placement";
        this.capturedGoats = 0;
        this.validMoves = [];
        this.moveHistory = new Set();

        this.createBoard();
        this.placeInitialTigers();
        this.setupEventListeners();
        this.highlightValidPlacements(); // Initial highlight

        this.sounds = {
            move: new Audio('sounds/move.mp3'),
            capture: new Audio('sounds/capture.mp3'),
            place: new Audio('sounds/place.mp3'),
            win: new Audio('sounds/win.mp3'),
            select: new Audio('sounds/select.mp3')
        };
        this.loadSounds();
    }

    assetLoaded() {
        this.loadedAssets++;
        if (this.loadedAssets >= this.assetsToLoad) {
            this.hideLoading();
        }
    }

    hideLoading() {
        this.loadingScreen.classList.add('hide');
        setTimeout(() => {
            this.loadingScreen.style.display = 'none';
        }, 500);
    }

    preloadImages() {
        const tigerImg = new Image();
        const goatImg = new Image();

        tigerImg.onload = () => this.assetLoaded();
        goatImg.onload = () => this.assetLoaded();

        tigerImg.src = 'static/tiger.png';
        goatImg.src = 'static/goat.png';
    }

    createBoard() {
        const boardSize = this.board.clientWidth;
        const gridUnit = boardSize / 5;
        let index = 0;

        for (let row = 0; row < 5; row++) {
            for (let col = 0; col < 5; col++) {
                const x = (col * gridUnit) + (gridUnit / 2);
                const y = (row * gridUnit) + (gridUnit / 2);

                const point = document.createElement("div");
                point.className = "intersection";
                point.style.left = `${x}px`;
                point.style.top = `${y}px`;
                point.dataset.index = index;

                this.board.appendChild(point);
                this.positions.push({
                    x, y, row, col,
                    occupied: null,
                    element: point
                });
                index++;
            }
        }
    }

    placeInitialTigers() {
        const corners = [0, 4, 20, 24];
        this.tigers = []; // Reset tigers array
        corners.forEach((index) => {
            this.placePiece("tiger", index);
            this.positions[index].occupied = "tiger";
        });
        console.log("Initial tigers placed at:", this.tigers.map(t => t.index));
    }

    placePiece(type, index) {
        const pos = this.positions[index];
        const piece = document.createElement("div");
        piece.className = type;
        piece.style.left = `${pos.x}px`;
        piece.style.top = `${pos.y}px`;
        piece.dataset.index = index;

        const img = document.createElement("img");
        img.src = type === "tiger" ? "static/tiger.png" : "static/goat.png";
        img.alt = type;
        piece.appendChild(img);

        this.board.appendChild(piece);

        if (type === "tiger") {
            this.tigers.push({ element: piece, index });
        } else {
            this.goats.push({ element: piece, index });
        }
    }

    setupEventListeners() {
        if (!this.board) {
            console.error("Board element not found");
            return;
        }

        this.board.addEventListener("click", (e) => {
            if (!e || !e.target) {
                console.error("Invalid click event");
                return;
            }
            this.handleClick(e);
        });

        const restartButton = document.getElementById("restart");
        if (restartButton) {
            restartButton.addEventListener("click", () => this.resetGame());
        }
    }

    handleClick(e) {
        const target = e.target;
        console.log("Click target:", target);

        if (!target) return;

        if (target.classList.contains("intersection")) {
            this.handleIntersectionClick(target);
        } else if (target.classList.contains("tiger") || target.classList.contains("goat")) {
            this.handlePieceClick(target);
        }

        // Highlight valid placement positions during goat's turn
        if (this.phase === "placement" && this.turn === "goat") {
            this.highlightValidPlacements();
        }
    }

    highlightValidPlacements() {
        this.positions.forEach(pos => {
            if (!pos.occupied) {
                pos.element.style.backgroundColor = "#88ff88";
                pos.element.style.transform = "translate(-50%, -50%) scale(1.2)";
            } else {
                pos.element.style.backgroundColor = "#654321";
                pos.element.style.transform = "translate(-50%, -50%) scale(1)";
            }
        });
    }

    handleIntersectionClick(intersection) {
        const index = parseInt(intersection.dataset.index);
        console.log(`Intersection clicked: ${index}`);

        if (this.phase === "placement" && this.turn === "goat") {
            if (!this.positions[index].occupied) {
                this.placeGoat(index);
                this.endTurn();
                this.highlightValidPlacements(); // Highlight remaining valid positions
            }
        } else if (this.selectedPiece && this.validMoves.includes(index)) {
            this.movePiece(index);
        }
    }

    placeGoat(index) {
        this.placePiece("goat", index);
        this.positions[index].occupied = "goat";

        if (this.goats.length === 20) {
            this.phase = "movement";
        }
        // Remove this.endTurn() from here since it's called in handleIntersectionClick
        this.sounds.place.play();
    }

    handlePieceClick(piece) {
        if (!piece) {
            console.error("No piece provided to handlePieceClick");
            return;
        }

        const pieceType = piece.classList[0];
        console.log(`Piece clicked: ${pieceType} at index ${piece.dataset.index}`);

        // Check if it's the correct turn and piece type
        if ((pieceType === "tiger" && this.turn === "tiger") ||
            (pieceType === "goat" && this.turn === "goat" && this.phase === "movement")) {

            // Clear previous selection
            this.clearSelection();

            // Set new selection
            piece.classList.add("selected");
            this.selectedPiece = piece;

            // Show valid moves
            const validMoves = this.getValidMoves(parseInt(piece.dataset.index), pieceType);
            this.validMoves = validMoves;

            // Highlight valid moves
            this.validMoves.forEach(index => {
                this.positions[index].element.style.backgroundColor = "#88ff88";
            });

            console.log(`Selected ${pieceType} at ${piece.dataset.index}, Valid moves: ${this.validMoves}`);
        }

        // After showing valid moves, check if the piece has no moves
        if (this.validMoves.length === 0) {
            console.log(`${pieceType} at ${piece.dataset.index} has no valid moves`);
            this.checkWinConditions();
        }

        this.sounds.select.play();
    }

    showValidMoves(piece) {
        this.clearSelection();
        const currentIndex = parseInt(piece.dataset.index);
        const pieceType = piece.classList[0];
        this.validMoves = this.getValidMoves(currentIndex, pieceType);
        console.log(
            `Valid moves for ${pieceType} at ${currentIndex}: ${this.validMoves}`
        );

        this.validMoves.forEach((index) => {
            this.positions[index].element.style.backgroundColor = "#88ff88";
        });
    }

    clearSelection() {
        // Remove selected class from pieces
        document.querySelectorAll(".selected").forEach(p => p.classList.remove("selected"));

        // Reset intersection colors without removing them
        this.positions.forEach(pos => {
            if (pos.element) {
                pos.element.style.backgroundColor = "#654321";
            }
        });

        this.selectedPiece = null;
        this.validMoves = [];
    }

    getValidMoves(currentIndex, pieceType) {
        const moves = [];
        const currentPos = this.positions[currentIndex];
        const isCorner = [0, 4, 20, 24].includes(currentIndex);

        // Define valid directions based on board lines
        const directions = [
            [-1, -1], [-1, 0], [-1, 1],
            [0, -1], [0, 1],
            [1, -1], [1, 0], [1, 1]
        ];

        // Add diagonal paths for corners
        if (isCorner) {
            switch (currentIndex) {
                case 0: // Top-left corner
                    moves.push(6); // Diagonal move
                    break;
                case 4: // Top-right corner
                    moves.push(8); // Diagonal move
                    break;
                case 20: // Bottom-left corner
                    moves.push(16); // Diagonal move
                    break;
                case 24: // Bottom-right corner
                    moves.push(18); // Diagonal move
                    break;
            }
        }

        // Check each direction for standard moves
        directions.forEach(([dr, dc]) => {
            const newRow = currentPos.row + dr;
            const newCol = currentPos.col + dc;

            if (newRow >= 0 && newRow < 5 && newCol >= 0 && newCol < 5) {
                const newIndex = newRow * 5 + newCol;

                // Basic move to adjacent empty spot
                if (!this.positions[newIndex].occupied) {
                    // Add diagonal moves only if they're valid board lines
                    const isDiagonal = Math.abs(dr) === 1 && Math.abs(dc) === 1;
                    const isValidDiagonal = isCorner ||
                        [6, 8, 16, 18].includes(currentIndex) ||
                        [6, 8, 16, 18].includes(newIndex);

                    if (!isDiagonal || isValidDiagonal) {
                        moves.push(newIndex);
                    }
                }
                // Tiger capture moves
                else if (pieceType === "tiger" && this.positions[newIndex].occupied === "goat") {
                    const jumpRow = newRow + dr;
                    const jumpCol = newCol + dc;

                    if (jumpRow >= 0 && jumpRow < 5 && jumpCol >= 0 && jumpCol < 5) {
                        const jumpIndex = jumpRow * 5 + jumpCol;
                        if (!this.positions[jumpIndex].occupied) {
                            moves.push(jumpIndex);
                        }
                    }
                }
            }
        });

        return [...new Set(moves)]; // Remove duplicates
    }

    movePiece(newIndex) {
        const oldIndex = parseInt(this.selectedPiece.dataset.index);
        const pieceType = this.selectedPiece.classList[0];
        let capturedGoat = null;

        // Check for capture move
        if (pieceType === "tiger") {
            const oldPos = this.positions[oldIndex];
            const newPos = this.positions[newIndex];
            const rowDiff = Math.abs(newPos.row - oldPos.row);
            const colDiff = Math.abs(newPos.col - oldPos.col);

            // If moving 2 spaces, it's a capture move
            if (rowDiff === 2 || colDiff === 2) {
                const midRow = (oldPos.row + newPos.row) / 2;
                const midCol = (oldPos.col + newPos.col) / 2;
                const midIndex = midRow * 5 + midCol;

                if (this.positions[midIndex].occupied === "goat") {
                    capturedGoat = this.goats.find(g =>
                        parseInt(g.element.dataset.index) === midIndex
                    );

                    if (capturedGoat) {
                        capturedGoat.element.remove();
                        this.goats = this.goats.filter(g => g !== capturedGoat);
                        this.positions[midIndex].occupied = null;
                        this.capturedGoats++;
                        this.showMessage("Tiger captured a goat!");

                        if (this.capturedGoats >= 5) {
                            this.showMessage("Tigers win!");
                            setTimeout(() => {
                                alert("Tigers Win!");
                                this.resetGame();
                            }, 1000);
                            return;
                        }
                    }
                }
            }
        }

        // Update piece position
        this.positions[oldIndex].occupied = null;
        this.positions[newIndex].occupied = pieceType;
        this.selectedPiece.style.left = `${this.positions[newIndex].x}px`;
        this.selectedPiece.style.top = `${this.positions[newIndex].y}px`;
        this.selectedPiece.dataset.index = newIndex;

        // Play appropriate sound
        if (capturedGoat) {
            this.sounds.capture.play();
        } else {
            this.sounds.move.play();
        }

        this.clearSelection();
        this.endTurn();
        this.updateStatus();
    }

    endTurn() {
        // Check win conditions before changing turn
        if (this.checkWinConditions()) {
            return;
        }

        this.turn = this.turn === "tiger" ? "goat" : "tiger";
        this.updateStatus();

        // Highlight valid placements when it's goat's turn in placement phase
        if (this.phase === "placement" && this.turn === "goat") {
            this.highlightValidPlacements();
        } else {
            // Reset intersection colors
            this.positions.forEach(pos => {
                pos.element.style.backgroundColor = "#654321";
                pos.element.style.transform = "translate(-50%, -50%) scale(1)";
            });
        }
    }

    showMessage(text, duration = 2000) {
        const message = document.getElementById('message');
        message.textContent = text;
        message.style.display = 'block';
        setTimeout(() => {
            message.style.display = 'none';
        }, duration);
    }

    updateStats() {
        const capturesElement = document.getElementById('captures');
        const remainingElement = document.getElementById('remaining');

        if (capturesElement) {
            capturesElement.textContent = this.capturedGoats;
        }
        if (remainingElement) {
            remainingElement.textContent = 20 - this.goats.length;
        }

        console.log(`Stats updated - Captures: ${this.capturedGoats}, Remaining: ${20 - this.goats.length}`);
    }

    updateStatus() {
        let status;
        if (this.phase === "placement") {
            if (this.turn === "goat") {
                status = `Place a Goat (${20 - this.goats.length} remaining)`;
            } else {
                status = `Tiger's Turn - Move or Capture`;
            }
        } else {
            status = `${this.turn.charAt(0).toUpperCase() + this.turn.slice(1)}'s Turn - Captured: ${this.capturedGoats}`;
        }
        this.status.textContent = status;
        this.updateStats();
    }

    checkWinConditions() {
        // Validate tiger positions first
        const actualTigers = Array.from(document.getElementsByClassName("tiger"))
            .map(t => parseInt(t.dataset.index));
        console.log("Actual tiger positions:", actualTigers);

        // Update tigers array if needed
        this.tigers = actualTigers.map(index => ({
            element: document.querySelector(`.tiger[data-index="${index}"]`),
            index: index
        }));

        // Check if tigers are trapped
        const allTigersTrapped = this.tigers.every(tiger => {
            const validMoves = this.getValidMoves(tiger.index, "tiger");
            console.log(`Tiger at ${tiger.index} has ${validMoves.length} valid moves`);
            return validMoves.length === 0;
        });

        if (allTigersTrapped) {
            console.log("All tigers are trapped!");
            this.showMessage("Goats win! All tigers are trapped!");
            setTimeout(() => {
                alert("Goats Win!");
                this.resetGame();
            }, 1000);
            return true;
        }

        return false;
    }

    resetGame() {
        // Store grid and intersection elements
        const gridLines = this.board.querySelector('.grid-lines');
        const intersections = Array.from(this.board.getElementsByClassName("intersection"));

        // Clear board content
        this.board.innerHTML = '';

        // Restore grid and intersections
        if (gridLines) this.board.appendChild(gridLines);
        intersections.forEach(intersection => {
            this.board.appendChild(intersection);
        });

        // Reset game state
        this.positions.forEach(pos => {
            pos.occupied = null;
            pos.element.style.backgroundColor = "#654321";
        });
        this.tigers = [];
        this.goats = [];
        this.selectedPiece = null;
        this.turn = "goat";
        this.phase = "placement";
        this.capturedGoats = 0;
        this.validMoves = [];

        // Place initial tigers
        this.placeInitialTigers();
        this.updateStatus();
    }

    // Add method to verify board state
    verifyBoardState() {
        console.log("Current board state:");
        console.log("Tigers:", this.tigers);
        console.log("Goats:", this.goats);
        console.log("Positions:", this.positions.map(p => p.occupied));
    }

    loadSounds() {
        Object.values(this.sounds).forEach(sound => {
            sound.addEventListener('canplaythrough', () => this.assetLoaded(), { once: true });
            sound.load();
            sound.volume = 0.3;
        });
    }
}

// Initialize game
new BaghaChal();