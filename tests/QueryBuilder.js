define([
    'underscore',
    'backbone',
    'test/fixtures',
    'bb-es/QueryBuilder'
], function (_, Backbone, fixtures, QueryBuilder) {

    var facet_default_configuration = {
        "all_terms": null,
        "order": null,
        "size": 5
    };

    module("Querybuilder: compute query parameters");

    test("it should accept empty query", 3, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();

        q.setQuery(null);
        deepEqual(b.updateRequestForQuery(q, {}), { "query": { "match_all": { } } });
        q.setQuery('');
        deepEqual(b.updateRequestForQuery(q, {}), { "query": { "match_all": { } } });
        q.setQuery([]);
        deepEqual(b.updateRequestForQuery(q, {}), { "query": { "match_all": { } } });

    });

    test("it should accept text query", 2, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();

        q.setQuery('foo');
        deepEqual(
            b.updateRequestForQuery(q, {}),
            { "query": { "match": { "_all": 'foo' } } }
        );
        q.setQuery('foo bar baz');
        deepEqual(
            b.updateRequestForQuery(q, {}),
            { "query": { "match": { "_all": 'foo bar baz' } } }
        );

    });

    test("it should accept array query", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();

        q.setQuery(['foo', 'bar']);
        deepEqual(
            b.updateRequestForQuery(q, {}),
            { "query": { "terms": { "_all": ['foo', 'bar'] } } }
        );

    });

    test("it should accept object query", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();

        q.setQuery({ "terms": { "_all": ['foo', 'bar'] } });
        deepEqual(
            b.updateRequestForQuery(q, {}),
            { "query": { "terms": { "_all": ['foo', 'bar'] } } }
        );

    });

    module('Querybuilder: compute facet parameter');

    test("it should convert a Facet into elasticsearch query", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();
        var f = fixtures.createFacetDefintion('foo');
        f.set(facet_default_configuration);

        q.addFacet(f);

        deepEqual(
            b.updateRequestForFacets(q, {}),
            { "facets": { "foo": { "terms": { "field": "foo", "size": 5 } } } }
        );

    });

    test("it should convert a filtered Facet into elasticsearch query", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createQuery();
        var f = fixtures.createProvisionedFacetDefinition('foo');
        f.set(facet_default_configuration);

        q.addFacet(f);
        q.setFacetFilter('foo', 'bar');

        deepEqual(
            b.updateRequestForFacets(q, {}),
            { "facets": { "foo": { "terms": { "field": "foo", "size": 5 } } } }
        );

    });

    test("it should exclude current facet filter on facet query", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        q.getFacets().each(function (facet) {
            facet.set(facet_default_configuration);
        });

        q.setFacetFilter('foo', 'bar');
        q.setFacetFilter('bar', 'baz');

        deepEqual(
            b.updateRequestForFacets(q, {}),
            {
                "facets": {
                    "foo": {
                        "terms": {
                            "field": "foo",
                            "size": 5
                        },
                        "facet_filter": {
                            "query": {
                                "match": {
                                    "bar": {
                                        "query": "baz",
                                        "type": "phrase"
                                    }
                                }
                            }
                        }
                    },
                    "bar": {
                        "terms": {
                            "field": "bar",
                            "size": 5
                        },
                        "facet_filter": {
                            "query": {
                                "match": {
                                    "foo": {
                                        "query": "bar",
                                        "type": "phrase"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        );

    });

    test("it should be possible to filter on 3 or more facets", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        q.addFacet(fixtures.createFacetDefintion('baz'));
        q.getFacets().each(function (facet) {
            facet.set(facet_default_configuration);
        });

        q.setFacetFilter('foo', 'bar');
        q.setFacetFilter('bar', 'baz');

        deepEqual(
            b.updateRequestForFacets(q, {}),
            {
                "facets": {
                    "foo": {
                        "terms": {
                            "field": "foo",
                            "size": 5
                        },
                        "facet_filter": {
                            "query": {
                                "match": {
                                    "bar": {
                                        "query": "baz",
                                        "type": "phrase"
                                    }
                                }
                            }
                        }
                    },
                    "bar": {
                        "terms": {
                            "field": "bar",
                            "size": 5
                        },
                        "facet_filter": {
                            "query": {
                                "match": {
                                    "foo": {
                                        "query": "bar",
                                        "type": "phrase"
                                    }
                                }
                            }
                        }
                    },
                    "baz": {
                        "terms": {
                            "field": "baz",
                            "size": 5
                        },
                        "facet_filter": {
                            "and": [
                                {
                                    "query": {
                                        "match": {
                                            "foo": {
                                                "query": "bar",
                                                "type": "phrase"
                                            }
                                        }
                                    }
                                },
                                {
                                    "query": {
                                        "match": {
                                            "bar": {
                                                "query": "baz",
                                                "type": "phrase"
                                            }
                                        }
                                    }
                                }
                            ]
                        }
                    }
                }
            }
        );
    });


    module("Querybuilder: compute filter parameter");

    test("it should not create a filter if no facet is filtered", 1,function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        var request = b.updateRequestForFilters(q, {});

        strictEqual(request.filter, undefined);

    });

    test("it should convert a filtered facet into an elasticsearch query", 1,function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        // update facets defaults
        q.getFacets().each(function (facet) {
            facet.set(facet_default_configuration);
        });

        q.setFacetFilter('foo', 'bar');

        var request = b.updateRequestForFilters(q, {});

        deepEqual(request.filter, {
            "query": {
                "match": {"foo": { "query": "bar", "type": "phrase" } }
            }
        });

    });

    test("it should use and if several filters are given", 1, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        // update facets defaults
        q.getFacets().each(function (facet) {
            facet.set(facet_default_configuration);
        });

        q.setFacetFilter('foo', 'bar');
        q.setFacetFilter('bar', 'baz');

        var request = b.updateRequestForFilters(q, {});

        deepEqual(request.filter, {
            "and": [
                {"query": {"match": {"foo": { "query": "bar", "type": "phrase" } } } },
                {"query": {"match": {"bar": { "query": "baz", "type": "phrase" } } } }
            ]
        });

    });

    module("Querybuilder: compute fields arguments");

    test("it should accept field filtering", 2, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        q.orderBy('foo', "asc");

        var request = b.updateRequestForFields(q, {});

        deepEqual(request.fields, ["foo", "bar"]);
        deepEqual(request.sort, [{"foo": "asc"}]);
    });

    test("it should be possible to exclude a field", 2, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        q.orderBy('foo', "asc");
        q.getField('foo').set("enabled", false);

        var request = b.updateRequestForFields(q, {});

        deepEqual(request.fields, ["bar"]);
        deepEqual(request.sort, [{"foo": "asc"}]);
    });

    module("Querybuilder: buildSearch");

    test("it should be possible to give default options", 2, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();

        var request = b.buildSearch(q, {size: 10});

        strictEqual(request.size, 10);

        request = b.buildSearch(q);

        strictEqual(request.size, undefined);
    });

    test("it should be possible to build a search request", 4, function () {

        var b = fixtures.createQueryBuilder();
        var q = fixtures.createProvisionedQuery();
        q.setFacetFilter('foo', 'bar');

        var request = b.buildSearch(q);
        ok(request.fields);
        ok(request.filter);
        ok(request.facets);
        ok(request.query);
    });


});
