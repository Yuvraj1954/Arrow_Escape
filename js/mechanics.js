/**
 * Future tile mechanics — registry only (not implemented in Phase 2).
 * gameplay.js can call getLevelMechanics(level) when adding World 3+ features.
 */
const MECHANIC_IDS = {
    ICE_TILE: "ice_tile",
    CONVEYOR: "conveyor",
    PORTAL: "portal",
    ROTATOR: "rotator",
    LAVA: "lava_tile"
};

const MECHANIC_WORLD_UNLOCK = {
    [MECHANIC_IDS.ICE_TILE]: 3,
    [MECHANIC_IDS.CONVEYOR]: 4,
    [MECHANIC_IDS.PORTAL]: 5,
    [MECHANIC_IDS.ROTATOR]: 6,
    [MECHANIC_IDS.LAVA]: 7
};

function getLevelMechanics(level) {
    const raw = level?.mechanics || {};
    return {
        enabled: Array.isArray(raw.enabled) ? raw.enabled : [],
        tiles: Array.isArray(raw.tiles) ? raw.tiles : [],
        portals: Array.isArray(raw.portals) ? raw.portals : [],
        conveyors: Array.isArray(raw.conveyors) ? raw.conveyors : []
    };
}

function isMechanicEnabled(level, mechanicId) {
    return getLevelMechanics(level).enabled.includes(mechanicId);
}

/** No-op hooks — wire up when implementing each world mechanic. */
function onMechanicBeforeMove(level, arrow, state) {
    return true;
}

function onMechanicAfterMove(level, arrow, state) {
    return state;
}
