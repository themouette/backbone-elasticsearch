define([
    'underscore',
    'bb-es/QueryBuilder',
    'bb-es/models/Query',
    'bb-es/models/filters/Term',
    'bb-es/models/ColumnDefinition'
], function (_, QueryBuilder, Query, Facet, Field) {

    var fixtures = {
        createQuery: function (extensions) {
            // create a query builder
            var myQuery = Query.extend(_.extend({
                url: 'foo',
                setup: function () {
                    // prevent auto fetching
                    return false;
                }
            }, extensions || {}));
            var q = new myQuery();

            return q;
        },
        createFacetDefintion: function(fieldname) {
            return new Facet({
                fieldname: fieldname
            });
        },
        createProvisionedFacetDefinition: function (fieldname, values) {
            var f = fixtures.createFacetDefintion(fieldname);
            f.updateFacets(values || [
                {term: 'baz', count: 1},
                {term: 'bar', count: 0}
            ]);
            return f;
        },
        createField: function(fieldname) {
            return new Field({
                fieldname: fieldname
            });
        },
        createResult: function (values) {
            return new Backbone.Model(values);
        },
        createProvisionedQuery: function () {
            var q = fixtures.createQuery();

            // define query facets
            q.defineFacets([
                fixtures.createProvisionedFacetDefinition('foo', [
                    {term: 'baz', count: 1},
                    {term: 'bar', count: 0}
                ]),
                fixtures.createProvisionedFacetDefinition('bar', [
                    {term: 'baz', count: 1},
                    {term: 'foo', count: 0}
                ])
            ]);

            q.defineFields([
                fixtures.createField('foo'),
                fixtures.createField('bar')
            ]);

            q.getResults().reset([
                fixtures.createResult({id: 0, foo: 'foo', bar: 'bar'}),
                fixtures.createResult({id: 1, foo: 'foo', bar: 'bar'}),
                fixtures.createResult({id: 2, foo: 'foo', bar: 'bar'})
            ]);

            return q;
        },
        createQueryBuilder: function (options) {
            var b = new QueryBuilder(options);
            return b;
        }
    };

    return fixtures;
});
