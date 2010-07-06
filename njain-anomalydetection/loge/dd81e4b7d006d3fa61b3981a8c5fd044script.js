
                        
			jsDebug = true;
		;;/********************************************/
/* IPS website javascript					*/
/********************************************/

var ips = {
	menus: {},
	delegate: {}
};

ips.ticker = Class.create({
	
	initialize: function( root, options )
	{
		if( !$( root ) ){
			return;
		}
		
		this.root = root;
		this.options = Object.extend({
			duration: 4,
			select: "li"
		}, options || {});
		
		this.items = $( root ).select( this.options.select );
		if( !this.items.length ){ return; }
		
		// Hide all except first
		this.items.invoke('hide').first().show();
		
		// Start timer for next one
		this.timer = this.nextItem.bind(this).delay( this.options.duration );
		
		// Set pause event
		$( this.root ).observe('mouseenter', this.pauseTicker.bindAsEventListener( this ) );
		$( this.root ).observe('mouseleave', this.unpauseTicker.bindAsEventListener( this ) );
	},
	
	pauseTicker: function(e)
	{
		clearTimeout( this.timer );
	},
	
	unpauseTicker: function(e)
	{
		this.timer = this.nextItem.bind(this).delay( this.options.duration );
	},
	
	nextItem: function()
	{
		// Find current item
		var cur = this.items.find( function(elem){
			return elem.visible();
		});
		
		var next = $( cur ).next( this.options.select );
		
		if( Object.isUndefined( next ) ){
			next = this.items.first();
		}
		
		// Fade current
		new Effect.Fade( $( cur ), { duration: 0.4, queue: 'end', afterFinish: function(){
			new Effect.Appear( $( next ), { duration: 0.8, queue: 'end' } );
		} } );
		
		// Reset timer
		this.timer = this.nextItem.bind( this ).delay( this.options.duration );
	}
});

ips.menu = Class.create({
	
	initialize: function( elem, target )
	{
		if( !$( elem ) || !$( target ) ){
			return;
		}
		
		this.elem = $( elem );
		this.target = $( target );
		
		$( this.target ).hide();
		
		$( elem ).observe('mouseover', this.event_mouseover.bindAsEventListener(this));
		$( elem ).observe('mouseout', this.event_mouseout.bindAsEventListener(this));
	},
	
	doShow: function()
	{
		Debug.write("Showing " + $( this.elem ).id );
		
		// Position it
		var elemPos = $( this.elem ).positionedOffset();
		var elemDim = $( this.elem ).getDimensions();
		
		$( this.target ).setStyle({
			position: 'absolute',
			top: ( elemPos.top + elemDim.height ) + 'px',
			left: ( elemPos.left ) + 'px'
		});
		
		$( this.elem ).addClassName('active');
		/*new Effect.Appear( $( this.target ), { duration: 0.1 } ); */
		$( this.target ).show();
	},
	
	doHide: function()
	{
		if( $( this.target ).visible() )
		{
			Debug.write("Hiding " + $( this.elem ).id );
			
			$( this.elem ).removeClassName('active');
			new Effect.Fade( $( this.target ), { duration: 0.1 } );
		}
	},
	
	event_mouseover: function( e )
	{
		window.clearTimeout( this._meventHide );
		this._meventShow = this.doShow.bind(this).delay(0.1);		
	},
	
	event_mouseout: function( e )
	{
		window.clearTimeout( this._meventShow );
		this._meventHide = this.doHide.bind(this).delay(0.2);		
	}
});

/************************************************/
/* IPB3 Javascript								*/
/* -------------------------------------------- */
/* ips.popup.js - Popup creator					*/
/* (c) IPS, Inc 2008							*/
/* -------------------------------------------- */
/* Author: Rikki Tissier						*/
/************************************************/

/**
 * Full list of options:
 * 
 * type: 			balloon, pane
 * modal: 			true/false
 * w: 				width
 * h: 				height
 * classname: 		classname to be applied to wrapper
 * initial: 		initial content
 * ajaxURL: 		If supplied, will ping URL for content and update popup
 * close: 			element that will close popup (wont work with balloon)
 * attach: 			{ target, event, mouse, offset }
 * hideAtStart: 	Hide after creation (allows showing at a later time)
 * stem: 			true/false
 * delay: 			{ show, hide }
 */

