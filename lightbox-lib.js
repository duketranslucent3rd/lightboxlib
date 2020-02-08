//'use strict';
(function() {

	/* ---
	| PREP
	--- */

	if (window.lblib) return;
	window.lblib = {};

	//shortcuts methods
	document.qs = document.querySelector;
	document.qsa = document.querySelectorAll;
	document.ce = document.createElement;
	let getCompStyle = (el, style) => {
		let styles = getComputedStyle(el);
		return styles.getPropertyValue(style);
	},
		carousel_slides,
		curr_carousel_slide_index;

	//func used by lbdialog to allow closure via escsape key (declared as non-anonymous func so it can be unbound
	//when lbdialog closes
	let closeLBDialogOnEscapePress = e => {
		if (e.keyCode == 27 && !document.qs('#lightbox').matches('.noClose')) lblib.hide('escape');
	};

	//build lightbox
    let lightboxDiv = document.ce('div');
    lightboxDiv.id = 'lightbox';
    document.body.prepend(lightboxDiv);

    //listen for carousel nav
    document.body.addEventListener('click', evt => {
    	if (!evt.target.matches('.lblib_ce .carousel-nav')) return;
    	let modifier = evt.target.matches('.carousel-next') ? 1 : -1;
    	if (evt.target.matches('.carousel-next'))
    		next_slide_index = carousel_slides.children[curr_carousel_slide_index + 1] ? curr_carousel_slide_index + 1 : 0;
    	else
    		next_slide_index = carousel_slides.children[curr_carousel_slide_index - 1] ? curr_carousel_slide_index - 1 : carousel_slides.children.length - 1;
    	lblib.centralElement.querySelector('.carousel-slide').remove();
    	let slide = carousel_slides.children[next_slide_index].cloneNode(true);
    	slide.classList.add('carousel-slide');
    	lblib.centralElement.appendChild(slide);
    	curr_carousel_slide_index = next_slide_index;
    });

	/* ---
	| MAIN - pretty much all "show something" functionality ends up here
	--- */

	lblib.lightbox = function(el, params = {}) {

	    //prep - establish element type
	    let lb = document.qs('#lightbox'),
	    	carousel_mode;		    
	    if (typeof el == 'string') el = document.qs(el);
	    if (params.carousel && el.children.length) {
	    	carousel_mode = 1;
	    	curr_carousel_slide_index = 0;
	    	carousel_slides = el.cloneNode(true);
	    	el.classList.add('carousel');
	    	el.innerHTML = '';
	    	let slide = carousel_slides.children[0].cloneNode(true);
	    	slide.classList.add('carousel-slide');
	    	el.appendChild(slide);
	    }
	    el.classList.add('lblib_ce');
	    lblib.centralElement = el;
	    [...lblib.centralElement.children].forEach(el => el.style.display = 'none');
		lb.classList[params.noClose ? 'add' : 'remove']('noClose');

	    //request to show
	    if (lblib.centralElement.id != 'lightbox') {

		  	//force central element to be child of body (lift it out of the DOM and re-insert). This ensures centering relative to body. After, put back where it was. This may be undesirable occasionally, where event attachment and binding would be lost e.g. for Vue.JS, so any elements with 'no-lb-pick-up' are ignored.

			if (!lblib.centralElement.parentElement.matches('body') && !lblib.centralElement.matches('.no-lb-pick-up')) {
				let node_holder = lblib.centralElement.cloneNode(true);
				let markerNodeForReinsertion = document.ce('em');
				markerNodeForReinsertion.setAttribute('id', 'markerNodeForReinsertion');
				lblib.centralElement.before(markerNodeForReinsertion);
				lblib.centralElement.remove();
				lblib.centralElement = document.body.insertBefore(node_holder, document.body.childNodes[0]);
			}

			//assuming noClose not passed, close lighbox if any button or el with .close inside central element is clicked
			if (!params.noClose)
				lblib.centralElement.addEventListener('click', evt => {
					if (!evt.target.matches('button, .close')) return;
					lblib.hide.call(this, 'close', evt);
				});

			//force position absolute and z-index 10001 if not set
			if (getCompStyle(lblib.centralElement, 'position') != 'absolute') lblib.centralElement.style.position = 'absolute';
			if (getCompStyle(lblib.centralElement, 'z-index') != 10003) lblib.centralElement.style.zIndex = 10003;
			
	    }	

	    //toggle show/hide lightbox...
	    if ((getCompStyle(lb, 'display') == 'none' || lb.matches('.retain-lb-on-close')) && lblib.centralElement.id != 'lightbox') {

			let retain_lb_on_close = lb.matches('.retain-lb-on-close'),
				callback = () => [...lblib.centralElement.children].concat(lblib.centralElement).filter(el => !el.matches('.stay-hidden')).forEach(el => el.style.display = 'block');
			if (!retain_lb_on_close) {
				document.qs('#lightbox').style.display = 'block';
				callback();
			} else
				callback();
			params.autoDisappear && setTimeout(() => lblib.hide('auto'), params.autoDisappear * 1000);
			if (!params.noClose) {
				let ce = lblib.centralElement;
				if (!ce.matches('#lblib-modal'))
					if (ce.querySelector('.top-close-btn'))
						ce.querySelector('.top-close-btn').remove();

				//...add top close button
				let a = document.ce('a');
				a.className = 'close top-close-btn';
				a.innerHTML = '&times;';
				el.prepend(a);

				//...add next/prev buttons if carousel
				if (carousel_mode) {
					['prev', 'next'].forEach(which => {
						let btn = document.ce('button');
						btn.classList.add('noLBClose', 'carousel-nav', 'carousel-'+which);
						btn.innerHTML = which == 'prev' ? '&laquo;' : '&raquo;';
						el.appendChild(btn);
					});
				}

			}
			params.callbackOnOpen && params.callbackOnOpen(lblib.centralElement);

	    } else if (lblib.centralElement.id == 'lightbox')
			lblib.hide('lb');

	    document.body.classList.toggle('lightbox-showing');
		lblib.centreElement(lblib.centralElement);
	
	};

	/* ---
	| CENTRE ELEMENT - util to centre the central element
	--- */
	
	lblib.centreElement = el => {
	    let temp_elWidth = parseInt(getCompStyle(el, 'width'));
	    if (isNaN(temp_elWidth)) el.style.width = temp_elWidth = '300'; //force default width if none set
	    let left = 'calc(50% - ('+temp_elWidth+'px / 2))';
	    let top = (50 + (document.documentElement.scrollTop || document.body.scrollTop))+'px';
		el.style.left = left;
	}

	/* ---
	| UTILITY FUNC: supporting func - on lightbox close, if CE was not a child of body, reinsert it where we grabbed
	| it from. Remove lightbox class and styling from it (and its children) in process. Removes the element if it was
	| an iframe or has .delete-on-close
	--- */

	function reinsertCentralElement() {

		let mnfr = document.qs('#markerNodeForReinsertion');
		
		//is it an absent file or has .delete-on-close? Just remove if so - nowhere to reinsert
		if ((!!lblib.centralElement && lblib.centralElement.matches('.absentFile')) || lblib.centralElement.matches('.delete-on-close')) {
			lblib.centralElement.remove();
			mnfr && mnfr.remove();
		} else {
			lblib.centralElement.classList.remove('lblib_ce');
			[...lblib.centralElement.children].concat(lblib.centralElement).forEach(el => el.setAttribute('style', null));
			if (mnfr) {
				mnfr.before(lblib.centralElement);
				mnfr.remove();
			}
		}
	}

	/* ---
	| ABSENT FILES: allows loading and display in LB of images or pages not currently in page. Runs on string, which
	| is URL to file.
	--- */

	//#### ADDIT ARGS: frame_class, callbackOnSRCChange
	lblib.fetch = function(uri, params) {

		//prep
		let contentToMake = '',
			contentType = /\.(jpg|gif|png|bmp|jpeg)$/.test(uri) ? 'img' : 'doc';

		//create container or reuse if existing
		let afCntr = document.qs('#lblib-afCntr') || document.ce('div');
		afCntr.id = 'lblib-afCntr';
		afCntr.innerHTML = '';
		afCntr.style.display = 'none';
		!afCntr.parentNode && document.body.appendChild(afCntr);
		lblib.loading(true);

		//image
		if (contentType == 'img') {
			afCntr.classList.add('img');
			let img = document.ce('img');
			afCntr.appendChild(img);
			img.onload = () => {
				lblib.hide();
				afCntr.style.width = img.width+'px';
				lblib.lightbox(afCntr, params);
			};
			img.src = uri;

		//doc (via iframe)
		} else {
			let ifr = document.ce('iframe');
			afCntr.classList.add('doc');
			ifr.src = url;
			ifr.onload = () => {
				lblib.hide();
				lblib.lightbox(afCntr, params);
			};
		}

	}

	/* ---
	| DIALOGS: lightbox-utilising replacement for in-built alert/confirm methods. See usage notes at top of page.
	--- */

	lblib.dialog = function(params) {

		lblib.hide('pre-dialog'); //<-- definitely sensible but is it safe?

	    //clean up from any previous alert
	    document.qsa('[id=lblib-modal]').forEach(el => el.remove());

	    //create, style (with necessary CSS, params-passed CSS and config CSS at top of file) and append dialog box
	    let box = document.ce('div');
	    box.setAttribute('id', 'lblib-modal')
		box.style.position = 'fixed';
		box.style.display = 'none';
		if (params.class) typeof params.class == 'string' ? box.classList.add(params.class) : box.classList.add.apply(null, params.class);
	    document.body.prepend(box);

	    //add content

	    let header;
	    if (params.title) header = params.title;
		header = header == undefined ? '' : "<h4 class='"+header.replace(/[^\w\-]/g, '_').toLowerCase()+"'>"+header+"</h4>";
		params.content = params.content.replace(/<p>(?=<p>)|<\/p>(?=<\/p>)/, '');
	    box.innerHTML += header+'<p>'+params.content+"</p><div style='clear: both'></div>";


	    //add buttons, unless params stipulate the dialog should close itself after X seconds. right button will
	    //always be put out, whereas left button is only put out if params.cancelButton object is passed, i.e. is
	    //confirm, not alert. onclick, along with effecting any callbacks passed, they will also close the lightbox
	    //unless  you pass 'noLBClose' in their object

	    if (!params.autoDisappear) {
		    let buttons = ['OK', 'cancel'];
		    for(let e in buttons) {
			  if ((buttons[e] == 'OK' || params.cancelButton) && params[buttons[e]+'Button'] !== false) {
				let but = document.ce('button');
				but.classList.add('lbd-button', buttons[e] == 'OK' ? 'r' : 'l', buttons[e].toLowerCase());
				but.style.float = buttons[e] == 'OK' ? 'right' : 'left';
				if (!params[buttons[e]+'Button'] || !params[buttons[e]+'Button'].big) but.classList.add('smaller');
				let butText;
				if (params[buttons[e]+'Button']) {
					but.classList.add('button-'+e);
				    if (params[buttons[e]+'Button'].noLBClose) but.classList.add('noLBClose');
				    if (params[buttons[e]+'Button'].class) but.classList.add(params[buttons[e]+'Button'].class);
				    butText = params[buttons[e]+'Button'].text ? params[buttons[e]+'Button'].text : buttons[e].substr(0, 1).toUpperCase()+buttons[e].substr(1);
				    if (params[buttons[e]+'Button'].callback) but.addEventListener('click', (button => { return evt => {
				    	evt.stopImmediatePropagation();
				    	params[button+'Button'].callback(button, evt);
				    	if (!params[buttons[e]+'Button'].noClose) lblib.hide.call(this, 'lbd-'+buttons[e], evt);
				    }; })(buttons[e]));
				} else
				    butText = buttons[e];
				but.innerHTML = butText;
				box.appendChild(but);
			  }
		    }
		}

		//centre and show
		lblib.lightbox(box, {autoDisappear: params.autoDisappear, noClose: params.noClose, callbackOnOpen: params.callbackOnOpen});

	    //lastly, close on keypress to <escape>
		document.addEventListener('keypress', closeLBDialogOnEscapePress);

	    //allow enter press on any form fields contained to trigger OK button?
	    if (params.allowEnter && params.OKButton)
	    	box.addEventListener('keypress', evt => {
				if (!evt.target.matches('input')) return;
				if (evt.keyCode == 13) box.querySelector('.lbd-button.ok').click();
	    	});

	    return box;

	};

	/* ---
	| HIDE LB - close lightbox and remove keypress bind to escape key. Args:
	|	@cause (str; obj) 	- a string or jQ reference that denotes the cause of closure. The latter will be either:
	|		- 'lb' 			- a click to the lightbox (i.e. surrounding the central element)
	|		- 'auto'		- the lightbox automatically closed after a set amount of time (via ::lbdialog() >
	|						  @autoDisappear)
	|		- 'escape'		- the escape button was pressed
	|		- 'pre-dialog'	- lbdialog() closed the lightbox in anticipation of showing a dialog
	|		- 'lbd-N'		- a click to a button within a dialog, where N is either 'OK' or 'cancel'
	|		- 'close'		- a click to an element with the class "close", or it was a non-suppressed button
	|	@evt (obj)			- where an event was involved in closure, the event object
	|	@callback (func)	- a callback function - note this may also be registered globally on window.lb_close_cb.
	|						  The first two args are passed to any callback (along with the ID of the associated
	|						  element, if any.)
	--- */

	lblib.hide = function(cause, evt) {

		//ignore if document in temporary LB close disable mode or LB not visible
		if (document.body.matches('.temporary-no-lb-close') || document.qs('#lightbox').style.display != 'block') return;

		//suppress closure?
		if (evt && evt.target.matches('.noLBClose, [rel=noLBClose]')) return;

		let ce_identifier = lblib.centralElement.getAttribute('data-id') || lblib.centralElement.id,
			reinsert_or_remove_ce = !lblib.centralElement.matches('#lblib-modal, #lblib-afCntr') ? 'r' : 'k';
	  
		let lb = document.qs('#lightbox');
		lb.style.display = 'none';
		lb.classList.remove('retain-lb-on-close');
		reinsert_or_remove_ce == 'r' ? reinsertCentralElement() : lblib.centralElement.remove();
		if (window.lb_close_cb) window.lb_close_cb(cause, evt, ce_identifier);

		document.removeEventListener('keypress', closeLBDialogOnEscapePress);

	};

	/* ---
	| LOADING/SPINNER - show in LB overlay while loading or data being submitted. Supports progress bars, either
	| infinite or percentile. Call each time progress percentage changes. Args:
	|	@progress (str, int)	- optional; either bool true for barnerpole-style progress bar, or an integer
	| denoting the percent complete:
	|	@msg (str)				- optional message to accompany
	|	@succeeded (bool)		- show that all went well
	|	@failed (bool)			- show that request failed
	--- */

	lblib.loading = function(progress, msg, succeeded, failed) {

		//build if first time
		let el = document.qs('#lb-loading');
		if (!el) {
			lblib.hide();
			el = document.ce('aside');
			el.id = 'lb-loading';
			el.innerHTML = '<p><strong>Just a sec...</strong></p><p></p><div class="bar"><div></div></div><span class="succeeded">&#10004;</span><span class="failed">&times;</span>';
			document.body.appendChild(el);
		}

		//set configure func
		function configure_lbloading(el) {
			el.className = '';
			if (progress) {
				el.classList.add('with-progress-bar', 'bar-type-'+(progress === true ? 'infinite' : 'pct'));
				if (progress !== true) el.querySelector('.bar div').style.width = progress+'%';
			}
			if (msg) {
				el.classList.add('with-msg');
				el.querySelector('p + p').innerHTML = msg;
			}
			if (succeeded) el.classList.add('succeeded');
			if (failed) el.classList.add('failed');
			if (succeeded || failed) setTimeout(() => lblib.hide(), 1000);
		}

		//launch and configure (just latter if already visible)
		el.style.display != 'block' ? lblib.lightbox(el, {noClose: 1, callbackOnOpen: configure_lbloading}) : configure_lbloading(el);
	};

})();