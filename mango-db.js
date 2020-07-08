// @ts-check
import CBOR from "@iljucha/cbor"
import fs from "fs"
import { ERR, TYPE } from "./constants.js"
import { assert, getType } from "./helpers.js"

/**
 * @typedef {{
 *      error: Error
 *      db: MangoDB
 * }} Connection
 *  * 
 * @typedef {{
 *      [property: string]: any
 * }} Item
 * 
 * @typedef {{
 *      type: string
 *      minSize?: number
 *      maxSize?: number
 * }} SchemeProperty
 * 
 * @typedef {Object.<string, any>} Query
 * 
 * @typedef {{
        name: string
        path: string
        maxStackLength?: number
        schema: Object.<string, SchemeProperty>
        base?: () => Item
 * }} Configuration
 */

/** @class MangoDB */
export default class MangoDB {
    /** @type {string} */
    #name = undefined
    /** @type {string} */
    #path = undefined
    /** @type {Item} */
    #schema = undefined
    /** @type {() => any} */
    #base = () => {}
    /** @type {Array.<Array<Item>>} */
    #data = [[]]
    /** @type {number} */
    #maxStackLength = 4096

    /**
     * Creates a MangoDB Object
     */
    constructor() {}

    /**
     * @param {Configuration} cfg
     * @returns {Promise.<Connection>}
     * @example
     * let DB
     * MangoDB.connect(yourConfig)
     *      .then(conn => DB = conn.db)
     *      .catch(conn => console.log(conn.error))
     * 
     * async function someFunction() {
     *      let conn = await MangoDB.connect(yourConfig)
     *      if (conn.error) {
     *          throw conn.error
     *      }
     *      let result = await conn.db.find({ })
     *      if (result.error) {
     *          throw result.error
     *      }
     *      console.log(result.items)
     * }
     */
    static async connect(cfg) {
        try {
            let db = new MangoDB()
            db.configure(cfg)
            await db.deserialize()
            return { error: null, db }
        }
        catch (error) {
            return { error, db: null}
        }
    }

    /**
     * @param {Configuration} config 
     * @example
     * DB.configure({
     *      name: "users"
     *      path: "./"
     *      maxStackLength: 4096
     *      schema: {
     *          id: {
     *              type: "string"
     *          },
     *          alias: {
     *              type: "string"
     *          },
     *          name: {
     *              type: "string"
     *          },
     *          registerDate: {
     *              type: "Date"
     *          }
     *      },
     *      base: function() {
     *          return {
     *              id: generateId()
     *              registerDate: new Date()
     *          }
     *      }
     * })
     */
    configure(config) {
        Object.keys(config).map(key => this[key] = config[key])
    }

