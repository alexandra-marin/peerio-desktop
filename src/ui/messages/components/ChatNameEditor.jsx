const React = require('react');
const { observer } = require('mobx-react');
const BetterInput = require('~/ui/shared-components/BetterInput');
const { chatStore } = require('~/icebear');
const { t } = require('peerio-translator');

@observer
class ChatNameEditor extends React.Component {
    cancelNameEdit = () => {
        console.log('Cancel name edit');
    };

    acceptNameEdit = (val) => {
        console.log('new chat name:', val);
        chatStore.activeChat.rename(val);
    };

    setNameInputRef = (ref) => {
        if (ref) ref.focus();
        this.nameInput = ref;
    };

    render() {
        return (
            <BetterInput label={this.props.showLabel ? t('title_title') : null}
                className={this.props.className}
                onBlur={this.props.onBlur}
                onReject={this.cancelNameEdit}
                onAccept={this.acceptNameEdit}
                ref={this.setNameInputRef}
                value={chatStore.activeChat ? chatStore.activeChat._chatName : ''} />
        );
    }
}

module.exports = ChatNameEditor;
