define([
    'backbone',
    './models/FilterDefinition',
    './models/filters/Term',
    './models/filters/Range'
], function (Backbone, FilterDefinition, FilterTerm, FilterRange) {

    Backbone.Es = {
        FilterDefinition: FilterDefinition,
        Filter: {
            Term: FilterTerm,
            Range: FilterRange
        }
    };

    return Backbone.Es;
});
