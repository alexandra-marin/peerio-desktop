const React = require('react');
const { observable, when } = require('mobx');
const { observer } = require('mobx-react');
const { FontIcon, Dialog } = require('~/react-toolbox');
const T = require('~/ui/shared-components/T');
const { serverSettings } = require('~/icebear');
const { t } = require('peerio-translator');
const moment = require('moment');

@observer
class MaintenanceWarning extends React.Component {
    @observable maintenanceStartDate = undefined;
    @observable maintenanceEndDate = undefined;
    @observable showDialog = false;
    @observable seen = false;

    constructor() {
        super();
        when(
            () => serverSettings.maintenanceWindow && serverSettings.maintenanceWindow.length === 2,
            () => {
                this.maintenanceStartDate = moment(serverSettings.maintenanceWindow[0]).format('LLL');
                this.maintenanceEndDate = moment(serverSettings.maintenanceWindow[1]).format('LLL');
            }
        );
    }

    toggleDialog = () => {
        this.showDialog = !this.showDialog;
    }

    dismiss = () => {
        this.seen = true;
        this.toggleDialog();
    }

    render() {
        if (this.maintenanceStartDate && this.maintenanceEndDate && !this.seen) {
            return (
                <div>
                    <div className="maintenance-wrapper" onClick={this.toggleDialog}>
                        <div className="maintenance-title">{t('title_maintenance')}</div>
                        <FontIcon value="info" className="maintenance-icon" />
                    </div>
                    <Dialog className="dialog-maintenance" active={this.showDialog}
                        title={t('dialog_scheduledMaintenance')}
                        onOverlayClick={this.dismiss} onEscKeyDown={this.dismiss}
                        actions={[{ label: t('button_dismiss'), onClick: this.dismiss }]}>
                        <T k="dialog_scheduledMaintenanceDates" tag="p">
                            {{ start: this.maintenanceStartDate, end: this.maintenanceEndDate }}
                        </T>
                    </Dialog>
                </div>
            );
        }
        return null;
    }
}

module.exports = MaintenanceWarning;