ips.popup = Class.create({
		
	initialize: function( id, options, callbacks )
	{		
		/* Set up properties */
		this.id				= '';
		this.wrapper		= null;
		this.inner			= null;
		this.stem			= null;
		this.options		= {};
		this.timer			= [];
		this.ready			= false;
		this._startup		= null;
		this.hideAfterSetup	= false;
		this.eventPairs		= {	'mouseover': 	'mouseout',
								'mousedown': 	'mouseup'
							  };
		this._tmpEvent 		= null;
		
		/* Now run */
		this.id = id;
		this.options = Object.extend({
			type: 				'pane',
			w: 					'500px',
			modal: 				false,
			modalOpacity: 		0.4,
			hideAtStart: 		true,
			delay: 				{ show: 0, hide: 0 },
			defer: 				false,
			hideClose: 			false,
			closeContents: 		"x"		
		}, arguments[1] || {});
		
		this.callbacks = callbacks || {};
		
		// Are we deferring the load?
		if( this.options.defer && $( this.options.attach.target ) )
		{
			this._defer = this.init.bindAsEventListener( this );
			$( this.options.attach.target ).observe( this.options.attach.event, this._defer );
			
			if( this.eventPairs[ this.options.attach.event ] )
			{
				this._startup = function(e){ this.hideAfterSetup = true; this.hide() }.bindAsEventListener( this );
				$( this.options.attach.target ).observe( this.eventPairs[ this.options.attach.event ], this._startup  );
			}
		}
		else
		{
			this.init();
		}
	},
	
	init: function()
	{
		try {
			Event.stopObserving( $( this.options.attach.target ), this.options.attach.event, this._defer );
		} catch(err) { }
		
		this.wrapper = new Element('div', { 'id': this.id + '_popup' } ).setStyle('z-index: 16000').hide().addClassName('popupWrapper');
		this.inner = new Element('div', { 'id': this.id + '_inner' } ).addClassName('popupInner');
		
		if( this.options.w ){ this.inner.setStyle( 'width: ' + this.options.w ); }
		if( this.options.h ){ this.inner.setStyle( 'max-height: ' + this.options.h ); }
		this.wrapper.insert( this.inner );
		
		if( this.options.hideClose != true )
		{
			this.closeLink = new Element('div', { 'id': this.id + '_close' } ).addClassName('popupClose').addClassName('clickable');
			this.closeLink.update( this.options.closeContents );
			this.closeLink.observe('click', this.hide.bindAsEventListener( this ) );
			this.wrapper.insert( this.closeLink );
		}
		
		$$('body')[0].insert( this.wrapper );
		
		if( this.options.classname ){ this.wrapper.addClassName( this.options.classname ); }
		
		if( this.options.initial ){
			this.update( this.options.initial );
		}
		
		// If we are updating with ajax, handle the show there
		if( this.options.ajaxURL ){
			this.updateAjax();
			setTimeout( this.continueInit.bind(this), 80 );
		} else {
			this.ready = true;
			this.continueInit();
		}
		
		// Need to set a timeout for continue,
		// in case ajax is still running
	},
	
	continueInit: function()
	{
		if( !this.ready )
		{
			setTimeout( this.continueInit.bind(this), 80 );
			return;
		}
		
		//Debug.write("Continuing...");
		// What are we making?
		if( this.options.type == 'balloon' ){
			this.setUpBalloon();
		} else {
			this.setUpPane();
		}
		
		// Set up close event
		try {
			if( this.options.close ){
				closeElem = $( this.wrapper ).select( this.options.close )[0];
				
				if( Object.isElement( closeElem ) )
				{
					$( closeElem ).observe( 'click', this.hide.bindAsEventListener( this ) );
				}
			}
		} catch( err ) {
			Debug.write( err );
		}
		
		// Callback
		if( Object.isFunction( this.callbacks['afterInit'] ) )
		{
			this.callbacks['afterInit']( this );
		}
		
		if( !this.options.hideAtStart && !this.hideAfterSetup )
		{
			this.show();
		}
		if( this.hideAfterSetup && this._startup )
		{	
			Event.stopObserving( $( this.options.attach.target ), this.eventPairs[ this.options.attach.event ], this._startup );
		}
	},
	
	updateAjax: function()
	{
		new Ajax.Request( this.options.ajaxURL,
						{
							method: 'get',
							onSuccess: function(t)
							{
								if( t.responseText != 'error' )
								{
									//Debug.write( t.responseText );
									Debug.write( "AJAX done!" );
									this.update( t.responseText );
									this.ready = true;
									
									// Callback
									if( Object.isFunction( this.callbacks['afterAjax'] ) )
									{
										this.callbacks['afterAjax']( this, t.responseText );
									}
								}
								else
								{
									Debug.write( t.responseText );
									return;
								}
							}.bind(this)
						});
	},
	
	show: function(e)
	{
		if( e ){ Event.stop(e); }
		
		if( this.timer['show'] ){
			clearTimeout( this.timer['show'] );
		}
		
		if( this.options.delay.show != 0 ){
			this.timer['show'] = setTimeout( this._show.bind( this ), this.options.delay.show );
		} else {
			this._show(); // Just show it
		}
	},
	
	hide: function(e)
	{
		if( e ){ Event.stop(e); }
		if( this.document_event ){
			Event.stopObserving( document, 'click', this.document_event );
		}
		
		if( this.timer['hide'] ){
			clearTimeout( this.timer['hide'] );
		}
				
		if( this.options.delay.hide != 0 ){
			this.timer['hide'] = setTimeout( this._hide.bind( this ), this.options.delay.hide );
		} else {
			this._hide(); // Just hide it
		}
	},
	
	_show: function()
	{		
		if( this.options.modal == false ){
			new Effect.Appear( $( this.wrapper ), { duration: 0.3, afterFinish: function(){
				if( Object.isFunction( this.callbacks['afterShow'] ) )
				{
					this.callbacks['afterShow']( this );
				}
			}.bind(this) } );
			this.document_event = this.handleDocumentClick.bindAsEventListener(this);
			Event.observe( document, 'click', this.document_event );
		} else {
			new Effect.Appear( $('document_modal'), { duration: 0.3, to: this.options.modalOpacity, afterFinish: function(){
				new Effect.Appear( $( this.wrapper ), { duration: 0.4, afterFinish: function(){
					if( Object.isFunction( this.callbacks['afterShow'] ) )
					{
						this.callbacks['afterShow']( this );
					}
			 	}.bind(this) } )
			}.bind(this) });
		}
	},
	
	_hide: function()
	{
		if( this._tmpEvent != null )
		{
			Event.stopObserving( $( this.wrapper ), 'mouseout', this._tmpEvent );
			this._tmpEvent = null;
		}
		
		if( this.options.modal == false ){
			new Effect.Fade( $( this.wrapper ), { duration: 0.3, afterFinish: function(){
				if( Object.isFunction( this.callbacks['afterHide'] ) )
				{
					this.callbacks['afterHide']( this );
				}
			}.bind(this) } );
		} else {
			new Effect.Fade( $( this.wrapper ), { duration: 0.3, afterFinish: function(){
				new Effect.Fade( $('document_modal'), { duration: 0.2, afterFinish: function(){
					if( Object.isFunction( this.callbacks['afterHide'] ) )
					{
						this.callbacks['afterHide']( this );
					}
				}.bind(this) } )
			}.bind(this) });
		}
	},
	
	handleDocumentClick: function(e)
	{
		if( !Event.element(e).descendantOf( this.wrapper ) )
		{
			this._hide(e);
		}
	},
	
	update: function( content )
	{
		this.inner.update( content );
	},
	
	setUpBalloon: function()
	{
		// Are we attaching?
		if( this.options.attach )
		{
			var attach = this.options.attach;
			
			if( attach.target && $( attach.target ) )
			{
				if( this.options.stem == true )
				{
					this.createStem();
				}
				
				// Get position
				if( !attach.position ){ attach.position = 'auto'; }
				if( Object.isUndefined( attach.offset ) ){ attach.offset = { top: 0, left: 0 } }
				if( Object.isUndefined( attach.offset.top ) ){ attach.offset.top = 0 }
				if( Object.isUndefined( attach.offset.left ) ){ attach.offset.left = 0 }
				
				if( attach.position == 'auto' )
				{
					Debug.write("Popup: auto-positioning");
					var screendims 		= document.viewport.getDimensions();
					var screenscroll 	= document.viewport.getScrollOffsets();
					var toff			= $( attach.target ).viewportOffset();
					var wrapSize 		= $( this.wrapper ).getDimensions();
					var delta 			= [0,0];
					
					if (Element.getStyle( $( attach.target ), 'position') == 'absolute')
					{
						var parent = $( attach.target ).getOffsetParent();
						delta = parent.viewportOffset();
				    }
				
					toff['left'] = toff[0] + delta[0];
					toff['top'] = toff[1] + delta[1] + screenscroll.top;
					
					//Debug.write( toff['left'] + "    " + toff['top'] );
					// Need to figure out if it will be off-screen
					var start 	= 'top';
					var end 	= 'left';
					
					//Debug.write( "Target offset top: " + toff.top + ", wrapSize Height: " + wrapSize.height + ", screenscroll top: " + screenscroll.top);
					if( ( toff.top - wrapSize.height - attach.offset.top ) < ( 0 + screenscroll.top ) ){
						var start = 'bottom';
					}
					
					if( ( toff.left + wrapSize.width - attach.offset.left ) > ( screendims.width - screenscroll.left ) ){
						var end = 'right';
					}
					
					finalPos = this.position( start + end, { target: $( attach.target ), content: $( this.wrapper ), offset: attach.offset } );
					
					if( this.options.stem == true )
					{
						finalPos = this.positionStem( start + end, finalPos );
					}
				}
				else
				{
					Debug.write("Popup: manual positioning");
					
					finalPos = this.position( attach.position, { target: $( attach.target ), content: $( this.wrapper ), offset: attach.offset } );
					
					if( this.options.stem == true )
					{
						finalPos = this.positionStem( attach.position, finalPos );
					}
				}
				
				// Add mouse events
				if( !Object.isUndefined( attach.event ) ){
					$( attach.target ).observe( attach.event, this.show.bindAsEventListener( this ) );
					
					if( attach.event != 'click' && !Object.isUndefined( this.eventPairs[ attach.event ] ) ){
						$( attach.target ).observe( this.eventPairs[ attach.event ], this.hide.bindAsEventListener( this ) );
					}
						
					$( this.wrapper ).observe( 'mouseover', this.wrapperEvent.bindAsEventListener( this ) );					
				}				
			}
		}
		
		Debug.write("Popup: Left: " + finalPos.left + "; Top: " + finalPos.top);
		$( this.wrapper ).setStyle( 'top: ' + finalPos.top + 'px; left: ' + finalPos.left + 'px; position: absolute;' );		
	},
	
	wrapperEvent: function(e)
	{
		if( this.timer['hide'] )
		{
			// Cancel event now
			clearTimeout( this.timer['hide'] );
			this.timer['hide'] = null;
			
			if( this.options.attach.event && this.options.attach.event == 'mouseover' )
			{
				// Set new event to account for mouseout of the popup,
				// but only if we don't already have one - otherwise we get
				// expontentially more event calls. Bad.
				if( this._tmpEvent == null ){
					this._tmpEvent = this.hide.bindAsEventListener( this );
					$( this.wrapper ).observe('mouseout', this._tmpEvent );
				}
			}
		}
	},
	
	positionStem: function( pos, finalPos )
	{
		var stemSize = { height: 16, width: 31 };
		var wrapStyle = {};
		var stemStyle = {};
		
		switch( pos.toLowerCase() )
		{
			case 'topleft':
				wrapStyle = { marginBottom: stemSize.height + 'px' };
				stemStyle = { bottom: -(stemSize.height) + 'px', left: '5px' };
				finalPos.left = finalPos.left - 15;
				break;
			case 'topright':
				wrapStyle = { marginBottom: stemSize.height + 'px' };
				stemStyle = { bottom: -(stemSize.height) + 'px', right: '5px' };
				finalPos.left = finalPos.left + 15;
				break;
			case 'bottomleft':
				wrapStyle = { marginTop: stemSize.height + 'px' };
				stemStyle = { top: -(stemSize.height) + 'px', left: '5px' };
				finalPos.left = finalPos.left - 15;
				break;
			case 'bottomright':
				wrapStyle = { marginTop: stemSize.height + 'px' };
				stemStyle = { top: -(stemSize.height) + 'px', right: '5px' };
				finalPos.left = finalPos.left + 15;
				break;
		}
		
		$( this.wrapper ).setStyle( wrapStyle );
		$( this.stem ).setStyle( stemStyle ).setStyle('z-index: 6000').addClassName( pos.toLowerCase() );
		
		return finalPos;
	},
	
	position: function( pos, v )
	{
		finalPos = {};
		var toff			= $( v.target ).viewportOffset();
		var tsize	 		= $( v.target ).getDimensions();
		var wrapSize 		= $( v.content ).getDimensions();
		var screenscroll 	= document.viewport.getScrollOffsets();
		var offset 			= v.offset;
		var delta			= [0,0];
		
		if (Element.getStyle( $( v.target ), 'position') == 'absolute')
		{
			var parent = $( v.target ).getOffsetParent();
			Debug.write( parent );
			delta = parent.viewportOffset();
			Debug.write( delta );
	    }
		
		toff['left'] = toff[0] + delta[0];
		toff['top'] = toff[1] + delta[1];
		
		if( !Prototype.Browser.Opera ){
			toff['top'] += screenscroll.top;
		}
		
		switch( pos.toLowerCase() )
		{
			case 'topleft':
				finalPos.top = ( toff.top - wrapSize.height - tsize.height ) - offset.top;
				finalPos.left = toff.left + offset.left;						
				break;
			case 'topright':
			 	finalPos.top = ( toff.top - wrapSize.height - tsize.height ) - offset.top;
				finalPos.left = ( toff.left - ( wrapSize.width - tsize.width ) ) - offset.left;
				break;
			case 'bottomleft':
				finalPos.top = ( toff.top + tsize.height ) + offset.top;
				finalPos.left = toff.left + offset.left;
				break;
			case 'bottomright':
				finalPos.top = ( toff.top + tsize.height ) + offset.top;
				finalPos.left = ( toff.left - ( wrapSize.width - tsize.width ) ) - offset.left;
				break;
		}
		
		return finalPos;
	},
	
	createStem: function()
	{
		this.stem = new Element('div', { id: this.id + '_stem' } ).update('&nbsp;').addClassName('stem');
		this.wrapper.insert( { top: this.stem } );
	},
	
	setUpPane: function()
	{
		// Does the document have a modal blackout?
		if( !$('document_modal') ){
			this.createDocumentModal();
		}
		
		this.positionPane();	
	},
	
	positionPane: function()
	{
		// Position it in the middle
		var elem_s = $( this.wrapper ).getDimensions();
		var window_s = document.viewport.getDimensions();
		var window_offsets = document.viewport.getScrollOffsets();

		var center = { 	left: ((window_s['width'] - elem_s['width']) / 2),
					 	top: (((window_s['height'] - elem_s['height']) / 2)/2)
					}
					
		if( center.top < 10 ){ center.top = 10; }
					
		$( this.wrapper ).setStyle('top: ' + center['top'] + 'px; left: ' + center['left'] + 'px; position: fixed;');
	},
			
	createDocumentModal: function()
	{
		var pageSize = $$('body')[0].getDimensions();
		var viewSize = document.viewport.getDimensions();
		
		var dims = [];
		
		//Debug.dir( pageSize );
		//Debug.dir( viewSize );
		
		if( viewSize['height'] < pageSize['height'] ){
			dims['height'] = pageSize['height'];
		} else {
			dims['height'] = viewSize['height'];
		}
		
		if( viewSize['width'] < pageSize['width'] ){
			dims['width'] = pageSize['width'];
		} else {
			dims['width'] = viewSize['width'];
		}
		
		var modal = new Element( 'div', { 'id': 'document_modal' } ).addClassName('modal').hide();
		modal.setStyle('width: ' + dims['width'] + 'px; height: ' + dims['height'] + 'px; position: absolute; top: 0px; left: 0px; z-index: 15000;');
		
		$$('body')[0].insert( modal );
	},
	
	getObj: function()
	{
		return $( this.wrapper );
	}
});


