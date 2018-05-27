const React = require('react');
const { observer } = require('mobx-react');

const css = require('classnames');
const CustomIcon = require('./CustomIcon');
const MaterialIcon = require('./MaterialIcon');

/*
    PROPS           type        description
    ----------------------------------------
    className       string
    value           string
    caption         string

    icon            string      Material Icon name, if !!icon, customIcon won't render
    customIcon      string      Custom Icon name

    tooltip         string
    tooltipPosition string
    ----------------------------------------
*/

@observer
class MenuItem extends React.Component {
    clickHandler = (ev) => {
        ev.stopPropagation();
        if (!this.props.disabled) this.props.onClick(ev);
    }

    render() {
        const { value, icon, customIcon, caption, className } = this.props;
        return (
            <div
                value={value}
                className={css(
                    'p-menu-item',
                    className,
                    {
                        clickable: !this.props.disabled,
                        disabled: this.props.disabled,
                        selected: this.props.selected
                    }
                )}
                onClick={this.clickHandler}
            >
                {icon
                    ? <MaterialIcon
                        key={`icon-${icon}`}
                        icon={icon}
                        className="icon"
                    />
                    : (customIcon
                        ? <CustomIcon
                            key={`icon-${customIcon}`}
                            icon={customIcon}
                            className="icon"
                            hover
                        />
                        : null
                    )
                }
                {caption}
            </div>
        );
    }
}

module.exports = MenuItem;
