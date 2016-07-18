function Content (props) {
	return h('div.content', {dangerouslySetInnerHTML: props.html});
}

function TableOfContents (props) {
	return h('.table-of-contents',
				h('ul', 
					props.nav.map(function (value) {
						return h('li', 
									h('a[href='+ value.href +']', 
										{
											class: value.active ? 'active' : '',
											onClick: props.onClick
										},
										value.text
									)
								)
					})
				)
			)
}

function Documentation () {
	var 
	markdown   = dio.stream();

	function rawMarkup () {
		return remarkable.render(markdown());
	}

	function getDocument (url, callback) {
		dio.request.get(url)
			.then(markdown)
			.then(callback)
			.catch(function () {
				markdown('# 404 | document not found')
				callback()
			});
	}

	function update (self) {
		return function () {
			self.forceUpdate();
			highlighter();
		}
	}

	function activateLink (self, href) {
		href   = href || this.getAttribute('href');

		var
		nav    = [];

		self.props.nav.forEach(function (value) {
			var
			item = Object.assign({}, value, {active: value.href !== href ? false : true});
			nav.push(item);
		});

		self.setProps({nav: nav});
		self.forceUpdate();
		getDocument(href, update(self));
		window.location.hash = href.replace('../', '').replace('.md', '');
	}

	return {
		getDefaultProps: function () {
			return {
				nav: [
					{text: 'Installation', href: '../installation.md'},
					{text: 'Getting Started', href: '../getting-started.md'},
					{text: 'Examples', href: '../examples.md'},
					{text: 'API Reference', href: '../api.md'}
				]
			}
		},
		componentWillReceiveProps: function (props) {
			getDocument(props.url, update(this));
			activateLink(this, props.url)
		},
		render: function (props, _, self) {
			return h('.documentation',
						Content({html: rawMarkup()}),
						TableOfContents({
							nav: props.nav,
							onClick: dio.curry(activateLink, [self], true)
						})
					)
		}
	}
}

function Welcome () {
	var 
	rawMarkup = dio.stream('');

	function handleClick (e) {
		var
		href = e.target.getAttribute('href');

		if (href) {
			router.nav(href.replace('.',''));
		}
	}

	return {
		componentDidMount: function (props, _, self) {
			dio.request.get(props.url)
				.then(rawMarkup)
				.then(function () {
					rawMarkup(remarkable.render(rawMarkup()))
					self.forceUpdate();
				});
		},
		componentDidUpdate: function () {
			highlighter();
		},
		render: function () {
			return h('.welcome', {
				onClick: dio.curry(handleClick, null, true),
				dangerouslySetInnerHTML: rawMarkup()
			});
		}
	}
}

var
remarkable = new Remarkable();

var
router = dio.createRouter('/docs/layout', {
		'/': function () {
			dio.createRender(Welcome, '.container')({url: '../welcome.md'});
		},
		'/documentation': function () {
			var 
			section = window.location.hash.toLowerCase().replace('#', '');

			section = section || 'installation';
			section = '../'+ section + '.md';

			dio.createRender(Documentation, '.container')({url: section});
		}
	});

document.querySelector('.logo a').addEventListener('click', dio.curry(router.nav, ['/'], true))