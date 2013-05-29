Backbone elasticsearch query
============================

Quickly create elasticsearch queries and associated interfaces.

Facet manipulation
------------------

Facets are a nice way to filter data in an index engine. Using `bb-es` makes it
easy to manipulate facets.

There is two main facet concepts in `bb-es`:

* defintions: define a facet flter and query
* filters: a filter associated to facet definition

### Facet definitions

A query needs facet definitions to be set before querying, here is how
you might define a facets:

``` javascript
q = new Query();

// define/reset all facets
q.defineFacets([
    new Term({fieldname: 'my-fieldname'}),
    new Term({fieldname: 'another-fieldname'})
]);

// add a facet
q.addFacet(new Numeric({fieldname: 'numeric-field'}));

// remove facet for field `another-fieldname`
q.removeFacet('another-fieldname');

// retrieve a facet definition
q.getFacet('my-fieldname'); // returns new Term({fieldname: 'my-fieldname'})

// clears all facet definitons
q.defineFacets([]);

// retrieve all facet definitions
q.getFacets(); // return a collection of facets
```

facet defintion associated events are:

* `add:facet_definition`: triggered when a facet definition is added
    callback signature is `function (quuery, definition, changes)`
* `remove:facet_definition`: triggered when a facet definition is removed
    callback signature is `function (query, definition, changes)`
* `reset:facet_definition`: triggered when all facet definitions collection is
    cleared
    callback signature is `function (query, new_definitions, changes)`

in all cases, a `change` event is triggered too.

### Facet filters

Facet filter values can be manipulated directly from the query as follow:

``` javascript
q = new Query();

// define facets
q.defineFacets([
    new Term({fieldname: 'my-fieldname'}),
    new Term({fieldname: 'another-fieldname'})
]);

// get foo filter values
q.getFacetFilter('foo');

// get foo filter ids
q.getFacetFilterId('foo');

// set filter for foo by id
q.setFacetFilter('foo', ['bar']);
// or
q.setFacetFilter('foo', 'bar');
```

facet filters changes triggers a `change:facet_filter` event with following
callback signature `function (facet_definition, new_value, changes)`.

Fields
------

When querying, it is possible to specify fields to return and how to sort. In
`bb-es` you do this by defining fields.

### Basics

Fields are instances of `ColumnDefiniton` and can be provide as follow:.

``` javascript
q = new Query();

// intialize or reset fields
q.defineFields([
    new Field({fieldname: 'foo'}),
    new Field({fieldname: 'bar'})
]);

// remove a field
q.removeField('foo');

// add field
q.addField(new Field({fieldname: 'foo'}));
```

following events are triggerd by query during fields manipulation:

* `add:field`: triggered whan a field is append to collection
    callback signature is `function (query, field, changes)`
* `remove:field`: triggered when a field is removed from collection
    callback signature is `function (query, field, changes)`
* `reset:field`: triggered when fields collection is reseted
    callback signature is `function (query, new_fields)`

Fields can be accessed through `getFields` and `getField` methods:

```javascript
q.getFIelds();      // return a backbone collection
q.getField('foo');  // return Field with foo fieldname
```

### Sorting

Sorting can be defined or retrieved on an exsting field directly from the query.

``` javascript
q = new Query();

// sort field 'foo' ascendig
q.orderBy('foo', 'asc');
// sort field 'bar' descendig
q.orderBy('bar', 'desc');

// access order
q.getOrderBy('foo');    // return 'desc'
q.getOrderBy();         // return {fieldname: 'foo', order: 'desc'}

// easy toggling
q.toggleSort();
// or with a fieldname
q.toggleSort('bar');
```

when sorting changes, a `change:field_order_by` event is triggered, callback
signature is `function (field, order, changes)`

Result manipulation
-------------------

Once query is populated, it is really simple to access results :

```
q.getResults();     // will return the whole result collection
q.getResult('id');  // will return result with id 'id'
```

You can listen to dedicated result events:

* `change:result`: triggered when a result is changed.
    callback signature is `function (query, result, changes)`
* `add:result`: triggered when a result is added
    callback signature is `function (query, result, changes)`
* `remove:result`: triggered when a result is removed
    callback signature is `function (query, result, changes)`
* `reset:result`: triggered when result collection is reseted
    callback signature is `function (query, new_elements)`

Querying
--------

There is two types of query in `bb-es`, fetching is paginated request to server
with facet partial fetching, and `facetQuery` is a pagianted facet only query.

### Search documents

``` javascript
q.fetch();          // fetch first page of document
q.fetchFirstPage(); // fetch first page of document
q.fetchNextPage();  // fetch the next page
```

when filters or columns changes, the collection is refetched.

### Search facets

``` javascript
q.fetchFacet('foo');        // fetch facet foo first page and reset results
q.fetchFacetNext('foo');    // fetch next facets page and append it to facet
                            // corresponding object
```

### Set query

The `query` can be set through `setQuery` and retrieved by `getQuery`.

``` javascript
// term march
q.setQuery('my query');

// terms match
q.setQuery(['my', 'terms', 'match']);

// no query nilter / match_all
q.setQuery();

// advanced query
q.setQuery({
    query_string: {
        default_field: "content",
        "query" : "this AND that OR thus"
    }
});
```

Extending Query for your needs
------------------------------

You have to extend `Query` for your own needs.

Following methods or properties are mandatory:

* `url`: the url to fetch
* `setup`: callback to initialize your data. return `false` to prevent auto
    fetching on initialisation

here is an example code:

``` javascript
// query for Foo documents
var FooQuery = Query.extend({
    url: 'index/foo',
    setup: function () {
        this.definedFacets([new Term({fieldname: 'foo'})]);
        this.defineFields([new Field({fieldname: 'foo', order_by: 'asc'})]);
        // autoreload on filter change
        this.on('change:facet_filter', this.onFetchfirstPage);
        // autoreload on order change
        this.on('change:field_order_by', this.onFetchfirstPage);
        // auto fetch on startup
        return true;
    }
});
```
