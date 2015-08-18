/*
 *
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 *
*/

var pluginObjects = {}

// qt 5.2 forbids assigning new properties to JS module
// global variable used by plugins to store temporary data
var global = {};

function addPlugin(pluginName, pluginObject) {
    pluginObjects[pluginName] = pluginObject
}

function messageHandler(received) {
    if (typeof received === 'undefined')
        return false;
    if (typeof received.messageType === 'undefined')
        return false;
    if (received.messageType === "callPluginFunction") {
        if (typeof received.plugin === 'undefined' || typeof received.func == 'undefined')
            return false;
        execMethod(received.plugin, received.func, received.params);
    }
    return true;
}

function execMethod(pluginName, functionName, params) {
    if (typeof pluginObjects[pluginName][functionName] != "function")
        return false;

    //  Extract the success callback id and failure callback ids sent by the plugin side
    var scId = params.shift();
    var ecId = params.shift();

    pluginObjects[pluginName][functionName].apply(this, params);
    return true;
}
