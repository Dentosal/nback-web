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
    if (settingsStr === null) {
        writeSettings(defaultSettings);
        return defaultSettings;
    }
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

const stepPrimary = () => {
    let settings = Alpine.store('settings');

    // Create entry and append to current run
    let entry = {
        response: {},
    };
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
    Alpine.store('state').currentRun.push(entry);

    // Activate relevant stimuli
    for (cell of document.querySelectorAll('#gamegrid>div')) {
        cell.classList.remove('active');
    }
    let active = settings.position.enabled ? entry.position + 1 : 5;
    let ac = document.querySelector('#gamegrid>div:nth-child(' + active + ')');
    ac.classList.add('active');
    ac.style.setProperty('--color', settings.color.enabled ? colors[entry.color] : "#00f");

    if (settings.audio.enabled) {
        audioCtx.src = 'audio/' + settings.audio.set + '/' + (entry.audio + 1) + '.mp3';
        audioCtx.play();
    }
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
        return JSON.parse(localStorage.getItem('history') || '[]');
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

    if (state.currentRun.length !== 0) {
        if (category === 'position') {
            state.currentRun.at(-1).response.position = true;
        } else if (category === 'audio') {
            state.currentRun.at(-1).response.audio = true;
        } else if (category === 'color') {
            state.currentRun.at(-1).response.color = true;
        } else if (category === 'shape') {
            state.currentRun.at(-1).response.shape = true;
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
