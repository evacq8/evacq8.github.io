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
		return new Vector2(this.x / mag, this.y / mag)
	}

	dot_product(vector) {
		return this.x * vector.x + this.y * vector.y;
	}

	// Return addition of many vectors
	static sum(...vectors) {
		let totalX = 0
		let totalY = 0
		for(let v of vectors) {
			totalX += v.x
			totalY += v.y
		}
		return new Vector2(totalX, totalY)
	}

	// Return scaler multiplication
	multiply(scaler) {
		return new Vector2(this.x * scaler, this.y * scaler)
	}
}


// Max amt of chars that can fit screen
let columns = Math.floor(canvas.width / fontWidth);
let rows = Math.floor(canvas.height / fontHeight);
// 2D grid of characters
const grid = [];
const prev_grid = []; // A grid that is used to refer to the old values of grid while looking through cells
function generateGrid() {
	for (let y = 0; y < rows; y++) {
		grid[y] = [];
		for (let x = 0; x < columns; x++) {
			grid[y][x] = {
				// This vector stores the direction which the energy is moving in and the magnitude represents energy
				flux: new Vector2(0, 0),
				prevFlux: new Vector2(0, 0)
			}
		}
	}
}
generateGrid(); // Call once on startup

window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    columns = Math.floor(canvas.width / fontWidth);
    rows = Math.floor(canvas.height / fontHeight);

    generateGrid();
});

// Read from cell.prevFlux and modify cell.flux
function diffuseGrid() {
    const damping = 0.98; // % of energy lost during transfer
	const sharing_amt = 0.8; // % of energy to transfer per frame
	// Loop thrugh each character/cell
    for (let y = 1; y < rows - 1; y++) {
        for (let x = 1; x < columns - 1; x++) {
            const cell = grid[y][x]
			// Amount of flux to share
			// Use prevFlux instead of reading for the flux we are modifying in the loop
			const flux_share = new Vector2(cell.prevFlux.x * sharing_amt * damping, cell.prevFlux.y * sharing_amt)
			cell.flux.x -= flux_share.x;
			cell.flux.y -= flux_share.y;

			// distribute this flux to neighbours depending on how much they're aligned to the flux direction
			// Get multipliers using uncentered dot product normalized to 0.0-1.0 range
			// ..and make sure they add to one.
			let dotu = new Vector2(0, 1).dot_product(flux_share.normalized())/2 + 0.5;
			let dotd = new Vector2(0, -1).dot_product(flux_share.normalized())/2 + 0.5;
			let dotl = new Vector2(-1, 0).dot_product(flux_share.normalized())/2 + 0.5;
			let dotr = new Vector2(1, 0).dot_product(flux_share.normalized())/2 + 0.5;
			const dotsum = dotu+dotd+dotl+dotr+0.001
			dotu /= dotsum
			dotd /= dotsum
			dotl /= dotsum
			dotr /= dotsum
			grid[y+1][x].flux = Vector2.sum(grid[y+1][x].flux, flux_share.multiply(dotu*damping))
			grid[y-1][x].flux = Vector2.sum(grid[y-1][x].flux, flux_share.multiply(dotd*damping))
			grid[y][x-1].flux = Vector2.sum(grid[y][x-1].flux, flux_share.multiply(dotl*damping))
			grid[y][x+1].flux = Vector2.sum(grid[y][x+1].flux, flux_share.multiply(dotr*damping))

			// Random noise
			if (Math.random() > 0.99) {
				cell.flux.x += ((Math.random()*2-1) * 0.1);
				cell.flux.y += (Math.random() * 0.9);
			}
		}
    }
	for (let y = 0; y < rows; y++) {	
        for (let x = 0; x < columns; x++) {
            // Check absolute bounds: 0 and length-1
            if (x === 0 || x === columns - 1 || y === 0 || y === rows - 1) {
                grid[y][x].flux.x = 0;
                grid[y][x].flux.y = 0;
            }
        }
    }
	// Set prevFlux to equal flux for the next iteration
	grid.flat().forEach(c => { 
		c.prevFlux.x = c.flux.x; 
		c.prevFlux.y = c.flux.y;
	})
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
        
		cell.flux.x = dx * 0.4;
		cell.flux.y = dy * 0.4;
    }

    prevMouseX = e.clientX;
    prevMouseY = e.clientY;
});

draw();
