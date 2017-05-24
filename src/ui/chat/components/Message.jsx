/* eslint-disable react/no-danger */
const React = require('react');
const Avatar = require('~/ui/shared-components/Avatar');
const { observer } = require('mobx-react');
const { time } = require('~/helpers/formatter');
const { sanitizeChatMessage } = require('~/helpers/sanitizer');
const emojione = require('~/static/emoji/emojione.js');
const Autolinker = require('autolinker');
const InlineFiles = require('./InlineFiles');
const css = require('classnames');
const { t } = require('peerio-translator');
const { Button, FontIcon, IconMenu, MenuItem } = require('~/react-toolbox');
const { isUrlAllowed } = require('~/helpers/url');
const urls = require('~/config').translator.urlMap;
const { User, systemMessages, contactStore } = require('~/icebear');
const { getHeaders } = require('~/helpers/http');
const uiStore = require('~/stores/ui-store');
const htmlEncoder = require('html-entities').AllHtmlEntities;

// ugly, but works. autolinker has only one global replacer fn, and we need to get message object in there somehow
let currentProcessingMessage;

const autolinker = new Autolinker({
    urls: {
        schemeMatches: true,
        wwwMatches: true,
        tldMatches: true
    },
    replaceFn(match) {
        if (match.getType() === 'url') {
            const url = match.getUrl();
            if (!isUrlAllowed(url)) return false;
            const msg = currentProcessingMessage;
            if (msg.inlineImages.length > 3) return true;

            getHeaders(url).then(headers => {
                const type = headers['content-type'];
                if (!type || !type.startsWith('image/')) return;
                const length = +headers['content-length'];
                if (length > 1024 * 1024 * 1024 * 5) return;
                if (msg.inlineImages.length > 3) return;
                if (!msg.inlineImages.includes(url)) msg.inlineImages.push(url);
            });
            return true;
        }

        return false;
    },
    email: true,
    phone: true,
    mention: false,
    hashtag: false,
    stripPrefix: false,
    newWindow: false,
    truncate: 0,
    className: '',
    stripTrailingSlash: false
});

function highlightMentions(str) {
    return str.replace(
        contactStore.getContact(User.current.username).mentionRegex,
        '<span class="mention self">$&</span>'
    );
}
// HACK: make this as a proper react component
window.openContact = function(username) {
    uiStore.contactDialogUsername = username;
};
const mentionRegex = /(\s*|^)@([a-zA-Z0-9_]{1,32})/gm;
function linkifyMentions(str) {
    return str.replace(mentionRegex, '$1<span class="mention clickable" onClick=openContact("$2")>@$2</span>');
}

const inlinePreRegex = /`(.*)`/g;
const blockPreRegex = /`{3}([^`]*)`{3}/g;
function formatPre(str) {
    return str.replace(blockPreRegex, '<div class="pre">$1</div>')
        .replace(inlinePreRegex, '<span class="pre">$1</span>');
}

function processMessage(msg) {
    if (msg.lastProcessedVersion !== msg.version) msg.processedText = null;
    if (msg.processedText != null) return msg.processedText;
    currentProcessingMessage = msg;
    // we don't expect any html in original text,
    // if there are any tags - user entered them, we consider them plaintext and encode
    let str = htmlEncoder.encode(msg.text);
    // in case some tags magically sneak in - remove all html except whitelisted
    str = sanitizeChatMessage(str);
    // now we start producing our own html
    str = autolinker.link(str);
    str = emojione.unicodeToImage(str);
    str = highlightMentions(str);
    str = linkifyMentions(str);
    str = formatPre(str);
    str = { __html: str };
    msg.processedText = str;
    msg.lastProcessedVersion = msg.version;
    return str;
}

/**
 * IMPORTANT:
 * MessageList.jsx scroll retention logic relies on root element of this component to have
 * class name 'message-content-wrapper' at the first position in class list
 */
@observer
class Message extends React.Component {
    renderSystemData(m) {
        // !! SECURITY: sanitize if you move this to something that renders dangerouslySetInnerHTML
        if (!m.systemData) return null;
        return <p className="system-message selectable">{systemMessages.getSystemMessageText(m)}</p>;
    }
    render() {
        const m = this.props.message;
        // console.log('Rendering message ', m.tempId || m.id);
        const invalidSign = m.signatureError === true;

        return (
            <div className={
                css('message-content-wrapper', {
                    'invalid-sign': invalidSign, 'send-error': m.sendError, light: this.props.light
                })}>
                <div className="flex-row">
                    {this.props.light ? null : <Avatar contact={m.sender} />}
                    {this.props.light ?
                        <div className="timestamp">{time.format(m.timestamp).split(' ')[0]}</div> : null
                    }
                    <div className="message-content">
                        {
                            this.props.light
                                ? null
                                : <div className="meta-data">
                                    <div className="user selectable">
                                        {m.sender.fullName} <span className="username">{m.sender.username}</span>
                                    </div>
                                    <div className="timestamp selectable">{time.format(m.timestamp)}</div>
                                </div>
                        }
                        <div className="flex-row flex-align-center">
                            {
                                m.systemData || m.files
                                    ? null
                                    : <p dangerouslySetInnerHTML={processMessage(m)} className="selectable" />
                            }
                            {m.files && m.files.length ? <InlineFiles files={m.files} /> : null}
                            {
                                /* SECURITY: sanitize if you move this to something that renders dangerouslySetInnerHTML */
                                this.renderSystemData(m)
                            }
                        </div>
                        {m.inlineImages.map(url => (
                            <img key={url} className="inline-image" onLoad={this.props.onImageLoaded} src={url} />))}
                        {m.sendError ?
                            <div className="flex-row flex-align-center">
                                <div className="send-error-menu">
                                    <IconMenu icon="error" position="topLeft" menuRipple>
                                        <MenuItem value={t('button_retry')}
                                            caption={t('button_retry')}
                                            onClick={() => m.send()} />
                                        <MenuItem value={t('button_delete')}
                                            caption={t('button_delete')}
                                            onClick={() => this.props.chat.removeMessage(m)} />
                                    </IconMenu>
                                </div>
                                <div className="send-error-message">{t('error_messageSendFail')}</div>
                            </div>
                            : null
                        }
                    </div>
                    {invalidSign ? <FontIcon value="error_outline_circle" className="warning-icon" /> : null}
                    {m.receipts ?
                        <div key={`${m.tempId || m.id}receipts`} className="receipt-wrapper">
                            {m.receipts.map(u => <Avatar key={u} username={u} size="tiny" />)}
                        </div> : null}

                </div>
                {invalidSign ?
                    <div className="invalid-sign-warning">
                        <div style={{ marginRight: 'auto' }}>{t('error_invalidMessageSignature')}</div>
                        <Button href={urls.msgSignature} label={t('title_readMore')} flat primary />
                    </div>
                    : null
                }

                {m.sending ? <div className="sending-overlay" /> : null}
            </div>
        );
    }
}

module.exports = Message;
