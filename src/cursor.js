// @ts-check
import { find, project } from "./methods.js"

/**
 * @typedef {import("./types").Join} Join
 * @typedef {import("./types").Query} Query
 * @typedef {import("./types").Item} Item
 * @typedef {import("./types").Projection} Projection
 * @typedef {import("./types").CursorOptions} CursorOptions
 */

export default class Cursor {
    /** @type {Item[]} */
    #items = []
    /** @type {Item[]} */
    #results = []
    /** @type {Query} */
    #query = {}
    /** @type {Join[]} */
    #joins = []
    /** @type {Projection} */
    #projection = {}
    /** @type {Item[]} */
    #joinedResults = []
    /** @type {CursorOptions} */
    #cursorOptions = {
        $skip: 0,
        $limit: Infinity,
        $reverse: false
    }

    /**
     * @param {Query} query
     * @param {Item[]} items 
     */
    constructor(query, items) {
        this.#query = query
        this.#items = items
    }

    /**
     * @param {Query} query
     */
    query(query) {
        this.#query = query 
        return this
    }

    /**
     * @param {Query} query
     */
    mixQuery(query) {
        this.#query = { ...this.#query, ...query }
        return this
    }

    get results() {
        /** @type {Item[]} */
        let tmp = []
        if (this.#joinedResults.length > 0) {
            tmp = this.#joinedResults
        }
        else {
            tmp = [ ...this.#results ]
        }
        if (Object.keys(this.#projection).length > 0) {
            tmp = project(tmp, this.#projection)
        }
        return tmp
    }

    get pointer() {
        return this.#results
    }

    /**
     * @param {boolean} value
     */
    reverse(value) {
        this.#cursorOptions.$reverse = value
        return this
    }

    /**
     * @param {number} amount 
     */
    skip(amount) {
        this.#cursorOptions.$skip = amount
        return this
    }

    /**
     * @param {number} amount 
     */
    limit(amount) {
        this.#cursorOptions.$limit = amount
        return this
    }

    /**
     * @param {Join} join 
     */
    join(join) {
        this.#joins.push(join)
        return this
    }

    /**
     * @param {Projection} projection 
     */
    project(projection) {
        this.#projection = projection
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
            promises.push(j.cursor.mixQuery({ $intern: [{[j.where[1]]: { $in: mixes[i] }}] }).toArray())
        })
        let res = await Promise.all(promises)
        this.#results.map((item) => {
            join = { ...item }
            this.#joins.map((j, i) => join[j.as] = res[i].find(_i => join[j.where[0]] === _i[j.where[1]]))
            this.#joinedResults.push(join)
        })
    }
 
    async exec() {
        this.#results = await find(this.#query, this.#items, this.#cursorOptions)
        if (this.#joins.length > 0) {
            await this.createJoin()
        }
        return this
    }

    /**
     * @param {number} index 
     */
    async single(index) {
        await this.exec()
        return this.results[index]
    }

    /**
     * @returns {Promise<Item[]>}
     */
    async toArray() {
        return (await this.exec()).results
    }

    /**
     * @param {(value: Item, index: number, array: Item[]) => void} callbackfn
     */
    async each(callbackfn) {
        return (await this.toArray()).forEach(callbackfn)
    }
}
