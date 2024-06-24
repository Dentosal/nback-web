"use strict";

// History statistics

const avgOrZero = array => {
    if (array.length === 0) {
        return 0;
    }
    return array.reduce((acc, x) => acc + x, 0) / array.length;
}

const medOrZero = array => {
    if (array.length === 0) {
        return 0;
    } else if (array.length === 1) {
        return array[0];
    } else {
        let elems = structuredClone(array);
        magicSort(elems);
        let mid = Math.floor(elems.length / 2);
        if (elems.length % 2 === 0) {
            return (elems[mid - 1] + elems[mid]) / 2;
        } else {
            return elems[mid];
        }
    }
}


// Simple % score for a run
const runScore = run => {
    let cats = run.settings.position.enabled + run.settings.audio.enabled + run.settings.color.enabled + run.settings.shape.enabled;
    if (cats === 0) {
        return 1;
    }
    let divider = cats * run.run.length;
    if (divider === 0) {
        return 1;
    }
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

const columnLatencyAvgStr = (entry, column) => Math.round(avgOrZero(entry.run.map(entry => entry.latency[column]).filter(a => a !== undefined))) + "ms";
const columnScoreStr = (entry, column) => {
    let score = entry.run.filter(entry => entry.correct[column]).length;
    let p = score / entry.settings.runLength;
    return Math.round(p*100) + "% (" + score + ")";
}

const formatDuration = seconds => {
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

const totalTime = history => {
    return history.reduce((acc, run) => acc + run.run.length * run.settings.secondsPerTrial, 0);
}

const totalTimeToday = history => {
    let today = (new Date().toLocaleString('fi-FI')).split(" ")[0];

    return history.filter(
        run => (new Date(run.endMoment).toLocaleString('fi-FI')).split(" ")[0] === today
    ).reduce((acc, run) => acc + run.run.length * run.settings.secondsPerTrial, 0);
}

const axisConfig = {
    percent: {
        beginAtZero: true,
        min: 0,
        max: 1,
        suggestedMin: 0,
        suggestedMax: 1,
        ticks: {
            callback: function (value, index, ticks) {
                return Math.round(value * 100) + "%";
            }
        }
    },
    seconds: {
        beginAtZero: true,
        ticks: {
            callback: function (value, index, ticks) {
                return formatDuration(value);
            }
        }
    },
    latency: {
        beginAtZero: true,
        type: 'linear',
        ticks: {
            callback: function (value, index, ticks) {
                return value + "ms";
            }
        }
    },
    resolution: {
        type: 'category',
        ticks: {
            callback: function (value, index, ticks) {
                return l10n.resolution[state.lang][value];
            }
        }
    },
};

const axisChoices = {
    x: {
        run: [
            { name: "date", options: {}, chartType: 'line' },
            { name: "n", options: {}, chartType: 'bar' },
            { name: "kind", options: {}, chartType: 'bar' },
            { name: "n_and_kind", options: {}, chartType: 'bar' },
            { name: "length", options: { beginAtZero: true }, chartType: 'line' },
            { name: "secondsPerTrial", options: axisConfig.seconds, chartType: 'line' },
            { name: "actionBias", options: { beginAtZero: true }, chartType: 'line' },
            { name: "duration", options: axisConfig.seconds, chartType: 'line' },
        ],
        trial: [
            { name: "correctness", options: axisConfig.percent, chartType: 'line' },
            { name: "resolution", options: axisConfig.resolution, chartType: 'bar' },
            { name: "latency", options: axisConfig.latency, chartType: 'line' },
            { name: "latency_100", options: axisConfig.latency, chartType: 'line' },
            { name: "value", options: {}, chartType: 'bar' },
        ],
    },
    y: {
        run: [
            { name: "date", options: {} },
            { name: "n", options: {} },
            { name: "length", options: { beginAtZero: true } },
            { name: "secondsPerTrial", options: axisConfig.seconds },
            { name: "actionBias", options: { beginAtZero: true } },
            { name: "score", options: axisConfig.percent },
            { name: "duration", options: axisConfig.seconds },
        ],
        trial: [
            { name: "correctness", options: axisConfig.percent },
            { name: "latency", options: axisConfig.latency },
        ],     
    }
};

const chartSettingsDefaults = {
    x: 'run:date',
    y: 'run:duration',
    combine: 'avg',
};

const runFilterDefaults = {
    date: { min: null, max: null },
    kindExact: false,
    kind: {
        position: false,
        audio: false,
        color: false,
        shape: false,
    },
    n: { min: 1, max: null },
    runLength: { min: null, max: null },
    secondsPerTrial: { min: null, max: null },
    actionBias: { min: 0, max: 1 },
};

const itemFilterDefaults = {
    kind: {
        position: "true",
        audio: "true",
        color: "true",
        shape: "true",
    },
    ignoreFirstN: false,
};

const insightsPresets = [
    {
        name: "Viiveen kehitys",
        chartSettings: {
            x: 'run:date',
            y: 'trial:latency',
            combine: 'combo',
        },
        runFilters: runFilterDefaults,
        itemFilters: itemFilterDefaults,
    },
    {
        name: "Onnistumisten kehitys, n≥3",
        chartSettings: {
            x: 'run:date',
            y: 'trial:correctness',
            combine: 'avg',
        },
        runFilters: {...runFilterDefaults, ...{n: { min: 3, max: null }}},
        itemFilters: itemFilterDefaults,
    },
    {
        name: "Onnistuminen per sijainti, n≥3",
        chartSettings: {
            x: 'trial:value',
            y: 'trial:correctness',
            combine: 'avg',
        },
        runFilters: {...runFilterDefaults, ...{n: { min: 3, max: null }}},
        itemFilters: {...itemFilterDefaults, ...{ kind: { ...itemFilterDefaults.kind, ...{audio: "false"}}}},
    },
    {
        name: "Viiveen vaikutus onnistumiseen",
        chartSettings: {
            x: 'trial:latency_100',
            y: 'trial:correctness',
            combine: 'avg',
        },
        runFilters: runFilterDefaults,
        itemFilters: itemFilterDefaults,
    },
];


const updateAnalysis = (history, runFilters, itemFilters, axes) => {
    let state = Alpine.store('state');

    let filtered = history.filter(entry => {
        let settings = entry.settings;

        let kindMatch = [
            settings.position.enabled === runFilters.kind.position,
            settings.audio.enabled === runFilters.kind.audio,
            settings.color.enabled === runFilters.kind.color,
            settings.shape.enabled === runFilters.kind.shape,
        ];

        return (runFilters.kindExact ? kindMatch.every(x => x) : kindMatch.some(x => x))
            && (runFilters.date.min === null || entry.startMoment >= runFilters.date.min)
            && (runFilters.date.max === null || entry.startMoment <= runFilters.date.max)
            && (runFilters.n.min === null || settings.n >= runFilters.n.min)
            && (runFilters.n.max === null || settings.n <= runFilters.n.max)
            && (runFilters.runLength.min === null || settings.runLength >= runFilters.runLength.min)
            && (runFilters.runLength.max === null || settings.runLength <= runFilters.runLength.max)
            && (runFilters.secondsPerTrial.min === null || settings.secondsPerTrial >= runFilters.secondsPerTrial.min)
            && (runFilters.secondsPerTrial.max === null || settings.secondsPerTrial <= runFilters.secondsPerTrial.max)
            && (runFilters.actionBias.min === null || settings.actionBias >= runFilters.actionBias.min)
            && (runFilters.actionBias.max === null || settings.actionBias <= runFilters.actionBias.max);
    });


    let [xScope, xName] = axes.x.split(":");
    let [yScope, yName] = axes.y.split(":");


    let data = [];
    for (let run of filtered) {
        const resolveRun = name => {
            if (name === "date") {
                if (run.endMoment === undefined) {
                    return "unknown";
                }
                return isoToLocalDate(run.endMoment);
            } else if (name === "index1") {
                return index + 1;
            } else if (name === "n") {
                return run.settings.n;
            } else if (name === "kind") {
                return (
                    (run.settings.position.enabled ? "S" : "")
                    + (run.settings.audio.enabled ? "Ä" : "")
                    + (run.settings.color.enabled ? "V" : "")
                    + (run.settings.shape.enabled ? "M" : "")
                );
            } else if (name === "n_and_kind") {
                return resolveRun("n") + " " + resolveRun("kind");
            } else if (name === "length") {
                return run.settings.runLength;
            } else if (name === "secondsPerTrial") {
                return run.settings.secondsPerTrial;
            } else if (name === "actionBias") {
                if (run.settings.actionBias === undefined) {
                    return "unknown";
                }
                return run.settings.actionBias;
            } else if (name === "score") {
                return runScore(run);
            } else if (name === "duration") {
                return run.run.length * run.settings.secondsPerTrial;
            } else {
                console.error("Unknown axis property: run:" + name);
            }
        }

        let x = null;
        let y = null;
        if (xScope === "run") {
            x = resolveRun(xName);
        }
        if (yScope === "run") {
            y = resolveRun(yName);
        }

        if (x !== null && y !== null) {
            data.push({ x, y });
            continue;
        }


        let trials = run.run.filter((trial, index) => (!itemFilters.ignoreFirstN) || index >= run.settings.n);


        for (let trial of trials) {
            for (let st of ["position", "audio", "color", "shape"]) {
                let resolution = { correct: trial.correct[st] === true, action: st in trial.response };
                if (run.settings[st].enabled && !maskedEval(itemFilters.kind[st], resolution)) {
                    continue;
                }

                const resolveTrial = name => {
                    if (name === "correctness") {
                        return trial.correct[st];
                    } else if (name === "resolution") {
                        return (trial.correct[st] ? "t" : "f") + ((st in trial.response) ? "p" : "n");
                    } else if (name === "latency") {
                        return trial?.latency?.[st];
                    } else if (name === "latency_100") {
                        let lat = resolveTrial("latency");
                        return lat ? (Math.round(lat / 100) * 100) : undefined;
                    } else if (name === "value") {
                        return st in trial ? (trial[st] + 1) : undefined;
                    } else {
                        console.error("Unknown axis property: trial:" + name);
                    }
                };

                x = xScope === "trial" ? resolveTrial(xName) : x;
                y = yScope === "trial" ? resolveTrial(yName) : y;
                if ((x !== undefined) && (x !== null) && (y !== undefined) && (x !== null)) {
                    data.push({ x, y });
                }
            }
        }
    }

    const nodata = document.getElementById('data-stats');
    if (data.length === 0) {
        nodata.innerText = "Ei lainkaan dataa valittuna.";
    } else {
        nodata.innerText = "Valittuna " + data.length + " datapistettä.";
    }

    const ctx = document.getElementById('chart');

    let chartType = axisChoices.x[xScope].find(v => v.name == xName).chartType;

    let chart = Chart.getChart(ctx);
    if (chart === undefined) {
        chart = new Chart(ctx, {
            type: chartType,
            data: {datasets: []},
        });
    } else if (chart.config.type !== chartType) {
        chart.destroy();
        chart = new Chart(ctx, {
            type: chartType,
            data: { datasets: [] },
        });
    }

    chart.data.datasets = [];
    chart.options.scales.x = {title: { display: true, text: l10n.chartValues[state.lang][axes.x] }};
    chart.options.scales.y = {title: { display: true, text: l10n.chartValues[state.lang][axes.y] }};

    for (let [a, aScope, aName] of [['x', xScope, xName], ['y', yScope, yName]]) {
        for (let [k, v] of Object.entries(axisChoices[a][aScope].find(v => v.name == aName).options)) {
            chart.options.scales[a][k] = v;
        }
    }

    if (axes.combine === 'sum') {
        let [keys, values] = computeDataset.sum(data);
        chart.data.labels = keys;
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["sum"],
            data: values,
        })
    } else if (axes.combine === 'avg') {
        let [keys, values] = computeDataset.avg(data);
        chart.data.labels = keys;
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["avg"],
            data: values,
        })
    } else if (axes.combine === 'med') {
        let [keys, values] = computeDataset.med(data);
        chart.data.labels = keys;
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["med"],
            data: values,
        })
    } else if (axes.combine === 'minmax') {
        let [keys, minValues] = computeDataset.min(data);
        let [_maxKeys, maxValues] = computeDataset.max(data);
        chart.data.labels = keys;
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["min"],
            data: minValues,
        });
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["max"],
            data: maxValues,
        });
    } else if (axes.combine === 'combo') {
        let [keys, avgValues] = computeDataset.avg(data);
        let [_medKeys, medValues] = computeDataset.med(data);
        let [_minKeys, minValues] = computeDataset.min(data);
        let [_maxKeys, maxValues] = computeDataset.max(data);
        chart.data.labels = keys;
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["avg"],
            data: avgValues,
        });
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["med"],
            data: medValues,
        });
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["min"],
            data: minValues,
        });
        chart.data.datasets.push({
            label: l10n.combineFn[state.lang]["max"],
            data: maxValues,
        });
    } else {
        console.error("Unknown combine type: " + axes.combine);
    }


    chart.update();
};

const groupByX = data => {
    let combined = {};
    for (let { x, y } of data) {
        if (combined[x] === undefined) {
            combined[x] = [];
        }
        combined[x].push(y);
    }
    return combined;
}

const unzipSortedMap = (data, f) => {
    let keys = Object.keys(data);
    magicSort(keys);

    let sortedData = [];
    for (let key of keys) {
        sortedData.push(f(data[key]));
    }

    return [keys, sortedData];
}

const computeDataset = {
    sum: data => unzipSortedMap(groupByX(data), arr => arr.reduce((acc, v) => acc + v, 0)),
    avg: data => unzipSortedMap(groupByX(data), avgOrZero),
    med: data => unzipSortedMap(groupByX(data), medOrZero),
    min: data => unzipSortedMap(groupByX(data), arr => arr.length > 0 ? Math.min(...arr) : 0),
    max: data => unzipSortedMap(groupByX(data), arr => arr.length > 0 ? Math.max(...arr) : 0),
}
