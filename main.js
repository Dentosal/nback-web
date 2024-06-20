// Normalize settings over app versions
const normalizeSettings = settings => {
    settings.audio.set = settings.audio.set || 'fi_automatic';
    settings.color.set = settings.color.set || 'high_contrast';
    settings.actionBias = settings.actionBias === undefined ? 0.1 : settings.actionBias;
    return settings;
};

const defaultSettings = normalizeSettings({
    n: 2,
    secondsPerTrial: 3,
    runLength: 100,
    actionBias: 0.1,
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
        set: 'high_contrast',
    },
    shape: {
        enabled: false,
        key: 's',
    },
});

const audios = [
    'fi_automatic',
    'fi_dento_numerot',
    'en_automatic',
];

const colors = {
    "high_contrast": [
        "red",
        "green",
        "blue",
        "yellow",
        "#a61",
        "indigo",
        "fuchsia",
        "black",
        "white"
    ],
    "colorblind": [
        "#332288",
        "#117733",
        "#44AA99",
        "#88CCEE",
        "#DDCC77",
        "#CC6677",
        "#AA4499",
        "#882255",
        "#ffffff",
    ],
    "confusing": [
        "red",
        "pink",
        "orange",
        "salmon",
        "green",
        "lime",
        "olive",
        "limegreen",
        "lawngreen",
    ]
};

