process.env.NODE_ENV="development";
var assert = require("assert");
var redis = require("redis");
var db = redis.createClient();
var ns="", obj1Name="Obj1", obj2Name="Obj2";
var lastStat={};
function s(obj){
  return JSON.stringify(obj);
}

function qatest(){
  var cbk,spec;
    if(arguments.length===1){
      cbk=arguments[0];
    }else{
      spec = arguments[0];
      cbk = arguments[1];
    }

  var diff={};
  db.info("commandstats",function(err,stats){
    if(err){throw err;}
    var res = stats.split("\n").forEach(function(elm){
      var tmp = elm.split(",")[0].replace("cmdstat_","").split(":");
      if(tmp[0] && tmp[1]){
        var command = tmp[0];
        if(command=="info" || command=="flushdb"){
          return;
        }
        var calls = tmp[1].split("=")[1];
        if(spec!==undefined && calls-lastStat[command] > 0 )
          diff[command] = calls-(lastStat[command]||0);
        lastStat[command]=calls;
      }
    });
    //console.log(s(diff));
    cbk( s(spec) == s(diff) );
  });
}

before(function(done){
  var dbnum=0;
  function getDB(cbk){
    db.dbsize(function(err,size){
      if(size>0){
        dbnum++;
        db.select(dbnum,function(err){
          if(err){ throw new Error("I couldn't find a empty db on the redis instance for testing.") ;}
          else{ getDB(cbk);}
        });
      }else{
        cbk(dbnum);
      }
    });
  }
  getDB(function(id){
    //reftests(function(){
      qatest(function(){
        done();
      });
    //});
  });
});

/*
describe("none relation",function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  var obj1 = SD.null(null,null);
  it("should return a haiku",function(done){  
    obj1.null(function(p){
      if(p.match(/\n/g).length == 2){
        done();
      }
    });
  });
});
*/

