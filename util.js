"use strict";

// https://stackoverflow.com/a/37580979 CC BY-SA 4.0
function permute(permutation) {
    var length = permutation.length,
        result = [permutation.slice()],
        c = new Array(length).fill(0),
        i = 1, k, p;

    while (i < length) {
        if (c[i] < i) {
            k = i % 2 && c[i];
            p = permutation[i];
            permutation[i] = permutation[k];
            permutation[k] = p;
            ++c[i];
            i = 1;
            result.push(permutation.slice());
        } else {
            c[i] = 0;
            ++i;
        }
    }
    return result;
}


// Eval without global scope access. STILL NOT SAFE.
// Used only for evaluating constant expressions from alpinejs properties.
function maskedEval(scr, scope) {
    var mask = {};
    // mask global properties 
    for (let p in this) mask[p] = undefined;
    // update mask with scope properties
    for (let p of Object.keys(scope)) mask[p] = scope[p];
    // execute script in private context
    return (new Function("with(this) { return " + scr + "}")).call(mask);
}

// Returns current local time truncated iso format
const getLocalNowISO = () => {
    let t = new Date();
    let z = t.getTimezoneOffset() * 60 * 1000;
    let tLocal = t - z;
    tLocal = new Date(tLocal);
    let iso = tLocal.toISOString();
    return iso.split(".")[0].replace("T", " ");
}

// Returns current local date in iso format
const getToday = () => getLocalNowISO().split(" ")[0];

// Converts iso date to local date
const isoToLocalDate = isoStr => {
    let t = new Date(isoStr);
    let z = t.getTimezoneOffset() * 60 * 1000;
    let tLocal = t - z;
    tLocal = new Date(tLocal);
    let iso = tLocal.toISOString();
    return iso.split("T")[0];
}

// Mutating sort, magically guess type
const collator = new Intl.Collator('en', { numeric: true, sensitivity: 'base' })
const magicSort = array => {
    if (array.length <= 1) {
        return;
    }

    array.sort(collator.compare);
}

// Convert value to number
const toNumber = (value, hint) => {
    if (hint.match(/date/) && value.match(/\d{4}-\d{2}-\d{2}/)) {
        return new Date(value).getTime();
    }

    if (hint === "trial:resolution") {
        return ["tp", "tn", "fp", "fn"].indexOf(value);
    }

    return Number(value);
}

/// Start download of a file with given data
function downloadTextFile(filename, text, mime = 'text/plain') {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:' + mime + ';charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}