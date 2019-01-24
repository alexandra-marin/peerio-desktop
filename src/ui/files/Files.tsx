import React from 'react';
import css from 'classnames';
import { observer } from 'mobx-react';
import { observable, action, computed, reaction, when, IReactionDisposer } from 'mobx';
import { DropTarget } from 'react-dnd';
import _ from 'lodash';

import { Button, Checkbox, ProgressBar, MaterialIcon } from 'peer-ui';
import { chatStore, fileStore, clientApp, t } from 'peerio-icebear';

import config from '~/config';
import T from '~/ui/shared-components/T';
import ConfirmFolderDeleteDialog from '~/ui/shared-components/ConfirmFolderDeleteDialog';
import uiStore from '~/stores/ui-store';
import beaconStore from '~/stores/beacon-store';

import { selectDownloadFolder, pickSavePath } from '~/helpers/file';

import DraggableLine from './components/DraggableLine';
import ZeroFiles from './components/ZeroFiles';
import FilesHeader from './components/FilesHeader';
import ShareConfirmDialog from './components/ShareConfirmDialog';

import DragDropTypes from './helpers/dragDropTypes';
import { uploadDroppedFiles } from './helpers/dragDropHelpers';
import LocalFileManager from './helpers/LocalFileManager';
import Banner from '~/ui/shared-components/Banner';

import { FileBeaconContext } from './helpers/fileBeaconContext';

const DEFAULT_RENDERED_ITEMS_COUNT = 15;

interface FilesProps {
    connectDropTarget?: (el: JSX.Element) => JSX.Element;
    isBeingDraggedOver?: boolean;
}

@DropTarget(
    [DragDropTypes.NATIVEFILE],
    {
        drop(_props, monitor) {
            if (monitor.didDrop()) return; // drop was already handled by eg. a droppable folder line
            uploadDroppedFiles(monitor.getItem().files, fileStore.folderStore.currentFolder);
        }
    },
    (connect, monitor) => ({
        connectDropTarget: connect.dropTarget(),
        isBeingDraggedOver: monitor.isOver({ shallow: true })
    })
)
@observer
export default class Files extends React.Component<FilesProps> {
    @observable renderedItemsCount = DEFAULT_RENDERED_ITEMS_COUNT;
    pageSize = DEFAULT_RENDERED_ITEMS_COUNT;
    localFileManager = new LocalFileManager();

    readonly shareConfirmDialogRef = React.createRef<ShareConfirmDialog>();

    disposers!: IReactionDisposer[];
    container: HTMLElement | null = null;

    componentWillMount() {
        clientApp.isInFilesView = true;
        this.disposers = [
            reaction(
                () => fileStore.folderStore.currentFolder,
                () => {
                    this.renderedItemsCount = DEFAULT_RENDERED_ITEMS_COUNT;
                }
            ),
            when(
                () => !!this.firstListedFileId,
                () => {
                    beaconStore.addBeacons('fileOptions');
                }
            ),
            when(
                () => !!this.firstReceivedFileId,
                () => {
                    beaconStore.addBeacons('receivedFile');
                }
            ),
            when(
                () => this.promptAddFolder,
                () => {
                    beaconStore.addBeacons('folders');
                }
            )
        ];
    }

    componentDidMount() {
        window.addEventListener('resize', this.enqueueCheck, false);
        // icebear will call this function to confirm file deletion
        fileStore.bulk.deleteFilesConfirmator = (files, sharedFiles) => {
            let msg = t('title_confirmRemoveFiles', { count: files.length });
            if (sharedFiles.length) msg += `\n\n${t('title_confirmRemoveSharedFiles')}`;
            return confirm(msg);
        };

        // icebear will call this function to select folder for bulk save
        fileStore.bulk.downloadFolderSelector = selectDownloadFolder;

        // icebear will call this function trying to pick a file or folder name which doesn't overwrite existing file
        fileStore.bulk.pickPathSelector = pickSavePath;

        // Show uploadFiles beacons if user has no files
        if (fileStore.loaded && !fileStore.files.length && !fileStore.folderStore.folders.length) {
            beaconStore.addBeacons('uploadFiles');
        }

        // If user is on first login, add startChat beacon and timeout to auto-clear uploadFiles beacon
        if (uiStore.firstLogin) {
            beaconStore.addBeacons('chat');
            beaconStore.queueIncrement(8000, 'uploadFiles');
        }
    }