describe('oneOne relation', function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  var relname="a";
  var id1=1,id2=2;
  var obj1 = SD.oneOne(obj1Name,obj2Name,relname);

  afterEach(function(done){
    db.flushdb(function(){
      done();
    });
  });

  describe('set action',function(){
    it('obj1 should own obj2. [OP:2]', function(done){
      var qaSpec={get:2,set:2};
      obj1.set(id1,id2,function(){
        db.get(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id2){
          assert.equal(_id2, id2);
          db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id1){
            assert.equal(_id1, id1);
            qatest(qaSpec,function(result){
              assert.equal(result, true, "QA test failed");
              done();
            });
          });
        });
      });
    });
  });

  describe('trac action',function(){
    it("obj1 should trac obj2 but obj2 doesn't trac obj1. [OP:1]", function(done){
      var qaSpec={get:2,set:1};
      obj1.trac(id1,id2,function(){
        db.get(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id2){
          assert.equal(_id2, id2);
          db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id1){
            assert.equal(_id1, null);
            qatest(qaSpec,function(result){
              assert.equal(result, true, "QA test failed");
              done();
            });
          });
        });
      });
    });
  });


  describe('free action',function(){
    it('obj1 should free obj2. [OP:1]', function(done){
      var qaSpec={get:2,set:2,del:1};
      obj1.set(id1,id2,function(){
        obj1.free(id1,function(){
          db.get(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id2){
            assert.equal(_id2, null);
            db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id1){
              assert.equal(_id1, id1);
              qatest(qaSpec,function(result){
                assert.equal(result, true, "QA test failed");
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('del action',function(){
    it('obj1 should free obj2 and obj1 should free obj2. [OP:2]', function(done){
      var qaSpec={get:2,set:2,del:2};
      obj1.set(id1,id2,function(){
        obj1.del(id1,id2,function(){
          db.get(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id2){
            assert.equal(_id2, null);
            db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id1){
              assert.equal(_id1, null);
              qatest(qaSpec,function(result){
                assert.equal(result, true, "QA test failed");
                done();
              });
            });
          });
        });
      });
    });
  });

  describe('get action',function(){
    it('obj1 should own obj2. [OP:1]', function(done){
      var qaSpec={get:1,set:2};
      obj1.set(id1,id2,function(){
        obj1.get(id1,function(data){
          assert.equal(data, id2);
          qatest(qaSpec,function(result){
            assert.equal(result, true, "QA test failed");
            done();
          });
        });
      });
    });
  });

  describe('contain action',function(){
    it('obj1 should contain obj2. [OP:1]', function(done){
      var qaSpec={get:1,set:2};
      obj1.set(id1,id2,function(){
        obj1.contains(id1,id2,function(data){
          assert.equal(data, true);
          qatest(qaSpec,function(result){
            assert.equal(result, true, "QA test failed");
            done();
          });
        });
      });
    });
  });

});

describe('hasMany relation', function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  var relname="c";
  var id1=1,id2=2,id3=3,id4=4;
  var obj1 = SD.hasMany(obj1Name,obj2Name,relname);
  var obj2 = SD.belongTo(obj2Name,obj1Name,relname);

  afterEach(function(done){
    db.flushdb(function(){
      done();
    });
  });

  describe('set action',function(){
    it('id1 should own id2, id3 and id4.id2,id3 and id4 belong to id1.[OP:2]',function(done){
      var qaSpec={get:3,set:3,sadd:3,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3","4"]));
              db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(_id2, id1);
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(_id3, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                    assert.equal(_id4, id1);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('trac action',function(){
    it('id1 should own id2 and id3, id2 own id1 and id4. [OP:1]', function(done){
      var qaSpec={get:3,sadd:3,smembers:1};
      obj1.trac(id1,id2,function(){
        obj1.trac(id1,id3,function(){
          obj1.trac(id1,id4,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3","4"]));
              db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(_id2, null);
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(_id3, null);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                    assert.equal(_id4, null);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('free action',function(){
    it('obj1 should free obj2. [OP:1]', function(done){
      var qaSpec={get:3,set:3,del:1,sadd:3,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.free(id1,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s([]));
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(_id2, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(_id3, id1);
                    db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                      assert.equal(_id4, id1);
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('del action',function(){
    it('obj1 should delete obj2 and obj2 should delete obj1. [OP:2]', function(done){
    var qaSpec={get:3,set:3,del:1,sadd:3,srem:1,smembers:1};
    obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.del(id1,id3,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s(["2","4"]));
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(_id2, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(_id3, null);
                    db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                      assert.equal(_id4, id1);
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  
  describe('get action',function(){
    it('id should have id2, id3 and id4. id2,id3 and id4 should belong to id1. [OP:1]', function(done){
      var qaSpec={get:3,set:3,sadd:3,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.get(id1,function(_id1){
              assert.equal(s(_id1), s(["2","3","4"]));
              obj2.get(id2,function(_id2){
                assert.equal(_id2, id1);
                obj2.get(id3,function(_id3){
                  assert.equal(_id3, id1);
                  obj2.get(id4,function(_id4){
                    assert.equal(_id4, id1);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('contains action',function(){
    it('id1 should contain id3.id2 should contain id1.id3 shouldn\'t contain id2.id4 should contain id1 [OP:1]', function(done){
      var qaSpec={get:3,set:3,sadd:3,sismember:1};  
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.contains(id1,id3,function(_id1){
              assert.equal(_id1, true);
              obj2.contains(id2,id1,function(_id2){
                assert.equal(_id2, true);
                obj2.contains(id3,id2,function(_id3){
                  assert.equal(_id3, false);
                  obj2.contains(id4,id1,function(_id4){
                    assert.equal(_id4, true);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

});

describe('belongTo relation', function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  var relname="d";
  var id1=1,id2=2,id3=3,id4=4;
  var obj1 = SD.hasMany(obj1Name,obj2Name,relname);
  var obj2 = SD.belongTo(obj2Name,obj1Name,relname);

  afterEach(function(done){
    db.flushdb(function(){
      done();
    });
  });

  describe('set action',function(){
    it('id1 should own id2, id3 and id4.id2,id3 and id4 belong to id1. [OP:2]',function(done){
      var qaSpec={get:3,set:3,sadd:3,smembers:1};
      obj2.set(id2,id1,function(){
        obj2.set(id3,id1,function(){
          obj2.set(id4,id1,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3","4"]));
              db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(_id2, id1);
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(_id3, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                    assert.equal(_id4, id1);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('trac action',function(){
    it('id4 should trac id2 but id2 shouldn\'t trac id4. [OP:1]', function(done){
      var qaSpec={get:3,set:3,sadd:2,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj2.trac(id4,id2,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3"]));
              db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(_id2, id1);
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(_id3, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                    assert.equal(_id4, id2);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('free action',function(){
    it('id3 should free id1.id1 should trac id3. [OP:1]', function(done){
      var qaSpec={get:3,set:3,del:1,sadd:3,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj2.free(id3,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s(["2","3","4"]));
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(_id2, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(_id3, null);
                    db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                      assert.equal(_id4, id1);
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('del action',function(){
    it('id3 should delete id1. id1 should delete id3.[OP:2]', function(done){
    var qaSpec={get:3,set:3,del:1,sadd:3,srem:1,smembers:1};
    obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj2.del(id3,id1,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s(["2","4"]));
                db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(_id2, id1);
                  db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(_id3, null);
                    db.get(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                      assert.equal(_id4, id1);
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });
  
  describe('get action',function(){
    it('id1 should have id2, id3 and id4. id2,id3 and id4 should belong to id1. [OP:1]', function(done){
      var qaSpec={get:3,set:3,sadd:3,smembers:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.get(id1,function(_id1){
              assert.equal(s(_id1), s(["2","3","4"]));
              obj2.get(id2,function(_id2){
                assert.equal(_id2, id1);
                obj2.get(id3,function(_id3){
                  assert.equal(_id3, id1);
                  obj2.get(id4,function(_id4){
                    assert.equal(_id4, id1);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('contains action',function(){
    it('id1 should contain id2.id2 should contain id1.id3 should contain id1.id4 shouldn\'t cotain id2. [OP:1]', function(done){
      var qaSpec={get:3,set:3,sadd:3,sismember:1};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id1,id4,function(){
            obj1.contains(id1,id2,function(_id1){
              assert.equal(_id1, true);
              obj2.contains(id2,id1,function(_id2){
                assert.equal(_id2, true);
                obj2.contains(id3,id1,function(_id3){
                  assert.equal(_id3, true);
                  obj2.contains(id4,id2,function(_id4){
                    assert.equal(_id4, false);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

});

describe('manyMany relation', function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  var relname="b";
  var id1=1, id2=2, id3=3,id4=4,id5=5;
  var obj1 = SD.manyMany(obj1Name,obj2Name,relname);
  var obj2 = SD.manyMany(obj2Name,obj1Name,relname);

  afterEach(function(done){
    db.flushdb(function(){
      done();
    });
  });

  describe('set action',function(){
    it('id1 should own id2 and id3, id2 own id1 and id4.id3 belongs to id1. [OP:2]', function(done){
      var qaSpec={sadd:6,smembers:4};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id4,id2,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3"]));
              db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(s(_id2), s(["1","4"]));
                db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(s(_id3), s(["1"]));
                  db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id4,function(err,_id4){
                    assert.equal(s(_id4), s(["2"]));
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      //Yes.Here is the pharaoh ;)
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('trac action',function(){
    it('id2 tracs id4 but id4 doesn\'t trac id2. [OP:1]', function(done){
      var qaSpec={sadd:3,smembers:4};
      obj1.trac(id1,id2,function(){
        obj1.trac(id1,id3,function(){
          obj2.trac(id2,id4,function(){
            db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
              assert.equal(s(_id1), s(["2","3"]));
              db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                assert.equal(s(_id2), s(["4"]));
                db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                  assert.equal(s(_id3), s([]));
                  db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id4,function(err,_id4){
                    assert.equal(s(_id4), s([]));
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('free action',function(){
    it('id3 should free id1. [OP1]', function(done){
      var qaSpec={del:1,sadd:6,smembers:4};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id4,id2,function(){
            obj2.free(id3,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s(["2","3"]));
                db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(s(_id2), s(["1","4"]));
                  db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(s(_id3), s([]));
                    db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id4,function(err,_id4){
                      assert.equal(s(_id4), s(["2"]));
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('del action',function(){
    it('id1 should delete id3.id3 should delete id1. [OP:2]', function(done){
      var qaSpec={sadd:6,srem:2,smembers:4};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id4,id2,function(){
            obj1.del(id1,id3,function(){
              db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id1,function(err,_id1){
                assert.equal(s(_id1), s(["2"]));
                db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id2,function(err,_id2){
                  assert.equal(s(_id2), s(["1","4"]));
                  db.smembers(ns+""+obj2Name+""+obj1Name+relname+":"+id3,function(err,_id3){
                    assert.equal(s(_id3), s([]));
                    db.smembers(ns+""+obj1Name+""+obj2Name+relname+":"+id4,function(err,_id4){
                      assert.equal(s(_id4), s(["2"]));
                      qatest(qaSpec,function(result){
                        assert.equal(result, true, "QA test failed");
                        done();
                      });
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('get action',function(){
    it('id1 should have id2 and id3. id2 should have 1 and 4. [OP:1]', function(done){
      var qaSpec={sadd:6,smembers:4};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id4,id2,function(){
            obj1.get(id1,function(_id1){
              assert.equal(s(_id1), s(["2","3"]));
              obj2.get(id2,function(_id2){
                assert.equal(s(_id2), s(["1","4"]));
                obj2.get(id3,function(_id3){
                  assert.equal(s(_id3), s(["1"]));
                  obj1.get(id4,function(_id4){
                    assert.equal(s(_id4), s(["2"]));
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

  describe('contains action',function(){
    it('id1 should contain id2.id2 should contain id1. id3 shouldn\'t contain id5. id4 shouldn\'t contain id5. [OP:1]', function(done){
      var qaSpec={sadd:6,sismember:4};
      obj1.set(id1,id2,function(){
        obj1.set(id1,id3,function(){
          obj1.set(id4,id2,function(){
            obj1.contains(id1, id2,function(_id1){
              assert.equal(_id1, true);
              obj2.contains(id2,id1,function(_id2){
                assert.equal(_id2, true);
                obj2.contains(id3,id5,function(_id3){
                  assert.equal(_id3,false);
                  obj1.contains(id4,id5,function(_id4){
                    assert.equal(_id4, false);
                    qatest(qaSpec,function(result){
                      assert.equal(result, true, "QA test failed");
                      done();
                    });
                  });
                });
              });
            });
          });
        });
      });
    });
  });

});



describe("Unconfigured",function(){
  it("should throw a error trying to make a relationship",function(done){
    var SD = require("../SpeedDate");
    SD.__RMDB();
    assert.throws(function(){
    SD.oneOne(obj1Name,obj2Name,"_ss");
    },Error
    );
    done();
  });
});


describe("If relationship name already existing",function(){
  it("should return a error",function(done){
    SD = require("../SpeedDate");
    SD.con(db);
    assert.throws(function(){
        SD.oneOne(obj1Name,obj2Name,"");
        SD.oneOne(obj1Name,obj2Name,"");
    },Error
    );
    done();
  });
});

describe("Bad use of arguments",function(){
  var SD = require("../SpeedDate");
  SD.con(db);
  it("should return a error",function(done){
    assert.throws(function(){
        SD.hasMany(obj1Name,obj2Name,"z",4);
    },Error
    );
    done();
  });
  it("should return a error",function(done){
    assert.throws(function(){
        SD.hasMany();
    },Error
    );
    done();
  });

});
