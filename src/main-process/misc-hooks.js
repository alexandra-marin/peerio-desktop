import { shell } from 'electron';

import { isUrlAllowed } from '../helpers/url';
import certData from '../cert_fingerprints';

export default function applyMiscHooks(mainWindow) {
    console.log('Attaching misc webContents hooks.');

    // make all attempts to navigate browser window open in external browser
    mainWindow.webContents.on('will-navigate', (e, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            e.preventDefault();
            if (isUrlAllowed(url)) shell.openExternal(url);
        }
    });

    mainWindow.webContents.on('new-window', (e, url) => {
        if (url !== mainWindow.webContents.getURL()) {
            e.preventDefault();
            if (isUrlAllowed(url)) shell.openExternal(url);
        }
    });

    mainWindow.webContents.session.setCertificateVerifyProc((request, callback) => {
        let ok = true;
        for (const d of certData) {
            if (request.hostname.match(d.hostRegex)) {
                // The reason for implementing check like this is
                // that we may want to include more fingerprints
                // for the same host for the period of transition
                // to a new certificate, so the later fingerprint
                // match can override the previous non-match,
                // setting ok back to true.
                ok = d.fingerprint === request.certificate.fingerprint;
                if (ok) break;
            }
        }
        if (!ok) {
            // Verification failure.
            callback(-2);
            return;
        }
        // Let chromium verify it further.
        callback(-3);
    });

    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
        if (details.responseHeaders.link) {
            // Remove 'link' headers to avoid 'preload' by XMLHttpRequest.
            delete details.responseHeaders.link;
        }
        callback({ cancel: false, responseHeaders: details.responseHeaders });
    });
}
