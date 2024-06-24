"use strict";

// Eval wihtout global scope access. STILL NOT SAFE.
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

// Returns current local date in iso format
const getToday = () => {
    let t = new Date();
    let z = t.getTimezoneOffset() * 60 * 1000;
    let tLocal = t - z;
    tLocal = new Date(tLocal);
    let iso = tLocal.toISOString();
    return iso.split("T")[0];
}

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
const magicSort = array => {
    if (array.length <= 1) {
        return;
    }

    array.sort((a, b) => a - b);
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