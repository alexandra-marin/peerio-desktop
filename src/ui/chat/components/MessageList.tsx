import React from 'react';
import { reaction, computed, observable, when, IReactionDisposer } from 'mobx';
import { observer } from 'mobx-react';

import { chatStore, clientApp, t } from 'peerio-icebear';
import { ProgressBar } from 'peer-ui';
import config from '~/config';
import beaconStore from '~/stores/beacon-store';

import PendingDMHeader from '~/ui/chat/components/PendingDMHeader';
import ChatHeader from '~/whitelabel/components/ChatHeader';

import Message from './Message';

@observer
export default class MessageList extends React.Component {
    private readonly loadTriggerDistance = 20;
    private readonly stickDistance = 50;
    private lastRenderedChatId: string | null = null;
    private lastTopElement: HTMLElement | null = null;
    private lastTopElementOffset: number = 0;

    readonly containerRef = React.createRef<HTMLDivElement>();
    private _topLoadReaction!: IReactionDisposer;
    private _botLoadReaction!: IReactionDisposer;
    private _initialLoadReaction!: IReactionDisposer;
    private beaconReaction!: IReactionDisposer;

    @observable pageScrolledUp = false;

    @computed
    get displayParticipants() {
        const chat = chatStore.activeChat;
        if (!chat) return [];
        if (chat.isChannel) return chat.allParticipants;
        return chat.otherParticipants;
    }

    componentWillMount() {
        clientApp.isReadingNewestMessages = true;
        // reaction to fix scroll position when scrolling up
        this._topLoadReaction = reaction(
            () => chatStore.activeChat && chatStore.activeChat.loadingTopPage,
            loading => {
                if (loading) {
                    this.lastTopElement = null;
                    for (let i = 0; i < this.containerRef.current.childNodes.length; i++) {
                        const el = this.containerRef.current.childNodes[i] as HTMLElement;
                        if (el.classList[0] !== 'message-content-wrapper') continue;
                        this.lastTopElement = el;
                        break;
                    }
                    this.lastTopElementOffset = this.lastTopElement
                        ? this.lastTopElement.offsetTop
                        : 0;
                    return;
                }
                if (this.lastTopElement) {
                    if (!this.lastTopElement) return;
                    // todo: animate
                    this.containerRef.current.scrollTop =
                        this.lastTopElement.offsetTop - this.lastTopElementOffset - 25;
                    this.lastTopElement = null;
                }
            }
        );
        // reaction to jump to recent from history mode
        this._initialLoadReaction = reaction(
            () => chatStore.activeChat && chatStore.activeChat.loadingInitialPage,
            () => {
                clientApp.isReadingNewestMessages = true;
                this.lastTopElement = null;
            }
        );
        // reaction to paging down to cancel top scroll fix
        this._botLoadReaction = reaction(
            () => chatStore.activeChat && chatStore.activeChat.loadingBottomPage,
            () => {
                this.lastTopElement = null;
            }
        );

        // If this is user's only chat, we show them the share-to-chat menu beacon
        // after a certain number of messages have been sent or received.
        if (chatStore.chats.length === 1) {
            this.beaconReaction = when(
                () =>
                    chatStore.activeChat &&
                    chatStore.activeChat.messages.length > config.beacons.messageCountSharePrompt,
                () => {
                    beaconStore.addBeacons('shareFileInChat');
                }
            );
        }
    }

    componentWillUnmount() {
        clientApp.isInChatsView = false;
        this._topLoadReaction();
        this._botLoadReaction();
        this._initialLoadReaction();
        if (this.beaconReaction) this.beaconReaction();
    }

    componentDidMount() {
        clientApp.isInChatsView = true;
        this.scrollToBottomIfNeeded();
    }

    componentDidUpdate() {
        this.scrollToBottomIfNeeded();
    }

    scrollToBottom = () => {
        window.requestAnimationFrame(this.smoothScrollStep);
    };

    smoothScrollStep = () => {
        const el = this.containerRef.current;
        if (!el) return;
        const goal = el.scrollHeight - el.clientHeight;
        if (el.scrollTop >= goal - 2) return;
        el.scrollTop += (goal - el.scrollTop) / 2 + 1;
        window.requestAnimationFrame(this.smoothScrollStep);
    };

    instantlyScrollToBottom = () => {
        const el = this.containerRef.current;
        if (!el) return;
        el.scrollTop = el.scrollHeight - el.clientHeight;
    };

    scrollToBottomIfNeeded() {
        if (!chatStore.activeChat) {
            clientApp.isReadingNewestMessages = true;
            return;
        }
        // check if chat has changed since last render
        if (
            !chatStore.activeChat.initialPageLoaded ||
            this.lastRenderedChatId !== chatStore.activeChat.id
        ) {
            this.lastRenderedChatId = chatStore.activeChat.id;
            clientApp.isReadingNewestMessages = true;
            this.instantlyScrollToBottom();
            return;
        }
        if (clientApp.isReadingNewestMessages) setTimeout(this.scrollToBottom);
    }

