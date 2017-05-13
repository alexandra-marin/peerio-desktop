const React = require('react');
const { observable } = require('mobx');
const { observer } = require('mobx-react');
const RTAvatar = require('~/react-toolbox').Avatar;
const { ProgressBar } = require('~/react-toolbox');
const cfg = require('~/config.js');
const { contactStore } = require('~/icebear');
const { t } = require('peerio-translator');

@observer
class ContactProfile extends React.Component {
    @observable contact;
    componentWillMount() {
        this.contact = contactStore.getContact(this.props.username);
    }
    componentWillReceiveProps(next) {
        this.contact = contactStore.getContact(next.username);
    }
    render() {
        const c = this.contact;
        if (!c) return null;
        if (c.loading) {
            return (
                <div className="contact-profile">
                    <div className="row flex-row flex-align-center">
                        <ProgressBar type="circular" mode="indeterminate" />
                    </div>
                </div>
            );
        }
        if (c.notFound) {
            return (
                <div className="contact-profile">
                    <div className="row flex-row flex-align-center">
                        {t('error_usernameNotFound')}
                    </div>
                </div>
            );
        }
        const f = c.fingerprint.split('-');
        return (
            <div className="contact-profile">
                {c.tofuError
                    ? <div className="contact-error">
                        {t('error_contactFingerprintChangedDetail')}
                    </div>
                    : null}
                <div className="row flex-row flex-align-center">
                    {/* TODO: use our Avatar component instead, and strip it of mouse events */}
                    <RTAvatar style={{ backgroundColor: c.color }} >{c.letter}</RTAvatar>
                    <div style={{ marginLeft: '8px' }} className="flex-col">
                        <div className="title">{c.username}</div>
                        <div >{c.firstName} {c.lastName}</div>
                    </div>
                </div>
                <div className="row">
                    <div className="list-title" style={{ marginBottom: '8px' }}> {t('title_publicKey')}</div>
                    <div className="monospace selectable">{f[0]} {f[1]} {f[2]}</div>
                    <div className="monospace selectable">{f[3]} {f[4]} {f[5]}</div>
                </div>
            </div>
        );
    }
}


module.exports = ContactProfile;
