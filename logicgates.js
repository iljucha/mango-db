// @ts-check
import { logic } from "./methods.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").LogicGate} LogicGate
 */

export const LOGICGATES = {
    /** @type {LogicGate} */
    $or: (queryArr, item) => queryArr.some(query => {
        const keys = Object.keys(query)
        return keys.every(key => logic(query, item, key))
    }),

    /** @type {LogicGate} */
    $and: (queryArr, item) => queryArr.every(query => {
        const keys = Object.keys(query)
        return keys.every(key => logic(query, item, key))
    })
}