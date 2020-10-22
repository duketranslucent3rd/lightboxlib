'use strict';
let lblib = (function() {

	/* ---
	| PREP
	--- */

	if (window.lblib) return;
	window.lblib = {};
	let lb,
		lb_ce,
		curr_usage,
		lb_showing = false,
		globals = {
			anim: true,
			enter: true,
			escape: true,
			clickLB: true,
			topCloseBtn: true,
			autoDisappearInterval: 1.5
		};

	//shortcuts methods
	document.qs = document.querySelector;
	document.qsa = document.querySelectorAll;
	document.ce = document.createElement;
	let bod = document.body;
	let getCompStyle = (el, style) => {
		let styles = getComputedStyle(el);
		return styles.getPropertyValue(style);
	},
		carousel_slides,
		curr_carousel_slide_index;


	//build lightbox
	lb = document.ce('div');
	lb.id = 'lightbox';
	document.body.prepend(lb);

	//listen for certain kinds of closure
	bod.addEventListener('click', evt => {
		if (!lb.matches('.noClose') && evt.target.matches('.lblib-ce .close, .lblib-ce button:not(.lbd-button)'))
			lblib.resolveModal(false) || lblib.hide(evt);
	});
	document.addEventListener('keyup', evt => {
		if (globals.escape && evt.keyCode == 27 && !lb.matches('.noClose'))
			lblib.resolveModal(false) || lblib.hide();
	});
	bod.addEventListener('keypress', evt => {
		if (globals.enter && evt.keyCode == 13 && !lb.matches('.noClose') && evt.target.matches('#lblib-modal input') && evt.target.value) {
			lblib.lastEnterVal = evt.target.value;
			lblib.resolveModal(true, evt.target.value);
		}
	});
	bod.addEventListener('click', evt => {
		if (globals.clickLB && evt.target === lb && !lb.matches('.noClose'))
			lblib.resolveModal(false) || lblib.hide();
	});

	//listen for carousel nav
	document.body.addEventListener('click', evt => {
		if (!evt.target.matches('.lblib-ce .carousel-nav')) return;
		let modifier = evt.target.matches('.carousel-next') ? 1 : -1,
			next_slide_index;
		if (evt.target.matches('.carousel-next'))
			next_slide_index = carousel_slides.children[curr_carousel_slide_index + 1] ? curr_carousel_slide_index + 1 : 0;
		else
			next_slide_index = carousel_slides.children[curr_carousel_slide_index - 1] ? curr_carousel_slide_index - 1 : carousel_slides.children.length - 1;
		lb_ce.querySelector('.carousel-slide').remove();
		let slide = carousel_slides.children[next_slide_index].cloneNode(true);
		slide.classList.add('carousel-slide');
		lb_ce.appendChild(slide);
		curr_carousel_slide_index = next_slide_index;
	});

	return {

		/* ---
		| LIGHTBOX - all lightbox modes are routed through here, i.e. to show an element of some sort. Args:
		|	@el (obj/str)	- a reference to an HTML element to show, or a selector string pointing to one
		|	@params (obj)	- optional params:
		|		- @autoDisappear (bool) - whether the lightbox should auto-close itself. The value in @defaults is used.
		|		- noClose (bool)		- stipulates that the lightbox cannot be closed by automatic means (i.e. from trigger elements)
		|		- carousel (bool)		- denotes the lightbox should cycle through the child elements of @el one by one, as a carousel
		|		- openCallback (func)	- a callback to be called once the lightbox opens. It is passed a reference to the central element.
		--- */

		lightbox(el, params = {}) {

			if (!curr_usage) curr_usage = !params.carousel ? 'lb' : 'carousel';

			//lightbox already showing? Close
			if (lb_showing) lblib.hide();

			//prep - establish element - unless was made internally, clone it
			let carousel_mode;
			if (typeof el == 'string') el = document.qs(el);
			let orig_el = el;
			if (!el.matches('#lblib-modal, #lb-loading, #lblib-afCntr')) {
				el = el.cloneNode(true);
				document.body.appendChild(el);
			}
			lb_ce = lblib.element = el;

			//classes
			el.classList.add('lblib-ce');
			lb.classList[params.noClose ? 'add' : 'remove']('noClose');

			//carousel mode?
			if (params.carousel && el.children.length) {
				carousel_mode = 1;
				curr_carousel_slide_index = 0;
				carousel_slides = orig_el.cloneNode(true);
				el.classList.add('carousel');
				el.querySelectorAll(':scope > *:not(:first-child)').forEach(el => el.remove());
				el.children[0].classList.add('carousel-slide');
			}

			//animate in?
			let fade;
			if (globals.anim && !el.matches('#lb-loading')) {
				fade = 1;
				lb_ce.classList.add('anim');
			}

			//toggle show/hide lightbox...
			if ((getCompStyle(lb, 'display') == 'none' || lb.matches('.retain-lb-on-close')) && lb_ce.id != 'lightbox') {
				lb_ce.style.display = lb.style.display = 'block';
				params.autoDisappear && setTimeout(() => lblib.hide(), (parseInt(params.autoDisappear) || globals.autoDisappearInterval) * 1000);
				if (!params.noClose) {
					if (!el.matches('#lblib-modal') && el.querySelector('#top-close-btn'))
						el.querySelector('#top-close-btn').remove();

					//...add top close button
					if (globals.topCloseBtn) {
						let a = document.ce('a');
						a.id = 'top-close-btn';
						a.className = 'close';
						a.innerHTML = '&times;';
						el.prepend(a);
					}

					//...add next/prev buttons if carousel
					if (carousel_mode) {
						['prev', 'next'].forEach(which => {
							let btn = document.ce('button');
							btn.classList.add('noClose', 'carousel-nav', 'carousel-'+which);
							btn.innerHTML = which == 'prev' ? '&laquo;' : '&raquo;';
							el.appendChild(btn);
						});
					}

				}

			} else if (lb_ce.id == 'lightbox')
				lblib.hide();

			lblib.centreElement(lb_ce);
			document.body.classList.add('lightbox-showing');
			lb_showing = 1;
			params.openCallback && params.openCallback(lb_ce);
		
		},

		/* ---
		| CENTRE ELEMENT - util to centre the central element. Args:
		|	@el (obj)	- the lightbox's central element
		--- */
		
		centreElement(el) {
			let temp_elWidth = parseInt(getCompStyle(el, 'width'));
			if (isNaN(temp_elWidth)) el.style.width = temp_elWidth = '300'; //force default width if none set
			let left = 'calc(50% - ('+temp_elWidth+'px / 2))';
			let top = (50 + (document.documentElement.scrollTop || document.body.scrollTop))+'px';
			el.style.left = left;
		},

		/* ---
		| ABSENT FILES: allows loading and display in LB of images or pages not currently in page. Runs on string, which
		| is URL to file. Args:
		|	@uri (str) 				- URI/URL to the image or page
		|	@params (obj)			- any of the params allowed by ::lightbox(), plus:
		|		@noLoader (bool)	- by default a barberpole loading indicator will show until the resource is loaded. If this is undesirable (e.g.
		|							  if @uri is a small filesize and thus will load quickly), pass true to suppress it.
		--- */

		fetch(uri, params = {}) {

			//prep
			curr_usage = 'fetch';
			let contentToMake = '',
				contentType = /\.(jpg|gif|png|bmp|jpeg)$/.test(uri) ? 'img' : 'doc';

			//create container or reuse if existing
			let afCntr = document.qs('#lblib-afCntr') || document.ce('div');
			afCntr.id = 'lblib-afCntr';
			afCntr.innerHTML = '';
			afCntr.style.display = 'none';
			!afCntr.parentNode && document.body.appendChild(afCntr);

			//show loader until ready?
			!params.noLoader && lblib.loading(true);			

			//image
			if (contentType == 'img') {
				afCntr.classList.add('img');
				let img = document.ce('img');
				afCntr.appendChild(img);
				img.onload = () => {
					afCntr.style.width = img.width+'px';
					lblib.lightbox(afCntr, params);
				};
				img.src = uri;

			//doc (via iframe)
			} else {
				let ifr = document.ce('iframe');
				afCntr.appendChild(ifr);
				afCntr.classList.add('doc');
				ifr.src = uri;
				ifr.onload = () => {
					lblib.lightbox(afCntr, params);
				};
			}

		},

		/* ---
		| MODALS - lightbox-hosted simulations of native modal dialogs. Returns promise so can be chained as
		| then()'ables. Args:
		|	@params (obj)	- object of params. All optional except @content:
		|		- @title (str)				- the modal's title, to be display at its top
		|		- @content (str/arr)		- the modal's main content - multiple paragraphs can be passed as an array
		|		- @prompt (bool/str)		- denotes a text field should be added, a la native prompt(). True for
		|									  an empty field, or a string
		|									  to set a start value. The field value will be passed to the resolve()
		|									  callback.
		|		- @OKButton (bool/obj)		- whether to include an OK button. If omitted, one is created by default
		|									  (which simply closes the
		|									  lightbox on click). Can be an object of parameters, including:
		|			- @text (str)			- the button text ('OK' if omitted')
		|			- @callback (func)		- a callback function to fire on click
		|			- @noClose (bool)		- suppresses the normal behaviour whereby clicks to buttons inside the
		|									  lightbox trigger it to close
		|		- @cancelButton (bool/obj)	- as with @OKButton, except it does not get created if omitted, and the
		|									  default text is 'cancel'
		--- */

		modal(params) {

			curr_usage = 'modal';

			return new Promise(res => {

				lblib.currModalPromiseRes = res;

				//create and append dialog box
				let box = document.ce('div');
				box.setAttribute('id', 'lblib-modal')
				box.style.position = 'fixed';
				box.style.display = 'none';
				document.body.appendChild(box);

				//populate
				let html = '';
				if (params.title) html += '<h4>'+params.title+'</h4>'; else box.classList.add('noTitle');
				html += '<p>'+(params.content instanceof Array ? params.content.join('</p><p>') : params.content)+'</p>';
				if (params.prompt) {
					box.classList.add('prompt');
					html += '<input id=lblib-prompt type=text value="'+(typeof params.prompt != 'string' ? '' : params.prompt)+'">';
				}
				box.innerHTML = html+'<div class=cl></div>';
				
				//add buttons OK/canel buttons as required - OK always (unless @autoDisappear), cancel only if @cancelButton passed
				['OK', 'cancel'].forEach(btnType => {
					if (params.noClose || params.autoDisappear || (btnType != 'OK' && !params.cancelButton) || params[btnType+'Button'] === false) return;
					let but = document.ce('button'),
						cfg = params[btnType+'Button'] || {};
					box.appendChild(but);
					but.classList.add('lbd-button', btnType == 'OK' ? 'r' : 'l', btnType.toLowerCase());
					but.style.float = btnType == 'OK' ? 'right' : 'left';
					but.textContent = cfg.text || btnType;
					but.addEventListener('click', evt => {
						if (!cfg.noClose) lblib.hide(evt);
						cfg.callback && cfg.callback(btnType, evt);
						let response = !params.prompt ? btnType == 'OK' : box.querySelector('#lblib-prompt').value;
						res(response);
					});
				});

				//centre and show
				lblib.lightbox(box, params);

			});

		},

		//modal() shortcuts
		alert(msg, noOKClose) {
			return lblib.modal({content: msg, OKButton: {noClose: noOKClose}});
		},
		confirm(msg, noOKClose) {
			return lblib.modal({title: 'Confirm', content: msg, cancelButton: 1, OKButton: {noClose: noOKClose}});
		},
		prompt(msg, dflt, noOKClose) {
			return lblib.modal({content: msg, cancelButton: 1, prompt: dflt || true, OKButton: {noClose: noOKClose}});
		},

		//programmatically resolve modal
		resolveModal(direction) {
			if (curr_usage != 'modal') return false;
			lblib.currModalPromiseRes(direction);
		},

		/* ---
		| HIDE - close lightbox.
		|	@evt (obj)			- where an event was involved in closure, the event object
		| It is possible for outside scripts to listen in for lightbox closure, via window.lb_close_cb(). It is passed the
		| @cause of closure and also any corresponding @evt.
		--- */

		hide(evt) {

			//ignore if document in temporary LB close disable mode or LB not visible
			if (document.body.matches('.temporary-no-lb-close') || lb.style.display != 'block') return;

			//suppress closure?
			if (evt && evt.target.matches('.noClose')) return;

			lb.style.display = 'none';
			lb.classList.remove('retain-lb-on-close');
			lblib.onClose && lblib.onClose(lb_ce, evt, curr_usage);
			document.body.classList.remove('lightbox-showing');

			//remove central element
			lb_ce.style.border = 'solid 10px blue';
			lb_ce.remove();
			lb_showing = false;
			curr_usage = null;

		},

		/* ---
		| LOADING - a loading progress indicator, either infinite (barberpole style), percentile or done/failed. Args:
		|	@progress (bool/int)	- true for barnerpole-style progress bar, or an integer or a percentile indication.
		|	@msg (str)				- optional accompanying message
		|	@succeeded (bool)		- show that all went well
		--- */

		loading(progress, msg, succeeded, failed) {

			curr_usage = 'loading';

			//build if first time
			let el = document.qs('#lb-loading');
			if (!el) {
				lblib.hide();
				el = document.ce('aside');
				el.id = 'lb-loading';
				el.classList.add('lblib-ce');
				el.innerHTML = `
				<p>
					<strong>Just a sec...</strong>
				</p>
				<p></p>
				<div class=bar><div>
				</div></div>
				<span class="succeeded">&#10004;</span>
				<span class="failed">&times;</span>
				`;
				document.body.appendChild(el);
			}

			//launch and configure (just latter if already visible)
			if (el.style.display != 'block') lblib.lightbox(el, {noClose: 1});
			lb_ce.classList.remove.apply(lb_ce.classList, [...lb_ce.classList].filter(c => c != 'lblib-ce'));
			if (progress) {
				el.classList.add('with-progress-bar', 'bar-type-'+(progress === true ? 'infinite' : 'pct'));
				if (progress !== true) lb_ce.querySelector('.bar div').style.width = progress+'%';
			}
			if (msg) {
				lb_ce.classList.add('with-msg');
				lb_ce.querySelector('p + p').innerHTML = msg;
			}
			if (succeeded) lb_ce.classList.add('succeeded');
			if (failed) lb_ce.classList.add('failed');
			if (succeeded || failed) setTimeout(() => lblib.hide(), 1000);

		},

		/* ---
		| CONFIG - set a global config item. Args: (obvious)
		--- */

		setConfig(item, val) {
			if (globals[item]) globals[item] = val;
		}

	};

})();
