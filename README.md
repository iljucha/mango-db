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
    maxStackLength: 4096,
    schema: {
        _id: {
            type: "string",
            minSize: 32,
            maxSize: 32
        },
        datetime: {
            type: "Date"
        },
        title: {
            type: "string",
            minSize: 4,
            maxSize: 64
        },
        text: {
            type: "string",
            minSize: 4,
            maxSize: 256
        }
    },
    base: () => ({ 
        _id: VUID(), 
        datetime: new Date()
    })
}

/** @type {MangoDB} */
export let Posts
MangoDB.connect(postsConfig)
    .then(conn => Posts = conn.db)
    .catch(conn => console.log(conn.error))


// also possible with setters:
let DB = new MangoDB()
DB.name = "posts"
DB.path = "./"
DB.maxStackLength = 4096
DB.schema = {
    _id: {
        type: "string",
        minSize: 32,
        maxSize: 32
    },
    datetime: {
        type: "Date"
    },
    title: {
        type: "string",
        minSize: 4,
        maxSize: 64
    },
    text: {
        type: "string",
        minSize: 4,
        maxSize: 256
    }
}
DB.base = function() { 
    return {
        _id: VUID(), 
        datetime: new Date()
    }
}
```

## Actions
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
DB.deleteOne({ _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy" })
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
DB.updateOne({ _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy" }, { title: "yay, i got updated!" })
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
DB.findOne({ _id: "wA357Fr3bv2bYfWKLxQmwIM8GogEOCOy" })
    .then(res => console.log(res.item, "updated"))
    .catch(res => console.log(res.error))

// find many items
DB.findMany({ })
    .then(res => console.log(res.items, "found"))
    .catch(res => console.log(res.error))
```