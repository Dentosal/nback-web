const defaultSettings = {
    n: 2,
    secondsPerTrial: 3,
    runLength: 100,
    position: {
        enabled: true,
        key: 'a',
    },
    audio: {
        enabled: true,
        key: 'l',
        set: 'fi_automatic'
    },
    color: {
        enabled: false,
        key: 'k',
    },
    shape: {
        enabled: false,
        key: 's',
    },
};

const audios = [
    'fi_automatic',
    'fi_dento_numerot',
    'en_automatic',
];

const colors = [
    "#332288",
    "#117733",
    "#44AA99",
    "#88CCEE",
    "#DDCC77",
    "#CC6677",
    "#AA4499",
    "#882255",
    "#ffffff",
];

const readSettings = () => {
    const settingsStr = localStorage.getItem('settings');
    try {
        return JSON.parse(settingsStr);
    } catch {
        writeSettings(defaultSettings);
        return defaultSettings;
    }
};

const writeSettings = settings => {
    localStorage.setItem('settings', JSON.stringify(settings));
};

const updateSettings = () => {
    let ok = document.getElementById('settings').checkValidity();
    if (ok) {
        let settings = Alpine.store('settings');
        writeSettings(settings);
    }
    let state = Alpine.store('state');
    state.hasValidSettings = ok;
};


let gameIntervalId = null;
let currentRun = [];
let audioCtx = new Audio();

const startGame = () => {
    document.getElementById('menu').close();
    currentRun = [];
    let interval = Number.parseFloat(Alpine.store('settings').secondsPerTrial);
    gameIntervalId = setInterval(() => stepGame(), 1000 * interval);
};

const stepGame = () => {
    let settings = Alpine.store('settings');

    // Create entry and append to current run
    let entry = {};
    if (settings.position.enabled) {
        entry.position = Math.floor(Math.random() * 9);
    }
    if (settings.audio.enabled) {
        entry.audio = Math.floor(Math.random() * 9);
    }
    if (settings.color.enabled) {
        entry.color = Math.floor(Math.random() * 9);
    }
    if (settings.shape.enabled) {
        entry.shape = Math.floor(Math.random() * 9);
    }
    currentRun.push(entry);

    // Activate relevant stimuli
    for (cell of document.querySelectorAll('#gamegrid>div')) {
        cell.classList.remove('active');
    }
    let active = settings.position.enabled ? entry.position + 1 : 5;
    let ac = document.querySelector('#gamegrid>div:nth-child(' + active + ')');
    ac.classList.add('active');
    ac.style.setProperty('--color', settings.color.enabled ? colors[entry.color] : "#f00");

    if (settings.audio.enabled) {
        audioCtx.src = 'audio/' + settings.audio.set + '/' + (entry.audio + 1) + '.mp3';
        audioCtx.play();
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.store('settings', readSettings());
    Alpine.store('state', {
        hasValidSettings: false,
    });
    setTimeout(updateSettings, 0);
    

    document.getElementById('menu').showModal();
})