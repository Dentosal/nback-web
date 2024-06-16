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
    Alpine.store('state').currentRun = [];
    setTimeout(stepGame, 1000);
};

const stepGame = () => {
    let settings = Alpine.store('settings');
    let perTrial = Number.parseFloat(settings.secondsPerTrial);
    let state = Alpine.store('state');
    stepCheckPrev(state);

    if (state.currentRun.length >= settings.runLength) {
        setTimeout(endGame, (perTrial + 1) * 1000);
        return;
    }

    // Run the current trial
    let timePrimary = 0.5;
    let timePost = perTrial - timePrimary;
    stepPrimary(settings);
    if (timePost > 0) {
        setTimeout(stepPost, timePost * 1000);
    }

    setTimeout(stepGame, perTrial * 1000);
}
const stepCheckPrev = state => {
    // Check previous trial, if any, and flash responses
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

const stepPrimary = settings => {
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
    ac.style.setProperty('--color', settings.color.enabled ? colors[entry.color] : "#f00");

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

    if (state.currentRun.length <= settings.n + 1) {
        for (k of Object.keys(correct)) {
            correct[k] = !(k in state.currentRun.at(-1).response);
        }
    } else {
        let lookback = state.currentRun.at(-(settings.n + 1));
        let current = state.currentRun.at(-1);

        console.log(JSON.stringify(lookback), JSON.stringify(current));
    
        for (k of Object.keys(correct)) {
            console.log("k", k, lookback[k], current[k]);
            let resp = k in state.currentRun.at(-1).response;
            let actual = lookback[k] == current[k];
            correct[k] = resp === actual;
        }
    }

    return correct;
};

const endGame = () => {
    let state = Alpine.store('state');
    let settings = Alpine.store('settings');

    let tbody = document.querySelector('#runstats > table > tbody');
    tbody.innerHTML = '';

    for (let row = 0; row < settings.runLength; row++) {
        let entry = state.currentRun[row];

        let tr = document.createElement('tr');
        let rowid = document.createElement('td');
        rowid.textContent = row + 1;
        tr.appendChild(rowid);


        if (settings.position.enabled) {
            let correct = entry.correct.position;
            let pressed = 'position' in entry.response;
            let td = document.createElement('td');
            td.textContent = entry.position;
            td.setAttribute('data-correct', correct);
            td.setAttribute('data-pressed', pressed);
            tr.appendChild(td);
        }
        if (settings.audio.enabled) {
            let correct = entry.correct.audio;
            let pressed = 'audio' in entry.response;
            let td = document.createElement('td');
            td.textContent = entry.audio;
            td.setAttribute('data-correct', correct);
            td.setAttribute('data-pressed', pressed);
            tr.appendChild(td);
        }
        if (settings.color.enabled) {
            let correct = entry.correct.color;
            let pressed = 'color' in entry.response;
            let td = document.createElement('td');
            td.textContent = entry.color;
            td.setAttribute('data-correct', correct);
            td.setAttribute('data-pressed', pressed);
            tr.appendChild(td);
        }
        if (settings.shape.enabled) {
            let correct = entry.correct.shape;
            let pressed = 'shape' in entry.response;
            let td = document.createElement('td');
            td.textContent = entry.shape;
            td.setAttribute('data-correct', correct);
            td.setAttribute('data-pressed', pressed);
            tr.appendChild(td);
        }

        tbody.appendChild(tr);
    }

    document.getElementById('runstats').showModal()
};

document.addEventListener('alpine:init', () => {
    Alpine.store('settings', readSettings());
    Alpine.store('state', {
        hasValidSettings: false,
        currentRun: [],
    });
    setTimeout(updateSettings, 0);
    

    document.getElementById('menu').showModal();

    window.onkeydown = event => {
        let settings = Alpine.store('settings');
        let state = Alpine.store('state');
        if (state.currentRun.length !== 0) {
            if (event.key === settings.position.key) {
                state.currentRun.at(-1).response.position = true;
            } else if (event.key === settings.audio.key) {
                state.currentRun.at(-1).response.audio = true;
            } else if (event.key === settings.color.key) {
                state.currentRun.at(-1).response.color = true;
            } else if (event.key === settings.shape.key) {
                state.currentRun.at(-1).response.shape = true;
            }
        }
    };
})