ips.delegate = {
	store: $A(),
	
	initialize: function()
	{
		document.observe('click', function(e){

			if( Event.isLeftClick(e) || Prototype.Browser.IE ) // IE doesnt provide isLeftClick info for click event
			{
				var elem = null;
				var handler = null;
			
				var target = ips.delegate.store.find( function(item){
					elem = e.findElement( item['selector'] );
					if( elem ){
						handler = item;
						return true;
					} else {
						return false;
					}
				});
			
				if( !Object.isUndefined( target ) )
				{				
					if( handler )
					{
						Debug.write("Firing callback for selector " + handler['selector'] );
						handler['callback']( e, elem, handler['params'] );
					}
				}
			}
        })
	},
	
	register: function( selector, callback, params )
	{
		ips.delegate.store.push( { selector: selector, callback: callback, params: params } );
	}
}
/**********************************************/

var Debug = {
	write: function( text ){
		if( jsDebug && !Object.isUndefined(window.console) ){
			console.log( text );
		}
	},
	dir: function( values ){
		if( jsDebug && !Object.isUndefined(window.console) ){
			console.dir( values );
		}
	},
	error: function( text ){
		if( jsDebug && !Object.isUndefined(window.console) ){
			console.error( text );
		}
	},
	warn: function( text ){
		if( jsDebug && !Object.isUndefined(window.console) ){
			console.warn( text );
		}
	},
	info: function( text ){
		if( jsDebug && !Object.isUndefined(window.console) ){
			console.info( text );
		}
	}
};;
							ips.menus['products'] = new ips.menu( $('nav_products'), $('nav_products_menu') );
						;;
							ips.menus['hosted'] = new ips.menu( $('nav_hosted'), $('nav_hosted_menu') );
						;;
							ips.menus['support'] = new ips.menu( $('nav_support'), $('nav_support_menu') );
						;;
		var popup = null;
		
		$('full_info').observe('click', function(e){
			Event.stop(e);
			if( $('full_info_popup') ){
				popup.show();
			} else {
				popup = new ips.popup( 'full_info', { type: 'pane', modal: true, hideAtStart: false, attach: { target: $( 'full_info' ) }, initial: $('full_info_pane').innerHTML, classname: 'addon_price_popup' });
				Cufon.refresh();
			}
		});
	;;
