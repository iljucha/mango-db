// @ts-check
import { ERR, TYPE } from "./constants.js"
import { getType, assert, find } from "./methods.js"
import { serialize, deserialize } from "./stream.js"
import Festival from "@iljucha/festival"
import Cursor from "./cursor.js"
import { Schema } from "./schema.js"

/**
 * @typedef {import("./types").SchemeProperties} SchemeProperties
 * @typedef {import("./types").Item} Item
 * @typedef {import("./types").Configuration} Configuration
 * @typedef {import("./types").Query} Query
 * @typedef {import("./types").Result} Result
 * @typedef {import("./types").Results} Results
 * @typedef {import("./types").EventHandler} EventHandler
 * @typedef {import("./types").CursorOptions} CursorOptions
 */

export default class MangoDB {
    /** @type {string} */
    #name = undefined
    /** @type {string} */
    #path = undefined
    /** @type {Schema} */
    #schema = new Schema({})
    /** @type {Item[]} */
    #data = []
    /** @type {Festival} */
    #events = new Festival()

    /** Creates a MangoDB Object */
    constructor() {}

    /**
     * @param {string} event 
     * @param {EventHandler} callback 
     */
    on(event, callback) {
        this.#events.on(event, callback)
    }

    /**
     * @param {string} event 
     * @param {EventHandler} callback 
     */
    off(event, callback) {
        this.#events.off(event, callback)
    }

    /**
     * @param {Configuration} config 
     * @example
     * DB.configure({
     *      name: "users"
     *      path: "./"
     *      schema: {
     *          id: {
     *              type: "string",
     *              minSize: 32,
     *              maxSize: 32,
     *              default: () => generateId()
     *          }
     *      }
     * })
     */
    configure(config) {
        Object.keys(config).map(key => this[key] = config[key])
    }

