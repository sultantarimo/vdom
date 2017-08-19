/* DIO 8.0.0 */
module.exports = function (Element, render, componentMount, commitElement) {
	'use strict'
	
	/**
	 * @constructor
	 */
	function List () {
		this.next = this
		this.prev = this
		this.length = 0
	}
	List.prototype = Object.create(null, {
		constructor: {value: List},
		/**
		 * @param {Element} element
		 * @param {Element} sibling
		 * @return {Element}
		 */
		insert: {value: function insert (element, sibling) {
			element.next = sibling
			element.prev = sibling.prev
			sibling.prev.next = element
			sibling.prev = element
			this.length++
			
			return element
		}},
		/**
		 * @param {Element} element
		 * @return {Element}
		 */
		remove: {value: function remove (element) {
			if (this.length < 1) 
				return
			
			element.next.prev = element.prev
			element.prev.next = element.next
			this.length--
			
			return element
		}},
		/**
		 * @return {Element}
		 */
		pop: {value: function pop () {
			return this.remove(this.prev)
		}},
		/**
		 * @param {Element} element
		 * @return {Element}
		 */
		push: {value: function push (element) {
			return this.insert(element, this)
		}},
		/**
		 * @param {function} callback
		 */
		forEach: {value: function forEach (callback) {
			for (var i = 0, element = this; i < this.length; i++)
				callback.call(this, element = element.next, i)
		}}
	})
	
	/**
	 * @constructor
	 */
	function Hash () {
		this.k = []
		this.v = []
	}
	Hash.prototype = Object.create(null, {
		/**
		 * @param  {*} key
		 * @param  {*} value
		 * @return {Hash}
		 */
		set: {value: function set (key, value) {
			var k = this.k
			var i = k.lastIndexOf(key)
	
			k[i < 0 ? (i = k.length) : i] = key
			this.v[i] = value
	
			return this
		}},
		/**
		 * @param  {*} key
		 * @return {*}
		 */
		get: {value: function get (key) {
			return this.v[this.k.lastIndexOf(key)]
		}},
		/**
		 * @param {*} key
		 * @return {boolean}
		 */
		has: {value: function has (key) {
			return this.k.lastIndexOf(key) > -1
		}}
	})
	
	/**
	 * @param {Object} destination
	 * @param {Object} source
	 */
	function merge (destination, source) {
		for (var key in source)
			destination[key] = source[key]
	}
	
	/**
	 * @param {Object} destination
	 * @param {Object} source
	 * @param {Object} delta
	 * @return {Object}
	 */
	function assign (destination, source, delta) {
		for (var key in source)
			destination[key] = source[key]
		
		for (var key in delta)
			destination[key] = delta[key]
	
		return destination
	}
	
	/**
	 * @param {function} callback
	 */
	function setImmediate (callback) {
		requestAnimationFrame(callback, 16)
	}
	
	/**
	 * @type {function}
	 * @return {void}
	 */
	function noop () {}
	
	/**
	 * @param {*} value
	 * @return {string}
	 */
	function escape (value) {
		return (value+'').replace(/[<>&"']/g, encode)
	}
	
	/**
	 * @param {string} character
	 * @return {string}
	 */
	function encode (character) {
		switch (character) {
			case '<': return '&lt;'
			case '>': return '&gt;'
			case '"': return '&quot;'
			case "'": return '&#x27;'
			case '&': return '&amp;'
			default: return character
		}
	}
	
	/**
	 * @param {string}
	 */
	function bool (name) {
		switch (name) {
			case 'area':
			case 'base':
			case 'br':
			case 'meta':
			case 'source':
			case 'keygen':
			case 'img':
			case 'col':
			case 'embed':
			case 'wbr':
			case 'track':
			case 'param':
			case 'link':
			case 'input':
			case 'hr':
			case '!doctype': return 0
			default: return 2
		}
	}
	
	var Readable = require('stream').Readable
	
	var Node = window.Node || noop
	var Symbol = window.Symbol || noop
	var Iterator = Symbol.iterator
	var Promise = window.Promise || noop
	var Map = window.Map || Hash
	var WeakMap = window.WeakMap || Hash
	
	var root = new WeakMap()
	var document = window.document || noop
	var requestAnimationFrame = window.requestAnimationFrame || setTimeout
	
	var ElementPromise = -3
	var ElementFragment = -2
	var ElementPortal = -1
	var ElementIntermediate = 0
	var ElementComponent = 1
	var ElementNode = 2
	var ElementText = 3
	
	var PriorityLow = -2
	var PriorityTask = -1
	var PriorityHigh = 1
	
	var LifecycleCallback = 'callback'
	var LifecycleRender = 'render'
	var LifecycleConstructor = 'constructor'
	var LifecycleWillMount = 'componentWillMount'
	var LifecycleDidMount = 'componentDidMount'
	var LifecycleWillReceiveProps = 'componentWillReceiveProps'
	var LifecycleShouldUpdate = 'shouldComponentUpdate'
	var LifecycleWillUpdate = 'componentWillUpdate'
	var LifecycleDidUpdate = 'componentDidUpdate'
	var LifecycleWillUnmount = 'componentWillUnmount'
	var LifecycleDidCatch = 'componentDidCatch'
	var LifecycleChildContext = 'getChildContext'
	var LifecycleInitialState = 'getInitialState'
	
	var NSMathML = 'http://www.w3.org/1998/Math/MathML'
	var NSXlink = 'http://www.w3.org/1999/xlink'
	var NSSVG = 'http://www.w3.org/2000/svg'
	
	var TypeFragment = '#Fragment'
	var TypeText = '#Text'
	
	/**
	 * @return {string}
	 */
	Element.prototype.html = ''
	Element.prototype.toString = function toString () {
		var flag = this.flag
	
		switch (flag) {
			case ElementComponent:
				return componentMount(this).toString()
			case ElementText:
				return escape(this.children)
		}
	
		var type = this.type
		var children = this.children
		var length = children.length
		var output = flag > ElementIntermediate ? '<' + type + toProps(this, this.props) + '>' : ''
	
		switch (bool(type)) {
			case 0:
				return output
			default:
				if (!this.html)
					while (length-- > 0)
						output += (children = children.next).toString()
				else
					output += this.html
		}
	
		return flag > ElementIntermediate ? output + '</'+type+'>' : output
	}
	
	/**
	 * @param {Element} element
	 * @param  {Object} props
	 * @return {String}
	 */
	function toProps (element, props) {
		var value, output = ''
	
		for (var key in props) {
			switch (value = props[key], key) {
				case 'dangerouslySetInnerHTML':
					if (value && value.__html)
						value = value.__html
					else
						break
				case 'innerHTML':
					element.html = value
					break
				case 'defaultValue':
					if (!props.value)
						output += ' value="'+escape(value)+'"'
				case 'key':
				case 'ref':
				case 'children':
					break
				case 'style':
					output += ' style="' + (typeof value === 'string' ? value : toStyle(value)) + '"'				
					break
				case 'className':
					key = 'class'
				default:
					if (value !== false && value != null)
						output += ' '+ key + (value !== true ? '="'+escape(value)+'"' : '')
					else
						continue
			}
		}
	
		return output
	}
	
	/**
	 * @param {Object} obj
	 * @return {string}
	 */
	function toStyle (obj) {
		var name, output = ''
	
		for (var key in obj) {
			if (key !== key.toLowerCase())
				name = key.replace(/([a-zA-Z])(?=[A-Z])/g, '$1-').replace(/^(ms|webkit|moz)/, '-$1').toLowerCase()
			else
				name = key
			
			output += name+':'+obj[key]+';'
		}
	
		return output
	}
	
	/**
	 * @return {string}
	 */
	Element.prototype.toJSON = function toJSON () {
		var flag = this.flag
	
		switch (flag) {
			case ElementComponent:
				return componentMount(this).toJSON()
			case ElementText:
				return this.children
		}
	
		var output = {type: this.type, props: this.props, children: []}
		var children = this.children
		var length = children.length
	
		while (length-- > 0)
			output.children.push((children = children.next).toJSON())
	
		return flag < ElementFragment ? output : output.children
	}
	
	/**
	 * @return {Stream}
	 */
	Element.prototype.chunk = ''
	Element.prototype.toStream = function toStream () {
		return new Stream(this)
	}
	
	/**
	 * @constructor
	 * @param {Element}
	 */
	function Stream (element) {
		this.stack = [commitElement(element)]
		this.type = 'text/html'
	
		Readable.call(this)
	}
	/**
	 * @type {Object}
	 */
	Stream.prototype = Object.create(Readable.prototype, {
		commit: {value: function commit (element, stack, index, done) {
			var type = element.type
			var children = element.children
			var length = children.length
			var output = ''
	
			while (element.flag === ElementComponent)
				element = componentMount(element)
	
			switch (element.flag) {
				case ElementText:
					output = escape(element.children)
					break
				case ElementNode:
					output = '<' + (type = element.type) + toProps(element.props) + '>'
					
					if (!length)
						output += bool(type) > 0 ? '</'+type+'>' : ''
				default:
					children.prev.chunk = element.flag !== ElementFragment ? '</'+type+'>' : ''  
	
					while (length-- > 0)
						stack.push(children = children.prev) 
			}
	
			return output + element.chunk
		}},
		_read: {value: function read () {
			var stack = this.stack
			var length = stack.length
	
			if (length === 0)
				return void this.push(null)
	
			this.push(this.commit(stack.pop(), stack, length-1, false))
		}}
	})
	
	/**
	 * @param {*} subject
	 * @param {Stream?} target
	 * @param {function?} callback
	 */
	return function (subject, target, callback) {
		if (!target || !target.writable)
			return render(subject, target, callback)
	
		var readable = new Stream(subject)
	
		if (typeof target.getHeader === 'function' && !target.getHeader('Content-Type'))
			target.setHeader('Content-Type', 'text/html')
	
		if (typeof callback === 'function')
			readable.on('end', callback)
	
		return readable.pipe(target), readable
	}
}