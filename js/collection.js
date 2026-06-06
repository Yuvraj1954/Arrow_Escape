// collection.js - Shape Collection screen logic

const SHAPE_NAMES = [
    "Arrow", "Box", "Cross", "Diamond", "Heart", 
    "Hexagon", "Octagon", "Pyramid", "Star", "Triangle",
    "Crown", "Shield", "Sword", "Gem", "Key"
];

function getDiscoveredShapes() {
    try {
        const stored = localStorage.getItem("shapeDiscovered");
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
    }
    return [];
}

function getShapeSvg(name, discovered) {
    if (!discovered) {
        return `<svg viewBox="0 0 24 24" class="collection-item-svg placeholder"><path fill="currentColor" opacity="0.3" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2zm1-12c-2.21 0-4 1.79-4 4h2c0-1.1.9-2 2-2s2 .9 2 2c0 2-3 1.75-3 5h2c0-2.25 3-2.5 3-5 0-2.21-1.79-4-4-4z"/></svg>`;
    }
    
    // Abstract geometric shape representation for discovered items
    // This provides a generic but pleasing SVG for any shape
    return `<svg viewBox="0 0 24 24" class="collection-item-svg discovered">
        <path fill="url(#shapeGrad)" d="M12 2l9 4v6c0 5.55-3.84 10.74-9 12-5.16-1.26-9-6.45-9-12V6l9-4z"/>
        <defs>
            <linearGradient id="shapeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-primary-light)" />
                <stop offset="100%" stop-color="var(--color-primary-dark)" />
            </linearGradient>
        </defs>
    </svg>`;
}

function renderCollectionGrid() {
    const grid = document.getElementById("collectionGrid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    const discoveredList = getDiscoveredShapes();
    // Use the actual discovered shapes plus some generic ones up to 15
    const allShapes = [...new Set([...discoveredList, ...SHAPE_NAMES])].slice(0, 15);
    
    allShapes.forEach(shapeName => {
        const isDiscovered = discoveredList.includes(shapeName);
        
        const item = document.createElement("div");
        item.className = "collection-item" + (isDiscovered ? " discovered" : " undiscovered");
        
        const svgContainer = document.createElement("div");
        svgContainer.className = "collection-item-icon";
        svgContainer.innerHTML = getShapeSvg(shapeName, isDiscovered);
        
        const label = document.createElement("div");
        label.className = "collection-item-label";
        label.textContent = isDiscovered ? shapeName : "???";
        
        item.appendChild(svgContainer);
        item.appendChild(label);
        grid.appendChild(item);
    });
}

function bindCollectionEvents() {
    const btnCollection = document.getElementById("btnCollection");
    const modalCloseCollection = document.getElementById("modalCloseCollection");
    const overlay = document.getElementById("collectionModalOverlay");
    const modal = document.getElementById("collectionModal");
    
    if (btnCollection) {
        btnCollection.addEventListener("click", () => {
            if (typeof playSound === "function") playSound("click");
            renderCollectionGrid();
            
            overlay.hidden = false;
            modal.hidden = false;
            overlay.style.display = "flex";
            overlay.style.pointerEvents = "auto";
            
            requestAnimationFrame(() => {
                overlay.classList.add("is-visible");
                modal.classList.add("is-visible");
            });
        });
    }
    
    if (modalCloseCollection) {
        modalCloseCollection.addEventListener("click", () => {
            if (typeof playSound === "function") playSound("click");
            
            overlay.classList.remove("is-visible");
            modal.classList.remove("is-visible");
            
            setTimeout(() => {
                overlay.hidden = true;
                modal.hidden = true;
                overlay.style.display = "none";
                overlay.style.pointerEvents = "none";
            }, 350);
        });
    }
}

document.addEventListener("DOMContentLoaded", bindCollectionEvents);
