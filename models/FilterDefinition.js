// define a model to handle filter definition.
// this definition handles all the filter, facet and parsing required for
// an elasticsearch and manipulation
//
// 1. Options
// 2. Convert formats
// 3. Choice manipulation
// 4. Ui related
// 5. Query related
define([
    'underscore',
    'backbone',
    'bb-es/exception'
], function (_, Backbone, Exception) {

    var messages = {
        please_implement_me: 'Please implement this method'
    };

    function template(object, fieldname) {
        if (_.isFunction(object.get(fieldname))) {
            return object.get(fieldname);
        }
        // this is not a template, let's compile
        object.set(fieldname, _.tempalte(object.get(fieldname)));
        return object.get(fieldname);
    }

    var FilterDefinition = Backbone.Model.extend({

        idAttribute: 'fieldname',

        /////////////////////////////////////////////////////
        // Options
        // -------
        /////////////////////////////////////////////////////

        defaults: {
            // humanize template.
            // function (facet) or string
            humanizeTpl: _.template('<%= facet %>'),
            // store available facets in a collection
            available_facets: null,
            // selected facets ids
            selected_facets: null,
            // can the filter be expanded
            expandable: true,
            // can the filter be collapsed
            collapsible: true,
            // the fieldname
            fieldname: null,
            // does the filter allow multiple filter
            multiple: true,
            // label for field
            placeholder: null,
            // prefix for humanized
            prefix: '',
            // suffix for humanized
            suffix: '',
            // enable filter
            enabled: true,
            // is there more ?
            total_facet_count: 0,
            // is there more ?
            total_results_count: 0,
            // others count
            other: 0,
            // default operator for multi filter selection
            defaultMultiCriterionOperator: 'or',
            // format facet function
            format: _.identity
        },

        initialize: function () {
            _.bindAll(this,
                'parseQueryResponse', 'updateFacets',
                'getChoices', 'getSelectedChoices',
                'convertIdToFacet', 'convertFacetToId',
                'convertIdToFilter', 'isEnabled'
            );

            if (!this.has('placeholder')) {
                this.set('placeholder', this.getFieldname());
            }

            this.set('available_facets', new Backbone.Collection());
            this.set('selected_facets', []);
            this.set('facet_cache', new Backbone.Collection());

            this.get('available_facets').on('reset', function() {
                this.trigger('change:available_facets');
            }, this);
        },

        validate: function (attrs) {
            // validate the filter can be displayed
            if (!attrs.expandable && !attrs.collapsible) {
                return "This filter cannot be displayed";
            }
            if (!attrs.fieldname) {
                return "a fieldname is required";
            }
        },


        /////////////////////////////////////////////////////
        // Convert formats
        // ---------------
        //
        // override `doConvert*` methods to handle your own
        // conversion logic.
        /////////////////////////////////////////////////////

        // returns facet from given facet unique id
        convertIdToFacet: function (id) {
            var internalConverter = function (facet_id) {
                return this.doConvertIdToFacet(facet_id) || this.retrieveFromCache(facet_id);
            };
            if (id instanceof Backbone.Collection) {
                return id.map(internalConverter, this);
            }
            if (_.isArray(id)) {
                return _.map(id, internalConverter, this);
            }
            return internalConverter.call(this, id);
        },
        // returns facet unique id from given facet
        convertFacetToId: function (facet) {
            if (facet instanceof Backbone.Collection) {
                return facet.map(this.doConvertFacetToId, this);
            }
            if (_.isArray(facet)) {
                return _.map(facet, this.doConvertFacetToId, this);
            }
            return this.doConvertFacetToId(facet);
        },
        // returns filter from given facet unique id
        convertIdToFilter: function (id) {
            if (id instanceof Backbone.Collection) {
                return id.map(this.doConvertIdToFilter, this);
            }
            if (_.isArray(id)) {
                return _.map(id, this.doConvertIdToFilter, this);
            }
            return this.doConvertIdToFilter(id);
        },
        // returns facet value from given filter
        convertFacetToFilter: function (facet) {
            if (facet instanceof Backbone.Collection) {
                return facet.map(this.doConvertFacetToFilter, this);
            }
            if (_.isArray(facet)) {
                return _.map(facet, this.doConvertFacetToFilter, this);
            }
            return this.doConvertFacetToFilter(facet);
        },
        // returns id value from given filter
        convertFilterToId: function (filters) {
            if (filters instanceof Backbone.Collection) {
                return filters.map(this.doConvertFilterToId, this);
            }
            if (_.isArray(filters)) {
                return _.map(filters, this.doConvertFilterToId, this);
            }
            return this.doConvertFilterToId(filters);
        },
        // returns a human readable filter value
        humanizeFacet: function(facet) {
            if (facet instanceof Backbone.Collection) {
                return facet.map(this.doHumanizeFacet, this);
            }
            if (_.isArray(facet)) {
                return _.map(facet, this.doHumanizeFacet, this);
            }
            return this.doHumanizeFacet(facet);
        },

        // extend following functions to handle your own filter logic
        doConvertFacetToId: function(facet) { return facet; },
        doConvertIdToFacet: function(id) { return id; },
        doConvertIdToFilter: function(id) {
            return this.doConvertFacetToFilter(this.doConvertIdToFacet(id));
        },
        doConvertFacetToFilter: function(facet) { return facet; },
        doConvertFilterToId: function(filter) { return filter; },
        doHumanizeFacet: function(facet) {
            var data = facet.toJSON();
            // extend data
            data.mute = !data.count;
            data.match_all = this.matchAllResults(facet, data);
            data.prefix = this.get('prefix') || '';
            data.suffix = this.get('suffix') || '';
            data.term = (this.get('format') || _.identity)(data.term);
            return template(this, 'humanizeTpl')(data);
        },

        matchAllResults: function (facet, data) {
            if (data.count !== this.get('total_results_count')) {
                return false;
            }

            // there is as much results as the total
            var id = this.doConvertFacetToId(facet);
            // it matches all results if no facet are selected for this filter
            return !this.getSelectedIds().length;
        },

        /////////////////////////////////////////////////////
        // Choice manipulation
        // -------------------
        //
        // choice manipulation api is defined here
        /////////////////////////////////////////////////////

        // retrun all available choices for this filter definition
        getChoices: function() {
            var facets = this.getAvailableFacets();
            return facets.map(this.formatChoiceFromFacet, this);
        },

        // format a facet
        formatChoiceFromFacet: function (facet) {
            var id = this.convertFacetToId(facet);
            return {
                id: id,
                text: this.humanizeFacet(facet),
                count: facet.get('count') || 0,
                selected: this.isIdSelected(id)
            };
        },

        isIdSelected: function (id) {
          return (-1 !== _.indexOf(this.getSelectedIds(), id));
        },

        // return choices that are currently selected
        getSelectedChoices: function() {
            var facets = this.getSelectedFacets();
            return facets.map(this.formatChoiceFromFacet, this);
        },

        getSelectedIds: function () {
            return this.convertFilterToId(this.getSelectedFilters());
        },

        // returns a collection of selected facets
        getSelectedFacets: function () {
            var selected_ids = this.getSelectedIds();
            selected_ids = this.convertIdToFacet(selected_id);
            return new Backbone.Collection(selected_ids);
        },

        getSelectedFilters: function () {
            return this.get('selected_facets');
        },

        getAvailableFacets: function () {
            return this.get('available_facets');
        },

        selectAll: function (filters, options) {
            var ids = this.convertFilterToId(filters);
            this.setFacetCache(ids);
            this.set('selected_facets', filters, options);
            return this;
        },

        unselectAll: function (options) {
            this.clearFacetCache();
            this.set('selected_facets', [], options);
            return this;
        },

        // cache management
        setFacetCache: function (ids) {
            var facets = _.map(ids, function (id) {
                var facet = this.convertIdToFacet(id);
                if (facet) {
                    facet.set({
                        count: 0,
                        id: id
                    });
                }
                return facet;
            }, this);
            this.get('facet_cache').reset(facets);
        },
        clearFacetCache: function () {
            this.get('facet_cache').reset();
        },
        retrieveFromCache: function (id) {
            return this.get('facet_cache').get(id);
        },

        /////////////////////////////////////////////////////
        // Ui related
        // ----------
        /////////////////////////////////////////////////////

        isExpandable: function () {
            return this.get('expandable');
        },

        isCollapsible: function () {
            return this.get('collapsible');
        },

        /////////////////////////////////////////////////////
        // Query related
        // -------------
        /////////////////////////////////////////////////////

        // compute filter parameter for
        // selected facets
        computeFilterQuery: function() {
            if (!this.isEnabled()) {
                return null;
            }

            var filters = this.getSelectedFilters();

            if (filters.length < 1) {
                // no selected filter,
                // no need to change
                return null;
            } else if (filters.length > 1) {
                // several filterss
                // it's an or filter
                var f = {};
                f[this.get('defaultMultiCriterionOperator')] = _.compact(filters.map(this.doComputeQueryFilter, this));
                if (!f[this.get('defaultMultiCriterionOperator')].length) {
                    return null;
                }
                return f;
            }

            return this.doComputeQueryFilter(_.first(filters));
        },
        doComputeFilterQuery: function (filter) { throw new Exception(messages.please_implement_me); },

        computeFacetFilter: function () {
            var f = this.computeFilterQuery();
            return f;
        },

        // update facet query to request facets for this field definition
        computeFacetQuery: function(filters) {
            if (!this.isEnabled()) {
                return null;
            }
            return this.doComputeFacetQuery(filters);
        },
        doComputeFacetQuery: function (filters) { throw new Exception(messages.please_implement_me); },

        // parse result and store facets localy
        parseQueryResponse: function (response, xhr) {
            if (!this.isEnabled()) {
                this.set('total_results_count', 0);
                this.set('total_facet_count', 0);
                return [];
            }
            this.set('total_results_count', response.hits.total);
            return this.doParseQueryResponse(response, xhr);
        },

        doParseQueryResponse: function (response, xhr) {
            return response.facets[this.getFieldname()];
        },

        updateFacets: function (facets) {
            this.get('available_facets').reset(facets);
        },

        /////////////////////////////////////////////////////
        // Accessors
        // ---------
        /////////////////////////////////////////////////////

        // return fieldname
        getFieldname: function () {
            return this.get('fieldname');
        },

        isMultiple: function () {
            return this.get('multiple');
        },

        // return the facet label
        getPlaceholder: function () {
            return this.get('placeholder');
        },

        isEnabled: function () {
            var enabled = this.get('enabled');
            return _.isFunction(enabled) ? enabled() : enabled;
        },

        hasMore: function () {
            return this.get('total_facet_count') > this.getAvailableFacets().length;
        }
    });

    return FilterDefinition;
});

