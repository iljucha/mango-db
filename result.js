// @ts-check

/**
 * @typedef {Object.<string, any>} Item
 */

export default class Result {
    /** @type {Error} */
    #error = undefined
    /** @type {Item[]} */
    #items = []

    /**
     * 
     * @param {Error} error 
     * @param {Item[]} items 
     */
    constructor(error, items) {
        this.#error = error
        this.#items = items || []
    }

    get error() {
        return this.#error
    }

    get first() {
        if (this.#items.length >= 1) {
            return this.#items[0]
        }
        return null
    }

    get last() {
        if (this.#items.length >= 1) {
            return this.#items[this.#items.length - 1]
        }
        return null
    }

    get items() {
        return this.#items
    }

    get itemsCount() {
        return this.#items.length
    }
}