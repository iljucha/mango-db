# MangoDB
Simple in-memory (with option to serialize) MongoDB parody.

# Usage
## Creation
```javascript
import MangoDB from "@iljucha/mango-db"
import VUID from "@iljucha/vuid" // ID generator

const postsConfig = {
    name: "posts",
    path: "./",
    schema: {
        _id: {
            type: "string",
            minimum: 32,
            maximum: 32,
            default: VUID
        },
        datetime: {
            type: "Date",
            default: () =>  new Date()
        },
        title: {
            type: "string",
            minimum: 4,
            maximum: 64
        },
        text: {
            type: "string",
            minimum: 4,
            maximum: 256
        }
    }
}
DB.configure(postsConfig)

// also possible with setters:
let DB = new MangoDB()
DB.name = "posts"
DB.path = "./"
DB.schema = {
    _id: {
        type: "string",
        minimum: 32,
        maximum: 32,
        default: VUID
    },
    datetime: {
        type: "Date",
        default: () =>  new Date()
    },
    title: {
        type: "string",
        minimum: 4,
        maximum: 64
    },
    text: {
        type: "string",
        minimum: 4,
        maximum: 256
    }
}
```

## Actions
### Query
This is the object you use to find Items.\
Of course you don't have to use all the Query-Filters at the same time, lol.
```javascript
// Very simple Query
let Query = {
    _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy"
}

// Very weird Query, matches all item in $or
Query = {
    $or: [
        { _id: { $regexp: /findme/i } }, // regexp.test(...)
        { _id: { $includes: "substring"} }, // str.includes(...)
        { _id: { $eq: "onlyme" } }, // value === input
        { _id: { $ne: "notme" } }, // value !== input
        { _id: { $lt: 5 } }, // value > input
        { _id: { $lte: 5 } }, // value >= input
        { _id: { $gt: 5 } }, // value < input
        { _id: { $gte: 5 } }, // value <= input
        { _id: { $in: ["findme", "orme"] } }, // arr.indexOf(input) >= 0
        { _id: { $nin: ["findmenot"] } }, // arr.indexOf(input) === -1
        { _id: { $exists: true } }, // property exists
        { _id: { $type: "string" } }, // value has type "string"
    ]
}

// Complex Query
Query = {
    $or: [
        { _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy" },
        { alias: { $regexp: /iljucha/i } },
        { name: { $includes: /ilj/i } }
    ],
    $and: [
        { status: { $nin: ["banned", "kicked"] } },
        { auth: { $eq: "admin" } }
    ]
}
```

### Join
You can join Items from other MangoDBs.
```javascript
let DB1 = new MangoDB()
let DB2 = new MangoDB()
let DB3 = new MangoDB()
DB1.find({ _user: 1 })
    .join({
        cursor: DB2.find({ _id: 1 }).join({
            cursor: DB3.find({ _user: 1 }).reverse(),
            where: ["fk_db2", "_id"],
            as: "db2_join"
        }),
        where: ["fk_db1", "_id"],
        as: "db1_join"
    })
    .toArray()
```

### Project
You can explicitly show or hide item fields.
```javascript
let DB1 = new MangoDB()
let DB2 = new MangoDB()
DB1.find({ _user: 1 })
    .project({ 
        _id: {
            $alias: "post" // rename "_id" to "post"
        },
        "db1_join._id": false // hide joined items "_id"
    }) 
    .join({
        cursor: DB2.find(),
        where: ["fk_db1", "_id"],
        as: "db1_join"
    })
    .toArray()
```

## Insert
```javascript
let items = [
    {
        title: "hewwo",
        text: "how are ya? :3"
    },
    {
        title: "im sick",
        text: "im a sick rapper, yo!"
    }
]

// takes items as arguments, no need to use Arrays (or if so, then ...array like here)
DB.insert(...items)
    .then(res => console.log(res.items))
    .catch(res => console.log(res.error))
```

## Delete
```javascript
// delete single item
DB.deleteOne(Query)
    .then(res => console.log(res.item, "deleted"))
    .catch(res => console.log(res.error))

// delete all, or type in query
DB.deleteMany({ })
    .then(res => console.log(res.items, "deleted"))
    .catch(res => console.log(res.error))
```

## Update
```javascript
// update single item
DB.updateOne(Query, { title: "yay, i got updated!" })
    .then(res => console.log(res.item, "updated"))
    .catch(res => console.log(res.error))

// update all, or type in query
DB.updateMany({ }, { title: "we all have now the same title :(" })
    .then(res => console.log(res.items, "updated"))
    .catch(res => console.log(res.error))
```

## Find
```javascript
DB.find({ text: { $regexp: /hello/i }})
    .limit(1000)
    .skip(10)
    .reverse(true)
    // to Promise<Item[]>
    .toArray()
    // to Promise<Item>
    .single(0 /** index */)
    // Promise<callbackfn<forEach>>
    .each(item => console.log(item))
```
