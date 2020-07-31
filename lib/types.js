//@ ts-check

import Cursor from "./cursor.js"
export default true

/** 
 * @typedef {number | string | Date} Comparable
 */

/**
 * @typedef {{[property: string]: any}} Item
 */

/**
 * @typedef {{[Logic: string]: LogicExec}} Logic
 */

/**
 * @typedef {(input1: any, input2: any) => boolean} LogicExec
 */

/**
 * @typedef {(queryOptions: QueryOption[], item: Item) => boolean} LogicGateExec
 */

/**
 * @typedef {{[LogicGate: string]: LogicGateExec}} LogicGate
 */

/**
 * @typedef {{
       $or?: QueryOption[]
       $and?: QueryOption[]
    }} LogicGates
 */

/**
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
 * @typedef {Item | { [property: string]: Logics }} QueryOption
 */

/**
 * @typedef {Item | QueryOption | LogicGates} Query
 */

/**
 * @typedef {{
       type: string
       minimum?: number
       maximum?: number
       default?: () => any
    }} SchemeProperty
 */

/**
 * @typedef {{[property: string]: SchemeProperty}} SchemeProperties
 */

/**
 * @typedef {{
       name: string
       path: string
       schema: SchemeProperties
   }} Configuration
 */

/**
 * @typedef {{error: Error, item: Item}} Result
 */

/**
 * @typedef {{error: Error, items: Item[]}} Results
 */

/**
 * @typedef {(...args: any[]) => any} EventHandler
 */

/**
 * @typedef {{
       $skip: number
       $limit: number
       $reverse: boolean
   }} CursorOptions
 */

 /**
  * @typedef {{
       cursor: Cursor
       where: [string, string]
       as: string
    }} Join
  */