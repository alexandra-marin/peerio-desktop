import React from 'react';
import { observer } from 'mobx-react';

import { Checkbox, MaterialIcon, Switch } from 'peer-ui';
import { User, chatStore, t, fileStore } from 'peerio-icebear';

import T from '~/ui/shared-components/T';
import uiStore from '~/stores/ui-store';

@observer
export default class Preferences extends React.Component {
    onMsgNotifChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        const { checked } = ev.target;
        User.current.saveSettings(settings => {
            settings.messageNotifications = checked;
        });
    }

    onErrorSoundsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.errorSoundsEnabled = ev.target.checked;
    }

    onMentionSoundsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.messageSoundsEnabled = false;
        uiStore.prefs.mentionSoundsEnabled = ev.target.checked;
    }

    onMessageSoundsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        if (ev.target.checked === true) uiStore.prefs.mentionSoundsEnabled = false;
        uiStore.prefs.messageSoundsEnabled = ev.target.checked;
    }

    onMentionDesktopNotificationsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.messageDesktopNotificationsEnabled = false;
        uiStore.prefs.mentionDesktopNotificationsEnabled = ev.target.checked;
    }

    onMessageDesktopNotificationsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        if (ev.target.checked === true) uiStore.prefs.mentionDesktopNotificationsEnabled = false;
        uiStore.prefs.messageDesktopNotificationsEnabled = ev.target.checked;
    }

    onInviteDesktopNotificationsChanged(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.inviteDesktopNotificationsEnabled = ev.target.checked;
    }

    onUnreadChatSorting(ev: React.ChangeEvent<HTMLInputElement>) {
        chatStore.unreadChatsAlwaysOnTop = ev.target.checked;
    }

    onUrlPreviewToggle(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.externalContentEnabled = ev.target.checked;
        if (!uiStore.prefs.externalContentConsented) {
            uiStore.prefs.externalContentConsented = true;
        }
    }

    onFavContactsPreviewToggle(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.externalContentJustForFavs = ev.target.checked;
        if (!uiStore.prefs.externalContentConsented) {
            uiStore.prefs.externalContentConsented = true;
        }
    }

    onPeerioContentPreviewToggle(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.peerioContentEnabled = ev.target.checked;
    }

    onInlineContentSizeLimitToggle(ev: React.ChangeEvent<HTMLInputElement>) {
        uiStore.prefs.limitInlineImageSize = !ev.target.checked;
    }

    render() {
        return (
            <div className="preferences">
                <section className="section-divider">
                    <div className="title">{t('title_emailNotifications')}</div>
                    <p>{t('title_emailsDetail')}</p>
                    <Switch
                        checked={User.current.settings.messageNotifications}
                        label={t('title_notificationsEmailMessage')}
                        onChange={this.onMsgNotifChanged}
                    />
                </section>
                <section className="section-divider">
                    <div className="title">{t('title_soundNotifications')}</div>
                    <p>{t('title_soundsDetail')}</p>
                    <Switch
                        checked={uiStore.prefs.messageSoundsEnabled}
                        label={t('title_soundsMessage')}
                        onChange={this.onMessageSoundsChanged}
                    />
                    <Switch
                        checked={uiStore.prefs.mentionSoundsEnabled}
                        // FIXME: Switch has never supported a `disabled` attribute; this has always been broken
                        // disabled={this.mentionSoundsSwitchDisabled}
                        label={t('title_soundsMention')}
                        onChange={this.onMentionSoundsChanged}
                    />
                    <Switch
                        checked={uiStore.prefs.errorSoundsEnabled}
                        label={t('title_soundsError')}
                        onChange={this.onErrorSoundsChanged}
                    />
                </section>
                <section className="section-divider">
                    <div className="title">{t('title_desktopNotifications')}</div>
                    <p>{t('title_desktopNotificationsDetail')}</p>
                    <Switch
                        checked={uiStore.prefs.messageDesktopNotificationsEnabled}
                        label={t('title_messageDesktopNotificationsMessage')}
                        onChange={this.onMessageDesktopNotificationsChanged}
                    />
                    <Switch
                        checked={uiStore.prefs.mentionDesktopNotificationsEnabled}
                        label={t('title_mentionDesktopNotificationsMessage')}
                        // FIXME: Switch has never supported a `disabled` attribute; this has always been broken
                        // disabled={this.mentionDesktopNotificationsSwitchDisabled}
                        onChange={this.onMentionDesktopNotificationsChanged}
                    />
                    <Switch
                        checked={uiStore.prefs.inviteDesktopNotificationsEnabled}
                        label={t('title_inviteDesktopNotificationsMessage')}
                        onChange={this.onInviteDesktopNotificationsChanged}
                    />
                </section>
                {/* <section className="section-divider prefs-files">
                    <div className="title">{t('title_files')}</div>
                    <div className="files-location-container">
                        <p className="narrow">{t('title_fileDownloadLocation')}</p>
                        <div className="file-location">
                            <span>Users/.../Work/Downloads/ThisIsTheprojectNameFile</span>
                            <Button>CHANGE</Button>
                        </div>
                    </div>
                </section>
        */}
                <section className="section-divider prefs-display">
                    <div className="title">{t('title_displayPreferences')}</div>
                    <p className="subheading">{t('title_imageFilePreviews')}</p>
                    <Switch
                        className="narrow"
                        label={t('title_showImagePreviews')}
                        checked={uiStore.prefs.peerioContentEnabled}
                        onChange={this.onPeerioContentPreviewToggle}
                    />
                    <p className="narrow smalltext">{t('title_showImagePreviewsDescription2')}</p>
                    <Switch
                        label={t('title_showLargeImages', {
                            size: fileStore.inlineImageSizeLimitFormatted
                        })}
                        checked={!uiStore.prefs.limitInlineImageSize}
                        onChange={this.onInlineContentSizeLimitToggle}
                    />
                    <p className="narrow smalltext">
                        {t('title_imageTooBigCutoff', {
                            size: fileStore.inlineImageSizeLimitCutoffFormatted
                        })}
                    </p>
                </section>
                <section className="section-divider prefs-url">
                    <p className="subheading">{t('title_urlPreview')}</p>
                    <div className="warning">
                        <MaterialIcon icon="security" />
                        <div>
                            <span>{t('title_EnableUrlPreviewWarning')}&nbsp;</span>
                            <T k="title_learnMore" />
                        </div>
                    </div>
                    <Switch
                        label={t('title_EnableUrlPreviews')}
                        checked={uiStore.prefs.externalContentEnabled}
                        onChange={this.onUrlPreviewToggle}
                    />
                    <Checkbox
                        label={t('title_onlyFromFavourites')}
                        checked={uiStore.prefs.externalContentJustForFavs}
                        // FIXME: pending fix in ui-library https://github.com/PeerioTechnologies/ui-library/pull/23
                        onChange={this.onFavContactsPreviewToggle as any}
                    />
                </section>
            </div>
        );
    }
}

/*
 <section>
     <div className="title">{t('title_privacy')}</div>
     <p>
         {t('title_privacyDetail')}
                         </p>
     <Switch checked="true" label={t('title_never')} />
     <Switch checked="false" label={t('title_yourName')} />
     <Switch checked="false" label={t('title_yourUsername')} />
     <Switch checked="false" label={t('title_yourEmail')} />
 </section>
*/