    /**
     * serializes into configured path and name
     */
    async serialize() {
        try {
            assert(this.name, ERR.MISS_NAME)
            assert(this.path, ERR.MISS_PATH)
            let write = await serialize(this.path + this.name, this.#data)
            assert(write === null, write)
            this.#events.trigger("serialize", null)
            return true
        }
        catch (error) {
            this.#events.trigger("error", error)
            return false
        }
    }

    /**
     * deserializes from configured path and name
     */
    async deserialize() {
        try {
            assert(this.name, ERR.MISS_NAME)
            assert(this.path, ERR.MISS_PATH)
            let read = await deserialize(this.path + this.name)
            assert(read.error === null, read.error)
            this.#data = read.data
            this.#events.trigger("deserialize", null)
            return true
        }
        catch (error) {
            this.#events.trigger("error", error)
            return false
        }
    }

    /**
     * Your MangoDB's name
     * @param {string} value
     */
    set name(value) {
        assert(typeof value === TYPE.STR, ERR.ARG_TYPE)
        this.#name = value
    }

    get name() {
        return this.#name
    }

    /**
     * The path your MangoDB is going to be serialized
     * @param {string} value
     */
    set path(value) {
        assert(typeof value === TYPE.STR, ERR.ARG_TYPE)
        this.#path = value
    }

    get path() {
        return this.#path
    }

    /**
     * Sets a schema for your MangoDB database
     * @param {SchemeProperties} value
     */
    set schema(value) {
        this.#schema = new Schema(value)
    }

    /**
     * @private
     * @param {Item[]} items
     * @return {Promise<Results>}
     */
    async insert(...items) {
        try {
            let _ids = this.#data.map(item => item._id)
            let iKeys = [ ..._ids ]
            items = items.map((item) => {
                item = { ...this.#schema.defaults, ...item }
                assert(item["_id"], ERR.MISS_PK)
                iKeys.push(item["_id"])
                return item
            })
            const dupe = new Set(iKeys).size !== iKeys.length 
            assert(dupe === false, ERR.PK_DUPES)
            let res = await this.#schema.test(items)
            assert(res.error === null, res.error)
            this.#data.push(...res.items)
            const copy = [ ...res.items ]
            this.#events.trigger("insert", copy)
            return { error: null, items: copy }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, items: null }
        }
    }

    /**
     * @public
     * @param {Item} item
     * @return {Promise<Result>}
     */    
    async insertOne(item) {
        let insert = await this.insert(item)
        let insertedItem = insert.items[0] || null
        return { error: insert.error, item: insertedItem }
    }

    /**
     * @public
     * @param {Item[]} items
     * @return {Promise<Results>}
     */    
    async insertMany(items) {
        let insert = await this.insert(...items)
        let insertedItems = insert.items || null
        return { error: insert.error, items: insertedItems }
    }

    /**
     * @private
     * @param {Item[]} items
     * @returns {Promise<Results>}
     */
    async delete(items) {
        try {
            items.map(item => {
                let index = this.#data.indexOf(item)
                assert(index >= 0, ERR.ITEM_POS)
                this.#data.splice(index, 1)
            })
            const copy = [ ...items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise<Result>}
     */
    async deleteOne(query) {
        try {
            assert(arguments.length === 1, ERR.ARGS_LEN)
            const results = (await this.find(query).limit(1).exec()).pointer
            assert(results.length === 1, ERR.NO_ITEMS)
            let res2 = await this.delete(results)
            assert(res2.error === null, res2.error)
            this.#events.trigger("delete", res2.items)
            return { error: null, item: res2.items[0] }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, item: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise<Results>}
     */
    async deleteMany(query) {
        try {
            assert(arguments.length === 1, ERR.ARGS_LEN)
            const results = (await this.find(query).exec()).pointer
            assert(results.length === 0, ERR.NO_ITEMS)
            let res2 = await this.delete(results)
            assert(res2.error === null, res2.error)
            this.#events.trigger("delete", res2.items)
            return { error: null, items: res2.items }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Item} update
     * @return {Promise<Result>}
     */
    async updateOne(query, update) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(update) === TYPE.OBJ, ERR.ARG_TYPE)
            const results = (await this.find(query).limit(1).exec()).pointer
            assert(results.length > 0, ERR.NO_ITEMS)
            let res2 = await this.update(results, update)
            assert(res2.error === null, res2.error)
            this.#events.trigger("update", res2.items)
            return { error: null, item: res2.items[0] }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, item: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Item} update
     * @return {Promise<Results>}
     * @example
     * DB.updateMany({}, { updated: new Date() })
     *      .then(res => console.log("updated", res.items))
     *      .then(res => console.log("update failed"))
     */
    async updateMany(query, update) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(update) === TYPE.OBJ, ERR.ARG_TYPE)
            const results = (await this.find(query).exec()).pointer
            assert(results.length > 0, ERR.NO_ITEMS)
            let res2 = await this.update(results, update)
            assert(res2.error === null, res2.error)
            this.#events.trigger("update", res2.items)
            return { error: null, items: res2.items }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, items: null }
        }
    }

    /**
     * @private
     * @param {Item[]} items 
     * @param {Item} update
     * @returns {Promise<Results>}
     */
    async update(items, update) {
        try {
            assert(update["_id"] === undefined, ERR.PK_UP)
            const mixins = items.map(item => ({ ...item, ...update }))
            let res2 = await this.#schema.test(mixins)
            assert(res2.error === null, res2.error)
            assert(items.length === res2.items.length, ERR.FATAL)
            items.map((item, idx) => {
                let index = this.#data.indexOf(item)
                assert(index >= 0, ERR.ITEM_POS)
                this.#data[index] = res2.items[idx]
            })
            const copy = [ ...res2.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} [query]
     * @returns {Cursor}
     * @example
     * let cur = DB.find().limit(100).skip(10).reverse()
     * async function doSomething(cursor) {
     *      await cursor.exec() // and
     *      cursor.results
     *      await cursor.first()
     *      await cursor.last()
     *      await cursor.forEach(item => ...) // or
     *      await cursor.map(item => ...) // or
     * }
     */
    find(query) {
        return new Cursor(query || {}, this.#data)
    }
}
