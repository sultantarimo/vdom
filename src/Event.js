import * as Constant from './Constant.js'
import * as Utility from './Utility.js'
import * as Lifecycle from './Lifecycle.js'
import * as Interface from './Interface.js'

/**
 * @this {object}
 * @param {object}
 */
export function handle (event) {
	dispatch(this.host, this, this.host.owner, event, Interface.event(element, event))
}

/**
 * @param {object} element
 * @param {object} host
 * @param {object} owner
 * @param {object} event
 * @param {*} calllback
 */
function dispatch (host, element, owner, event, callback) {
	if (callback) {
		if (Utility.iterable(callback)) {
			Utility.each(function (value) {
				dispatch(element, host, owner, event, callback)
			}, callback)
		} else {
			Lifecycle.event(host, Constant.event, event, callback, owner.props, owner.state, owner.context)
		}
	}
}
