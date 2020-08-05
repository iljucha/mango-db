// @ts-check
import { ERR, TYPE } from "./constants.js"
import { assert, getType } from "./methods.js"

/**
 * @typedef {import("@iljucha/mango-db/lib/types").SchemeProperties} SchemeProperties
 * @typedef {import("@iljucha/mango-db/lib/types").Item} Item
 */

export class Schema {
    /** @type {SchemeProperties} */
    #schema = {}
    /** @type {Item} */
    #defaults = {}

    /**
     * @param {SchemeProperties} init
     */
    constructor(init) {
        assert(getType(init) === TYPE.ITEM, ERR.ARG_TYPE)
        const keys = Object.keys(init)
        let keyType, keyDefault
        keys.map((key) => {
            assert(/\.|\ |\$/.test(key) === false, ERR.FIELD_NAME)
            keyType = init[key].type
            keyDefault = init[key].default
            assert(keyType, ERR.MISS_CFG_TYPE)
            assert(typeof keyType === TYPE.STR, ERR.TYPE)
            if (keyDefault) {
                assert(typeof keyDefault === TYPE.FN && keyDefault(), ERR.TYPE)
                this.#defaults[key] = keyDefault
            }
        })
        this.#schema = init
    }

    /**
     * @param {Item[]} items
     */
    async test(items) {
        try {
            items = items.map((item) => {
                let iType, sType, property, iSize, sKey
                const oKeys = Object.keys(item)
                oKeys.map(key => {
                    assert(/\.|\ |\$/.test(key) === false, ERR.FIELD_NAME)
                    property = item[key]
                    sKey = this.#schema[key]
                    assert(sKey, ERR.UKEY)
                    iType = getType(property)
                    sType = sKey.type
                    assert(sType === iType, ERR.TYPE)
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
                    if (sKey.minimum) {
                        assert(iSize >= sKey.minimum, ERR.SIZE_SMALL)
                    }
                    if (sKey.maximum) {
                        assert(iSize <= sKey.maximum, ERR.SIZE_BIG)
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
     * @type {Item}
     */
    get defaults() {
        let obj = {}, prop
        for (prop in this.#defaults) {
            obj[prop] = this.#defaults[prop]()
        }
        return obj
    }
}