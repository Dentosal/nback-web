// History statistics

const avgOrZero = array => {
    if (array.length === 0) {
        return 0;
    }
    return array.reduce((acc, x) => acc + x, 0) / array.length;
}


// Simple % score for a run
const runScore = run => {
    let cats = run.settings.position.enabled + run.settings.audio.enabled + run.settings.color.enabled + run.settings.shape.enabled;
    if (cats === 0) {
        return 1;
    }
    let divider = cats * run.run.length;
    return run.run.reduce((acc, x) => {
        let correct = 0;
        if (run.settings.position.enabled) {
            correct += x.correct.position;
        }
        if (run.settings.audio.enabled) {
            correct += x.correct.audio;
        }
        if (run.settings.color.enabled) {
            correct += x.correct.color;
        }
        if (run.settings.shape.enabled) {
            correct += x.correct.shape;
        }
        return acc + correct;
    }, 0) / divider;
};

const runsWithMode = mode => readRunHistory().map((run, index) => {
    run.index = index;
    return run;
}).filter(run => 
    run.settings.position.enabled === (mode.position || false)
    && run.settings.audio.enabled === (mode.audio || false)
    && run.settings.color.enabled === (mode.color || false)
    && run.settings.shape.enabled === (mode.shape || false)
);

const allModeCombos = () => {
    let modes = [false, true];
    let combos = [];
    for (let position of modes) {
        for (let audio of modes) {
            for (let color of modes) {
                for (let shape of modes) {
                    combos.push({position, audio, color, shape});
                }
            }
        }
    }
    return combos;
}

// Disregarding timing, what's the highest n-back for each mode where runLenght > 40 + n?
const highestPerfectRun = () => {
    allModeCombos().flatMap(mode => {
        let runs = runsWithMode(mode).filter(run => runScore(run) === 1.0); //  && run.run.length > 10 + run.settings.n
        if (runs.length === 0) {
            return [];
        }
        let maxn = Math.max(...runs.map(r => r.settings.n));
        runs = runs.filter(run => run.settings.n === maxn);
        runs.sort((a, b) => b.run.length - a.run.length);
        return [runs[0].index];
    });
};

const someStats = () => {
    allModeCombos().map(mode => {
        let runs = runsWithMode(mode);
        let avg = runs.reduce((acc, run) => acc + runScore(run), 0) / runs.length;
        console.log(mode, avg);
    });
};


const columnLatencyAvgStr = (entry, column) => Math.round(avgOrZero(entry.run.map(entry => entry.latency[column]).filter(a => a !== undefined))) + "ms";
const columnScoreStr = (entry, column) => {
    let score = entry.run.filter(entry => entry.correct[column]).length;
    let p = score / entry.settings.runLength;
    return Math.round(p*100) + "% (" + score + ")";
}

const formatTime = seconds => {
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    minutes = minutes % 60;
    seconds = seconds % 60;
    let result = "";
    if (hours > 0) {
        result += hours + "h";
    }
    if (minutes > 0) {
        result += minutes + "m";
    }
    if (seconds > 0) {
        result += seconds + "s";
    }
    if (result === "") {
        result = "0s";
    }
    return result;
};

const totalTime = () => {
    let history = readRunHistory();
    return history.reduce((acc, run) => acc + run.run.length * run.settings.secondsPerTrial, 0);
}

const totalTimeToday = () => {
    let history = readRunHistory();
    let today = (new Date().toLocaleString('fi-FI')).split(" ")[0];

    return history.filter(
        run => (new Date(run.endMoment).toLocaleString('fi-FI')).split(" ")[0] === today
    ).reduce((acc, run) => acc + run.run.length * run.settings.secondsPerTrial, 0);
}
