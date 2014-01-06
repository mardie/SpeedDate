# SpeedDate

SpeedDate is a library that provides fast relations for your data. Currently it is only available for NODE.js but in a near future this could change. It uses redis because It is very fast but you can use it along other structures or DBs (Use SpeedDate just for relate ids and keep the rest where you like). Design focus is speed and simplicity. SpeedDate borns because the need of a fast and transparent system for related data that doesn't query a hundred hidden querys on the background. SpeedDate test its performance for a quantified development and improvement.

## How can I make my relationship work?

    npm install speeddate

```javascript
var redis = require("redis"),
SD = require("speeddate");
client = redis.createClient();
//We connect SpeedDate to a client.
SD.con(client);
//Relation config.
//"User" hasMany "Post" and this is called "PostByWriter"
//*Relation Name is optional in this case but it provides information for debugging.
var postsByWriter = SD.hasMany("User","Post","PostByWriter");
//Relation use.
//User 1 has Post 2
postsByWriter.set("1","2",function(){
//What posts does User 1 have?
  postsByWriter.get("1",function(data){
    console.log(data);
  });
});
```

## What can i expect?
### Design goals
* Speed.
* Simplicity.

### Relations types:
* One-One (SD.oneOne)
* One-Many and Many-One (SD.hasMany, SD.belongTo)
* Many-Many (SD.manyMany)

### Actions:
* set (2 queries). Set a relationship between two ids.

    ```
    rel.set(id1,id2,callback(){})
    ```

* get (1 query). Get related ids.

    ```
    rel.get(id1,callback(data){})
    ```

* del (2 queries). Deletes relationship between two ids.

    ```
    rel.del(id1,id2,callback(){})
    ```

* free (1 query). As del but just deletes first object references in the relationship.

    ```
    rel.free(id1,callback(){})
    ```

* trac (1 query). As set but just first object knows about the relationship.

    ```
    rel.trac(id1,id2,callback(){})
    ```

* contains (1 query). Check if a id relates to another.

    ```
    rel.contains(id1,id2,callback(boolean){})
    ```

## Is your relationship moving too fast?
It is not enought to say *fast*. SpeedDate tests performance. Now performance is between 70% and 95% (of node_redis). Even tought it still is very fast, performance will improve in the future.

**How fast? I need numbers not ratios.**

It depends on config,system,... so if you need numbers use a node_redis benchmark and apply de above ratio.

## Making plans.

In the future development will focus on bugfixing and answering a few questions for focusing in 1.0 release.

### Performance.
* Mechanism for key length reduction.
* Does moving logic to redis improves performance?

### Multilanguage?
* Moving to redis-scripting?

## License
2 Clause BSD License.

Something to say? Let me know. 

d@mardie.net