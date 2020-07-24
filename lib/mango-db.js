// @ts-check
import CBOR from "@iljucha/cbor"
import fs from "fs"
import { ERR, TYPE } from "./constants.js"
import { flatten, getType, assert, match } from "./methods.js"
import Festival from "@iljucha/festival"
import { MangoDBS } from "./mango-dbs.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").Connection} Connection
 * @typedef {import("@iljucha/mango-db/lib/types").SchemeProperties} SchemeProperties
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 * @typedef {import("@iljucha/mango-db/lib/types").Link} Link
 * @typedef {import("@iljucha/mango-db/lib/types").Configuration} Configuration
 * @typedef {import("@iljucha/mango-db/lib/types").Query} Query
 * @typedef {import("@iljucha/mango-db/lib/types").Options} Options
 * @typedef {import("@iljucha/mango-db/lib/types").Result} Result
 * @typedef {import("@iljucha/mango-db/lib/types").Results} Results
 * @typedef {import("@iljucha/mango-db/lib/types").EventHandler} EventHandler
 */

export default class MangoDB {
    /** @type {string} */
    #name = undefined
    /** @type {string} */
    #path = undefined
    /** @type {MangoDBS} */
    #schema = new MangoDBS({})
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
     * @param {Configuration} cfg
     * @returns {Promise<Connection>}
     * @example
     * let DB
     * MangoDB.connect(yourConfig)
     *      .then(conn => DB = conn.db)
     *      .catch(conn => console.log(conn.error))
     */
    static async connect(cfg) {
        try {
            let db = new MangoDB()
            db.configure(cfg)
            await db.deserialize()
            return { error: null, db }
        }
        catch (error) {
            return { error, db: null }
        }
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
        this.#schema = new MangoDBS(value)
    }

