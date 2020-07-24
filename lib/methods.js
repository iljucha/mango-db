// @ts-check
import { LOGICGATES } from "./logicgates.js"
import { LOGICS } from "./logics.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 * @typedef {import("@iljucha/mango-db/lib/types").Configuration} Configuration
 * @typedef {import("@iljucha/mango-db/lib/types").QueryOption} QueryOption
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Logic} Logic
 * @typedef {import("@iljucha/mango-db/lib/types").LogicGate} LogicGate
 * @typedef {import("@iljucha/mango-db/lib/types").Update} Update
 * @typedef {import("@iljucha/mango-db/lib/types").UpdateResult} UpdateResult
 */

/**
 * @param {any} value
 * @returns {string}
 * @example
 * getType(1337) // returns "number"
 * getType("1337") // returns "string"
 * getType({}) // returns "Object"
 * getType([]) // returns "Array"
 */
export function getType(value) {
    let type = typeof value
    if (type === "object") {
        return value ? Object.prototype.toString.call(value).slice(8, -1) : "null"
    }
    return type
}

/**
 * @param {any} value
 * @returns {boolean}
 */
export function isObject(value) {
    return value !== null && Object.prototype.toString.call(value) === "[object Object]"
}

/**
 * Flattens object
 * @param {any} obj 
 */
export function flatten(obj) {
    return Object.assign({}, ...function _flatten(child, path = []) {
        return [].concat(...Object.keys(child).map(key => isObject(child[key])
            ? _flatten(child[key], path.concat([key]))
            : ({ [path.concat([key]).join(".")] : child[key] })
        ))
    }(obj))
}

/**
* @param {any[]} arr 
* @param {any} item 
* @returns {{stack: number, index: number}}
*/
export function itemIndex(arr, item) {
    let stack = 0, index
    for (stack; stack < arr.length; stack++) {
        index = arr[stack].indexOf(item)
        if (index > -1) {
            return { stack, index }
        }
    }
    return { stack: -1, index: -1 }
}

/**
 * @param {any} condition 
 * @param {any} message
 * @example
 * assert(false, "false will never be true") // throws
 * assert(true, "true will be true") // does nothing
 */
export function assert(condition, message) {
    if (!condition) {
        throw Error(message)
    }
}

/**
 * @param {QueryOption} query 
 * @param {Item} item 
 * @param {string} key
 * @returns {boolean}
 */
export function logic(query, item, key) {
    if (query[key] === item[key]) {
        return true
    }
    let $ok = 0, i = 0
    /** @type {Logic} */
    let $logic
    let $condition
    let keys = Object.keys(query[key])
    let kLength = keys.length
    for (i; i < kLength; i++) {
        $logic = LOGICS[keys[i]]
        if (item[key] && $logic) {
            $condition = $logic(query[key][keys[i]], item[key])
            if ($condition === true) {
                $ok++
            }
            else {
                break
            }
        }
        else {
            break
        }
    }
    return kLength === $ok
}

/**
 * @param {Query} query 
 * @param {Item} item 
 * @param {string[]} keys
 * @returns {boolean}
 */
export function match(query, item, keys) {
    /** @type {LogicGate} */
    let $logicGate
    return keys.every(key => {
        if (query[key] === item[key]) {
            return true
        }
        if (logic(query, item, key) === true) {
            return true
        }
        $logicGate = LOGICGATES[key]
        if ($logicGate) {
            return $logicGate(query[key], item)
        }
    })
}