

var generateError = function(err,data){
  console.log(err);
  console.log(data);
  if (err.code){
    return err;
  } else{
     return {
    status: 500,
    err: err,
    data : data,
      };
  }
 
};
module.exports = {
  generateError : generateError,
};