PostAssoc=function(){};PostAffAction=function(actionCode){if(actionCode==undefined){actionCode='';}
this.ac=actionCode;};PostAffAction.prototype.quote=function(string){var escapable=/[\\\"\/\x00-\x1f\x7f-\x9f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,meta={'\b':'\\b','\t':'\\t','\n':'\\n','\f':'\\f','\r':'\\r','"':'\\"','\\':'\\\\','/':'\\/'};escapable.lastIndex=0;return escapable.test(string)?'"'+string.replace(escapable,function(a){var c=meta[a];return typeof c==='string'?c:'\\u'+('0000'+a.charCodeAt(0).toString(16)).slice(-4);})+'"':'"'+string+'"';};PostAffAction.prototype.toString=function(){var output='';for(var property in this){var value=this[property];if(typeof value=='string'){output+='"'+property+'":'+this.quote(value)+',';}}
return'{'+output.substring(0,output.length-1)+'}';}
PostAffAction.prototype._correctString=function(value,regexp){if(typeof(value)=='undefined'){return null;}
var strValue=new String(value);strValue=strValue.replace(/,/g,".");strValue=this._removeDotButFirst(strValue);var a=new RegExp('['+regexp+']','gi');strValue=strValue.replace(a,"");strValue=strValue.replace(/^[0]+/g,"");return strValue;};PostAffAction.prototype._correctCurrency=function(valueIn){var value=this._correctString(valueIn,'^0-9\.\-');if(value.indexOf('-')==0){return'-'+this._correctString(value.substring(1),'^0-9\.');}
return this._correctString(value,'^0-9\.');};PostAffAction.prototype._removeDotButFirst=function(source){pos=source.indexOf('.');return source.substring(0,pos+1)+source.substring(pos+1).replace(/\./gi,'');}
PostAffAction.prototype._correctCommission=function(value){if(value=='0'){return value;}
value=this._correctString(value,'^\-0-9\.\%');if(value.indexOf('%')==0){return'%'+this._correctCurrency(value.substring(1));}
return this._correctCurrency(value);};PostAffAction.prototype._correctText=function(value){if(typeof value=='undefined'){return null;}
var s=new String(value);return s.toString();};PostAffAction.prototype.setTotalCost=function(value){this.t=this._correctCurrency(value);};PostAffAction.prototype.setCoupon=function(value){this.cp=this._correctText(value);};PostAffAction.prototype.setFixedCost=function(value){this.f=this._correctCurrency(value);};PostAffAction.prototype.setOrderID=function(value){this.o=this._correctText(value);};PostAffAction.prototype.setProductID=function(value){this.p=this._correctText(value);};PostAffAction.prototype.setAffiliateID=function(value){this.a=this._correctText(value);};PostAffAction.prototype.setCampaignID=function(value){this.c=this._correctText(value);};PostAffAction.prototype.setChannelID=function(value){this.ch=this._correctText(value);};PostAffAction.prototype.setCurrency=function(value){this.cr=this._correctText(value);};PostAffAction.prototype.setCustomCommission=function(value){this.cc=this._correctCommission(value);};PostAffAction.prototype.setStatus=function(value){this.s=value;};PostAffAction.prototype.setData1=function(value){this.d1=this._correctText(value);};PostAffAction.prototype.setData2=function(value){this.d2=this._correctText(value);};PostAffAction.prototype.setData3=function(value){this.d3=this._correctText(value);};PostAffAction.prototype.setData4=function(value){this.d4=this._correctText(value);};PostAffAction.prototype.setData5=function(value){this.d5=this._correctText(value);};PostAffAction.prototype.setTimeStamp=function(value){this.ts=this._correctText(value);};

PostAffAttributeWriter=function(idIn,attributeNameIn,urlParamNameIn,separatorIn){var id=idIn;var attributeName=attributeNameIn;var urlParamName=urlParamNameIn;var separator=getSeparator(separatorIn);var value;if(typeof urlParamName=='string'&&urlParamName!=''){value=new PostUrlReplacer(urlParamName,separator);}else{value=new PostValueReplacer(separator);}
function getSeparator(separatorIn){if(separatorIn==undefined||separatorIn==''){return null;}
return separatorIn;}
this.getElementsById=function(elementId){var nodes=new Array();var tmpNode=document.getElementById(elementId);while(tmpNode){nodes.push(tmpNode);tmpNode.id="";tmpNode=document.getElementById(elementId);for(var x=0;x<nodes.length;x++){if(nodes[x]==tmpNode){tmpNode=false;}}}
for(var x=0;x<nodes.length;x++){nodes[x].id=elementId;}
return nodes;};this.writeAttribute=function(valueIn){if(valueIn==null||valueIn==''){return;}
var elements=this.getElementsById(id);for(var i=0;i<elements.length;i++){switch(attributeName){case'href':elements[i].href=value.replace(elements[i].href,valueIn);break;case'value':elements[i].value=value.replace(elements[i].value,valueIn);break;case'action':elements[i].action=value.replace(elements[i].action,valueIn);break;default:elements[i].setAttribute(attributeName,value.replace(elements[i].getAttribute(attributeName),valueIn));break;}}};};PostUrlReplacer=function(urlParameterNameIn,separatorIn){var storedBefore=false;var parameterName=urlParameterNameIn;var separator=separatorIn;this.replace=function(oldValue,newValue){var url=PostAffParams.parse(oldValue);oldParamValue=url.getParamValue(parameterName);if(separator==null){url.addParam(parameterName,newValue);storedBefore=true;return url.toString();}
if(oldParamValue==undefined){oldParamValue='';}
if(storedBefore){if(oldParamValue.indexOf(separator)!=-1){oldParamValue=oldParamValue.substring(0,oldParamValue.lastIndexOf(separator));}else{oldParamValue='';}}
var newParamValue=newValue;if(oldParamValue!=''){newParamValue=oldParamValue+separator+newValue;}
if(newValue==''||newValue==undefined){newParamValue=oldParamValue;}
url.addParam(parameterName,newParamValue);storedBefore=true;return url.toString();}};PostValueReplacer=function(separatorIn){var storedBefore=false;var separator=separatorIn;this.replace=function(oldValue,newValue){if(separator==null||oldValue==''){storedBefore=true;return newValue;}
if(storedBefore){oldValue=oldValue.substring(0,oldValue.lastIndexOf(separator));}
storedBefore=true;if(newValue==''||newValue==undefined){return oldValue;}
if(oldValue==''||oldValue==undefined){return newValue;}
return oldValue+separator+newValue;}};

PostAffCookieManager=function(){var flash=null,flashVersion=null;var visitorCookie=new PostAffCookie('PAPVisitorId');var oldCookies=new PostAssoc();addOldCookie(new PostAffCookie('PAPCookie_Sale'));addOldCookie(new PostAffCookie('PAPCookie_FirstClick'));addOldCookie(new PostAffCookie('PAPCookie_LastClick'));function addOldCookie(cookie){oldCookies[cookie.name]=cookie;}
function loadOldHttpCookies(){for(var name in oldCookies){try{oldCookies[name].load();}catch(err){}}}
function getFlashVersion(){var version="",n=navigator;if(n.plugins&&n.plugins.length){for(var i=0;i<n.plugins.length;i++){if(n.plugins[i].name.indexOf('Shockwave Flash')!=-1){version=n.plugins[i].description.split('Shockwave Flash ')[1];break;}}}else if(window.ActiveXObject){for(var j=10;j>=4;j--){try{var result=eval("new ActiveXObject('ShockwaveFlash.ShockwaveFlash."
+j+"');");if(result){version=j+'.0';break;}}catch(e){}}}
return version;}
this.isFlashActive=function(){if(flashVersion==null){flashVersion=getFlashVersion();}
return!(flashVersion==""||flashVersion<5);}
this.callFlash=function(params){this.removeFlashElement();this.insertFlashElement(params);}
this.deleteOldCookies=function(){for(var name in oldCookies){try{oldCookies[name].deleteCookie();}catch(err){}}}
this.readAllFlashCookies=function(){var cookies=new Array(visitorCookie.name);var count=1;for(var id in oldCookies){cookies[count]=oldCookies[id].name;count++;}
this.readFlashCookies(cookies);}
this.loadHttpCookies=function(){loadOldHttpCookies();visitorCookie.load();}
this.removeFlashElement=function(){if(flash!=null){try{flash.parentNode.removeChild(flash);flash=null;}catch(e){}}};this.insertFlashElement=function(params){if(!this.isFlashActive()){return;}
var paramsString=params.toString();var id='papswf';var obj='<object'+((window.ActiveXObject)?' id="'+id+'" classid="clsid:D27CDB6E-AE6D-11cf-96B8-444553540000" data="'+PostAffTracker.getFlashUrl()+paramsString+'"':'');obj+=' width="1px" height="1px">';obj+='<param name="movie" value="'+PostAffTracker.getFlashUrl()+paramsString+'">';obj+='<param name="AllowScriptAccess" value="always">';obj+='<embed src="'+PostAffTracker.getFlashUrl()+paramsString+'" type="application/x-shockwave-flash" width="1px" height="1px" AllowScriptAccess="always"></embed>';obj+='</object>';flash=document.createElement("div");flash.innerHTML=obj;var scriptElement=document.getElementById(PostAffTracker.getIntegrationElementId());scriptElement.parentNode.insertBefore(flash,scriptElement.nextSibling);}
this.saveVisitorToHttpCookie=function(visitorId){PostAffCookie.setHttpCookie(visitorCookie.name,visitorId);};this.getOldCookiesSerialized=function(){var params="";for(var name in oldCookies){if(oldCookies[name].value!=''&&oldCookies[name].value!=null){params+="||"+oldCookies[name].name+"="+oldCookies[name].value;}}
return params;};this.readFlashCookies=function(cookies){var params=new PostAffParams('pap.swf');params.addParam('a','r');for(var i=0;i<cookies.length;i++){params.addParam('n'+i,cookies[i]);}
this.callFlash(params);};this.deleteFlashCookies=function(cookies){var params=new PostAffParams('pap.swf');params.addParam('a','r');for(var id in cookies){params.addParam('n'+id,cookies[id]);params.addParam('d'+id,'1');}
this.callFlash(params);};this.writeFlashCookies=function(cookies){var params=new PostAffParams('pap.swf');params.addParam('a','w');for(var i=0;i<cookies.length;i++){params.addParam('n'+i,cookies[i].name);params.addParam('v'+i,cookies[i].value);if(cookies[i].getOverwrite()=='1'){params.addParam('ne'+i,cookies[i].getOverwrite());}}
this.callFlash(params);};this.getFlashCookies=function(cookies){var cookiesArray=new PostAssoc();var cookie;var flashCookies=cookies.split('_,_');for(var i=0;i<flashCookies.length;i++){var pos=flashCookies[i].indexOf('=');if(pos<0||flashCookies[i].length==pos+1){continue;}
cookie=new PostAffCookie(flashCookies[i].substr(0,pos));cookie.value=flashCookies[i].substr(pos+1);cookiesArray[cookie.name]=cookie;}
return cookiesArray;};this.parseFlashCookies=function(cookies){this.processFlashCookies(this.getFlashCookies(cookies));};this.getVisitorCookie=function(){return visitorCookie;};this.processFlashCookie=function(cookie){if(typeof oldCookies[cookie.name]=='object'){oldCookies[cookie.name].value=cookie.value;return;}
if(cookie.name==visitorCookie.name){visitorId=visitorCookie.value=cookie.value;visitorCookie.trackingMethod='F';this.saveVisitorToHttpCookie(visitorId);}};this.getVisitorId=function(){return this.getVisitorCookie().value;}
this.getVisitorIdOrSaleCookieValue=function(){if(this.getVisitorCookie().value!=null){return this.getVisitorCookie().value;}
return oldCookies['PAPCookie_Sale'].value;}
this.writeVisitorIdToFlash=function(){var cookies=new Array();cookies[0]=visitorCookie;this.writeFlashCookies(cookies);}
this.setVisitorId=function(visitorId){visitorCookie.value=visitorId;visitorCookie.trackingMethod='';this.saveVisitorToHttpCookie(visitorId);this.writeVisitorIdToFlash();};};PostAffCookieManager.prototype.processFlashCookies=function(cookies){for(var name in cookies){this.processFlashCookie(cookies[name]);}
if(typeof cookies[this.getVisitorCookie().name]!='object'&&this.getVisitorCookie().value!=null){this.writeVisitorIdToFlash();}};PostAffParams=function(scriptName){var params=new PostAssoc();this.script=scriptName;this.addParam=function(name,value){params[name]=value;};this.getParamValue=function(name){return params[name];}
this.encodeParams=function(){var uri='?';for(var name in params){uri+=name+"="+encodeURIComponent(params[name])+"&";}
return uri.substr(0,uri.length-1);};this.toString=function(){return this.script+this.encodeParams();};};PostAffParams.parse=function(url){var parseParam;var parts=url.split('?');var params=new PostAffParams(parts[0]);if(parts.length>1){parameters=parts[1].split('&');for(var i=0;i<parameters.length;i++){parseParam=parameters[i].split('=');params.addParam(parseParam[0],parseParam[1]);}}
return params;}
PostAffParams.replaceHttpInText=function(text){text=text.replace("http://","H_");text=text.replace("https://","S_");return text;};PostAffCookie=function(name){this.name=name;this.value=null;this.trackingMethod='';var dontOverwrite='1';this.load=function(){this.value=PostAffCookie.getHttpCookie(this.name);if(this.value!=null){this.trackingMethod='1';}};this.setOverwrite=function(){dontOverwrite='0';}
this.getOverwrite=function(){return dontOverwrite;}
this.deleteCookie=function(){PostAffCookie.deleteHttpCookie(this.name);};};PostAffCookie.getHttpCookie=function(name){var value=document.cookie.match('(^|;) ?'+name+'=([^;]*)(;|$)');if(value&&value[2]!=''){return decodeURIComponent(value[2]);}
return null;};PostAffCookie.setHttpCookie=function(name,value,expired){if(expired==null){var theDate=new Date();var expired=new Date(theDate.getTime()+31536000000*10);}
document.cookie=name+'='+encodeURIComponent(value)+';expires='+expired.toGMTString()+';path=/';};PostAffCookie.deleteHttpCookie=function(name){expired=new Date(0);PostAffCookie.setHttpCookie(name,'',expired);};

PostAffRequest=function(cookieManager){this.cookieManager=cookieManager;this.sendCalled=false;this.send=function(){this.sendCalled=true;this.loadHttpCookies();if(this.cookieManager.isFlashActive()){this.cookieManager.readAllFlashCookies();var self=this;setTimeout(function(){self.callTrackScript();},1000);return;}
this.callTrackScript();};};PostAffRequest.prototype.accountId;PostAffRequest.prototype.setAccountId=function(accountIdIn){this.accountId=accountIdIn;}
PostAffRequest.prototype.loadHttpCookies=function(){this.cookieManager.loadHttpCookies();}
PostAffRequest.prototype.getTrackingParams=function(){alert("getTrackingParams parent");}
PostAffRequest.prototype.fillTrackingParams=function(){var params=this.getTrackingParams();var visitorId=this.cookieManager.getVisitorId();if(visitorId!=null&&visitorId!='null'){params.addParam('visitorId',visitorId);}
if(this.accountId!=null&&this.accountId!='null'&&this.accountId!=''){params.addParam('accountId',this.accountId);}
return params;}
PostAffRequest.prototype.callTrackScript=function(){var params=this.fillTrackingParams();var trackingScriptElement=document.createElement('script');trackingScriptElement.type='text/javascript';trackingScriptElement.src=PostAffTracker.getRequestUrl()+params.toString();scriptElement=document.getElementById(PostAffTracker.getIntegrationElementId());scriptElement.parentNode.insertBefore(trackingScriptElement,scriptElement.nextSibling);};

PostAffInfo=function(cookieManager){this.cookieManager=cookieManager;var affiliateId,campaignId,accountId;var received=false;var pendingCallbacks=new Array();this.onResponseReceived=function(){received=true;for(var i=0;i<pendingCallbacks.length;i++){pendingCallbacks[i]();}
pendingCallbacks=new Array();}
this.call=function(callback){if(received){callback();return;}
pendingCallbacks[pendingCallbacks.length]=callback;if(!this.sendCalled){this.send();}}
this.setAccountId=function(accountIdIn){this.accountId=accountIdIn;}
this.setAffiliateInfo=function(affiliateIdIn,campaignIdIn){affiliateId=affiliateIdIn;campaignId=campaignIdIn;this.onResponseReceived();}
this.getAffiliateId=function(){return affiliateId;}
this.getCampaignId=function(){return campaignId;}};PostAffInfo.prototype=new PostAffRequest;PostAffInfo.prototype.constructor=PostAffInfo;PostAffInfo.prototype.getTrackingParams=function(){return new PostAffParams("get_affinfo.php");}
PostAffInfo.prototype.fillTrackingParams=function(){var params=PostAffRequest.prototype.fillTrackingParams.call(this);return params;}
PostAffInfo.prototype.callTrackScript=function(){visitorId=this.cookieManager.getVisitorId();if(visitorId==undefined||visitorId==''){return;}
PostAffRequest.prototype.callTrackScript.call(this);}

PostAffTrackingRequest=function(cookieManager,actions,accountId){this.cookieManager=cookieManager;this.actions=actions;this.accountId=accountId;};PostAffTrackingRequest.prototype=new PostAffRequest;PostAffTrackingRequest.prototype.constructor=PostAffTrackingRequest;PostAffTrackingRequest.prototype.loadHttpCookies=function(){this.cookieManager.loadHttpCookies();this.cookieManager.deleteOldCookies();}
PostAffTrackingRequest.prototype.getTrackingParams=function(){return new PostAffParams("track.php");}
PostAffTrackingRequest.prototype.fillTrackingParams=function(){var params=PostAffRequest.prototype.fillTrackingParams.call(this);var visitorId=this.cookieManager.getVisitorId();if(visitorId!=null&&visitorId!='null'){params.addParam('tracking',this.cookieManager.getVisitorCookie().trackingMethod);}
params.addParam('url',PostAffParams.replaceHttpInText(window.location.protocol+"//"+window.location.host+"/"+window.location.pathname));params.addParam('referrer',PostAffParams.replaceHttpInText(document.referrer));params.addParam('getParams',PostAffTrackingRequest.getGetParams().toString());params.addParam('anchor',document.location.hash.substring(1));if(this.accountId!=undefined){params.addParam('accountId',this.accountId);}
if(typeof this.actions=="object"&&this.actions.length>0){var sale='';for(var i=0;i<this.actions.length;i++){sale+=this.actions[i].toString()+',';}
params.addParam('sale','['+sale.substring(0,sale.length-1)+']');}
params.addParam('cookies',this.cookieManager.getOldCookiesSerialized());return params;}
PostAffTrackingRequest.getGetParams=function(){var getParams=PostAffParams.parse(document.location.search);if(typeof AffiliateID=='string'){getParams.addParam('AffiliateID',AffiliateID);}
if(typeof BannerID=='string'){getParams.addParam('BannerID',BannerID);}
if(typeof CampaignID=='string'){getParams.addParam('CampaignID',CampaignID);}
if(typeof Channel=='string'){getParams.addParam('Channel',Channel);}
if(typeof Data1=='string'){getParams.addParam('pd1',Data1);}
if(typeof Data2=='string'){getParams.addParam('pd2',Data2);}
return getParams;}

var PostAffTracker=new function(){var integrationElementId='pap_x2s6df8d';var flashUrl,requestUrl;this._cmanager=new PostAffCookieManager();var affInfo=new PostAffInfo(this._cmanager);var separator;var actionObjects=new Array();var accountId;function computeUrl(){var url=new String(document.getElementById(integrationElementId).src);flashUrl=requestUrl=url.substr(0,url.lastIndexOf('/')+1);}
computeUrl();function writeValueToAttribute(value,id,attributeName,urlParamName,separator){var writer=new PostAffAttributeWriter(id,attributeName,urlParamName,separator);writer.writeAttribute(value);}
this.getIntegrationElementId=function(){return integrationElementId;}
this.getRequestUrl=function(){return requestUrl;}
this.getFlashUrl=function(){return flashUrl;}
this.setRequestUrl=function(url){requestUrl=url;}
this.setAccountId=function(value){accountId=value;};this.track=function(){var request=new PostAffTrackingRequest(this._cmanager,actionObjects,accountId);request.send();actionObjects=new Array();};this.register=function(){return this.track();};this.createAction=function(actionCode){var obj=new PostAffAction(actionCode);actionObjects[actionObjects.length]=obj;return obj;};this.createSale=function(){return this.createAction();};this.notifySale=function(){return this.writeVisitorIdToAttribute('pap_dx8vc2s5','value');};this.writeVisitorIdToAttribute=function(id,attributeName,urlParamName,separatorIn){this._cmanager.loadHttpCookies();var writer=new PostAffAttributeWriter(id,attributeName,urlParamName,this._getSeparator(separatorIn));writer.writeAttribute(this._getAccountId()+this._cmanager.getVisitorIdOrSaleCookieValue());if(!this._cmanager.isFlashActive()){return;}
this._cmanager.readAllFlashCookies();var self=this;setTimeout(function(){writer.writeAttribute(self._getAccountId()+self._cmanager.getVisitorIdOrSaleCookieValue());},1000);};this.writeCookieToCustomField=function(id,separatorIn){this.writeVisitorIdToAttribute(id,'value',null,separatorIn);};this.writeCookieToLink=function(id,urlParamName,separatorIn){this.writeVisitorIdToAttribute(id,'href',urlParamName,separatorIn);};this.setVisitorId=function(id){this._cmanager.setVisitorId(id);};this.writeAffiliateToCustomField=function(id){affInfo.setAccountId(this._getAccountId());affInfo.call(function(){writeValueToAttribute(affInfo.getAffiliateId(),id,'value',null,separator);});};this.writeCampaignToCustomField=function(id){affInfo.setAccountId(this._getAccountId());affInfo.call(function(){writeValueToAttribute(affInfo.getCampaignId(),id,'value',null,separator);});};this.writeAffiliateToLink=function(id,urlParamName,separatorIn){var localSeparator=this._getSeparator(separatorIn);affInfo.setAccountId(this._getAccountId());affInfo.call(function(){writeValueToAttribute(affInfo.getAffiliateId(),id,'href',urlParamName,localSeparator);});};this._setAffiliateInfo=function(affiliateId,campaignId){affInfo.setAffiliateInfo(affiliateId,campaignId);};this._getSeparator=function(separatorIn){if(separatorIn==null||separatorIn==undefined||separatorIn==''){return separator;}
return separatorIn;};this._getAccountId=function(){if(accountId!=undefined&&accountId!=null){return accountId;}
return'';}
this._processFlashCookies=function(cookies){this._cmanager.parseFlashCookies(cookies);};this.setAppendValuesToField=function(separatorIn){return separator=separatorIn;};};function rpap(cookies){PostAffTracker._processFlashCookies(cookies);}
function setVisitor(v){PostAffTracker.setVisitorId(v);}
function setAffiliateInfo(userId,campaignId){PostAffTracker._setAffiliateInfo(userId,campaignId);}
function papTrack(){PostAffTracker.track();}

;;
<!--
papTrack();
//-->
;;