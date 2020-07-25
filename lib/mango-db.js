// @ts-check
import CBOR from "@iljucha/cbor"
import fs from "fs"
import { ERR, TYPE } from "./constants.js"
import { getType, assert } from "./methods.js"
import Festival from "@iljucha/festival"
import Finder from "./finder.js"
import { Schema } from "./schema.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").SchemeProperties} SchemeProperties
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 * @typedef {import("@iljucha/mango-db/lib/types").Join} Join
 * @typedef {import("@iljucha/mango-db/lib/types").Configuration} Configuration
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Result} Result
 * @typedef {import("@iljucha/mango-db/lib/types").Results} Results
 * @typedef {import("@iljucha/mango-db/lib/types").EventHandler} EventHandler
 * @typedef {import("@iljucha/mango-db/lib/types").Find} Find
 */

export default class MangoDB {
    /** @type {string} */
    #name = undefined
    /** @type {string} */
    #path = undefined
    /** @type {Schema} */
    #schema = new Schema({})
    /** @type {Array<Item>} */
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
     *          },
     *          alias: {
     *              type: "string",
     *              maxSize: 16
     *          },
     *          name: {
     *              type: "string",
     *              maxSize: 64
     *          },
     *          registerDate: {
     *              type: "Date",
     *              default: () => new Date()
     *          }
     *      }
     * })
     */
    configure(config) {
        Object.keys(config).map(key => this[key] = config[key])
    }

    /**
     * serializes into configured path and name
     * @example
     * DB.serialize()
     *      .then(res => console.log("serialized, you can close your application"))
     *      .catch(res => console.log("oh no, something bad happened"))
     */
    async serialize() {
        try {
            assert(this.name, ERR.MISS_NAME)
            assert(this.path, ERR.MISS_PATH)
            const serialization = CBOR.encode(this.#data)
            await fs.promises.writeFile(this.path + this.name, serialization)
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
     * @example
     * DB.deserialize()
     *      .then(res => console.log("success"))
     *      .catch(res => console.log("failed"))
     */
    async deserialize() {
        try {
            assert(this.name, ERR.MISS_NAME)
            assert(this.path, ERR.MISS_PATH)
            let res = await fs.promises.readFile(this.path + this.name)
            this.#data = CBOR.decode(res)
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
     * @example
     * DB.name = "users"
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
     * @example
     * DB.path = "./"
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
     * @example
     * DB.schema = {
     *      id: {
     *          type: "string"
     *      },
     *      alias: {
     *          type: "string"
     *      },
     *      name: {
     *          type: "string"
     *      },
     *      registerDate: {
     *          type: "Date"
     *      }
     * }
     */
    set schema(value) {
        this.#schema = new Schema(value)
    }

    /**
     * @param {Item[]} items
     * @return {Promise<Results>}
     * @example
     * DB.insert(item1, item2, ...)
     *      .then(res => console.log("inserted", res.items))
     *      .then(res => console.log("insert failed"))
     */
    async insert(...items) {
        try {
            let iKeys = [], iType
            items = items.map(item => {
                iType = getType(item)
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
     * @example
     * DB.deleteOne({})
     *      .then(res => console.log("deleted", res.first))
     *      .then(res => console.log("delete failed"))
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
     * @example
     * DB.deleteMany({})
     *      .then(res => console.log("deleted", res.items))
     *      .then(res => console.log("delete failed"))
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
     * @example
     * DB.updateOne({}, { updated: new Date() })
     *      .then(res => console.log("updated", res.first))
     *      .then(res => console.log("update failed"))
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
     * @returns {Finder}
     * @example
     * let finder = DB.find().limit(100).skip(10).reverse()
     * async doSomething() {
     *      await finder.exec() // and
     *      finder.results ...
     * 
     *      await finder.forEach(item => ...) // or
     *      await finder.map(item => ...) // or
     * }
     */
    find(query) {
        return new Finder(query || {}, this.#data)
    }
}