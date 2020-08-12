// @ts-check
/**
 * @typedef {import("./types").Projection} Projection
 * @typedef {import("./types").Item} Item
 * @typedef {import("./types").Configuration} Configuration
 * @typedef {import("./types").QueryOption} QueryOption
 * @typedef {import("./types").Query} Query
 * @typedef {import("./types").Logic} Logic
 * @typedef {import("./types").LogicExec} LogicExec
 * @typedef {import("./types").LogicGates} LogicGates
 * @typedef {import("./types").CursorOptions} CursorOptions
 * @typedef {import("./types").LogicGateExec} LogicGateExec
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
    }),
    /** @type {LogicGateExec} */
    $intern: (queryArr, item) => queryArr.every(query => {
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
 * @param {Item} item 
 */
function unflatten(item) {
    /** @type {Item} */
    let result = {}
    let keys
    let iKeys = Object.keys(item)
    iKeys.map(key => {
        keys = key.split(".")
        keys.reduce((r, e, j) => r[e] || (r[e] = isNaN(Number(keys[j + 1])) ? (keys.length - 1 == j ? item[key] : {}) : []), result)
    }) 
    return result
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
 * @param {Item} item 
 */
function flat(item) {
    let result = {}, isEmpty, p, i, l
    let recurseFlat = (cur, prop) => {
        if (Object(cur) !== cur) {
            result[prop] = cur
        }
        else if (Array.isArray(cur)) {
            l = cur.length
            for (i = 0; i < l; i++) {
                recurseFlat(cur[i], prop + "[" + i + "]")
            }
            if (l == 0) {
                result[prop] = []
            }
        }
        else {
            isEmpty = true
            for (p in cur) {
                isEmpty = false
                recurseFlat(cur[p], prop ? prop + "." + p : p)
            }
            if (isEmpty && prop) {
                result[prop] = {}
            }
        }
    }
    recurseFlat(item, "")
    return result
}

/**
 * @param {Query} query 
 * @param {Item} item 
 * @param {string[]} keys
 * @returns {boolean}
 */
export function match(query, item, keys) {
    /** @type {LogicGateExec} */
    let $logicGate
    /** @type {any} */
    const copy = flat(item)
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

/**
 * @param {Query} query
 * @param {Item[]} items
 * @param {CursorOptions} options
 * @returns {Promise<Item[]>}
 */
export async function find(query, items, options) {
    let { $limit, $reverse, $skip } = options
    let item, len = items.length
    const results = [], keys = Object.keys(query)
    let i = $reverse === false ? 0 : (len - 1)
    let skipped = 0
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

/**
 * @param {Item[]} items 
 * @param {Projection} projection 
 */
export function project(items, projection) {
    const projectionKeys = Object.keys(projection)
    let unflat = false 
    let hide = [], show = [], aliases = new Map()
    projectionKeys.map(key => {
        if (key.includes(".")) {
            unflat = true
        }
        if (projection[key] === false) {
            hide.push(key)
        }
        if (projection[key] === true) {
            show.push(key)
        }
        if (projection[key]["$alias"]) {
            hide.push(key)
            aliases.set(key, projection[key]["$alias"])
        }
    })
    let copy, newItem
    return items.map(item => {
        newItem = { ...item }
        copy = flat(newItem)
        projectionKeys.map(key => {
            if (aliases.has(key)) {
                newItem[aliases.get(key)] = copy[key]
            }
            if (hide.includes(key) && newItem[key]) {
                newItem[key] = undefined
            }
            else if (show.includes(key) && newItem[key]) {
                newItem[key] = copy[key]
            }
        })
        return unflat === true ? unflatten(newItem) : newItem
    })
}