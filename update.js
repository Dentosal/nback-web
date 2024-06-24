"use strict"; 

let current_version = "$MAGIC_VERSION_NUMBER";

const isLocalDev = () => {
    return [
        'localhost:8000',
        '[::]:8000',
        '127.0.0.1:8000',
    ].includes(window.location.host);
};

const fetchLatestVersion = async () => {
    try {
        let r = await fetch("version.txt?_=" + Date.now(), { cache: "no-store" });
        let version = await r.text();
        return version.trim();
    } catch (e) {
        let elem = document.querySelector("#update");
        elem.classList.add("error");
        elem.innerText = "Päivitysten tarkastus epäonnistui";
        return null;
    }
};

let update_throttle = 1000 * 60; // At most once per minute
let update_last = performance.now(); // So that we don't check immediately

const checkForUpdates = async () => {    
    let elem = document.querySelector("#update");
    elem.classList.remove("error");
    
    if (isLocalDev()) {
        elem.innerText = "Localhost, ei päivitystarkastusta";
        return;
    }

    let now = performance.now();
    if (now - update_last < update_throttle) {
        return;
    }
    update_last = now;

    let latest_version = await fetchLatestVersion();
    if (latest_version === null) {
        return;
    }

    if (current_version === null) {
        current_version = latest_version;
        elem.innerText = "";
    } else if (latest_version !== current_version) {
        elem.innerText = "Uusi versio saatavilla! Klikkaa päivittääksesi.";
    } else {
        elem.innerText = "";
    }
};

document.addEventListener('DOMContentLoaded', () => checkForUpdates());
document.addEventListener("focus", () => checkForUpdates());
