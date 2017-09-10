/**
 * @constructor
 * @param {Object?} props
 * @param {Object?} context
 */
function Component (props, context) {
	this.refs = null
	this.state = null
	this.props = props
	this.context = context
}
/**
 * @type {Object}
 */
var ComponentPrototype = {
	forceUpdate: {value: forceUpdate}, 
	setState: {value: setState}
}

/**
 * @param {Object?} props
 * @param {Object?} context
 */
function PureComponent (props, context) {
	Component.call(this, props, context)
}
PureComponent.prototype = Object.create(createComponent(Component.prototype), {
	shouldComponentUpdate: {value: shouldComponentUpdate}
})

/**
 * @param {Object} prototype
 * @return {Object}
 */
function createComponent (prototype) {
	defineProperty(defineProperties(prototype, ComponentPrototype), SymbolComponent, {value: SymbolComponent})

	if (!hasOwnProperty.call(prototype, SharedSiteRender))
		defineProperty(prototype, SharedSiteRender, {value: noop, writable: true})

	return prototype
}

/**
 * @param {Object} props
 * @param {Object} state
 * @return {boolean}
 */
function shouldComponentUpdate (props, state) {
	return compare(this.props, props) || compare(this.state, state)
}

/**
 * @param {(Object|function)} state
 * @param {function?} callback
 */
function setState (state, callback) {
	enqueueStateUpdate(this[SymbolElement], this, state, callback)
}

/**
 * @param {function} callback
 */
function forceUpdate (callback) {
	enqueueComponentUpdate(this[SymbolElement], this, callback, SharedComponentForceUpdate)
}

/**
 * @param {Element} element
 * @return {number}
 */
function mountComponent (element) {
	var owner = element.type
	var context = element.context || {}
	var prototype = owner.prototype
	var instance
	var children

	if (prototype && prototype.render) {
		if (prototype[SymbolComponent] !== SymbolComponent)
			createComponent(prototype)

		instance = owner = getComponentInstance(element, owner)
	} else {
		instance = new Component()
		instance.render = owner
	}

	element.owner = owner
	element.instance = instance
	element.context = context
	
	instance[SymbolElement] = element
	instance.refs = {}
	instance.props = element.props
	instance.context = context

	if (owner[SharedGetInitialState])
		instance.state = getComponentState(element, instance, getLifecycleData(element, SharedGetInitialState))
	else if (!instance.state)
		instance.state = {}

	if (owner[SharedComponentWillMount] && element.work === SharedWorkTask) 
		getLifecycleMount(element, SharedComponentWillMount)
	
	children = element.children = getComponentElement(element, instance)

	if (owner[SharedGetChildContext])
		element.context = getComponentContext(element)

	return children
}

/**
 * @param {Element} element
 * @param {Element} snapshot
 * @param {number} signature
 */
function updateComponent (element, snapshot, signature) {
	if (element.work === SharedWorkTask)
		return

	element.work = SharedWorkTask

	var instance = element.instance
	var owner = element.owner
	var nextContext = instance.context
	var prevProps = element.props
	var nextProps = snapshot.props
	var prevState = instance.state
	var nextState = signature === SharedComponentStateUpdate ? assign({}, prevState, element.state) : prevState

	if (owner[SharedGetChildContext])
		merge(element.context, getComponentContext(element))

	switch (signature) {
		case SharedComponentForceUpdate:
			break
		case SharedComponentPropsUpdate:
			if (owner[SharedComponentWillReceiveProps]) {
				getLifecycleUpdate(element, SharedComponentWillReceiveProps, nextProps, nextContext)
			}
		case SharedComponentStateUpdate:
			if (owner[SharedComponentShouldUpdate])
				if (getLifecycleUpdate(element, SharedComponentShouldUpdate, nextProps, nextState, nextContext) === false)
					return void (element.work = SharedWorkSync)
	}

	if (owner[SharedComponentWillUpdate])
		getLifecycleUpdate(element, SharedComponentWillUpdate, nextProps, nextState, nextContext)

	if (signature === SharedComponentPropsUpdate)
		instance.props = nextProps

	if (signature === SharedComponentStateUpdate)
		instance.state = nextState

	reconcileElement(getElementChildren(element), getComponentElement(element, instance))

	if (owner[SharedComponentDidUpdate])
		getLifecycleUpdate(element, SharedComponentDidUpdate, prevProps, prevState, nextContext)

	if (element.ref !== snapshot.ref)
		commitReference(element, snapshot.ref, SharedReferenceReplace)

	element.work = SharedWorkSync
}

/**
 * @param {Element} element
 */
function unmountComponent (element) {
	if ((element.state = null, element.owner[SharedComponentWillUnmount]))
		element.state = getLifecycleMount(element, SharedComponentWillUnmount)
}

/**
 * @param {Element} element
 * @param {Component} instance
 * @param {function?} callback
 * @param {number} signature
 */
function enqueueComponentUpdate (element, instance, callback, signature) {
	if (!element)
		return void requestAnimationFrame(function () {
			enqueueComponentUpdate(element[SymbolElement], instance, callback, signature)
		})

	if (element.work === SharedWorkTask)
		return void requestAnimationFrame(function () {
			enqueueComponentUpdate(element, instance, callback, signature)
		})

	if (!hasDOMNode(element))
		return

	updateComponent(element, element, signature)

	if (typeof callback === 'function')
		enqueueStateCallback(element, instance, callback)
}

/**
 * @param {Element} Element
 * @param {Component} instance
 * @param {(Object|function)} state
 * @param {function?} callback
 */
