// @ts-check
/**
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 * @typedef {import("@iljucha/mango-db/lib/types").Configuration} Configuration
 * @typedef {import("@iljucha/mango-db/lib/types").QueryOption} QueryOption
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Logic} Logic
 * @typedef {import("@iljucha/mango-db/lib/types").LogicExec} LogicExec
 * @typedef {import("@iljucha/mango-db/lib/types").LogicGates} LogicGates
 * @typedef {import("@iljucha/mango-db/lib/types").CursorOptions} CursorOptions
 * @typedef {import("@iljucha/mango-db/lib/types").LogicGateExec} LogicGateExec
 */

/**
 * @typedef {LogicGates}
 */
const LOGICGATES = {
    /** @type {LogicGateExec} */
    $or: (queryArr, item) => queryArr.some(query => {
        const keys = Object.keys(query)
        return keys.every(key => logic(query, item, key))
    }),

    /** @type {LogicGateExec} */
    $and: (queryArr, item) => queryArr.every(query => {
        const keys = Object.keys(query)
        return keys.every(key => logic(query, item, key))
    })
}

/**
 * @typedef {Logic}
 */
const LOGICS = {
    /** @type {LogicExec} */
    $regexp: (regexp, str) => regexp.test(str),
    /** @type {LogicExec} */
    $includes: (substr, str) => str.includes(substr),
    /** @type {LogicExec} */
    $eq: (val1, val2) => val1 === val2,
    /** @type {LogicExec} */
    $ne: (val1, val2) => val1 !== val2,
    /** @type {LogicExec} */
    $lt: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 < val1
    },
    /** @type {LogicExec} */
    $lte: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 <= val1
    },
    /** @type {LogicExec} */
    $gt: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 > val1
    },
    /** @type {LogicExec} */
    $gte: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 >= val1
    },
    /** @type {LogicExec} */
    $in: (arr, val) => arr.indexOf(val) >= 0,
    /** @type {LogicExec} */
    $nin: (arr, val) => arr.indexOf(val) === -1,
    /** @type {LogicExec} */
    $exists: (bool, val) => bool === true ? (val ? true : false) : (val ? false : true),
    /** @type {LogicExec} */
    $type: (type, val) => type === getType(val)
}

/**
 * @param {any} value
 * @returns {string}
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
function isObject(value) {
    return value !== null && Object.prototype.toString.call(value) === "[object Object]"
}

/**
 * @param {any} value
 * @returns {boolean}
 */
function plainObj(value) {
    return [
        typeof value === "object",
        value !== null,
        !(value instanceof Date),
        !(value instanceof RegExp),
        !(Array.isArray(value) && value.length === 0),
        !(value instanceof Map),
        !(value instanceof Set)
    ].every(Boolean)
}

/**
 * @param {any} obj 
 * @param {string} path
 * @returns {any}
 */
function flatten(obj, path = null) {
    /** @type {any} */
    let value
    /** @type {string} */
    let newPath
    return Object.keys(obj).reduce((acc, key) => {
        value = obj[key]
        newPath = [path, key].filter(Boolean).join(".")
        return isObject(value)
            ? { ...acc, ...flatten(value, newPath) }
            : { ...acc, ...{ [newPath]: value } }
    }, {})
}

/**
 * @param {any} obj 
 * @returns {any}
 */
function unflatten(obj) {
    /** @type {any} */
    let result = {}
    Object.keys(obj).forEach(k => setValue(result, k, obj[k]))
    return result
}

/**
 * 
 * @param {any} obj 
 * @param {string} path 
 * @param {void} value 
 */
function setValue(obj, path, value) {
    /** @type {string[]} */
    let way = path.split(".")
    /** @type {any} */
    let last = way.pop();
    way.reduce((pV, cV, cI, arr) => {
        pV[cV] = pV[cV] || (isFinite(cI + 1 in arr ? arr[cI + 1] : last) ? [] : {})
    }, obj)[last] = value
}

/**
 * @param {any} condition 
 * @param {any} message
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
function logic(query, item, key) {
    /** @type {LogicExec} */
    let $logic
    let keys = Object.keys(query[key])
    let kLength = keys.length, i = 0
    for (i; i < kLength; i++) {
        $logic = LOGICS[keys[i]]
        if (!item[key] || !$logic || !$logic(query[key][keys[i]], item[key])) {
            return false
        }
    }
    return true
}

/**
 * @param {Query} query 
 * @param {Item} item 
 * @param {string[]} keys
 * @returns {boolean}
 */
function match(query, item, keys) {
    /** @type {LogicGateExec} */
    let $logicGate
    /** @type {any} */
    const copy = flatten({ ...item })
    return keys.every(key => {
        if (query[key] === copy[key]) {
            return true
        }
        else if (typeof query[key] === "object") {
            if (logic(query, copy, key)) {
                return true
            }
            $logicGate = LOGICGATES[key]
            if ($logicGate) {
                return $logicGate(query[key], copy)
            }
        }
        return false
    })
}

/** @type {CursorOptions} */
const findOptions = {
    $skip: 0,
    $limit: Infinity,
    $reverse: false
}

/**
 * @param {Query} query
 * @param {Item[]} items
 * @param {CursorOptions} [options]
 * @returns {Promise<Item[]>}
 */
export async function find(query, items, options) {
    options = { ...findOptions, ...options }
    let { $limit, $reverse, $skip } = options
    let item, len = items.length
    const results = [], keys = Object.keys(query)
    let i = $reverse === false ? 0 : (len - 1), skipped = 0
    if ($limit <= 0) {
        return results
    }
    if ($skip < 0) {
        $skip = 0
    }
    const next = () => $reverse === false ? i++ : i--
    while (items[i] && results.length !== $limit) {
        item = items[i]
        if (match(query, item, keys)) {
            $skip <= skipped ? results.push(item) : skipped++
        }
        next()
    }
    return results
}