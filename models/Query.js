// query builder assist into creating queries for elasticsearch
define([
    'underscore',
    'backbone',
    'bb-es/collections/FilterDefinition',
    'bb-es/collections/ColumnDefinition',
    'bb-es/QueryBuilder',
    'bb-es/exception'
], function (_, Backbone, FacetCollection, FieldCollection, QueryBuilder, Exception) {

    var messages = {
        url_required: 'You need to define a "url" property.',
        unable_to_parse_query: "Unable to parse given query"
    };

    // some utility methods
    var getValue = function(object, prop) {
        if (!(object && object[prop])) return null;
        return _.isFunction(object[prop]) ? object[prop]() : object[prop];
    };
    var urlError = function() {
        throw new Exception('A "url" property or function must be specified');
    };

    var Query = Backbone.Model.extend({

        url: null,
        // override this to use a custom collection class for results
        collectionClass: Backbone.Collection,

        defaults: {
            // page length for queries.
            // @integer {default: 50}
            page_length: 50,
            // current query
            query: null
        },

        initialize: function () {
            if (!this.url) {
                throw new Exception(messages.url_required);
            }

            _.bindAll(this,
                // facet definition triggers
                'triggerFacetChange', 'triggerFacetAdd', 'triggerFacetRemove', 'triggerFacetReset',
                // field definition triggers
                'triggerFieldOrderByChange', 'triggerFieldAdd', 'triggerFieldRemove', 'triggerFieldReset',
                // facet definition triggers
                'triggerResultChange', 'triggerResultAdd', 'triggerResultRemove', 'triggerResultReset'
            );

            // intialize collections
            this
                .initializeFacetDefinitions()
                .initializeFieldDefinitions()
                .initializeResultDefinition();

            if (false !== this.setup.call(this)) {
                this.fetch();
            }
        },

        // callback ued to configure query
        setup: function () {
        },

        initializeFacetDefinitions: function () {
            var facets = new FacetCollection();
            this.set('facet_definition', facets);
            // delegate events for facets
            facets
                .on('change:selected_facets', this.triggerFacetChange)
                .on('add', this.triggerFacetAdd)
                .on('remove', this.triggerFacetRemove)
                .on('reset', this.triggerFacetReset);
            return this;
        },

        triggerFacetChange: function (facet, new_filter, chg) {
            if (!(chg.changes && chg.changes.selected_facets)) {
                // event is badly triggered on other properties change
                return ;
            }
            this.trigger('change:facet_filter', facet, new_filter, {
                                            changes: { facet_filter: true } });
            var changes = { changes: { facet_filter: {} } };
            changes.changes.facet_filter[facet.getFieldname()] = true;
            this.trigger('change', this, new_filter, changes);
        },

        triggerFacetAdd: function (collection, facets, changes) {
            var facet = facets.at(changes.index);
            this.trigger('add:facet_definition', this, facet, changes);
            this.trigger('change', this, facet, {add: {facet_definition: changes}});
        },

        triggerFacetRemove: function (facet, facets, changes) {
            this.trigger('remove:facet_definition', this, facet, changes);
            var chg = { remove: { facet_definition: {} } };
            chg.remove.facet_definition[facet.getFieldname()] = changes;
            this.trigger('change', this, facet, chg);
        },

        triggerFacetReset: function (facets, changes) {
            this.trigger('reset:facet_definition', this, facets.models);
            this.trigger('change', this, facets.models, {
                                            reset: { facet_definition: true } });
        },

        // define facets collection
        defineFacets: function (facets) {
            this.get('facet_definition').reset(facets);
            return this;
        },

        addFacet: function (facet) {
            this.get('facet_definition').add(facet);
            return this;
        },

        getFacets: function () {
            return this.get('facet_definition');
        },

        // return facet for `fieldname`
        getFacet: function (fieldname) {
            return this.get('facet_definition').get(fieldname);
        },

        removeFacet: function (fieldname) {
            this.get('facet_definition').remove(fieldname);
            return this;
        },

        setFacetFilter: function (fieldname, value, options) {
            if (!_.isArray(value)) { value= [value]; }
            this.getFacet(fieldname).selectAll(value, options);
            return this;
        },

        getFacetFilter: function (fieldname) {
            return this.getFacet(fieldname).getSelectedFacets();
        },

        getFacetFilterId: function (fieldname) {
            return this.getFacet(fieldname).getSelectedIds();
        },

        setFacetFilterId: function (fieldname, value, options) {
            var facet = this.getFacet(fieldname);
            value = facet.convertIdToFilter(value);
            facet.selectAll(value, options);
            return this;
        },



        initializeFieldDefinitions: function () {
            var fields = new FieldCollection();
            this.set('field_definition', fields);
            // delegate events for fields
            fields
                .on('change:order_by', this.triggerFieldOrderByChange)
                .on('add', this.triggerFieldAdd)
                .on('remove', this.triggerFieldRemove)
                .on('reset', this.triggerFieldReset);
            return this;
        },

        triggerFieldOrderByChange: function (field, new_order, chg) {
            // first reset previous set order
            var fieldname = field.getFieldname();
            this.getFields().each(function (aField) {
                if (fieldname !== aField.getFieldname()) {
                    aField.resetOrderBy({silent: true});
                }
            });
            // trigger events
            this.trigger('change:field_order_by', field, new_order, {
                                        changes: { field_order_by: true } });
            var changes = { changes: { field_order_by: {} } };
            changes.changes.field_order_by[fieldname] = true;
            this.trigger('change', this, new_order, changes);
        },

        triggerFieldAdd: function (collection, fields, changes) {
            var field = fields.at(changes.index);
            this.trigger('add:field', this, field, changes);
            this.trigger('change', this, field, {add: {field: changes}});
        },

        triggerFieldRemove: function (field, fields, changes) {
            this.trigger('remove:field', this, field, changes);
            var chg = { remove: { field: {} } };
            chg.remove.field[field.getFieldname()] = changes;
            this.trigger('change', this, field, chg);
        },

        triggerFieldReset: function (fields, changes) {
            this.trigger('reset:field', this, fields.models);
            this.trigger('change', this, fields.models, { reset: { field: true } });
        },

        defineFields: function (fields) {
            this.get('field_definition').reset(fields);
            return this;
        },

        addField: function (field)  {
            this.get('field_definition').add(field);
            return this;
        },

        getFields: function () {
            return this.get('field_definition');
        },

        getField: function (fieldname) {
            return this.get('field_definition').get(fieldname);
        },

        removeField: function (fieldname) {
            this.get('field_definition').remove(fieldname);
            return this;
        },

        orderBy: function (fieldname, order) {
            this.getField(fieldname).orderBy(order || FieldCollection.prototype.model.SORT_ASC);
            return this;
        },

        getOrderBy: function (fieldname) {
            if (fieldname) {
                return this.getField(fieldname).getOrderBy();
            }
            var field = this.getFields().find(function (f) {
                if (f.isSorted()) {
                    return  f;
                }
            });

            if (!field) {
                return false;
            }

            return {
                fieldname: field.getFieldname(),
                order: field.getOrderBy()
            };
        },

        toggleSort: function (fieldname) {
            // if no fieldname given
            if (!fieldname && (fieldname = this.getOrderBy())) {
                // find the currently sorted field
                fieldname = fieldname.fieldname;
            } else if (!fieldname && (fieldname = this.getFields().first())) {
                // there were no previous sorting
                // let's go with first
                fieldname = fieldname.getFieldname();
            } else if (!fieldname) {
                // not even a field... return !
                return this;
            }

            this.getField(fieldname).toggleSort();

            return this;
        },

        initializeResultDefinition: function () {
            var results = new this.collectionClass();
            this.set('results', results);
            // delegate events for results
            results
                .on('change', this.triggerResultChange)
                .on('add', this.triggerResultAdd)
                .on('remove', this.triggerResultRemove)
                .on('reset', this.triggerResultReset);
            return this;
        },

        triggerResultChange: function (result, chg) {
            this.trigger('change:result', this, result, chg);
            var changes = { changes: { result: {} } };
            changes.changes.result[result.id] = chg.changes;
            this.trigger('change', this, result, changes);
        },

        triggerResultAdd: function (collection, results, changes) {
            var result = results.at(changes.index);
            this.trigger('add:result', this, result, changes);
            this.trigger('change', this, result, {add: {result: changes}});
        },

        triggerResultRemove: function (result, results, changes) {
            this.trigger('remove:result', this, result, changes);
            var chg = { remove: { result: {} } };
            chg.remove.result[result.id] = changes;
            this.trigger('change', this, result, chg);
        },

        triggerResultReset: function (results, changes) {
            this.trigger('reset:result', this, results.models);
            this.trigger('change', this, results.models, {
                                            reset: { result: true } });
        },

        getResults: function () {
            return this.get('results');
        },

        getResult: function (id) {
            return this.getResults().get(id);
        },

        getQuery: function () {
            return this.get('query');
        },

        setQuery: function (q) {
            this.set('query', q);
            return this;
        },



        // create query builder for current query
        getQueryBuilder: function (options) {
            var q = new QueryBuilder(options);
            return q;
        },

        // overryde sync to call elasticsearch
        sync: function (method, model, options, defaults) {
            // only read is allowed
            if (method !== 'read') {
                throw new Exception(_.template('unknown method <%= method %> for Configurateur model', {
                    method: method
                }));
            }
            // default options, unless specified
            options || (options = {});
            // default JSON request options
            var params = {type: 'POST', dataType: 'json'};
            // Ensure that we have a URL.
            if (!options.url) {
                params.url = getValue(model, 'url') || urlError();
            }
            if (!options.data) {
                params.contentType = 'application/json';
                var querybuilder = model.getQueryBuilder(options);
                params.data = JSON.stringify(querybuilder.buildSearch(model, defaults));
            }

            return $.ajax(_.extend(params, options));
        },

        getFetchDefaults: function (defaults) {
            return _.defaults(defaults, {
                size: this.get('page_length')
            });
        },

        setLoading: function(isLoading) {
            this.set('loaded', !isLoading);
        },

        // override fetch method to update local collections
        // instead of recreating the model
        fetch: function(defaults, options) {
            options = options ? _.clone(options) : {};
            var model = this;
            var success = options.success;
            // trigger loading only
            this.setLoading(!options.add);
            options.success = function(resp, status, xhr) {
                var results = model.parse(resp, xhr);

                model.getFacets().onServerResponse(resp, xhr);
                if (results) {
                    if (!options.add) {
                        model.getResults().reset(results);
                    } else {
                        model.getResults().add(results);
                    }
                }
                model.setLoading(false);

                if (success) success(model, resp);
            };
            options.error = Backbone.wrapError(options.error, model, options);
            return (this.sync || Backbone.sync).call(this, 'read', this, options, model.getFetchDefaults(defaults));
        },

        parse: function (response, xhr) {
            var res = [], item;
            this.set('total', response.hits.total);
            if (!response.hits.total) {
                return res;
            }
            for (var i=0, l=response.hits.hits.length ; i<l ; i++ ) {
                item = response.hits.hits[i].fields || response.hits.hits[i]._source;
                item.id = response.hits.hits[i]._id;
                res.push(item);
            }
            return res;
        },


        // is there a next page ?
        hasNextPage: function () {
            return this.getCurrentPage() < Math.ceil(this.get('total') / this.get('page_length'));
        },

        getCurrentPage: function () {
            return Math.ceil(this.getResults().length / this.get('page_length')) ;
        },

        fetchNextPage: function () {
            var self = this;
            return this.fetch({
                "from": this.getResults().length,
                "size": this.get('page_length')
            }, {add: true});
        },

        fetchFirstPage: function () {
            return this.fetch({
                "from": 0,
                "size": this.get('page_length')
            }, {add: false});
        }

    });

    return Query;
});

