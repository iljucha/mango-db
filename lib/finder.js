// @ts-check
import { find } from "./methods.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 * @typedef {import("@iljucha/mango-db/lib/types").Join} Join
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Find} Find
 */

export default class Finder {
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
    #linkedResults = []

    /**
     * @public
     * @param {Query} query 
     * @param {Item[]} items 
     */
    constructor(query, items) {
        this.#query = query
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
        if (this.#linkedResults.length > 0) {
            tmp = this.#linkedResults
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
     * @param {Join} link 
     */
    join(link) {
        this.#joins.push(link)
        return this
    }

    /**
     * @private
     */
    async link() {
        this.#linkedResults = []
        let found, linked, linking
        let promises = []
        this.#joins.map(link => promises.push(link.finder.toArray()))
        let res = await Promise.all(promises)
        this.results.map(item => {
            linking = { ...item }
            linked = 0
            this.#joins.map((link, counter) => {
                found = res[counter].find(_item => item[link.where[0]] === _item[link.where[1]])
                if (found) {
                    linking[link.as || link.where[0]] = found
                    linked++
                }
            })
            if (this.#joins.length === linked) {
                this.#linkedResults.push(linking)
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
        await this.link()
        return this
    }

    /**
     * @returns {Promise<Item[]>}
     */
    async toArray() {
        await this.exec()
        return this.results
    }

    /**
     * @param {(value: Item, index: number, array: Item[]) => void} callbackfn
     */
    async forEach(callbackfn) {
        await this.exec()
        return this.results.forEach(callbackfn)
    }

    /**
     * @param {(value: Item, index: number, array: Item[]) => void} callbackfn
     */
    async map(callbackfn) {
        await this.exec()
        return this.results.map(callbackfn)
    }
}