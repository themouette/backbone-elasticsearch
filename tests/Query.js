define([
    'underscore',
    'backbone',
    'test/fixtures',
    'bb-es/models/Query',
    'bb-es/models/filters/Term',
    'bb-es/models/ColumnDefinition',
    'bb-es/exception'
], function (_, Backbone, fixtures, Query, Facet, Field, Exception) {

    function assertEventCalled(message, args) {
        return function () {
            if (args) {
            //console.log(args, arguments);
                ok(_.isEqual(_.toArray(arguments), args), message);
            } else {
                ok(true, message);
            }
        };
    }

    module("Query: Data validation");

    test("It should throw an exception if no `url` property is provided", 1, function () {
        throws(
            function () {
                var q = new Query();
            },
            Exception,
            "Url property is required"
        );
    });



    module("Query: Facets");

    test("it should be possible to retrive a facet defintion", 1, function () {
        var q = fixtures.createQuery();
        q.defineFacets([
            fixtures.createFacetDefintion('foo'),
            fixtures.createFacetDefintion('bar')
        ]);

        ok(q.getFacet('foo') instanceof Facet);
    });


    test("It should throw `change` and `change:facet_filter` event when selected facet changes", 3, function () {

        var q = fixtures.createProvisionedQuery();
        var f = q.getFacet('foo');
        var new_value = ['bar'];

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, new_value, { changes: { facet_filter: { foo: true } } }]
                    )
        );
        q.on('change:facet_filter', assertEventCalled(
                        '`change:facet_filter` event is called',
                        [f, new_value, { changes: { facet_filter: true } }]
                    )
        );

        q.setFacetFilter('foo', new_value);
        deepEqual(new_value, q.getFacetFilterId('foo'));
    });

    test("it should trigger `change` and `add:facet_definition` when a new facet defintion is added", 2, function () {

        var q = fixtures.createQuery();
        var f = fixtures.createFacetDefintion('foo');

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { add: { facet_definition: {index: 0} } }]
                    )
        );
        q.on('add:facet_definition', assertEventCalled(
                        '`add:facet_definition` event is called',
                        [q, f, {index: 0}]
                    )
        );

        q.addFacet(f);
    });

    test("it should trigger `change` and `remove:facet_definition` when a facet is removed", 3, function () {

        var q = fixtures.createProvisionedQuery();
        var f = q.getFacet('foo');

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { remove: { facet_definition: {foo: {index: 0}} } }]
                    )
        );
        q.on('remove:facet_definition', assertEventCalled(
                        '`remove:facet_definition` event is called',
                        [q, f, {index: 0}]
                    )
        );

        q.removeFacet('foo');

        strictEqual(undefined, q.getFacet('foo'), 'facet is removed');
    });

    test("it should trigger `change` and `reset:facet_definition` when facets are reset", 2, function () {

        var q = fixtures.createQuery();
        var f = [fixtures.createFacetDefintion('foo'), fixtures.createFacetDefintion('bar')];

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { reset: { facet_definition: true }}]
                    )
        );
        q.on('reset:facet_definition', assertEventCalled(
                        '`reset:facet_definition` event is called',
                        [q, f]
                    )
        );

        q.defineFacets(f);
    });

    test("it should be possible to select facet filter", 2, function () {

        var q = fixtures.createProvisionedQuery();

        q.setFacetFilter('foo', 'bar');
        deepEqual(q.getFacetFilterId('foo'), ['bar']);

        q.setFacetFilter('foo', ['baz']);
        deepEqual(q.getFacetFilterId('foo'), ['baz']);
    });

    test("it should be possible to access all facet definitions", 2, function () {

        var q = fixtures.createProvisionedQuery();
        var f = [
            q.getFacet('foo').toJSON(),
            q.getFacet('bar').toJSON()
        ];

        ok(q.getFacets() instanceof Backbone.Collection);
        deepEqual(q.getFacets().toJSON(), f);
    });


    module("Query: Fields");

    test("it should be possible to (re)set fields", 0, function () {

        var q = fixtures.createQuery();

        q.defineFields([
            fixtures.createField('foo'),
            fixtures.createField('bar')
        ]);

    });

    test("it should be possible to add a field", 0, function () {

        var q = fixtures.createQuery();

        q.addField(fixtures.createField('foo'));

    });

    test("it should be possible to retrieve a field", 2, function () {

        var q = fixtures.createProvisionedQuery();

        ok(q.getField('foo') instanceof Field);
        equal(q.getField('foo').getFieldname(), 'foo');

    });

    test("it should be possible to retrieve all fields", 2, function () {

        var q = fixtures.createProvisionedQuery();
        var f = [q.getField('foo').toJSON(), q.getField('bar').toJSON()];

        ok(q.getFields() instanceof Backbone.Collection);
        deepEqual(q.getFields().toJSON(), f);

    });

    test("It should throw `change` and `change:field_order_by` event when selected facet changes", 11, function () {

        var q = fixtures.createProvisionedQuery();
        var f = q.getField('foo');
        var order = Field.SORT_DESC;

        ok(!q.getOrderBy(), "no default sorting");

        q.toggleSort();
        equal(q.getOrderBy().fieldname, 'foo', "default order is `asc`, default field is the first");

        q.orderBy('bar');
        deepEqual(q.getOrderBy(), {fieldname: 'bar', order: Field.SORT_ASC}, "default order is `asc`");

        q.toggleSort();
        deepEqual(q.getOrderBy(), {fieldname: 'bar', order: Field.SORT_DESC}, "toggle sort uses currently sorted field");

        q.toggleSort('foo');
        deepEqual(q.getOrderBy(), {fieldname: 'foo', order: Field.SORT_ASC}, "toggle sort on unsorted field is asc");
        strictEqual(q.getField('bar').isSorted(), false, "only one sorted field at a time");

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, order, { changes: { field_order_by: { foo: true } } }]
                    )
        );
        q.on('change:field_order_by', assertEventCalled(
                        '`change:field_order_by` event is called',
                        [f, order, { changes: { field_order_by: true } }]
                    )
        );

        order = Field.SORT_DESC;
        q.orderBy('foo', order);
        equal(order, q.getOrderBy('foo'));
        ok(!q.getOrderBy('bar'));
        deepEqual(q.getOrderBy(), {fieldname: 'foo', order: order});
    });

    test("it should trigger `change` and `add:field` when a new field is added", 2, function () {

        var q = fixtures.createQuery();
        var f = fixtures.createField('foo');

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { add: { field: {index: 0} } }]
                    )
        );
        q.on('add:field', assertEventCalled(
                        '`add:field` event is called',
                        [q, f, {index: 0}]
                    )
        );

        q.addField(f);

    });

    test("it should trigger `change` and `remove:field` when a facet is removed", 3, function () {

        var q = fixtures.createProvisionedQuery();
        var f = q.getField('foo');

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { remove: { field: {foo: {index: 0}} } }]
                    )
        );
        q.on('remove:field', assertEventCalled(
                        '`remove:field` event is called',
                        [q, f, {index: 0}]
                    )
        );

        q.removeField('foo');

        strictEqual(undefined, q.getField('foo'), 'field is removed');
    });

    test("it should trigger `change` and `reset:field` when facets are reset", 2, function () {

        var q = fixtures.createQuery();
        var f = [
            fixtures.createField('foo'),
            fixtures.createField('bar')
        ];

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, f, { reset: { field: true }}]
                    )
        );
        q.on('reset:field', assertEventCalled(
                        '`reset:field` event is called',
                        [q, f]
                    )
        );

        q.defineFields(f);
    });


    module('Query: results');

    test("it should be possible to access result collection", 1, function () {

        var q = fixtures.createQuery();

        ok(q.getResults() instanceof Backbone.Collection);

    });

    test("it should be possible to specify a collection class for results", 1, function () {

        var MyCollection = Backbone.Collection.extend({});

        var q = fixtures.createQuery({
            collectionClass: MyCollection
        });

        ok(q.getResults() instanceof MyCollection);
    });

    test("it should trigger `change` and `change:result` when a result is modified", 2, function () {

        var q = fixtures.createProvisionedQuery();
        var r = q.getResult(1);

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, r, { changes: { result: { 1: { foo: true }  } } } ]
                    )
        );
        q.on('change:result', assertEventCalled(
                        '`change:result` event is called',
                        [q, r, { changes: { foo: true }  } ]
                    )
        );

        r.set('foo', 'baz');
    });

    test("it should trigger `change` and `add:result` when a new result is appened", 2, function () {

        var q = fixtures.createQuery();
        var r = fixtures.createResult({id: 5, foo: 'foo', bar: 'bar'});

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, r, { add: { result: { index: 0 }  } } ]
                    )
        );
        q.on('add:result', assertEventCalled(
                        '`add:result` event is called',
                        [q, r, { index: 0 } ]
                    )
        );

        q.getResults().add(r);

    });

    test("it should trigger `change` and `remove:result` when a result is removed", 2, function () {

        var q = fixtures.createProvisionedQuery();
        var r = q.getResult(0);

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, r, { remove: { result: { 0: { index: 0 } } } } ]
                    )
        );
        q.on('remove:result', assertEventCalled(
                        '`remove:result` event is called',
                        [q, r, { index: 0 } ]
                    )
        );

        q.getResults().remove(0);
    });

    test("it should trigger `change` and `reset:result` when result are reseted", 2, function () {

        var q = fixtures.createProvisionedQuery();
        var r = [
            fixtures.createResult({id: 2, foo: 'foo', bar: 'bar'}),
            fixtures.createResult({id: 5, foo: 'foo', bar: 'bar'})
        ];

        q.on('change', assertEventCalled(
                        '`change` event is called',
                        [q, r, { reset: {result: true } }]
                    )
        );
        q.on('reset:result', assertEventCalled(
                        '`remove:result` event is called',
                        [q, r]
                    )
        );

        q.getResults().reset(r);
    });

    module('Query: query management');

    test("it should be possible to set and retrieve query", 5, function () {

        var q = fixtures.createQuery();

        q.setQuery();
        strictEqual(q.getQuery(), undefined);

        q.setQuery('');
        strictEqual(q.getQuery(), '');

        q.setQuery([]);
        deepEqual(q.getQuery(), []);

        q.setQuery(['foo', 'bar']);
        deepEqual(q.getQuery(), ['foo', 'bar']);

        q.setQuery({term: {foo: 'bar'} });
        deepEqual(q.getQuery(), {term: {foo: 'bar'} });
    });

});
