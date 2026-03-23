const canvas = document.getElementById('terminal-background');
const ctx = canvas.getContext('2d');

// Make the canvas full screen
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

// ASCII Gradiant characters
const chars = ` .-+=:*@#`;
const charArray = chars.split("");

const fontWidth = 22;
const fontHeight = 22;

// For storing direction of fluid
class Vector2 {
	constructor(x = 0, y = 0) { 
		this.x = x;
		this.y = y;
	}

	magnitude() {
		return Math.sqrt(this.x**2 + this.y**2)
	}
	
	normalized() {
		const mag = this.magnitude();
		if (mag < 0.1) return new Vector2(0, 0);
		return new Vector2(this.x /= mag, this.y /= mag)
	}

	dot_product(vector) {
		return this.x * vector.x + this.y * vector.y;
	}

	// Add many vectors
	static sum(...vectors) {
		let totalX = 0
		let totalY = 0
		for(let v of vectors) {
			totalX += v.x
			totalY += v.y
		}
		return new Vector2(totalX, totalY)
	}
}


// Max amt of chars that can fit screen
let columns = Math.floor(canvas.width / fontWidth);
let rows = Math.floor(canvas.height / fontHeight);
// 2D grid of characters
const grid = [];
function generateGrid() {
	for (let y = 0; y < rows; y++) {
		grid[y] = [];
		for (let x = 0; x < columns; x++) {
			grid[y][x] = {
				// This vector stores the direction which the energy is moving in and the magnitude represents energy
				flux: new Vector2(0, 0)
			}
		}
	}
}
generateGrid(); // Call once on startup

window.addEventListener('resize', () => {
    // 1. Update pixel dimensions
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // 2. Recalculate grid dimensions
    columns = Math.floor(canvas.width / fontWidth);
    rows = Math.floor(canvas.height / fontHeight);

    // 3. Regenerate the grid so it matches the new size
    // Note: This will clear the current "fluid" state. 
    generateGrid();
});

// Call this inside your 'resize' event listener!

function diffuseGrid() {
    const conduction = 1.45; 
    const flowSpeed = 19;
    const damping = 0.97; 

    // Save snapshot of cell fluxes
    const snapshot = grid.map(row => row.map(cell => ({
        flux: new Vector2(cell.flux.x, cell.flux.y)
    })));

	// Loop thrugh each character/cell
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < columns - 1; x++) {
            const cell = grid[y][x];
            
            // Take average vectors from neighbours (difusion)h
			const averageVector = Vector2.sum(
				snapshot[y+1][x].flux, // up
				snapshot[y-1][x].flux, // down
				snapshot[y][x-1].flux, // left
				snapshot[y][x+1].flux  // right
			)
			averageVector.x /= 4
			averageVector.y /= 4
            cell.flux.x += (averageVector.x - cell.flux.x) * conduction;
            cell.flux.y += (averageVector.y - cell.flux.y) * conduction;

            // Advection
            // Look at the neighbor "upstream" based on the current flux
            // If flux.x is positive, we pull from the left (x-1)
            const targetX = Math.max(0, Math.min(columns - 1, Math.round(x - snapshot[y][x].flux.x * flowSpeed)));
            const targetY = Math.max(0, Math.min(rows - 1, Math.round(y - snapshot[y][x].flux.y * flowSpeed)));
            
            const upstream = snapshot[targetY][targetX];
            
            // Blend the upstream flux into the current cell
            cell.flux.x = cell.flux.x * 0.5 + upstream.flux.x * 0.5;
            cell.flux.y = cell.flux.y * 0.5 + upstream.flux.y * 0.5;

			// Randomness
            cell.flux.x += (Math.random() - 0.5) * 0.15;
            cell.flux.y += (Math.random() - 0.5) * 0.15;
            
			// Waste energy
            cell.flux.x *= damping;
            cell.flux.y *= damping;
        }
    }
}


function draw() {
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `${fontHeight}px monospace`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < columns; x++) {
            const cell = grid[y][x];
            
            // Map energy (0 to 1) to ASCII index
            let intensity = Math.min(Math.abs(cell.flux.magnitude()), 1);
            let charIdx = Math.floor(intensity * (charArray.length - 1));
            let char = charArray[charIdx];

            ctx.fillStyle = `rgb(${60 + 50*cell.flux.magnitude()}, ${60 + 50*cell.flux.magnitude()}, ${60 + 50*cell.flux.magnitude()})`;
            
            ctx.fillText(char, x * fontWidth, y * fontHeight);
        }
    }
    
    diffuseGrid();
    requestAnimationFrame(draw);
}

let prevMouseX = 0;
let prevMouseY = 0;
window.addEventListener('mousemove', (e) => {
    // Convert mouse pixel coordinates to cell coordinates
    const gridX = Math.floor(e.clientX / fontWidth);
    const gridY = Math.floor(e.clientY / fontHeight);

    // Check if mouse is inside grid
    if (gridY >= 1 && gridY < rows - 1 && gridX >= 1 && gridX < columns - 1) {
        const cell = grid[gridY][gridX];

        const dx = e.clientX - prevMouseX;
        const dy = e.clientY - prevMouseY;
        
		cell.flux.x = dx;
		cell.flux.y = dy;
    }

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
});

draw();
