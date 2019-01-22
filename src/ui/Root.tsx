import React from 'react';
import { DragDropContext } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';
import { ipcRenderer } from 'electron';
import { computed, reaction, observable, when } from 'mobx';
import { observer } from 'mobx-react';

import { socket, clientApp, warnings, chatStore, t } from 'peerio-icebear';
import { A11yWrapper, Button, ProgressBar } from 'peer-ui';

import DragPreviewLayer from '~/ui/files/components/DragPreviewLayer';
import TwoFADialog from '~/ui/shared-components/TwoFADialog';
import Snackbar from '~/ui/shared-components/Snackbar';
import SystemWarningDialog from '~/ui/shared-components/SystemWarningDialog';

import appState from '~/stores/app-state';
import routerStore from '~/stores/router-store';
import uiStore from '~/stores/ui-store';

import isDevEnv from '~/helpers/is-dev-env';
import * as appControl from '~/helpers/app-control';
import { sendWindowHiddenNotification } from '~/helpers/notifications';

import UpdateFailedDialog from './updater/UpdateFailedDialog';
import InstallingUpdateDialog from './updater/InstallingUpdateDialog';
import ReadyToInstallUpdateDialog from './updater/ReadyToInstallUpdateDialog';

@DragDropContext(HTML5Backend)
@observer
export default class Root extends React.Component {
    /*
        Snackbar exists in root because snackbar warnings appears everywhere in app.
        However, root snackbar interferes with MessageInput in any currently active chat.
        So we need to only show root snackbar on non-chat screens.

        The rule is:
            * show if not in either `/app/chats/` or `/app/patients/` view
            * or, show snackbar if there is no current activeChat.
                This covers the case where we are in `chats` or `patients` view but without MessageInput
                e.g. zero states, new DM, new room
    */
    @computed
    get snackbarVisible() {
        return (
            (!routerStore.currentRoute.startsWith(routerStore.ROUTES.chats) &&
                !routerStore.currentRoute.startsWith(routerStore.ROUTES.patients)) ||
            !chatStore.activeChat
        );
    }

    @observable showOfflineNotification = false;

    constructor(props: {}) {
        super(props);
        if (isDevEnv) {
            appState.devModeEnabled = true;
        }

        // events from main process
        ipcRenderer.on('warning', (_ev, key) => warnings.add(key)); // TODO: not needed anymore?
        ipcRenderer.on('console_log', (_ev, arg) => console.log(arg));
        ipcRenderer.on('activate_dev_mode', () => {
            appState.devModeEnabled = true;
        });
        ipcRenderer.on('main-window-hidden', () => {
            if (process.platform === 'win32') {
                if (!uiStore.sharedPrefs.minimizeToTrayNotificationSeen) {
                    sendWindowHiddenNotification();
                    uiStore.sharedPrefs.minimizeToTrayNotificationSeen = true;
                }
            }
        });

        reaction(
            () => socket.connected,
            connected => {
                if (connected) {
                    this.showOfflineNotification = false;
                    return;
                }
                setTimeout(() => {
                    this.showOfflineNotification = !socket.connected;
                }, 5000);
            },
            { fireImmediately: true }
        );

        when(() => clientApp.clientSessionExpired, () => appControl.relaunch());
    }

    componentWillMount() {
        clientApp.isFocused = appState.isActive;
        reaction(
            () => appState.isActive,
            active => {
                clientApp.isFocused = active;
            }
        );
    }
    renderReconnectSection() {
        return (
            <span>
                <Button
                    className="reconnect"
                    label={t('button_retry')}
                    onClick={socket.reset}
                    theme="inverted"
                />
            </span>
        );
    }

    render() {
        return (
            <A11yWrapper>
                <div className={`status-bar ${this.showOfflineNotification ? 'visible' : ''}`}>
                    {this.showOfflineNotification ? (
                        <ProgressBar circular theme="light" size="small" />
                    ) : null}
                    #{socket.reconnectAttempt}&nbsp;{t('error_connecting')}&nbsp;
                    {appState.isOnline && this.renderReconnectSection()}
                </div>
                {this.props.children}

                {this.snackbarVisible ? <Snackbar /> : null}
                <SystemWarningDialog />
                <TwoFADialog />
                <UpdateFailedDialog />
                <ReadyToInstallUpdateDialog />
                <InstallingUpdateDialog />
                <DragPreviewLayer />
            </A11yWrapper>
        );
    }
}
