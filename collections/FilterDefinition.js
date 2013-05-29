define([
    'underscore',
    'backbone',
    '../models/FilterDefinition'
], function (_, Backbone, Definition) {

    var FilterDefinition = Backbone.Collection.extend({

        model: Definition,

        // set possible facets from server response
        onServerResponse: function (response, xhr) {
            this.each(function (definition) {
                definition.updateFacets(definition.parseQueryResponse(response, xhr));
            });
        }
    });

    return FilterDefinition;
});

