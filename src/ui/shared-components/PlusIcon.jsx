import React from 'react';
import css from 'classnames';

class PlusIcon extends React.PureComponent {
    render() {
        return (
            <span
                className={css('plus-icon-container', this.props.className, {
                    clickable: !!this.props.onClick
                })}
                onClick={this.props.onClick}
            >
                {this.props.label && <span className="label">{this.props.label}</span>}
                <span className="plus-icon">+</span>
            </span>
        );
    }
}

export default PlusIcon;
