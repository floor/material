/**
 * Select View Class
 *
 * @class View.Select
 * @author Jerome Vial
 */
define([
	'utils/DOM'
], function (
	DOM
) {

	var exports = new Class({

		/**
		 * [_selectItem description]
		 * @param  {[type]} item [description]
		 * @return {[type]}      [description]
		 */
		_selectItem: function(item) {

			if (this.item)
				this.item.removeClass('is-selected');

			item.addClass('is-selected');

			this.item = item;
		},


		/**
		 * 
		 */
		 selectByID: function(id) {
		 	//_log.debug('selectByID', id);

		 	if (!id) return;

		 	var item = this.content.getElement('[data-id="'+id+'"]');

			if (!item) return;

			if (this.item)
				this.item.removeClass('is-selected');

			this.item = item;
			item.addClass('is-selected');

			//_log.debug(item, id);

			minimal.settings.set('view.list.selected', id);
			minimal.settings.save();
		},


		/**
		 * [_onClickElement description]
		 * @param  {[type]} ev [description]
		 * @return {[type]}    [description]
		 */
		_onClickElement: function(ev) {
			//_log.debug('_onClickElement', ev.target);
			if (this.item)
				this.item.removeClass('is-selected');

			var item = DOM.getAttrFirst(ev.target, 'data-id');

			//_log.debug(item);

			if (!item) {
				_log.debug('error! no item selected');
				return;
			}

			this.fireEvent('userSelect');

			var id = item.get('data-id');
			this.id = id;
			this.item = item;
			item.addClass('is-selected');
			this.fireEvent('select', couch.doc[id]);

			minimal.settings.set('view.list.selected', id);
			minimal.settings.save();

			//this.fireEvent('settings', ['selected', item]);
		},


		/**
		 * [_onClickElement description]
		 * @param  {[type]} ev [description]
		 * @return {[type]}    [description]
		 */
		_onDblClickElement: function(ev) {
			//_log.debug('dclick', ev.target);
			if (this.item)
				this.item.removeClass('is-selected');

			var item = DOM.getAttrFirst(ev.target, 'data-id');

			if (!item) return;

			this.fireEvent('userSelect');

			this.item = item;
			item.addClass('is-selected');
			this.fireEvent('select', item.retrieve('info'));

			if (item.get('data-node') == "true")
				this.fireEvent('openNode', item.get('data-id'));
			else this.fireEvent('open', item.get('data-id'));

			//this.fireEvent('settings', ['selected', item]);
		},


		/**
		 * [unselect description]
		 * @return {[type]} [description]
		 */
		unselect: function() {
			this.item.removeClass('is-selected');
			this.id = null;
			this.item = null;
		},


		/**
		 * [next description]
		 * @return {Function} [description]
		 */
		next: function(ev) {
			_log.debug('next', this.list.length);
			var array = this.list,
				next;

			var index = array.indexOf(this.id);
			
			if(index >= 0 && index < array.length - 1)
			   next = array[index + 1];

			if (!next) return;

			var item = this.content.getElement('[data-id="'+next+'"]')

			if (!item) return;

			var scrolltop = this.content.scrollTop;


			this._selectItem(item);

			this.id = next;

			var coord = item.getCoordinates(this.content);
			var top = item.getStyle('top').toInt();

			var offset = this.size.y - coord.height;

			if (top > scrolltop + offset) {
				this.content.scrollTop = top - offset;
			}

			// _log.debug(this.content.scrollTop, coord.height);

			// var first = parseInt(this.content.scrollTop / 57) - 6;

			// _log.debug('first', first, first < 0 ? 0 : first);

	  //    	this.virtualList._renderChunk(this.content, first < 0 ? 0 : first);


			var event = new Event('scroll');
			this.content.dispatchEvent(event);


			this.fireEvent('select', couch.doc[next]);
		},

		/**
		 * [previous description]
		 * @return {[type]} [description]
		 */
		previous: function(ev) {

			var array = this.list,
				previous;

			var index = array.indexOf(this.id);

			if(index >= 0 && index < array.length)
			   previous = array[index - 1];

			if (!previous) return;

			var item = this.content.getElement('[data-id="'+previous+'"]')

			if (!item) return;

			this.id = previous;

			this._selectItem(item);
			var offset = 0;

			var coord = item.getCoordinates(this.content);
			var top = item.getStyle('top').toInt();

			if (top < this.content.scrollTop) {
			 	this.content.scrollTop = top - offset;
			}
		
			//_log.debug(this.content.scrollTop, coord.height);

			var first = parseInt(this.content.scrollTop / 57) - 6;

			//_log.debug('first', first, first < 0 ? 0 : first);

			var event = new Event('scroll');
			this.content.dispatchEvent(event);

	     	//this.surface._renderChunk(this.content, first < 0 ? 0 : first);	
		

			this.fireEvent('select', couch.doc[previous]);
		}
	});

	return exports;
});
