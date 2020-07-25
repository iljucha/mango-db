//@ ts-check

import MangoDB from "./mango-db.js"
import Finder from "./finder.js"

export default true

/** 
 * Basic Comparable Type
 * @typedef {number | string | Date} Comparable
 */

/**
 * Basic Item Type
 * @typedef {{[property: string]: any}} Item
 */

/**
 * Basic Logic Function Type
 * @typedef {(input1: any, input2: any) => boolean} Logic
 */

/**
 * Basic Logical-Gate Type
 * @typedef {(queryOptions: QueryOption[], item: Item) => boolean} LogicGate
 */

/**
 * Basic LogicGates-Collection Type
 * @typedef {{
       $or?: QueryOption[]
       $and?: QueryOption[]
    }} LogicGates
 */

/**
 * Basi Logics-Collection Type
 * @typedef {{
       $regexp?: RegExp
       $includes?: string
       $eq?: any
       $ne?: any
       $lt?: Comparable
       $lte?: Comparable
       $gt?: Comparable
       $gte?: Comparable
       $in?: any[]
       $nin?: any[]
       $exists?: boolean
       $type?: string
    }} Logics
 */

/**
 * Basic QueryOption Type
 * @typedef {Item | { [property: string]: Logics }} QueryOption
 */

/**
 * Basic Query Type
 * @typedef {Item | QueryOption | LogicGates} Query
 */

/**
 * Basic SchemeProperty Type
 * @typedef {{
       type: string
       minimum?: number
       maximum?: number
       default?: () => any
    }} SchemeProperty
 */

/**
 * Basic SchemeProperties Type
 * @typedef {{[property: string]: SchemeProperty}} SchemeProperties
 */

/**
 * Basic Connection Type
 * @typedef {{error: Error, db: MangoDB}} Connection
 */

/**
 * Basic Configuration Type
 * @typedef {{
       name: string
       path: string
       schema: SchemeProperties
   }} Configuration
 */

/**
 * Basic Options Type
 * @typedef {{
       $links?: Link[]
  }} Options
 */

/**
 * Basic Single-Result Type
 * @typedef {{error: Error, item: Item}} Result
 */

/**
 * Basic Multi-Result Type
 * @typedef {{error: Error, items: Item[]}} Results
 */

/**
 * Basic EventHandler Type
 * @typedef {(...args: any[]) => any} EventHandler
 */

/**
 * Basic Update Type
 * @typedef {{
       $set?: Item
   }} Update
 */

/**
 * Basic Update-Result Type
 * @typedef {{
       $set?: Item[]
  }} UpdateResult
 */

/**
 * Find Options
 * @typedef {{
       $skip?: number
       $limit?: number
       $reverse?: boolean
   }} FindOptions
 */

/**
 * Find Object
 * @typedef {{
       $skip?: number
       $limit?: number
       $reverse?: boolean
   }} Find
 */

 /**
  * Basic Join Type
  * @typedef {{
       finder: Finder
       where: [string, string]
       as?: string
    }} Join
  */