    /**
     * find items in an item array
     * @param {Query} query
     * @param {Item[]} items
     * @return {Promise<Results>}
     * @example
     * let objArr = [
     *      { id: 1, name: "john" },
     *      { id: 2, name: "martina" }
     * ]
     * let query = { id: 2, name: "martina" }
     * MangoDB.findMany(query, objArr)
     *      .then(res => console.log("found", res.items))
     *      .catch(res => console.log(res.error))
     */
    static async findMany(query, items) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(query) === TYPE.QUERY, ERR.ARG_TYPE)
            assert(Array.isArray(items), ERR.ARG_TYPE)
            const keys = Object.keys(query)
            const results = items.filter(item => MangoDB.find(query, item, keys))
            assert(results.length > 0, ERR.NO_ITEMS)
            return { error: null, items: results }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * find first item in an item array
     * @param {Query} query
     * @param {Item[]} items
     * @return {Promise<Result>}
     * @example
     * let objArr = [
     *      { id: 1, name: "john" },
     *      { id: 2, name: "martina" }
     * ]
     * let query = { id: 2, name: "martina" }
     * MangoDB.findOne(query, objArr)
     *      .then(res => console.log("found", res.first))
     *      .catch(res => console.log(res.error))
     */
    static async findOne(query, items) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(query) === TYPE.QUERY, ERR.ARG_TYPE)
            assert(Array.isArray(items), ERR.ARG_TYPE)
            const keys = Object.keys(query)
            const result = items.find(item => MangoDB.find(query, item, keys))
            assert(result, ERR.NO_ITEMS)
            return { error: null, item: result }
        }
        catch (error) {
            return { error, item: null }
        }
    }

    /**
     * @param {Item[]} items
     * @param {Link[]} links
     * @return {Promise<Results>}
     */
    static async link(items, ...links) {
        try {
            const newItems = []
            let promises = [], found, counter, linked, linking
            links.map(l => promises.push(l.db.findMany(l.query)))
            let res = await Promise.all(promises)
            res.map(r => assert(r.error === null, r.error))
            items.map(item => {
                linking = { ...item }
                counter = 0
                linked = 0
                links.map(link => {
                    found = res[counter].items.find(_item => item[link.on] === _item[link.where])
                    if (found) {
                        linking[link.as] = found
                        linked++
                    }
                    counter++
                })
                if (links.length === linked) {
                    newItems.push(linking)
                }
            })
            assert(newItems.length > 0, ERR.NO_ITEMS)
            return { error: null, items: newItems }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query 
     * @param {Item} item
     * @param {string[]} keys
     */
    static find(query, item, keys) {
        const $copy = flatten({ ...item })
        return match(query, $copy, keys)
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
     * @returns {Promise.<{error: Error, items: Item[]}>}
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
            let res1 = await MangoDB.findOne(query, this.#data)
            assert(res1.error === null, res1.error)
            let res2 = await this.delete([res1.item])
            assert(res2.error === null, res2.error)
            const copy = { ...res2.items[0] }
            this.#events.trigger("delete", copy)
            return { error: null, item: copy }
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
            let res1 = await MangoDB.findMany(query, this.#data)
            assert(res1.error === null, res1.error)
            let res2 = await this.delete(res1.items)
            assert(res2.error === null, res2.error)
            const copy = [ ...res2.items ]
            this.#events.trigger("delete", copy)
            return { error: null, items: copy }
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
            let res1 = await MangoDB.findOne(query, this.#data)
            assert(res1.error === null, res1.error)
            let res2 = await this.update([res1.item], update)
            assert(res2.error === null, res2.error)
            const copy = { ...res2.items[0] }
            this.#events.trigger("update", copy)
            return { error: null, item: copy }
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
            let res1 = await MangoDB.findMany(query, this.#data)
            assert(res1.error === null, res1.error)
            let res2 = await this.update(res1.items, update)
            assert(res2.error === null, res2.error)
            const copy = [ ...res2.items ]
            this.#events.trigger("update", copy)
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
     * @param {Item} update
     * @returns {Promise<Results>}
     */
    async update(items, update) {
        try {
            const $transactions = []
            assert(update["_id"] === undefined, ERR.PK_UP)
            const mixins = items.map(item => ({ ...item, ...update }))
            let res2 = await this.#schema.test(mixins)
            assert(res2.error === null, res2.error)
            assert(items.length === res2.items.length, ERR.FATAL)
            items.map((item, idx) => {
                let index = this.#data.indexOf(item)
                assert(index >= 0, ERR.ITEM_POS)
                $transactions.push((_i = index, _x = idx) => {
                    this.#data[_i] = res2.items[_x]
                })
            })
            $transactions.forEach($transaction => $transaction())
            const copy = [ ...res2.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Options} [options]
     * @return {Promise<Results>}
     * @example
     * DB.findMany({})
     *      .then(res => console.log("found", res.items))
     *      .catch(res => console.log(res.error))
     */
    async findMany(query, options) {
        if (!options) {
            options = {}
        }
        try {
            let res = await MangoDB.findMany(query, this.#data)
            assert(res.error === null, res.error)
            let workingCopy = [ ...res.items ]
            if (options.$links) {
                let links = await MangoDB.link(workingCopy, ...options.$links)
                assert(links.error === null, links.error)
                workingCopy = links.items
            }
            return { error: null, items: workingCopy }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Options} [options]
     * @return {Promise<Result>}
     * @example
     * DB.findOne({})
     *      .then(res => console.log("found", res.items))
     *      .catch(res => console.log(res.error))
     */
    async findOne(query, options) {
        if (!options) {
            options = {}
        }
        try {
            let res = await MangoDB.findOne(query, this.#data)
            assert(res.error === null, res.error)
            let workingCopy = { ...res.item }
            if (options.$links) {
                let links = await MangoDB.link([workingCopy], ...options.$links)
                assert(links.error === null, links.error)
                workingCopy = links.items[0]
            }
            return { error: null, item: workingCopy }
        }
        catch (error) {
            this.#events.trigger("error", error)
            return { error, item: null }
        }
    }
}