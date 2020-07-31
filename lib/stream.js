import fs from "fs"
import CBOR from "@iljucha/cbor"

/**
 * @param {string} path
 * @param {any} data
 * @returns {Promise<Error>}
 */
export async function serialize(path, data) {
    return new Promise((resolve, reject) => {
        const serialization = CBOR.encode(data)
        const stream = fs.createWriteStream(path)
        stream.write(serialization)
        stream.on("finish", () => resolve(null))
        stream.on("error", (error) => reject(error))
    })
}

/**
 * @param {string} path 
 * @returns {Promise<{error: Error, data: any}>}
 */
export async function deserialize(path) {
    return new Promise((resolve, reject) => {
        const chunks = []
        const stream = fs.createReadStream(path)
        stream.on("data", (chunk) => chunks.push(chunk))
        stream.on("end", () => resolve({ error: null, data: CBOR.decode(Buffer.concat(chunks))}))
        stream.on("error", (error) => reject({ error, data: null }))
    })
}