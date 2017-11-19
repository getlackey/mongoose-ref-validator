/*jslint node:true, nomen: true, unparam:true */
'use strict';
/*global setImmediate */
/*
    Copyright 2015 Enigma Marketing Services Limited

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

var mongoose = require('mongoose'),
    assert = require('assert'),
    Q = require('q');

module.exports = function (schema, options) {
    var models = {},
        refs = {},
        opts = {};

    opts.onDeleteRestrict = (options && options.onDeleteRestrict) || [];
    /**
     * resolves an object path (eg. test.prop.x)
     * if any of the properties is an array it will iterate
     * and return all elements
     *
     * @param  {object} obj
     * @param  {string} path
     * @return {array}
     */
    function getItems(obj, path) {
        var pathItems = Array.isArray(path) ? path : path.split('.'),
            elm = obj,
            items = [];

        pathItems.some(function (key, index) {
            var isLastKey = (index + 1 === pathItems.length);
            elm = elm[key];

            if (elm === undefined) {
                return false;
            }

            if (Array.isArray(elm)) {
                elm.forEach(function (val) {
                    if (isLastKey) {
                        items.push(val);
                    } else {
                        items = items.concat(getItems(val, pathItems.slice(index + 1)));
                    }
                });
                return true;
            }

            // not array, so, object or primitive
            if (isLastKey) {
                items.push(elm);
                return true;
            }

            return false;
        });

        return items;
    }
    /**
     * Sets middleware on the referenced models
     *
     * @param {object} Model - The current model, where this plugin is running
     * @param {string} modelName - the model that is being referenced
     * @param {string} path - the property with the reference
     */
    function setMiddleware(Model, modelName, path) {
        var RefModel;

        // We only apply the middleware on the provided 
        // paths in the plugin options.
        if (opts.onDeleteRestrict.indexOf(path) === -1) {
            return;
        }

        RefModel = models[modelName];
        RefModel.schema.pre('remove', function (next) {
            var doc = this,
                q = {};

            q[path] = doc._id;

            Model
                .findOne(q)
                .exec()
                .then(function (doc) {
                    if (doc) {
                        return next(new Error('Unable to delete as ref exist in ' + Model.modelName + ' id:' + doc._id));
                    }
                    next();
                }, next);
        });
    }

    // Store the referenced models and list of properties from the current
    // schema that have references
    schema.on('init', function (Model) {
        // look into the current schema and see
        // if there are any properties defined as being 
        // external references
        //
        // when any refs are found they are stores into 
        // a refs global var and the corresponding models are 
        // loaded into the global models var.
        // For each model additional middleware will be set
        // preventing the removal of any element being used.
        (function getRefItems(obj, path) {
            if (!path) {
                path = [];
            }

            if (Array.isArray(obj)) {
                obj.forEach(function (item) {
                    setImmediate(getRefItems, item, path);
                });
            } else if (typeof obj === 'object') {
                if (obj.ref) {
                    refs[path.join('.')] = obj.ref;
                    if (!models[obj.ref]) {
                        try {
                            models[obj.ref] = Model.model(obj.ref);
                        } catch (e) {
                            if (e.name === 'MissingSchemaError') {
                                // couldn't find a clean way/event to 
                                // detect when a model was loaded
                                // so let's set this as null and wait
                                // for a timer to check it and load the right one
                                models[obj.ref] = [];
                            } else {
                                throw e;
                            }
                        }
                    }

                    if (Array.isArray(models[obj.ref])) {
                        // save it for later...
                        models[obj.ref].push(path.join('.'));
                    } else {
                        setMiddleware(Model, obj.ref, path.join('.'));
                    }
                } else {
                    Object.keys(obj).forEach(function (item) {
                        var newPath = path.slice(0);
                        newPath.push(item);

                        setImmediate(getRefItems, obj[item], newPath);
                    });
                }
            }
        }(schema.tree));

        // keep trying to load the pending modules until it either loads or
        // throws error
        (function checkPendingModels() {
            var reTry = false;

            Object.keys(models).forEach(function (key) {
                var item = models[key];
                if (Array.isArray(models[key])) {
                    try {
                        models[key] = Model.model(key);
                        item.forEach(function (pathName) {
                            setMiddleware(Model, key, pathName);
                        });
                    } catch (e) {
                        if (e.name === 'MissingSchemaError') {
                            reTry = true;
                        } else {
                            throw e;
                        }
                    }
                }
            });

            if (reTry) {
                setImmediate(checkPendingModels);
            }
        }());
    });

    schema.pre('save', function (next) {
        var doc = this,
            promises = [];

        Object.keys(refs).forEach(function (path) {
            var modelName = refs[path],
                Model = models[modelName];

            assert(Model, 'Unable to find model ' + modelName);

            getItems(doc, path).forEach(function (item) {
                var promise = Model
                    .findOne({
                        _id: item
                    })
                    .select('_id')
                    .lean(true)
                    .exec()
                    .then(function (record) {
                        if ((!record && item) || (!record && !item && doc.__proto__.schema.tree[path].required)) {
                            return {
                                path: path,
                                id: item
                            };
                        }
                        return null;
                    });

                promises.push(promise);
            });
        });

        Q.all(promises).then(function (items) {
            var Err = new mongoose.Error.ValidationError({}),
                errors = items.filter(function (item) {
                    return !!item;
                });

            errors.forEach(function (item) {
                if (item) {
                    if (Err.errors[item.path]) {
                        Err.errors[item.path] += ', ' + item.id;
                    } else {
                        Err.errors[item.path] = 'Invalid Ref. ' + item.id;
                    }
                }
            });

            return next(errors.length > 0 ? Err : null);
        }, next);
    });
};
