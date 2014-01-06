
var async = {parallel:function(arrf,res){
  //replacement for async. Improves performance.
  var t=0;
  var err1;
  function end(err,d){
    if(t==1){
      res(err||err1,d);
    }else{
      err1=err;
      t++;
    }
  }
  arrf[0](end);
  arrf[1](end);
}};
var extend = require("lodash").extend;
var db;
var ns="";

if(process.env.NODE_ENV==='development'){
  module.exports.__RMDB = function(){
    db=undefined;
  };
}

module.exports.con = function(_db){
    db=_db;
};

module.exports.ns = function(_ns){
    ns=_ns.tostring();
};

var argcheck = function(){
  if(arguments[0].length<2 || arguments[0].length>3){
    throw new Error('Bad use of arguments typeRel("Obj1","Obj2","relName")');
  }
};

var checkConf=function(){
  if(db===undefined) {
    throw new Error('I need a redis client! use SpeedDate.con(client)');
  }
};
var type={none:0,one:1,many:2};
var relations={};

function relation(type1,type2,obj1,obj2,nameRel){
  checkConf();
  if(nameRel===undefined)nameRel="";
  if(relations[obj1+""+obj2+""+nameRel]===undefined){
    relations[obj1+""+obj2+""+nameRel]=true;
  }else{
    var msg = 'Relation '+nameRel+' already exists for '+obj1+' and '+obj2;
    throw new Error(msg); 
  }

  var functions={};
  functions[type.none]={null:function(arg,adone){
    var h = "This is a haiku\nYou could write a better one\nGo ahead and try.";
    //console.log("You have defined a relation without elements.");
    adone(null,h);
  }
  };

  functions[type.one]={};

  functions[type.one].set = function setOne(arg,adone){
    db.set(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],arg[1],function(err,dbdata){
      adone(err);
    });
  };
  functions[type.one].get = function getOne(arg,adone){
    db.get(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
      adone(err,dbdata);
    });
  };
  functions[type.one].contains = function containsOne(arg,adone){
    db.get(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
      adone(err,(dbdata==arg[1]));
    });
  };
  functions[type.one].free = function freeOne(arg,adone){
    db.del(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
      adone(err);
    });
  };
  functions[type.one].del = function delOne(arg,adone){
    db.del(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
      adone(err);
    });
  };
  functions[type.many]={};
  functions[type.many].set = function setMany(arg,adone){
    db.sadd(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],arg[1],function(err,dbdata){
          adone(err);
    });
  };
  functions[type.many].get = function getMany(arg,adone){
    db.smembers(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
      adone(err,dbdata);
    });
  };
  functions[type.many].contains = function containMany(arg,adone){
    db.sismember(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],arg[1],function(err,dbdata){
      adone(err,(dbdata==1));
    });
  };
  functions[type.many].free = function freeMany(arg,adone){
      db.del(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],function(err,dbdata){
        adone(err);
      });
  };
  functions[type.many].del = function delMany(arg,adone){
    db.srem(ns+""+arg.obj1+""+arg.obj2+nameRel+":"+arg[0],arg[1],function(err,dbdata){
      adone(err);
    });
  };

  function otherSide(){

    var rev = extend({},arguments[0]);
    var __t = arguments[0]['1'];
    rev['1'] = arguments[0]['0'];
    rev['0'] = __t;
    rev.obj1 = obj2;
    rev.obj2 = obj1;
    return rev;
  }

function getFn(type1,type2,action){
  return function runBothSides(){
    var cbk;
    var arg=arguments;

    cbk=arg[arg.length-1];
    arg.obj1=obj1;
    arg.obj2=obj2;
    
    async.parallel([
      function(done){
        functions[type1][action](arg,done);
      },
      function(done){
        if(type2==type.none) {
          done(null);  
        }else{
          functions[type2][action](otherSide(arg),done);
        }
      }],
      function(err,r){
        if(err){throw err;}
        if(cbk){
          //cbk(r[0]); //async
          cbk(r); 
        }
      }
    );
  };
}
  
  var api ={};
    if(type1==type.none || type2==type.none){
      api.null=getFn(type.none,type.none,null);
      return api;
    }

    api.set = getFn(type1,type2,"set");
    api.trac = getFn(type1,type.none,"set");
    api.get = getFn(type1,type.none,"get");
    api.del = getFn(type1,type2,"del");
    api.free = getFn(type1,type.none,"free");
    api.contains = getFn(type1,type.none,"contains");

  return api;
}

module.exports.null=function(){
  argcheck(arguments);
  return relation(type.none,type.none);
};
module.exports.hasMany=function(self,other,nameRel){
  argcheck(arguments);
  return relation(type.many,type.one,self,other,nameRel);
};
module.exports.belongTo=function(self,other,nameRel){
  argcheck(arguments);
  return relation(type.one,type.many,self,other,nameRel);
};
module.exports.manyMany=function(self,other,nameRel){
  argcheck(arguments);
  return relation(type.many,type.many,self,other,nameRel);
};
module.exports.oneOne=function(self,other,nameRel){
  argcheck(arguments);
  return relation(type.one,type.one,self,other,nameRel);
};
