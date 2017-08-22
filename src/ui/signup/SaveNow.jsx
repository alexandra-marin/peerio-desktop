const React = require('react');
const { Component } = require('react');
const { observer } = require('mobx-react');
const { Button } = require('~/react-toolbox');
const { t } = require('peerio-translator');
const fs = require('fs');
const electron = require('electron').remote;
const T = require('~/ui/shared-components/T');

@observer class SaveNow extends Component {
    wwref = (ref) => {
        this.ref = ref;
    }
    // TODO: this is duplicated with Security settings, FIX IT
    save = () => {
        const store = this.props.store;
        this.replaceTemplateVars(store.username, store.email, store.passphrase, () => {
            const win = electron.getCurrentWindow();
            electron.dialog.showSaveDialog(win, { defaultPath: `${store.username}.pdf` }, this.printToPdf);
        });
    };

    replaceTemplateVars(username, email, key, callback) {
        const js = `
            document.getElementById('username').innerHTML = '${username}';
            document.getElementById('email').innerHTML = '${email}';
            document.getElementById('key').innerHTML = '${key}';
            `;
        this.ref.executeJavaScript(js, true, callback);
    }

    printToPdf = (filePath) => {
        if (!filePath) return;
        this.ref.printToPDF({ printBackground: true, landscape: false }, (er, data) => {
            fs.writeFileSync(filePath, data);
        });
    };

    render() {
        return (
            <div className="flex-col profile">
                <div className="warning-line">
                    <div className="flex-col flex-justify-center" style={{ width: '275px', whiteSpace: 'nowrap' }}>
                        <T k="title_saveNow1" className="display-1" />
                    </div>
                </div>
                <T k="title_saveNow3" tag="p" />
                <T k="title_saveNow4" tag="p" />
                {/* <div>
                    <p>{t('title_yourAccountKey')}</p>
                    <div className="passphrase">{this.props.store.passphrase}</div>
                </div> */}

                <Button icon="file_download"
                    label={t('button_saveAccountKey')}
                    className="button-gradient"
                    style={{ marginTop: '32px' }}
                    onClick={this.save} />
                <webview ref={this.wwref} src="./AccountKeyBackup.html"
                    style={{ display: 'inline-flex', width: 0, height: 0, flex: '0 1' }} />
            </div>
        );
    }
}

module.exports = SaveNow;
