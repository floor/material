
/**
 * Element options
 */
module.exports = {
	name: 'layout',
	prefix: 'ui',
	component:['body'],

	tag: 'div',

	settings: {
		list: {
		 	width: 320
		},
		navi: {
			width: 230,
			display: "normalized"
		}
	},
	resizer: {
		modifier: {
			row: {
				size: 'width',
				from: 'left',
				mode: {
					y: false
				}
			},
			column: {
				size: 'height',
				from: 'top',
				mode: {
					x: false
				}
			}
		}
	}
};