    componentWillUnmount() {
        clientApp.isInFilesView = false;
        window.removeEventListener('resize', this.enqueueCheck);
        fileStore.searchQuery = '';
        fileStore.clearSelection();
        // remove icebear hook for sharing selection
        fileStore.bulk.shareWithSelector = null;
        // remove icebear hook for deletion
        fileStore.bulk.deleteFilesConfirmator = null;
        // remove icebear hook for bulk save
        fileStore.bulk.downloadFolderSelector = null;
        fileStore.bulk.pickPathSelector = null;
        this.disposers.forEach(d => d());

        // Clean up beacons
        beaconStore.clearBeacons();
        beaconStore.clearIncrementQueue();
    }

    readonly toggleSelectAll = (ev: React.MouseEvent<HTMLInputElement>) => {
        this.items.forEach(item => {
            item.selected = !!ev.currentTarget.checked;
        });
    };

    onUploadClick = async () => {
        // Beacon control
        if (beaconStore.activeBeacon === 'uploadFiles') {
            beaconStore.clearBeacons();
        }
        if (uiStore.firstLogin && !beaconStore.beaconsInQueue.length) {
            beaconStore.queueBeacons('chat', 8000);
        }

        // Actual uploading function
        await this.localFileManager.pickAndUpload();
    };

    // Beacon states, handed down to FileLine via FileBeaconContext
    @computed
    get firstListedFileId() {
        if (fileStore.files.length === 0 || this.items.length === 0) return '';
        return this.items[0].fileId;
    }

    @computed
    get firstReceivedFileId() {
        let fileId = '';

        for (let i = 0; !fileId && i < this.renderedItemsCount && i < this.items.length; i++) {
            if (this.recentReceivedFileIds.includes(this.items[i].fileId)) {
                fileId = this.items[i].fileId;
            }
        }
        return fileId;
    }

    @computed
    get recentReceivedFileIds() {
        return chatStore.recentReceivedFiles.map(f => f.fileId);
    }

    @computed
    get promptAddFolder() {
        return (
            fileStore.files.length >= config.beacons.fileCountFolderPrompt &&
            fileStore.folderStore.folders.length === 0
        );
    }

    @computed
    get items(): any[] {
        return fileStore.searchQuery
            ? fileStore.filesAndFoldersSearchResult
            : fileStore.folderStore.currentFolder.filesAndFoldersDefaultSorting;
    }

    @computed
    get renderedItems(): JSX.Element[] {
        const currentFolder = fileStore.folderStore.currentFolder;

        const renderedItems: JSX.Element[] = [];
        const data = this.items;

        for (let i = 0; i < this.renderedItemsCount && i < data.length; i++) {
            const f = data[i];
            if (
                f.isFolder &&
                currentFolder.isRoot &&
                !currentFolder.isShared &&
                f.convertingToVolume
            )
                continue;
            renderedItems.push(
                <DraggableLine fileOrFolder={f} key={f.id} confirmShare={this.confirmShare} />
            );
        }
        return renderedItems;
    }

    @computed
    get allAreSelected() {
        return this.items.length && !this.items.some(i => !i.selected && !i.isShared);
    }

    readonly confirmShare = () => {
        return this.shareConfirmDialogRef.current.check();
    };

    readonly checkScrollPosition = () => {
        if (!this.container) return;
        if (this.renderedItemsCount >= this.items.length) {
            this.renderedItemsCount = this.items.length;
            return;
        }

        const distanceToBottom =
            this.container.scrollHeight - this.container.scrollTop - this.container.clientHeight;
        if (distanceToBottom < 250) {
            this.renderedItemsCount += this.pageSize;
        }
    };

    readonly enqueueCheck = _.debounce(
        () => {
            window.requestAnimationFrame(this.checkScrollPosition);
        },
        100,
        { leading: true, maxWait: 400 }
    );

    readonly setContainerRef = (ref: HTMLElement | null) => {
        this.container = ref;
        this.enqueueCheck();
    };

    /*
     * 27/6/18: According to Lucas, folder removal notifications are a
     * work-in-progress, and these are just placeholder variables -- one or both
     * might be removed eventually? `removedFolderNotifVisible` is currently
     * always false, so the notification is never shown. (obvs check for rot
     * when implementing for real, please!)
     */
    @observable removedFolderNotifVisible = false;
    @observable removedFolderNotifToHide = false;

    @action.bound
    dismissRemovedFolderNotif() {
        this.removedFolderNotifToHide = true;

        setTimeout(() => {
            this.removedFolderNotifVisible = false;
        }, 250);
    }

    get removedFolderNotif() {
        return (
            <div
                className={css('removed-folder-notif', {
                    'hide-in-progress': this.removedFolderNotifToHide
                })}
            >
                <T k="title_removedFromFolder">{{ folderName: 'Design files' }}</T>
                <Button icon="close" onClick={this.dismissRemovedFolderNotif} />
            </div>
        );
    }

