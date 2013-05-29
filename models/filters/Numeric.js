// define a numeric term search for elastic search
// facet doc: http://www.elasticsearch.org/guide/reference/api/search/facets/terms-facet.html
// filter definition
define([
    'underscore',
    'backbone',
    './Term'
], function (_, Backbone, Term) {
    var Numeric = Term.extend({
        doConvertFacetToId: function(facet) {
            return facet.get('term').toString();
        },
        doConvertIdToFacet: function(id) {
            return _.first(this.getAvailableFacets().where({term: parseInt(id, 10)}));
        }
    });
    return Numeric;
});
