define([
    'tpl!bb-es/templates/FilterCollapsed.html',
    'underscore',
    'bb-es/views/BaseFilter',
    'select2'
], function (tpl, _, BaseView) {

    var separator = '|';
    var FilterCollapsed = BaseView.extend({

        className: 'filter-box-collapsed control-group',

        initialize: function () {
            BaseView.prototype.initialize.call(this);
            _.bindAll(this, 'onValueChange');
            this.selector = 'input[name='+ this.getFieldname() +']';
        },

        render: function () {
            this.$el.html(tpl(this.getTemplateValues()));
            this.attachUi();
            return this;
        },

        delegateEvents: function () {
            BaseView.prototype.delegateEvents.apply(this, arguments);
            this.attachUi();
        },

        undelegateEvents: function () {
            this.detachUi();
            BaseView.prototype.undelegateEvents.apply(this, arguments);
        },

        attachUi: function () {
            var self = this;

            this.$(this.selector).select2({
                    allowClear: true,
                    separator: separator,
                    initSelection: function (element, callback) {
                        var val;
                        if (!element.val().length) {
                            val = self.model.getSelectedChoices();
                        } else {
                            val = element.val().split(separator);
                            val = self.model.convertIdToFacet(val);
                            val = _.map(val, self.model.formatChoiceFromFacet, self.model);
                        }
                        if (self.isMultiple()) {
                            return callback(val);
                        }
                        return callback(_.first(val));
                    },
                    multiple: this.isMultiple(),
                    /*
                    query: function (query) {
                        if (!query.term.length) { query.callback({results: []}); return;}
                        query.callback({
                            results: [{
                                id: this.normalizeValue(query.term),
                                text: this.humanizeValue(query.term)
                            }]
                        });
                    },*/
                    data: this.model.getChoices()
                }).on('change', this.onValueChange);
        },

        detachUi: function () {
            this.$(this.selector)
                .off('change', this.onValueChange)
                .select2('destroy');
        },

        // parse the change event arguments to get value
        onValueChange: function (event) {
            var val = $(this.selector).select2('val');
            // ensure this is an array
            if (!_.isArray(val)) {
                val = val ? [val] : [];
            }

            //and set value
            this.model.selectAll(this.model.convertIdToFilter(val));
        },

        getValue: function () {
            value = BaseView.prototype.getValue.call(this);
            if (_.isArray(value)) {
                return value.join(separator);
            }
            return value;
        },

        getTemplateValues: function() {
            return {
                fieldname: this.getFieldname(),
                placeholder: this.getPlaceholder(),
                value: this.getValue(),
                disabled: !this.model.isEnabled(),
                has_more: this.model.hasMore(),
                count: this.model.get('total_facet_count')
            };
        },

        fetchAll: function () {
        }
    });

    return FilterCollapsed;
});