    readonly refConfirmFolderDeleteDialog = (ref: ConfirmFolderDeleteDialog | null) => {
        fileStore.bulk.deleteFolderConfirmator = ref && ref.show;
    };

    @action
    hideClosingBanner() {
        uiStore.closingBannersVisible.files = false;
    }

    render() {
        const currentFolder = fileStore.folderStore.currentFolder;
        const selectedCount = fileStore.selectedFilesOrFolders.length;

        const { connectDropTarget, isBeingDraggedOver } = this.props;

        this.enqueueCheck();
        return (
            <div className="files">
                {uiStore.closingBannersVisible.files ? (
                    <Banner
                        headerText="Backup your files"
                        mainText="Peerio will be closing on July 2019. We recommend you begin transitioning your files and important information out of Peerio."
                        onDismiss={this.hideClosingBanner}
                        actionButton={{
                            label: 'Learn How',
                            url: 'https://support.peerio.com/hc/en-us/articles/360021688052'
                        }}
                    />
                ) : null}
                <FilesHeader onUpload={this.onUploadClick} />
                <div className="file-wrapper">
                    <div
                        className={css('file-table-wrapper', {
                            'with-banner': uiStore.closingBannersVisible.files
                        })}
                    >
                        <div className="file-table-header row-container">
                            <Checkbox
                                className={css('file-checkbox', {
                                    hide: selectedCount === 0
                                })}
                                // @ts-ignore lucas should fix! needs to be
                                // `(ev: React.MouseEvent<HTMLInputElement>) => void`
                                // instead of `() => void`
                                onChange={this.toggleSelectAll}
                                checked={this.allAreSelected}
                            />
                            <div className="file-icon" />
                            {/* blank space for file icon image */}
                            <div className="file-name">{t('title_name')}</div>
                            <div className="file-owner">{t('title_owner')}</div>
                            <div className="file-uploaded">{t('title_uploaded')}</div>
                            <div className="file-size">{t('title_size')}</div>
                            <div className="file-actions" />
                        </div>
                        {currentFolder.isRoot &&
                            this.removedFolderNotifVisible &&
                            this.removedFolderNotif}
                        {(currentFolder.convertingToVolume ||
                            currentFolder.convertingFromFolder) && (
                            <div
                                className={css('file-ui-subheader', 'row', {
                                    'converting-to-volume': currentFolder.convertingToVolume
                                })}
                            >
                                <div className="file-checkbox percent-in-progress">
                                    {currentFolder.progressPercentage}%
                                </div>

                                <div className="file-share-info">
                                    {currentFolder.convertingToVolume && (
                                        <span>
                                            <MaterialIcon icon="sync" />
                                            &nbsp;
                                            <T k="title_filesInQueue" tag="span" />
                                            &nbsp; (
                                            <T k="title_filesLeftCount" tag="span">
                                                {{
                                                    count:
                                                        currentFolder.progressMax -
                                                        currentFolder.progress
                                                }}
                                            </T>
                                            )
                                        </span>
                                    )}
                                    {currentFolder.convertingFromFolder && (
                                        <T k="title_convertingFolderNameToShared">
                                            {{ folderName: currentFolder.name }}
                                        </T>
                                    )}
                                </div>
                                <ProgressBar
                                    value={currentFolder.progress}
                                    max={currentFolder.progressMax}
                                />
                            </div>
                        )}
                        {this.localFileManager.preparingForUpload ? (
                            <div className="row-container">
                                <ProgressBar />
                            </div>
                        ) : null}
                        {connectDropTarget(
                            <div
                                className={css('drop-zone', {
                                    'drop-zone-droppable-hovered': isBeingDraggedOver
                                })}
                            >
                                <div
                                    ref={this.setContainerRef}
                                    onScroll={this.enqueueCheck}
                                    className={css('file-table-body scrollable', {
                                        'hide-checkboxes': selectedCount === 0
                                    })}
                                >
                                    <FileBeaconContext.Provider
                                        value={{
                                            firstListedFileId: this.firstListedFileId,
                                            firstReceivedFileId: this.firstReceivedFileId
                                        }}
                                    >
                                        {this.renderedItems}
                                    </FileBeaconContext.Provider>
                                    {fileStore.loaded && currentFolder.isEmpty ? (
                                        <ZeroFiles
                                            isRoot={currentFolder.isRoot && !currentFolder.isShared}
                                        />
                                    ) : null}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                <ShareConfirmDialog ref={this.shareConfirmDialogRef} />
                <ConfirmFolderDeleteDialog ref={this.refConfirmFolderDeleteDialog} />
            </div>
        );
    }
}
