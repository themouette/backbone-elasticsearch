// define a term search for elastic search/
// facet doc: http://www.elasticsearch.org/guide/reference/api/search/facets/terms-facet.html
// filter definition
define([
    'underscore',
    'backbone',
    'bb-es/models/FilterDefinition'
], function (_, Backbone, FilterDefinition) {

    var termTpl = _.template('<% if (mute) { %><span class="muted"><% } else if (match_all) { %><span class="match-all"><% } %>' +
      '<%= prefix %><%= term %><%= suffix %> ' +
      '<% if (!mute && !match_all) { %><span class="muted"><% } %>' +
      '(<%= count %>)</span>');

    var Term = FilterDefinition.extend({
        defaults: _.extend({}, FilterDefinition.prototype.defaults, {
            humanizeTpl: termTpl,
            // use a script field instead of fieldname
            script_field: null,
            // use a field list instead of fieldname
            fields: null,
            // number of records to retrun
            size: 5,
            // should all terms be included in facet query
            // even if there is no count
            all_terms: false,
            // order results by 'count', 'term', 'reverse_count', 'reverse_term'
            order: 'term'
        }),

        // compute a single value
        doComputeQueryFilter: function(filter) {
            var ret = {
                "match": { }
            };

            ret.match[this.getFieldname()] = {
                "query": filter,
                "type" : "phrase"
            };

            return {"query": ret};
        },

        // update facet query to request facets for this field definition
        doComputeFacetQuery: function(filter) {
            var facetQuery = {};
            var q = {};

            // is it a field, a scriptfield or a fields query ?
            if (this.get('script_field')) {
                q.script_field = this.get('script_field');
            } else if (this.get('fields')) {
                q.fields = this.get('fields');
            } else {
                q.field = this.getFieldname();
            }

            // compute extra parameters
            _.each(['size', 'all_terms', 'script', 'order'], function (property) {
                if (this.has(property)) {
                    q[property] = this.get(property);
                }
            }, this);

            // add facet to query
            facetQuery = {
              "terms": q
            };

            if (filter) {
                facetQuery.facet_filter = filter;
            }

            return facetQuery;
        },

        // parse result to store facets localy
        doParseQueryResponse: function (response, xhr) {
            var facets = FilterDefinition.prototype.doParseQueryResponse.call(this, response, xhr);

            // update has more
            this.set('total_facet_count', (facets.terms.length || 0) + facets.other);

            return facets.terms;
        },

        doConvertFacetToId: function(facet) {
            return facet.get('term');
        },
        doConvertIdToFacet: function(id) {
            return _.first(this.getAvailableFacets().where({term: id}));
        },
        doConvertFacetToFilter: function(facet) {
            return facet.get('term');
        },
        retrieveFromCache: function (id) {
            return FilterDefinition.prototype.retrieveFromCache.call(this, id) || new Backbone.Model({term: id, count: 0});
        }
    });

    return Term;
});
