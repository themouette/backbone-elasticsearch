define(function () {
    var Exception = function (message) {
        this.message = message;
    };

    Exception.prototype.toString = function () {
        return this.message;
    };

    return Exception;
});
