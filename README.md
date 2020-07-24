# MangoDB
Simple in-memory (with option to serialize) MongoDB parody.

# Usage
## Creation and Connection
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
let Query2 = {
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
let Query3 = {
    _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy",
    $or: [
        { title: { $regexp: /bad word/i } },
        { text: { $regexp: /bad word/i } }
    ],
    $and: [
        { userAlias: { $nin: ["user1", "user2"] } },
        { userAlias: { $includes: "frank" } }
    ]
}
```

### Link
You can link Items from other MangoDBs.
```javascript
let DB1 = new MangoDB()
let DB2 = new MangoDB()
let Options = {
    $links: [
        // LINK from DB2.findMany({ }) ON "_user"
        // WHERE DB1->item["_user"] EQ DB2->item["_id"]
        { db: DB2, query: { }, as: "_user", on: "_user", where: "_id" }
    ]
}

DB1.findMany(Query, Options)
```

### Insert
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
// find single item
DB.findOne(Query)
    .then(res => console.log(res.item, "updated"))
    .catch(res => console.log(res.error))

// find many items
DB.findMany({ })
    .then(res => console.log(res.items, "found"))
    .catch(res => console.log(res.error))
```