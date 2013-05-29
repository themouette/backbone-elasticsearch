require.config({
    deps: ["jquery", "test/Query", "test/QueryBuilder", "test/FilterDefinitionTest"],
    paths: {
        "test": ".",
        "bb-es": "..",

        // now libs
        "jquery": "./resources/jquery-1.8.2",
        "underscore": "./resources/lodash",
        "backbone": "./resources/backbone"
    },
    shim: {
        "backbone": {
            deps: ["underscore", "jquery"],
            exports: "Backbone"
        },
        "underscore": {
            exports: "_"
        },
        "jquery": {
            exports: "$"
        }
    }
});
