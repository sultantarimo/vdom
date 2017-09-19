describe('Render', () => {
	let container = document.createElement('div')

	it('should render dangerouslySetInnerHTML', () => {
		render(h('h1', {dangerouslySetInnerHTML: {__html: '<div>test</div>'}}), container)
		assert.html(container, '<h1><div>test</div></h1>', 'dangerouslySetInnerHTML')
	})

	it('should render null', () => {
		render(null, container)
		assert.html(container, '')
	})

	it('should render text', () => {
		render('hello', container)
		assert.html(container, 'hello', 'render text')
	})

	it('should not render an undefined attribute', () => {
		render(h('h1', {className: undefined}, '0'), container)
		assert.html(container, '<h1>0</h1>')
	})

	it('should not render a null attribute', () => {
		render(h('h1', {prop: null}, '0'), container)
		assert.html(container, '<h1>0</h1>')
	})

	it('should render a class attribute', () => {
		render(h('h1', {class: 1}, '0'), container)
		assert.html(container, '<h1 class="1">0</h1>')
	})

	it('should render a className property', () => {
		render(h('h1', {className: 2}, '0'), container)
		assert.html(container, '<h1 class="2">0</h1>')
	})

	it('should not render an undefined property', () => {
		render(h('input', {value: undefined}, '0'), container)
		assert.html(container, '<input>', 'value')

		render(h('a', {href: undefined}, '0'), container)
		assert.html(container, '<a>0</a>', 'href')
	})

	it('should render style objects', () => {
		render(h('h1', {style: {width: '100px'}}, '0'), container)
		assert.equal(container.firstChild.style.width, '100px', 'render element style object')
	})

	it('should render style strings', () => {
		render(h('h1', {style: 'width:100px'}, '0'), container)
		assert.equal(container.firstChild.style.width, '100px', 'render element style string')
	})

	it('should render img width', () => {
		render(h('img', {width: '100px'}), container)
		assert.equal(container.firstChild.getAttribute('width'), '100px', 'render element img width')
	})

	it('should render un-ordered input attributes', () => {
		render(h('input', {value: 0.4, step: 0.1, type: 'range', min: 0, max: 1}), container)
		assert.equal(container.firstChild.value, '0.4')
	})

	it('should render a class component', () => {
		render(class {
			render () {
				return h('h1', {id: 1}, '2')
			}
		}, container)
		assert.html(container, '<h1 id="1">2</h1>')
	})

	it('should render a function component', () => {
		render(() => h('h1', {id: 1}, '1'), container);
		assert.html(container, '<h1 id="1">1</h1>')
	})

	it('should render a iteratable', () => {
		render(() => ({
			[Symbol.iterator]: function* () {
		    yield 1
		    yield 2
		    yield 3
			}
		}), container)
		assert.html(container, '123')
	})

	it('should render a array', () => {
		render(() => [h('h1', 'Hello'), h('h1', 'World')], container)
		assert.html(container, '<h1>Hello</h1><h1>World</h1>')
	})

	it('should unmount a component', () => {
		assert.equal(unmountComponentAtNode(container), true)
		assert.html(container, '')
	})

	it('should (un)mount ref function(instance)', () => {
		let refs = null
		let A = class {
			render() {
				return null
			}
		}

		render(class {
			render() {
				return h(A, {ref: (value) => refs = value})
			}
		}, container)
		assert.instanceOf(refs, A, 'ref function(instance#mount)')

		unmountComponentAtNode(container)
		assert.equal(refs, null, 'ref function(instance#unmount)')
	})

	it('should (un)mount ref string(instance)', () => {
		let refs = null
		let A = class {
			render() {
				return null
			}
		}

		render(class {
			componentDidMount() {
				refs = this.refs
			}
			render() {
				return h(A, {ref: 'instance'})
			}
		}, container)
		assert.instanceOf(refs.instance, A, 'ref string(instance#mount)')

		unmountComponentAtNode(container)
		assert.equal(refs.instance, null, 'ref string(node#unmount)')
	})
})
