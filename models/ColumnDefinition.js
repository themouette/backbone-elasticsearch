// define a field search
define([
    'underscore',
    'backbone'
], function (_, Backbone) {
    var ColumnDefinition = Backbone.Model.extend({
        idAttribute: 'fieldname',
        defaults: {
            // title
            title: null,
            // field
            fieldname: null,
            // script_field
            script_field: null,
            // sort order
            order_by: null,
            // enable
            enabled: true,
            // displayed
            display: true,
            // classname to use for column
            classname: null,
            // format value
            format: _.identity
        },

        initialize: function() {
            if (!this.has('title')) {
                this.set('title', this.get('fieldname'));
            }
            if (!this.has('classname')) {
                this.set('classname', this.get('fieldname'));
            }
            this.on('error', function() {console.log(arguments);});
        },

        validate: function (attrs) {
            // validate the filter can be displayed
            if (!attrs.fieldname) {
                return "a fieldname is required";
            }
            if (attrs.order_by && (-1 === _.indexOf([
                                        ColumnDefinition.SORT_ASC,
                                        ColumnDefinition.SORT_DESC
                                    ], attrs.order_by))) {
                return _.template('unknown sort order"<%= sort %>"', {sort: attrs.order_by});
            }
        },

        /////////////////////////////////////////////////////
        // Query related
        // -------------
        /////////////////////////////////////////////////////

        computeFieldscriptRequest: function () {
            if (!this.isEnabled()) {
                return null;
            }
            return {"script": this.get('script_field')};
        },

        computeFieldRequest: function () {
            if (!this.isEnabled()) {
                return null;
            }
            return this.getFieldname();
        },

        computeSortRequest: function () {
           var sort = {};
            sort[this.getFieldname()] = this.getOrderBy();
            return sort;
        },

        /////////////////////////////////////////////////////
        // Order by
        // --------
        /////////////////////////////////////////////////////

        isSorted: function () {
            return this.has('order_by');
        },

        resetOrderBy: function (options) {
            this.set('order_by', null, options || {});
            return this;
        },

        toggleSort: function () {
            switch(this.get('order_by') || ColumnDefinition.SORT_DESC) {
                case ColumnDefinition.SORT_ASC:
                    this.orderBy(ColumnDefinition.SORT_DESC);
                    break;
                case ColumnDefinition.SORT_DESC:
                default:
                    this.orderBy(ColumnDefinition.SORT_ASC);
                    break;
            }
        },

        orderBy: function (order) {
            this.set('order_by', order);
            return this;
        },

        /////////////////////////////////////////////////////
        // Accessors
        // ---------
        /////////////////////////////////////////////////////

        // return fieldname
        getFieldname: function () {
            return this.get('fieldname');
        },
        // return OrderBy
        getOrderBy: function () {
            return this.get('order_by');
        },
        isDisplayed: function () {
            var display = this.get('display');
            return _.isFunction(display) ? display() : display;
        },
        isEnabled: function () {
            var enabled = this.get('enabled');
            return _.isFunction(enabled) ? enabled() : enabled;
        },
        isScriptField: function () {
            return this.has('script_field');
        }
    });

    _.extend(ColumnDefinition, {
        SORT_ASC: 'asc',
        SORT_DESC: 'desc'
    });
    return ColumnDefinition;
});

