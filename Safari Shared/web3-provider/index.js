// Copyright © 2021 Tokenary. All rights reserved.
// Rewrite of index.js from trust-web3-provider.

"use strict";

import TokenaryEthereum from "./ethereum";
import TokenarySolana from "./solana";
import TokenaryNear from "./near";
import ProviderRpcError from "./error";

window.tokenary = {overlayConfigurations: []};
window.tokenary.postMessage = (name, id, body, provider) => {
    const message = {name: name, id: id, provider: provider, body: body};
    window.postMessage({direction: "from-page-script", message: message}, "*");
};

window.tokenary.disconnect = (provider) => {
    const disconnectRequest = {subject: "disconnect", provider: provider};
    window.postMessage(disconnectRequest, "*");
};

// - MARK: Ethereum

window.ethereum = new TokenaryEthereum();
window.web3 = {currentProvider: window.ethereum};
window.metamask = window.ethereum;
window.dispatchEvent(new Event('ethereum#initialized'));

// - MARK: Solana - disabled

//window.solana = new TokenarySolana();
//window.tokenarySolana = window.solana;
//window.phantom = {solana: window.solana};
//window.dispatchEvent(new Event("solana#initialized"));

// - MARK: Near - disabled

//window.near = new TokenaryNear();
//window.sender = window.near;
//window.dispatchEvent(new Event("near#initialized"));

// - MARK: Process content script messages

window.addEventListener("message", function(event) {
    if (event.source == window && event.data && event.data.direction == "from-content-script") {
        const response = event.data.response;
        const id = event.data.id;
        
        if ("overlayConfiguration" in response) {
            window.tokenary.overlayConfigurations.push(response.overlayConfiguration);
            window.tokenary.showOverlay();
        } else if ("latestConfigurations" in response) {
            const name = "didLoadLatestConfiguration";
            var remainingProviders = new Set(["ethereum", "solana", "near"]);
            
            for(let configurationResponse of response.latestConfigurations) {
                configurationResponse.name = name;
                deliverResponseToSpecificProvider(id, configurationResponse, configurationResponse.provider);
                remainingProviders.delete(configurationResponse.provider);
            }
            
            remainingProviders.forEach((provider) => {
                deliverResponseToSpecificProvider(id, {name: "didLoadLatestConfiguration"}, provider);
            });
        } else {
            deliverResponseToSpecificProvider(id, response, response.provider);
        }
    }
});

function deliverResponseToSpecificProvider(id, response, provider) {
    switch (provider) {
        case "ethereum":
            window.ethereum.processTokenaryResponse(id, response);
            break;
        case "solana":
            window.solana.processTokenaryResponse(id, response);
            break;
        case "near":
            window.near.processTokenaryResponse(id, response);
            break;
        case "multiple":
            response.bodies.forEach((body) => {
                body.id = id;
                body.name = response.name;
                deliverResponseToSpecificProvider(id, body, body.provider);
            });
            
            response.providersToDisconnect.forEach((provider) => {
                switch (provider) {
                    case "ethereum":
                        window.ethereum.externalDisconnect();
                        break;
                    case "solana":
                        window.solana.externalDisconnect();
                        break;
                    case "near":
                        window.near.externalDisconnect();
                        break;
                    default:
                        break;
                }
            });
            
            break;
        default:
            // pass unknown provider message to all providers
            window.ethereum.processTokenaryResponse(id, response);
            window.solana.processTokenaryResponse(id, response);
            window.near.processTokenaryResponse(id, response);
    }
}

// MARK: - Tokenary overlay for iOS

window.postMessage({inpageAvailable: true}, "*");

window.tokenary.overlayTapped = () => {
    const request = window.tokenary.overlayConfigurations[0].request;
    window.tokenary.overlayConfigurations.shift();
    window.tokenary.hideOverlayImmediately(true);
    deliverResponseToSpecificProvider(request.id, {id: request.id, error: new ProviderRpcError(4001, "Canceled"), name: request.name}, request.provider);
    
    const cancelRequest = {subject: "cancelRequest", id: request.id};
    window.postMessage(cancelRequest, "*");
};

window.tokenary.hideOverlayImmediately = (immediately) => {
    if (immediately) {
        document.getElementById("tokenary-overlay").style.display = "none";
        if (window.tokenary.overlayConfigurations.length) {
            window.tokenary.showOverlay();
        }
    } else {
        setTimeout( function() { window.tokenary.hideOverlayImmediately(true); }, 200);
    }
};

window.tokenary.showOverlay = () => {
    const overlay = document.getElementById("tokenary-overlay");
    if (overlay) {
        window.tokenary.unhideOverlay(overlay);
    } else {
        window.tokenary.createOverlay();
    }
};

window.tokenary.createOverlay = () => {
    const overlay = document.createElement("div");
    overlay.setAttribute("id", "tokenary-overlay");
    overlay.setAttribute("ontouchstart", `
        event.stopPropagation();
        if (event.target === event.currentTarget) {
            window.tokenary.overlayTapped();
            return false;
        }
    `);
    
    overlay.innerHTML = `<button id="tokenary-button" onclick="window.tokenary.overlayButtonTapped();">Proceed in Tokenary</button>`;
    document.body.appendChild(overlay);
    window.tokenary.unhideOverlay(overlay);
};

window.tokenary.unhideOverlay = (overlay) => {
    overlay.firstChild.innerHTML = window.tokenary.overlayConfigurations[0].title;
    overlay.style.display = "grid";
}

window.tokenary.overlayButtonTapped = () => {
    const request = window.tokenary.overlayConfigurations[0].request;
    window.tokenary.overlayConfigurations.shift();
    window.location.href = "https://tokenary.io/extension?query=" + encodeURIComponent(JSON.stringify(request));
    window.tokenary.hideOverlayImmediately(false);
};
