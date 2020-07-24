// @ts-check
/**
 * @typedef {import("@iljucha/mango-db/lib/types").Logic} Logic
 */

import { getType } from "./methods.js"

export const LOGICS = {
    /** @type {Logic} */
    $regexp: (regexp, str) => regexp.test(str),
    /** @type {Logic} */
    $includes: (substr, str) => str.includes(substr),
    /** @type {Logic} */
    $eq: (val1, val2) => val1 === val2,
    /** @type {Logic} */
    $ne: (val1, val2) => val1 !== val2,
    /** @type {Logic} */
    $lt: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 < val1
    },
    /** @type {Logic} */
    $lte: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 <= val1
    },
    /** @type {Logic} */
    $gt: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 > val1
    },
    /** @type {Logic} */
    $gte: (val1, val2) => {
        val1 = typeof val1 === "string" ? val1.length : val1
        val2 = typeof val2 === "string" ? val2.length : val2
        return val2 >= val1
    },
    /** @type {Logic} */
    $in: (arr, val) => arr.indexOf(val) >= 0,
    /** @type {Logic} */
    $nin: (arr, val) => arr.indexOf(val) === -1,
    /** @type {Logic} */
    $exists: (bool, val) => bool === true ? (val ? true : false) : (val ? false : true),
    /** @type {Logic} */
    $type: (type, val) => type === getType(val)
}
