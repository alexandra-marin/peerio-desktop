/* eslint-disable jsx-a11y/no-static-element-interactions */
import React from 'react';
import { ProgressBar } from 'peer-ui';
import { User, socket } from 'peerio-icebear';
import secret from 'peerio-icebear/dist/crypto/secret';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react';
import css from 'classnames';
import ChatKegDb from 'peerio-icebear/dist/models/kegs/chat-keg-db';

@observer
class KegEditor extends React.Component {
    @observable dbs = null;
    @observable kegIds = [];
    @observable loading = false;
    @observable selectedDb = null;
    @observable selectedKeg = null;
    @observable keg = null;

    @action
    loadDbs() {
        this.dbs = [];
        this.loading = true;
        socket
            .send('/auth/kegs/user/dbs')
            .then(
                action(resp => {
                    resp.forEach(db => {
                        this.dbs.push({
                            id: db,
                            name: db.replace(/_.*_/, '...')
                        });
                    });
                })
            )
            .catch(err => {
                console.error(err);
                alert(err);
            })
            .finally(() => {
                this.loading = false;
            });
    }

    @action
    loadKegIds(dbId) {
        if (dbId === 'SELF') {
            this.selectedDb = User.current.kegDb;
        } else {
            this.selectedDb = new ChatKegDb(dbId);
            this.selectedDb.loadMeta().then(() => this.forceUpdate());
        }
        this.selectedKeg = null;
        this.loading = true;

        socket
            .send('/auth/kegs/db/list', { kegDbId: dbId })
            .then(resp => {
                this.kegIds = resp;
            })
            .catch(err => {
                console.error(err);
                alert(err);
            })
            .finally(() => {
                this.loading = false;
            });
    }

    loadKeg(id) {
        this.selectedKeg = id;
        this.loading = true;
        socket
            .send('/auth/kegs/get', { kegDbId: this.selectedDb.id, kegId: id })
            .then(resp => {
                this.keg = resp; // in case decrypt fails
                if (resp.payload instanceof ArrayBuffer) {
                    const key = this.selectedDb.boot.keys[resp.keyId].key;
                    resp.payload = secret.decryptString(new Uint8Array(resp.payload), key);
                }
                resp.payload = JSON.parse(resp.payload);
                this.keg = resp; // to trigger mobx render
            })
            .catch(err => {
                console.error(err);
                alert(err);
            })
            .finally(() => {
                this.loading = false;
            });
    }

    componentWillMount() {
        if (User.current) this.loadDbs();
    }

    render() {
        if (!User.current) {
            return <div className="authenticate-first-warning">Authenticate first, buddy.</div>;
        }
        return (
            <div className="keg-edit-container">
                <div className="list">
                    {this.dbs.map(db => {
                        return (
                            <div
                                key={db.id}
                                title={db.id}
                                onClick={() => this.loadKegIds(db.id)}
                                className={css('list-item', {
                                    active: this.selectedDb && this.selectedDb.id === db.id
                                })}
                            >
                                {db.name}
                            </div>
                        );
                    })}
                </div>
                {this.selectedDb ? (
                    <KegList
                        onSelect={kegId => this.loadKeg(kegId)}
                        kegIds={this.kegIds}
                        selectedKeg={this.selectedKeg}
                    />
                ) : null}
                {this.selectedDb ? (
                    <div className="list keg-view selectable">
                        <ChatInfo c={this.selectedDb} />
                        <div className="keg selectable">
                            {this.keg
                                ? JSON.stringify(this.keg, null, 2)
                                : '<- select keg to inspect it'}
                        </div>
                    </div>
                ) : null}
                {this.loading ? (
                    <div className="spinner-backdrop">
                        <ProgressBar circular theme="multicolor" />
                    </div>
                ) : null}
            </div>
        );
    }
}

function KegList(props) {
    return (
        <div className="list">
            {props.kegIds.map(kegId => {
                return (
                    <div
                        key={kegId}
                        onClick={() => props.onSelect(kegId)}
                        className={css('list-item', {
                            active: props.selectedKeg === kegId
                        })}
                    >
                        {kegId}
                    </div>
                );
            })}
        </div>
    );
}

function ChatInfo(props) {
    if (!props.c || !props.c.key) return <div>Loading chat metadata...</div>;
    return (
        <div className="selectable">
            <div className="keg-chip selectable">{props.c.id}</div>
            <br />
            {props.c.allParticipants ? (
                props.c.allParticipants.map(p => (
                    <div className="keg-chip" key={p.username}>
                        {p.username}
                    </div>
                ))
            ) : (
                <div className="keg-chip selectable">{User.current.username}</div>
            )}
        </div>
    );
}

export default KegEditor;