    /**
     * serializes into configured path and name ( + .json )
     * DB.toJSON()
     *      .then(res => console.log("now i have a JSON copy"))
     *      .catch(res => console.log("oh no, what happened?"))
     */
    async toJSON() {
        try {
            assert(this.name, ERR.MISS_NAME)
            assert(this.path, ERR.MISS_PATH)
            const serialization = JSON.stringify(this.#data, null, 2)
            await fs.promises.writeFile(this.path + this.name + ".json", serialization)
            return true
        }
        catch (error) {
            console.log(error)
            return false
        }
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
            return true
        }
        catch (error) {
            console.log(error)
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
            return true
        }
        catch (error) {
            console.log(error)
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
     * Sets stack length (min 100, max 100000)
     * @param {number} value
     * @example
     * DB.maxStackLength = 4096
     */
    set maxStackLength(value) {
        assert(typeof value === TYPE.NUM, ERR.ARG_TYPE)
        assert(value > 100 && value < 100000, ERR.RANGE)
        this.#maxStackLength = value
    }

    get maxStackLength() {
        return this.#maxStackLength
    }

    /**
     * Sets a schema for your MangoDB database
     * @param {Item} value
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
        assert(getType(value) === TYPE.ITEM, ERR.ARG_TYPE)
        const schemaKeys = Object.keys(value)
        assert(schemaKeys.length >= 1, ERR.RANGE)
        let keyType
        schemaKeys.map(schemaKey => {
            keyType = value[schemaKey].type
            assert(keyType, ERR.MISS_CFG_TYPE)
            assert(keyType !== TYPE.OBJ && keyType !== TYPE.ARR && typeof keyType === TYPE.STR, ERR.TYPE)
        })
        this.#schema = value
    }

    get schema() {
        return this.#schema
    }

    /**
     * If you don't want to add properties\
     * everytime you insert items into your\
     * MangoDB database, you can set up a base.
     * @param {() => Item} value
     * @example
     * DB.base = function() {
     *      return {
     *          id: generateId(),
     *          registerDate: new Date()
     *      }
     * }
     * 
     * DB.base = () => ({
     *      id: generateId(),
     *      registerDate: new Date()
     * })
     */
    set base(value) {
        assert(typeof value === TYPE.FN, ERR.ARG_TYPE)
        const test = value()
        this.test([test])
            .then(() => this.#base = value)
            .catch(res => assert(false, res.error))
    }

    get base() {
        return this.#base()
    }

    /**
     * @param {Item[]} arr 
     * @param {Item} item 
     */
    static itemIndex(arr, item) {
        let stack = 0, index
        for (stack; stack < arr.length; stack++) {
            index = arr[stack].indexOf(item)
            if (index > -1) {
                return { stack, index }
            }
        }
        return { stack: -1, index: -1 }
    }

    /**
     * find items in an item array
     * @param {Query} query
     * @param {Item[]} items
     * @return {Promise.<{error: Error, items: Item[]}>}
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
     * @return {Promise.<{error: Error, item: Item}>}
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
     * @param {Query} query 
     * @param {Item} item
     * @param {string[]} keys
     */
    static find(query, item, keys) {
        return keys.every(key => {
            if (query[key] === item[key]) {
                return true
            }
            if (query[key] instanceof RegExp && typeof item[key] === TYPE.STR) {
                return query[key].test(item[key])
            }
        })
    }

    /**
     * @param {Item[]} items
     * @return {Promise.<{error: Error, items: Item[]}>}
     */
    async test(items) {
        try {
            assert(this.schema, ERR.MISS_SCHEMA)
            items = items.map(item => {
                let iType, sType, property, iSize, sKey
                const oKeys = Object.keys(item)
                oKeys.map(key => {
                    property = item[key]
                    sKey = this.schema[key]
                    assert(sKey, ERR.UKEY)
                    iType = getType(property)
                    sType = sKey.type
                    assert(iType !== TYPE.OBJ && iType !== TYPE.ARR && sType === iType, ERR.TYPE)
                    switch (sType) {
                        case TYPE.STR:
                            iSize = property.length
                            break
                        case TYPE.NUM:
                            iSize = property
                            break
                        default:
                            break
                    }
                    if (sKey.minSize) {
                        assert(iSize >= sKey.minSize, ERR.SIZE_SMALL)
                    }
                    if (sKey.minSize) {
                        assert(iSize <= sKey.maxSize, ERR.SIZE_BIG)
                    }
                })
                return item
            })
            return { error: null, items }
        }
        catch (error) {
            return { error, items: null}
        }
    }

    /**
     * @param {Item[]} items
     * @return {Promise.<{error: Error, items: Item[]}>}
     * @example
     * DB.insert(item1, item2, ...)
     *      .then(res => console.log("inserted", res.items))
     *      .then(res => console.log("insert failed"))
     */
    async insert(...items) {
        try {
            const lastStack = this.#data[this.#data.length - 1]
            const maxAllowed = this.maxStackLength - lastStack.length
            assert(items.length <= maxAllowed, ERR.TMI)
            let iKeys = [], iType
            items = items.map(item => {
                iType = getType(item)
                assert(iType === TYPE.ITEM, ERR.INVALID_ITEM)
                item = { ...this.base, ...item }
                assert(item["_id"], ERR.MISS_PK)
                iKeys.push(item["_id"])
                return item
            })
            const dupe = new Set(iKeys).size !== iKeys.length 
            assert(dupe === false, ERR.PK_DUPES)
            let res = await this.test(items)
            assert(res.error === null, res.error)
            if (lastStack.length >= this.maxStackLength) {
                this.#data.push([])
            }
            lastStack.push(...res.items)
            const copy = [ ...res.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise.<{error: Error, item: Item}>}
     * @example
     * DB.deleteOne({})
     *      .then(res => console.log("deleted", res.first))
     *      .then(res => console.log("delete failed"))
     */
    async deleteOne(query) {
        try {
            assert(arguments.length === 1, ERR.ARGS_LEN)
            // @ts-ignore for array.flat
            let res = await MangoDB.findOne(query, this.#data.flat(1))
            assert(res.error === null, res.error)
            let { stack, index } = MangoDB.itemIndex(this.#data, res.item)
            assert(stack >= 0 && index >= 0, ERR.ITEM_POS)
            this.#data[stack].splice(index, 1)
            const copy = { ...res.item }
            return { error: null, item: copy }
        }
        catch (error) {
            return { error, item: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise.<{error: Error, items: Item[]}>}
     * @example
     * DB.deleteMany({})
     *      .then(res => console.log("deleted", res.items))
     *      .then(res => console.log("delete failed"))
     */
    async deleteMany(query) {
        try {
            assert(arguments.length === 1, ERR.ARGS_LEN)
            // @ts-ignore for array.flat
            let res = await MangoDB.findMany(query, this.#data.flat(1))
            assert(res.error === null, res.error)
            res.items.map(item => {
                let { stack, index } = MangoDB.itemIndex(this.#data, item)
                assert(stack >= 0 && index >= 0, ERR.ITEM_POS)
                this.#data[stack].splice(index, 1)
            })
            const copy = [ ...res.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Item} update
     * @return {Promise.<{error: Error, item: Item}>}
     * @example
     * DB.updateOne({}, { updated: new Date() })
     *      .then(res => console.log("updated", res.first))
     *      .then(res => console.log("update failed"))
     */
    async updateOne(query, update) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(update) === TYPE.OBJ, ERR.ARG_TYPE)
            // @ts-ignore for array.flat
            let res1 = await MangoDB.findOne(query, this.#data.flat(1))
            assert(res1.error === null, res1.error)
            assert(update["_id"] === undefined, ERR.PK_UP)
            const mixin = { ...res1.item, ...update }
            let res2 = await this.test([mixin])
            assert(res2.error === null, res2.error)
            let { stack, index } = MangoDB.itemIndex(this.#data, res1.item)
            assert(stack >= 0 && index >= 0, ERR.ITEM_POS)
            this.#data[stack][index] = res2.items[0]
            const copy = [ ...res2.items ]
            return { error: null, item: copy }
        }
        catch (error) {
            return { error, item: null }
        }
    }

    /**
     * @param {Query} query
     * @param {Item} update
     * @return {Promise.<{error: Error, items: Item[]}>}
     * @example
     * DB.updateMany({}, { updated: new Date() })
     *      .then(res => console.log("updated", res.items))
     *      .then(res => console.log("update failed"))
     */
    async updateMany(query, update) {
        try {
            assert(arguments.length === 2, ERR.ARGS_LEN)
            assert(getType(update) === TYPE.OBJ, ERR.ARG_TYPE)
            // @ts-ignore for array.flat
            let res1 = await MangoDB.findMany(query, this.#data.flat(1))
            assert(res1.error === null, res1.error)
            assert(update["_id"] === undefined, ERR.PK_UP)
            const mixins = res1.items.map(item1 => ({ ...item1, ...update }))
            let res2 = await this.test(mixins)
            assert(res2.error === null, res2.error)
            assert(res1.items.length === res2.items.length, ERR.FATAL)
            let item2Counter = 0
            res1.items.map(item1 => {
                let { stack, index } = MangoDB.itemIndex(this.#data, item1)
                assert(stack >= 0 && index >= 0, ERR.ITEM_POS)
                this.#data[stack][index] = res2.items[item2Counter]
                item2Counter++
            })
            const copy = [ ...res2.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise.<{error: Error, items: Item[]}>}
     * @example
     * DB.findMany({})
     *      .then(res => console.log("found", res.items))
     *      .catch(res => console.log(res.error))
     */
    async findMany(query) {
        try {
            // @ts-ignore for array.flat
            let res = await MangoDB.findMany(query, this.#data.flat(1))
            assert(res.error === null, res.error)
            const copy = [ ...res.items ]
            return { error: null, items: copy }
        }
        catch (error) {
            return { error, items: null }
        }
    }

    /**
     * @param {Query} query
     * @return {Promise.<{error: Error, item: Item}>}
     * @example
     * DB.findOne({})
     *      .then(res => console.log("found", res.items))
     *      .catch(res => console.log(res.error))
     */
    async findOne(query) {
        try {
            // @ts-ignore for array.flat
            let res = await MangoDB.findOne(query, this.#data.flat(1))
            assert(res.error === null, res.error)
            const copy = { ...res.item }
            return { error: null, item: copy }
        }
        catch (error) {
            return { error, item: null }
        }
    }
}