function enqueueStateUpdate (element, instance, state, callback) {
	if (state)
		switch (state.constructor) {
			case Promise:
				return enqueueStatePromise(element, instance, state, callback)
			case Function:
				return enqueueStateUpdate(element, instance, enqueueStateCallback(element, instance, state), callback)
			default:
				if (element.work !== SharedWorkSync && !hasDOMNode(element))
					return void assign(instance.state, element.state, state)
				else
					element.state = state

				enqueueComponentUpdate(element, instance, callback, SharedComponentStateUpdate)
		}
}

/**
 * @param {Element} element
 * @param {Component} instance
 * @param {Promise} state
 * @param {function?} callback
 */
function enqueueStatePromise (element, instance, state, callback) {
	state.then(function (value) {
		requestAnimationFrame(function () {
			enqueueStateUpdate(element, instance, value, callback)
		})
	}).catch(function (e) {
		invokeErrorBoundary(element, e, SharedSiteAsync+':'+SharedSiteSetState, SharedErrorActive)
	})
}

/**
 * @param {Element} element
 * @param {Component} instance
 * @param {function} callback
 */
function enqueueStateCallback (element, instance, callback) {
	try {
		return callback.call(instance, instance.state, instance.props)
	} catch (e) {
		invokeErrorBoundary(element, e, SharedSiteSetState+':'+SharedSiteCallback, SharedErrorActive)
	}
}

/**
 * @param {Element} element
 * @param {Component} instance
 * @param {Object} state
 * @return {Object}
 */
function getComponentState (element, instance, state) {	
	if (state instanceof Object)
		return state

	if (state instanceof Promise)
		enqueueStatePromise(element, instance, state)

	return instance.state || {}
}

/**
 * @param {Element} element
 * @param {function} owner
 * @return {Component}
 */
function getComponentInstance (element, owner) {
	try {
		return new owner(element.props, element.context)
	} catch (e) {
		invokeErrorBoundary(element, e, SharedSiteConstructor, SharedErrorActive)
	}

	return new Component()
}

/**
 * @param {Element} element
 * @param {Component}
 * @return {Element}
 */
function getComponentElement (element, instance) {
	try {
		return commitElement(instance.render(instance.props, instance.state, element.context))
	} catch (e) {
		return commitElement(invokeErrorBoundary(element, e, SharedSiteRender, SharedErrorActive))
	}
}

/**
 * @param {Element} element
 * @return {Object?}
 */
function getComponentContext (element) {
	if (element.owner[SharedGetChildContext])
		return getLifecycleData(element, SharedGetChildContext) || element.context || {}
	else
		return element.context || {}
}

/**
 * @param {Element} element
 * @param {string} name
 */
function getLifecycleData (element, name) {
	try {
		return element.owner[name].call(element.instance, element.props)
	} catch (e) {
		invokeErrorBoundary(element, e, name, SharedErrorActive)
	}
}

/**
 * @param {Element} element
 * @param {string} name
 */
function getLifecycleMount (element, name) {
	try {
		var state = element.owner[name].call(element.instance, hasDOMNode(element) && findDOMNode(element))
		
		if (name === SharedComponentWillUnmount && state instanceof Promise)
			return state

		getLifecycleReturn(element, state)
	} catch (e) {
		invokeErrorBoundary(element, e, name, name === SharedComponentWillMount ? SharedErrorActive : SharedErrorPassive)
	}
}

/**
 * @param {Element} element
 * @param {string} name
 * @param {Object} props
 * @param {Object} state
 * @param {Object} context
 */
function getLifecycleUpdate (element, name, props, state, context) {
	try {
		var state = element.owner[name].call(element.instance, props, state, context)

		if (name === SharedComponentShouldUpdate)
			return state

		getLifecycleReturn(element, state)
	} catch (e) {
		invokeErrorBoundary(element, e, name, SharedErrorActive)
	}
}

/**
 * @param {Element} element
 * @param {Object?} state
 */
function getLifecycleReturn (element, state) {
	switch (typeof state) {
		case 'object':
			if (!state)
				break
		case 'function':
			enqueueStateUpdate(element, element.instance, state)
	}
}

/**
 * @param {Element} element
 * @param {function} callback
 * @param {*} first
 * @param {*} second
 * @param {*} third
 */
function getLifecycleCallback (element, callback, first, second, third) {
	try {
		return callback.call(element.instance, first, second, third)
	} catch (e) {
		invokeErrorBoundary(element, e, SharedSiteCallback, SharedErrorPassive)
	}
}

/**
 * @param {(Component|Node)?} value
 * @param {*} key
 * @param {Element} element
 */
function setComponentReference (value, key, element) {
	if (this.refs) {
		if (key !== element.ref)
			delete this.refs[element.ref]

		this.refs[key] = value
	}
}

/**
 * @param {(Component|Element|Node)} element
 * @return {Node}
 */
function findDOMNode (element) {
	if (!element)
		invariant(SharedSiteFindDOMNode, 'Expected to receive a component')

	if (isValidElement(element[SymbolElement]))
		return findDOMNode(element[SymbolElement])

	if (isValidElement(element))
		if (element.id < SharedElementEmpty)
			return findDOMNode(getElementBoundary(element, SharedSiblingNext))
		else if (hasDOMNode(element))
			return getDOMNode(element)

	if (isValidDOMNode(element))
		return element

	invariant(SharedSiteFindDOMNode, 'Called on an unmounted component')
}
