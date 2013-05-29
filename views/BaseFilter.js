define([
    'underscore',
    'backbone'
], function (_, Backbone) {

    var BaseFilter = Backbone.View.extend({
        initialize: function () {
            _.bindAll(this, 'render', 'remove');

            this.selector = 'input[name='+ this.getFieldname() +']';

            this.model.on('change:available_facets', this.render);
        },

        // return associated filer fieldname
        getFieldname: function() {
            return this.model.getFieldname();
        },
        isMultiple: function () {
            return this.model.isMultiple();
        },

        // return the facet label
        getPlaceholder: function () {
            return this.model.getPlaceholder();
        },

        // return the selected facet value
        getValue: function () {
            var value = "", filters = this.model.getSelectedFilters();
            if (!filters || !filters.length) {
                value = "";
            } else if (this.isMultiple()) {
                value = this.model.convertFilterToId(filters);
            } else {
                value = this.model.convertFilterToId(_.first(filters));
            }
            return value;
        }
    });

    return BaseFilter;
});
