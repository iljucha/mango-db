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
     * @public
     * @param {Query} [query] 
     */
    query(query) {
        this.#query = query || {}
        return this
    }

    /**
     * @public
     * @param {Query} [query] 
     */
    mixQuery(query) {
        this.#query = { ...this.#query, ...query || {} }
        return this
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
        let join = {}, promises = [], mixes = []
        this.#joins.map((j, i) => {
            mixes[i] = []
            this.#results.map((item) => mixes[i].push(item[j.where[0]]))
            promises.push(j.cursor.mixQuery({ [j.where[1]]: { $in: mixes[i] } }).toArray())
        })
        let res = await Promise.all(promises)
        this.#results.map((item) => {
            join = { ...item }
            this.#joins.map((j, i) => join[j.as] = { ...res[i].find(_i => join[j.where[0]] === _i[j.where[1]]) })
            this.#joinedResults.push(join)
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
