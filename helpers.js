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