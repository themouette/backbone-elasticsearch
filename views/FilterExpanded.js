define([
    'tpl!../templates/FilterExpanded.html',
    'tpl!../templates/FilterItemCheckbox.html',
    'tpl!../templates/FilterItemRadio.html',
    'underscore',
    './BaseFilter'
], function (tpl, checkboxTpl, radioTpl, _, BaseView) {

    var FilterExpanded = BaseView.extend({
        className: 'filter-box-expanded control-group',

        events: {
            'change input': 'onChange'
        },

        initialize: function () {
            BaseView.prototype.initialize.call(this);
            _.bindAll(this, 'onChange');
            this.selector = 'input[name='+ this.getFieldname() +']';
        },

        render: function () {
            this.$el.html(tpl(this.getTemplateValues()));
            return this;
        },

        getTemplateValues: function() {
            return {
                fieldname: this.getFieldname(),
                placeholder: this.getPlaceholder(),
                value: this.getValue(),
                disabled: !this.model.isEnabled(),
                itemTemplate: this.isMultiple() ? checkboxTpl : radioTpl,
                choices: this.model.getChoices()
            };
        },

        onChange: function (event) {
            var checked = this.$(':checked');
            var vals = _.map(checked, function (item) {return $(item).val();});
            this.model.selectAll(this.model.convertIdToFilter(vals));
        }
    });

    return FilterExpanded;
});
