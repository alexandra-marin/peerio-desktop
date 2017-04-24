const React = require('react');
const { IconButton, Tooltip, TooltipIconButton } = require('~/react-toolbox');
const css = require('classnames');
const { observer } = require('mobx-react');

@observer
class AppNav extends React.Component {
    render() {
        return (
            <div className={css('menu-item', { active: this.props.active })} onClick={this.props.onClick}>
                <TooltipIconButton
                    tooltip={this.props.tooltip}
                    tooltipDelay={500}
                    tooltipPosition="right"
                    icon={this.props.icon} />
                <div className={this.props.showBadge ? 'look-at-me' : 'banish'}>
                    {this.props.badge}
                </div>
            </div>
        );
    }
}

module.exports = AppNav;
