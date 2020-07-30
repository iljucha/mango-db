// @ts-check
import { find } from "./methods.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").Join} Join
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 */

export default class Cursor {
    /** @type {Item[]} */
    #items = []
    /** @type {Item[]} */
    #results = []
    /** @type {Query} */
    #query = {}
    #skip = 0
    #limit = Infinity
    /** @type {Join[]} */
    #joins = []
    #reverse = false
    /** @type {Item[]} */
    #joinedResults = []

    /**
     * @public
     * @param {Query} [query] 
     * @param {Item[]} items 
     */
    constructor(query, items) {
        this.#query = query || {}
        this.#items = items
    }

    /**
     * @private
     */
    get findOptions() {
        return {
            $limit: this.#limit,
            $reverse: this.#reverse,
            $skip: this.#skip
        }
    }

    /**
     * @public
     */
    get results() {
        let tmp = []
        if (this.#joinedResults.length > 0) {
            tmp = this.#joinedResults
        }
        else {
            tmp = [ ...this.#results ]
        }
        return tmp
    }

    /**
     * @public
     */
    get pointer() {
        return this.#results
    }

    /**
     * @public
     * @param {number} amount 
     */
    skip(amount) {
        this.#skip = amount
        return this
    }

    /**
     * @public
     * @param {number} amount 
     */
    limit(amount) {
        this.#limit = amount
        return this
    }

    /**
     * @public
     * @param {Join} join 
     */
    join(join) {
        this.#joins.push(join)
        return this
    }

    /**
     * @private
     */
    async createJoin() {
        this.#joinedResults = []
        let found, linked = 0, linking = {}, promises = []
        this.#joins.map(link => promises.push(link.cursor.toArray()))
        let res = await Promise.all(promises)
        this.results.map((item) => {
            linking = { ...item }
            linked = 0
            this.#joins.map((link, idx) => {
                found = res[idx].find(_item => item[link.where[0]] === _item[link.where[1]])
                if (found) {
                    linking[link.as || link.where[0]] = found
                    linked++
                }
            })
            if (this.#joins.length === linked) {
                this.#joinedResults.push(linking)
            }
        })
    }

    /**
     * @public
     */
    reverse() {
        this.#reverse = true
        return this
    }
 
    /**
     * @public
     */
    async exec() {
        this.#results = await find(this.#query, this.#items, this.findOptions)
        if (this.#joins.length > 0) {
            await this.createJoin()
        }
        return this
    }

    /**
     * @public
     */
    async first() {
        await this.exec()
        return this.results[0]
    }

    /**
     * @public
     */
    async last() {
        await this.exec()
        return this.results[this.results.length - 1]
    }

    /**
     * @returns {Promise<any[]>}
     */
    async toArray() {
        await this.exec()
        return this.results
    }

    /**
     * @param {(value: any, index: number, array: any[]) => void} callbackfn
     */
    async forEach(callbackfn) {
        await this.exec()
        return this.results.forEach(callbackfn)
    }

    /**
     * @param {(value: any, index: number, array: any[]) => void} callbackfn
     */
    async map(callbackfn) {
        await this.exec()
        return this.results.map(callbackfn)
    }
}