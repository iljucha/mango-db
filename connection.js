import MangoDB from "@iljucha/mango-db"

export default class Connection {
    /** @type {Error} */
    #error
    /** @type {MangoDB} */
    #db
    constructor(error, db) {
        this.#error = error
        this.#db = db
    }

    get error() {
        return this.#error
    }

    get db() {
        return this.#db
    }
}