const readSettings = () => {
    const settingsStr = localStorage.getItem('settings');
    if (settingsStr === null) {
        writeSettings(defaultSettings);
        return defaultSettings;
    }
    try {
        return normalizeSettings(JSON.parse(settingsStr));
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


let audioCtx = new Audio();

const startGame = () => {
    document.getElementById('menu').close();
    let state = Alpine.store('state');
    state.currentRun = [];
    state.selectedRun = readRunHistory().length; // For stat display and checking for ongoing game
    setTimeout(stepGame, 1000);
};

const stepGame = () => {
    let settings = Alpine.store('settings');
    let perTrial = Number.parseFloat(settings.secondsPerTrial);
    let state = Alpine.store('state');
    stepCheckPrev(state);

    if (state.currentRun.length >= settings.runLength) {
        setTimeout(endGame, perTrial * 1000);
        return;
    }

    // Run the current trial
    let timeDelay = 0.1;
    let timePrimary = 0.4;
    let timePost = perTrial - timeDelay - timePrimary;
    setTimeout(stepPrimary, timeDelay * 1000);
    if (timePost > 0) {
        setTimeout(stepPost, timePost * 1000);
    }

    setTimeout(stepGame, perTrial * 1000);
}
const stepCheckPrev = state => {
    // Check previous trial, if any, and flash error responses
    if (state.currentRun.length !== 0) {
        let correct = checkCorrect();
        state.currentRun.at(-1).correct = correct;
        for (k of Object.keys(correct)) {
            document.querySelector("#responses ." + k).setAttribute('data-correct', correct[k]);
        }
    }
    setTimeout(() => {
        for (r of document.querySelectorAll("#responses *[data-correct]")) {
            r.removeAttribute('data-correct');
        }
    }, 400);
}

let stimuliStartedAt = null;

const stepPrimary = () => {
    let settings = Alpine.store('settings');
    let state = Alpine.store('state');

    let nback = state.currentRun.at(-settings.n);

    // Create entry and append to current run
    let entry = {
        response: {},
        latency: {},
    };
    if (settings.position.enabled) {
        if (nback !== undefined && Math.random() < settings.actionBias) {
            entry.position = nback.position;
        } else {
            entry.position = Math.floor(Math.random() * 9);
        }
    }
    if (settings.audio.enabled) {
        if (nback !== undefined && Math.random() < settings.actionBias) {
            entry.audio = nback.audio;
        } else {
            entry.audio = Math.floor(Math.random() * 9);
        }
    }
    if (settings.color.enabled) {
        if (nback !== undefined && Math.random() < settings.actionBias) {
            entry.color = nback.color;
        } else {
            entry.color = Math.floor(Math.random() * 9);
        }
    }
    if (settings.shape.enabled) {
        if (nback !== undefined && Math.random() < settings.actionBias) {
            entry.shape = nback.shape;
        } else {
            entry.shape = Math.floor(Math.random() * 9);
        }
    }

    state.currentRun.push(entry);

    // Activate relevant stimuli
    for (cell of document.querySelectorAll('#gamegrid>div')) {
        cell.classList.remove('active');
    }
    let active = settings.position.enabled ? entry.position + 1 : 5;
    let ac = document.querySelector('#gamegrid>div:nth-child(' + active + ')');
    ac.classList.add('active');
    ac.style.setProperty('--color', settings.color.enabled ? colors[settings.color.set][entry.color] : "#00f");

    if (settings.audio.enabled) {
        audioCtx.src = 'audio/' + settings.audio.set + '/' + (entry.audio + 1) + '.mp3';
        audioCtx.play();
    }

    stimuliStartedAt = performance.now();
};

const stepPost = () => {
    for (cell of document.querySelectorAll('#gamegrid>div')) {
        cell.classList.remove('active');
    }
};

const checkCorrect = () => {
    let settings = Alpine.store('settings');
    let state = Alpine.store('state');

    let correct = {};
    if (settings.position.enabled) {
        correct.position = false;
    }
    if (settings.audio.enabled) {
        correct.audio = false;
    }
    if (settings.color.enabled) {
        correct.color = false;
    }
    if (settings.shape.enabled) {
        correct.shape = false;
    }

    if (state.currentRun.length <= settings.n) {
        for (k of Object.keys(correct)) {
            correct[k] = !(k in state.currentRun.at(-1).response);
        }
    } else {
        let lookback = state.currentRun.at(-(settings.n + 1));
        let current = state.currentRun.at(-1);

        for (k of Object.keys(correct)) {
            let resp = k in current.response;
            let actual = lookback[k] == current[k];
            correct[k] = resp === actual;
        }
    }

    return correct;
};

const endGame = () => {
    updateRunHistory();
    setTimeout(() => {
        document.getElementById('runstats').showModal();
    }, 0); // Allow the browser to update the DOM before
}

const readRunHistory = () => {
    try {
        return JSON.parse(localStorage.getItem('history') || '[]').map(run => {
            run.settings = normalizeSettings(run.settings);
            return run;
        });
    } catch {
        return [];
    }
};

const updateRunHistory = () => {
    currentRun = Alpine.store('state').currentRun;
    let settings = Alpine.store('settings');
    localStorage.getItem('history');
    let history = readRunHistory();
    let newHistory = history.concat([{
        endMoment: (new Date()).toISOString(),
        settings,
        run: currentRun,
    }]);
    localStorage.setItem('history', JSON.stringify(newHistory));
    Alpine.store('runHistory', newHistory);
};

const closeThisModal = event => {
    let t = event.target;
    while (t.tagName !== 'DIALOG') {
        t = t.parentElement;
    }
    t.close();
};

const backToMenu = event => {
    closeThisModal(event);
    document.getElementById('menu').showModal();
}

const sendResponse = category => {
    let settings = Alpine.store('settings');
    let state = Alpine.store('state');
    
    let latency = performance.now() - stimuliStartedAt; // ms

    if (state.currentRun.length !== 0) {
        let entry = state.currentRun.at(-1);
        if (category === 'position') {
            entry.response.position = true;
            entry.latency.position = entry.latency.position || latency;
        } else if (category === 'audio') {
            entry.response.audio = true;
            entry.latency.audio = entry.latency.audio || latency;
        } else if (category === 'color') {
            entry.response.color = true;
            entry.latency.color = entry.latency.color || latency;
        } else if (category === 'shape') {
            entry.response.shape = true;
            entry.latency.shape = entry.latency.shape || latency;
        } else {
            console.error("Unknown category", category);
        }
    }
};

document.addEventListener('alpine:init', () => {
    Alpine.store('settings', readSettings());
    Alpine.store('runHistory', readRunHistory());
    Alpine.store('state', {
        hasValidSettings: false,
        currentRun: [],
        selectedRun: null,
    });
    setTimeout(updateSettings, 0);
    

    document.getElementById('menu').showModal();

    window.onkeydown = event => {
        let settings = Alpine.store('settings');
        let state = Alpine.store('state');
        if (state.currentRun.length !== 0) {
            if (event.key === settings.position.key) {
                sendResponse('position');
            } else if (event.key === settings.audio.key) {
                sendResponse('audio');
            } else if (event.key === settings.color.key) {
                sendResponse('color');
            } else if (event.key === settings.shape.key) {
                sendResponse('shape');
            }
        }
    };
})
