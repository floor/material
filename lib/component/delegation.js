

module.exports = {

    /**
     * [delegate description]
     * @param  {string} event    [description]
     * @param  {string} selector [description]
     * @param  {Function} handle   [description]
     */
	delegate(event, selector, handle){
        var self = this.element;

        var delegation = self._delegation || (self._delegation = {});
        var events = delegation[event] || (delegation[event] = {});
        var map = (events[selector] || (events[selector] = new Map));

        if (map.get(handle)) return;

        var action = function(e){
            var target = $(e.target || e.srcElement);
            var match = target.matches(selector) ? target : target.parent(selector);

            var res;

            if (match) res = handle.call(self, e, match);

            return res;
        };

        map.set(handle, action);

        self.on(event, action);
    }
};
