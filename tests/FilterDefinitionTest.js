define([
    'underscore',
    'backbone',
    'test/fixtures',
    'bb-es/QueryBuilder'
], function (_, Backbone, fixtures, QueryBuilder) {

    module("FilterDefinition");

    test('it should be possible to return empty computed query filter', 6, function () {
        // get a mock object
        var f = fixtures.createProvisionedFacetDefinition('foo');
        f.doComputeQueryFilter = function (filter) {
            ok(true, '`doComputeQueryFilter` mock is called');
            return null;
        };

        // with no filter:
        strictEqual(null, f.computeFilterQuery());

        // with a single filter:
        f.selectAll(['foo']);
        strictEqual(null, f.computeFilterQuery());

        // with a multiple filter:
        f.selectAll(['foo', 'bar']);
        strictEqual(null, f.computeFilterQuery());
    });
});
