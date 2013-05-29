// define a range search for elastic search/
// facet doc: http://www.elasticsearch.org/guide/reference/api/search/facets/range-facet.html
// filter definition: http://www.elasticsearch.org/guide/reference/query-dsl/term-query.html
define([
    'underscore',
    'backbone',
    'bb-es/models/FilterDefinition',
    'bb-es/exception'
], function (_, Backbone, FilterDefinition, Exception) {

    var messages = {
        "invalid": 'given facet cannot be displayed'
    };

    var rangeTpl = _.template('<% if (mute) { %><span class="muted"><% } else if (match_all) { %><span class="match-all"><% } %>' +
      'de <%= prefix %><%= from %><%= suffix %> à <%= prefix %><%= to %><%= suffix %> ' +
      '<% if (!mute && !match_all) { %><span class="muted"><% } %>' +
      '(<%= count %>)</span>');
    var toTpl = _.template('<% if (mute) { %><span class="muted"><% } else if (match_all) { %><span class="match-all"><% } %>' +
      'moins de <%= prefix %><%= to %><%= suffix %> ' +
      '<% if (!mute && !match_all) { %><span class="muted"><% } %>' +
      '(<%= count %>)</span>');
    var fromTpl = _.template('<% if (mute) { %><span class="muted"><% } else if (match_all) { %><span class="match-all"><% } %>' +
      'plus de <%= prefix %><%= from %><%= suffix %> ' +
      '<% if (!mute && !match_all) { %><span class="muted"><% } %>' +
      '(<%= count %>)</span>');
    var idTmpl = _.template('<%= from %>-<%= to %>');
    var idRexexp = /^(\d*\.?\d*)-(\d*\.?\d*)$/;

    var Range = FilterDefinition.extend({
        defaults: _.extend({}, FilterDefinition.prototype.defaults, {
            // use a key and value script instead of fieldname
            key_script: null,
            value_script: null,
            // use a key and value field instead of fieldname
            key_field: null,
            value_field: null,
            // ranges to look for
            ranges: []
        }),

        // compute a single filter value
        doComputeQueryFilter: function(value) {
            var ret = {
                "range": {
                }
            };

            ret.range[this.getFieldname()] = value;

            return ret;
        },
        // update facet query to request facets for this field definition
        doComputeFacetQuery: function(filter) {
            var facetQuery = {};
            var q = {};

            // is it a field, a scriptfield or a fields query ?
            if (this.get('key_field')) {
                q.key_field = this.get('key_field');
                q.value_field = this.get('value_field');
            } else if (this.get('key_script')) {
                q.key_script = this.get('key_script');
                q.value_script = this.get('value_script');
            } else {
                q.field = this.getFieldname();
            }

            q.ranges = this.get('ranges');

            // add fatet to query
            facetQuery = {
              "range": q
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
            this.set('total_facet_count', facets.ranges.length);

            return facets.ranges;
        },

        doConvertFacetToId: function(facet) {
            return idTmpl(_.extend({
                    "from": '',
                    "to": ''
                }, facet.toJSON()));
        },
        doConvertIdToFacet: function(id) {
            var range = idRexexp.exec(id);
            var filter = {
                from: parseFloat(range[1], 10) || null,
                to: parseFloat(range[2], 10) || null
            };
            if (null === filter.to) { delete filter.to; }
            if (null === filter.from) { delete filter.from; }
            return _.first(this.getAvailableFacets().where(filter));
        },
        doConvertFacetToFilter: function(facet) {
            var f = facet.toJSON();
            return _.extend({
                    "include_lower" : true,
                    "include_upper" : false
                }, _.pick(f, 'from', 'to'));
        },
        doConvertFilterToId: function(filter) {
            return idTmpl(_.extend({
                    "from": '',
                    "to": ''
                }, filter));
        },
        doHumanizeFacet: function(facet) {
            var range = this.doConvertFacetToRange(facet);
            var data = { };
            _.each(['from', 'to', 'count', 'display_from', 'display_to'], function (index) {
                var num = typeof facet.get(index) != "undefined" ?
                                facet.get(index) :
                                    typeof range[index] != "undefined" ?
                                        range[index] : null;
                if (typeof num !== null) {
                    num = parseInt(num, 10);
                    if (_.isFinite(num)) {
                        data[index] = num.toLocaleString();
                        return ;
                    }
                }
                data[index] = '';
            });
            if (data.display_from && data.display_from !== '') {
                data.from = data.display_from;
            }
            if (data.display_to && data.display_to !== '') {
                data.to = data.display_to;
            }
            // some more values
            data.mute = !facet.get('count');
            data.match_all = this.matchAllResults(facet, data);
            data.suffix = this.get('suffix') || '';
            data.prefix = this.get('prefix') || '';
            if (facet.has('from') && facet.has('to')) {
                return rangeTpl(data);
            }
            if (facet.has('from')) {
                return fromTpl(data);
            }
            if (facet.has('to')) {
                return toTpl(data);
            }
            throw new Exception(messages.invalid);
        },

        doConvertFacetToRange: function (facet) {
            return _.first(_.where(this.get('ranges'), _.pick(facet.toJSON(), 'from', 'to')));
        }
    });

    return Range;
});
