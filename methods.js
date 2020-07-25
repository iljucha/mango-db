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
 * @typedef {import("@iljucha/mango-db/lib/types").Find} Find
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
    let $ok = 0, i = 0
    /** @type {Logic} */
    let $logic
    let keys = Object.keys(query[key])
    let kLength = keys.length
    for (i; i < kLength; i++) {
        $logic = LOGICS[keys[i]]
        if (item[key] && $logic && $logic(query[key][keys[i]], item[key])) {
            $ok++
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
    const copy = flatten({ ...item })

    return keys.every(key => {
        if (query[key] === copy[key]) {
            return true
        }
       
        if (logic(query, copy, key) === true) {
            return true
        }
        
        $logicGate = LOGICGATES[key]
        if ($logicGate) {
            return $logicGate(query[key], copy)
        }
    })
}

/** @type {Find} */
export const findOptions = {
    $skip: 0,
    $limit: Infinity,
    $reverse: false
}

/**
 * @param {Query} query
 * @param {Item[]} items
 * @param {Find} [options]
 */
export async function find(query, items, options) {
    options = { ...findOptions, ...options }
    let { $limit, $reverse, $skip } = options
    const len = items.length, results = [], keys = Object.keys(query)
    let i = $reverse === false ? (0 + $skip) : ((len - $skip) - 1)
    if ($limit === 0) {
        return results
    }
    const next = () => $reverse === false ? i++ : i--
    while (items[i] && results.length !== $limit) {
        if (match(query, items[i], keys)) {
            results.push(items[i])
        }
        next()
    }
    return results
}