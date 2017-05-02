const React = require('react');
const { IconMenu, MenuItem, MenuDivider, ProgressBar } = require('~/react-toolbox');
const css = require('classnames');
const { t } = require('peerio-translator');


function FileActions(props) {
    return (
        <td className="item-actions" onClick={props.onRowClick}>
            <IconMenu icon="more_vert">
                {props.downloadDisabled
                  ? <ProgressBar type="linear" mode="indeterminate" multicolor className="processing-file" />
                  : null }
                <MenuItem caption={t('title_download')}
                  icon="file_download"
                  onClick={props.onDownload}
                  className={css({ disabled: props.downloadDisabled })} />

                <MenuItem caption={t('button_shareViaChat')}
                        icon="chat"
                        onClick={props.onShare}
                        className={css({ disabled: props.shareDisabled })} />
                {/* SHARE VIA MAIL ACTION no mail so it's commented out. */}
                {/* <MenuItem caption={t('button_shareViaMail')}
                        icon="email"
                        onClick={props.onShare}
                        className={css({ disabled: props.shareDisabled })} /> */}
                {/* <TooltipDiv*/}
                {/* tooltip="Add to folder"*/}
                {/* tooltipDelay={delay}*/}
                {/* tooltipPosition="top"*/}
                {/* icon="create_new_folder"*/}
                {/* onClick={noop}*/}
                {/* className={css({ disabled: props.newFolderDisabled })} />*/}
                <MenuDivider />
                <MenuItem caption={t('button_delete')}
                        icon="delete"
                        onClick={props.onDelete}
                        className={css({ disabled: props.deleteDisabled })} />
            </IconMenu>
        </td>
    );
}

module.exports = FileActions;