    onImageLoaded = () => {
        if (clientApp.isReadingNewestMessages && !chatStore.activeChat.canGoDown)
            this.scrollToBottom();
    };

    // todo: investigate why throttling causes lags when scrolling with trackpad at big velocity
    handleScroll = () => {
        const el = this.containerRef.current;
        if (!el) return;
        // _.throttle(
        // console.log('SCROLL');
        // we can't handle scroll if content height is too small
        if (el.scrollHeight <= el.clientHeight) return;

        const distanceToBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        const distanceToTop = el.scrollTop;
        // console.log(distanceToTop, distanceToBottom);

        // detecting sticking state
        clientApp.isReadingNewestMessages =
            distanceToBottom < this.stickDistance && !chatStore.activeChat.canGoDown;

        // detecting if we have scrolled up by one "page" or more
        this.pageScrolledUp = distanceToBottom > el.clientHeight;

        // triggering page load
        if (distanceToBottom < this.loadTriggerDistance) {
            //  console.log('TRIGGER');
            chatStore.activeChat.loadNextPage();
        }
        if (distanceToTop < this.loadTriggerDistance) {
            // console.log('TRIGGER');
            chatStore.activeChat.loadPreviousPage();
        }
    }; // , 150, { leading: true, trailing: true });

    /**
     * IMPORTANT:
     * Scroll position retention logic counts on
     * 1. Message items to have className "message-content-wrapper"as their FIRST class mentioned
     * 2. No OTHER type of items to have the same class name at the first position
     */
    renderMessages() {
        const chat = chatStore.activeChat;
        const ret: JSX.Element[] = [];
        if (chat.canGoUp) {
            ret.push(
                <div key="top-progress-bar" className="progress-wrapper">
                    {chat.loadingTopPage ? (
                        <ProgressBar
                            circular
                            theme="multicolor"
                            className="messages-inline-progress-bar"
                        />
                    ) : null}
                </div>
            );
        }
        const msgs = chat.messages;
        const limboMsgs = chat.limboMessages;
        const totalLength = msgs.length + limboMsgs.length;
        for (let i = 0; i < totalLength; i++) {
            const m = i < msgs.length ? msgs[i] : limboMsgs[i - msgs.length];
            if (m.firstOfTheDay) {
                const ts = m.timestamp.toLocaleDateString();
                ret.push(
                    <div key={`marker${i}${ts}${m.id}`} className="marker-wrapper">
                        <div className="marker" />
                        <div className="content">
                            {ts === new Date().toLocaleDateString() ? t('title_today') : ts}
                        </div>
                        <div className="marker" />
                    </div>
                );
            }
            let key = m.tempId || m.id;
            if (i >= msgs.length) {
                key += 'limbo';
            }
            ret.push(
                <Message
                    key={key}
                    message={m}
                    chat={chat}
                    light={m.groupWithPrevious}
                    onImageLoaded={this.onImageLoaded}
                />
            );
            if (
                i < msgs.length - 1 &&
                chat.newMessagesMarkerPos === m.id &&
                chat.showNewMessagesMarker
            ) {
                ret.push(
                    <div key={`newmsgsmarker${i}${m.id}`} className="marker-wrapper new-messages">
                        <div className="marker" />
                        <div className="content">{t('title_newMessages')}</div>
                    </div>
                );
            }
        }

        if (chat.canGoDown) {
            ret.push(
                <div key="bot-progress-bar" className="progress-wrapper">
                    {chat.loadingBottomPage ? (
                        <ProgressBar
                            circular
                            theme="multicolor"
                            className="messages-inline-progress-bar"
                        />
                    ) : null}
                </div>
            );
        }

        return ret;
    }

    renderChatStart() {
        const chat = chatStore.activeChat;

        if (chat.isChatCreatedFromPendingDM) {
            return (
                <div className="messages-start">
                    <PendingDMHeader
                        isNewUser={chat.isNewUserFromInvite}
                        contact={this.displayParticipants[0]}
                    />
                </div>
            );
        }

        if (chat.canGoUp || !chat.initialPageLoaded) return null;
        return <ChatHeader />;
    }

    render() {
        if (!chatStore.activeChat) return null;
        return (
            <div
                className="messages-current scrollable"
                onScroll={this.handleScroll}
                ref={this.containerRef}
                data-test-id="messageList"
            >
                {this.renderChatStart()}
                {chatStore.activeChat.loadingInitialPage ? (
                    <ProgressBar circular theme="multicolor" className="messages-progress-bar" />
                ) : (
                    this.renderMessages()
                )}
            </div>
        );
    }
}
