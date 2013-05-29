define([
    'underscore',
    'backbone',
    '../models/ColumnDefinition'
], function (_, Backbone, Column) {
    var ColumnDefinition = Backbone.Collection.extend({

        model: Column,

        initialize: function () {
            _.bindAll(this, 'updateQuery');
        },

        updateQuery: function (query) {
            query || (query = {});
            this.each(function (column) {
                query = column.updateQuery.call(column, query);
            });

            return query;
        }
    });

    return ColumnDefinition;
});

