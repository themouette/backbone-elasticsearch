define([
    'underscore',
    'backbone'
], function (_, Backbone) {

    var QueryBuilder = function (options) {
        options || (options = {});
        this.options = _.defaults(options, this.defaults);
        this.initialize.call(this);
    };

    _.extend(QueryBuilder.prototype, {
        // default options for query parameter computation
        // possible options are:
        // - `includeFacets`: (bool), default `true`, should facets be request too
        // - `includeFields`: (bool), default `true`, should fields filter be used
        defaults: {
            includeFacets: true,
            includeFields: true,
            includeFilters: true
        },

        initialize: function () {
        },

        // create the request body for given query,
        buildSearch: function (query, defaults) {
            var request = _.clone(defaults || {});
            request = this.updateRequestForQuery(query, request);
            request = this.updateRequestForFields(query, request);
            request = this.updateRequestForFacets(query, request);
            request = this.updateRequestForFilters(query, request);
            return request;
        },

        buildFacetSearch: function (facet, query, defaults) {
            request = _.clone(defaults || {});
            facet = _.isObject(facet) ? facet : query.getFacet(facet);
            var filter = this.buildFilter(query, [facet.getFieldname()]);
            request =  this.updateRequestForFacet(facet, request, filter);
            request = this.updateRequestForFacets(query, request);
            return request;
        },

        updateRequestForQuery: function (query, request) {
            var term = query.getQuery();
            // ensure request.query is created
            request.query || (request.query = {});
            if (!term || 0 === term.length) {
                _.extend(request.query, { "match_all": {} });
            } else if (_.isString(term)) {
                _.extend(request.query, { "match": { "_all": term } });
            } else if (_.isArray(term)) {
                _.extend(request.query, { "terms": { "_all": term } });
            } else if (_.isObject(term)) {
                _.extend(request.query, term);
            } else {
                throw new Exception(messages.unable_to_parse_query);
            }

            return request;
        },

        // update facets field
        updateRequestForFacets: function (query, request) {
            if (!this.options.includeFacets) {
                return request;
            }
            return query.getFacets().reduce(function (request, facet) {
                var filter = this.buildFilterForFacet(query, [facet.getFieldname()]);
                return this.updateRequestForFacet(facet, request, filter);
            }, request, this);
        },

        updateRequestForFacet: function (facet, request, filter) {
            // ensure filter can be used directly
            if (1 === filter.length) {
                // only one, this is a simple filter
                filter = _.first(filter);
            } else if(filter.length) {
                // multiple filters ? that's an "and"
                filter = { and: filter};
            } else if (!_.isObject(filter) || _.isEmpty(filter)) {
                // no filter...
                filter = null;
            }
            var q = facet.computeFacetQuery(filter);
            if (q) {
                // first ensure facets key is present
                request.facets || (request.facets = {});
                request.facets[facet.getFieldname()] = q;
            }
            return request;
        },

        // update field related request
        // that mean "sort", "fields" and "script fields" request keys
        // this only impact returned results
        updateRequestForFields: function (query, request) {
            if (!this.options.includeFields) {
                return request;
            }
            return query.getFields().reduce(function (request, field, index) {
                return this.updateRequestForField(field, request);
            }, request, this);
        },

        updateRequestForField: function (field, request) {
            var q;
            if (field.isScriptField() && (q = field.computeFieldscriptRequest())) {
                // set script fields property
                request.script_fields || (request.script_fields = []);
                request.script_fields[field.getFieldname()] = q;
            } else if (q = field.computeFieldRequest()) {
                // set fields property
                request.fields || (request.fields = []);
                request.fields.push(q);
            }
            // set sort property
            if (field.isSorted() && (q = field.computeSortRequest()) ) {
                request.sort || (request.sort = []);
                request.sort.push(q);
            }
            return request;
        },

        // update request with filter part.
        // filter is append to "filter" request key.
        // this filter does not impact facet search
        updateRequestForFilters: function (query, request) {
            if (!this.options.includeFilters) {
                return request;
            }

            var filter = this.buildFilter(query, []);

            if (filter.length) {
                // first define the filter key
                request.filter || (request.filter = {});
                if (1 === filter.length) {
                    request.filter = _.extend(request.filter, _.first(filter));
                } else {
                    request.filter.and || (request.filter.and = []);
                    request.filter.and = _.union(request.filter.and, filter);
                }
            }

            return request;
        },

        // build a filter object for all facet filters
        // in query.
        // ir returns an array of filters thant can be
        // used the way you want (or, and, _.extend...)
        buildFilterForFacet: function (query, excludes) {
            excludes || (excludes = []);
            // enque all facet filter in an array
            return query.getFacets().reduce(function (filters, facet) {
                return this.buildFacetFilterForFacet(filters, facet, excludes);
            }, [], this);
        },

        buildFacetFilterForFacet: function(filters, facet, excludes) {
            // if facet is not excluded
            if (-1 === _.indexOf(excludes, facet.getFieldname())) {
                var f = facet.computeFacetFilter();
                if (f) {
                    filters.push(f);
                }
            }
            return filters;
        },

        // build a filter object for all facet filters
        // in query.
        // ir returns an array of filters thant can be
        // used the way you want (or, and, _.extend...)
        buildFilter: function (query, excludes) {
            excludes || (excludes = []);
            // enque all facet filter in an array
            return query.getFacets().reduce(function (filters, facet) {
                return this.buildFacetFilter(filters, facet, excludes);
            }, [], this);
        },

        buildFacetFilter: function(filters, facet, excludes) {
            // if facet is not excluded
            if (-1 === _.indexOf(excludes, facet.getFieldname())) {
                var f = facet.computeFilterQuery();
                if (f) {
                    filters.push(f);
                }
            }
            return filters;
        }
    });

    return QueryBuilder;
});
